from dataclasses import dataclass
from typing import Dict, Any, List, Optional
import pandas as pd

from .config import BacktestConfig
from .strategy_sandbox import StrategySandbox
from .normalizer import SignalNormalizer
from .order_planner import OrderPlanner
from .fill_engine import FillEngine
from .position_manager import PositionManager
from .pnl_engine import PNLEngine, TradeEvent
from .metrics import basic_metrics


@dataclass
class BacktestResult:
    equity_curve: pd.Series
    trades: List[TradeEvent]
    metrics: Dict[str, Any]
    # Frontend adapter için bar bazında ek seriler:
    used_pct_series: Optional[pd.Series] = None  # 0..1
    leverage_series: Optional[pd.Series] = None  # spot=1.0, futures>=1.0


class BacktestEngine:
    def __init__(self, config: BacktestConfig):
        config.validate()
        self.cfg = config

    def run(self, candles: pd.DataFrame, user_code: str, globals_whitelist: Dict[str, Any]) -> BacktestResult:
        test = False
        # 1) Strategy → signals
        raw = StrategySandbox.run_user_code(
            base_df=candles,
            user_code=user_code,
            globals_whitelist=globals_whitelist,
            indicator_codes=self.cfg.extra_indicator_codes if hasattr(self.cfg, "extra_indicator_codes") else None
        )
        raw = StrategySandbox.validate_signals(raw, self.cfg.allow_short_spot)
        if test:
            raw = raw.iloc[:3000]
        print(f"Generated {len(raw)} signal rows from {len(candles)} candles.")
        print(f"Sample signals:\n{raw.head(3)}\n{raw.tail(3)}")
        print(f"position column: {raw['position'] if 'position' in raw.columns else 'N/A'}")
        # 2) Normalize
        sig = SignalNormalizer.normalize(raw)
        print(f"Normalized signals:\n{sig.head(3)}\n{sig.tail(3)}")
        # 3) Plan orders
        planned = OrderPlanner.plan(sig, self.cfg.scaleout_policy)
        print(f"Planned {len(planned)} orders.")
        print(f"Sample planned orders:\n{planned[:15]}\n{planned[-15:]}")
        # 4) Fill + Position + PnL
        pm = PositionManager(self.cfg.scaleout_policy)

        balance = float(self.cfg.initial_balance)
        equity: List[float] = []
        trades: List[TradeEvent] = []
        
        # Frontend returns için seriler
        used_series: List[float] = []
        lev_series: List[float] = []

        # TP/SL kolonları (varsa)
        tp_col = sig["take_profit"] if "take_profit" in sig.columns else None
        sl_col = sig["stop_loss"] if "stop_loss" in sig.columns else None

        # Fill’leri önceden hesapla
        fills = FillEngine.fill(sig, planned, self.cfg.execution_mode, self.cfg.time_in_force)
        print(f"Generated {len(fills)} fills.")
        print(f"Sample fills:\n{fills[:3]}\n{fills[-3:]}")
        # Bar bazında durum
        cur_used = 0.0               # 0..1 (sermaye kullanım oranı)
        cur_dir = 0                  # -1 / 0 / +1
        cur_lev = 1.0                # efektif kaldıraç (spot=1)

        for i, row in sig.iterrows():
            price = float(row["close"])

            # 4.a Funding (opsiyonel)
            if self.cfg.funding_rate_per_bar is not None and pm.total_qty() > 0 and pm.side is not None:
                notional = pm.total_qty() * price
                balance -= notional * float(self.cfg.funding_rate_per_bar)

            # 4.b TP/SL kontrolü (bar high/low)
            if pm.side and pm.total_qty() > 0:
                bar_high = float(row["high"])
                bar_low  = float(row["low"])

                # Mutasyon sırasında bozulmasın diye kopya üzerinde dön
                tranches_snapshot = list(pm.tranches)
                for t in tranches_snapshot:
                    tp_hit = sl_hit = False
                    tp_val = t.tp if (t.tp is not None and t.tp != 0.0) else None
                    sl_val = t.sl if (t.sl is not None and t.sl != 0.0) else None

                    if pm.side == "long":
                        if tp_val is not None: tp_hit = bar_high >= tp_val
                        if sl_val is not None: sl_hit = bar_low  <= sl_val
                    else:  # short
                        if tp_val is not None: tp_hit = bar_low  <= tp_val
                        if sl_val is not None: sl_hit = bar_high >= sl_val

                    if not (tp_hit or sl_hit):
                        continue
                    
                    # Aynı barda ikisi de vurduysa conflict_rule uygula
                    if tp_hit and sl_hit:
                        if test:
                            print(f"Timestamp= {row['timestamp']}, Bar idx={i}: tranche TP ve SL aynı anda vurdu, conflict_rule={self.cfg.conflict_rule}")
                        rule = self.cfg.conflict_rule
                        if rule == "take_first":
                            hit_type, exec_price = "TP", tp_val
                        elif rule == "mid":
                            hit_type = "MID"
                            exec_price = (tp_val + sl_val) / 2.0 if (tp_val is not None and sl_val is not None) else (tp_val or sl_val)
                        else:  # "stop_first" (varsayılan)
                            hit_type, exec_price = "SL", sl_val
                    else:
                        if test:
                            print(f"Timestamp= {row['timestamp']}, Bar idx={i}: tranche {'TP' if tp_hit else 'SL'} vurdu.")
                            print(f"Tranche details: {t}")
                        hit_type = "TP" if tp_hit else "SL"
                        exec_price = tp_val if tp_hit else sl_val

                    qty = float(t.quantity)
                    if qty <= 0 or exec_price is None:
                        continue
                    
                    # Tranche'a özel PnL ve komisyon
                    direction = 1 if t.side == "long" else -1
                    pnl = ((exec_price - t.entry_price) * direction) * qty
                    commission = PNLEngine.commission(
                        self.cfg.fee_model, qty, exec_price, t.leverage, float(self.cfg.commission)
                    )
                    balance += pnl - commission

                    # used_pct'i kapattığımız miktar oranında düşür
                    tot_qty_before = pm.total_qty()
                    next_used = (cur_used * max(0.0, (tot_qty_before - qty)) / tot_qty_before) if tot_qty_before > 0 else 0.0

                    margin_used = (qty * t.entry_price) / t.leverage if t.leverage > 0 else (qty * t.entry_price)
                    pnl_percentage = (pnl / margin_used * 100.0) if margin_used > 0 else 0.0

                    trades.append(TradeEvent(
                        i,
                        f"{hit_type}_CLOSE",
                        "sell" if t.side == "long" else "buy",
                        "market",
                        None,
                        exec_price,
                        t.leverage,
                        cur_used,          # from
                        next_used,         # to (kısmi kapanışta oranlı düşürülür)
                        qty,
                        qty * exec_price,
                        commission,
                        pnl,
                        pnl_percentage
                    ))
                    if test:
                        print(f"Timestamp= {row['timestamp']}, Bar idx={i}: tranche TP/SL -> type={hit_type}, qty={qty}, price={exec_price}, pnl={pnl}, comm={commission}")

                    # Sadece bu tranche kadar kapat (FIFO/LIFO politikasına göre)
                    pm.close_specific_tranche(t)

                    # State güncelle
                    cur_used = next_used
                    if pm.total_qty() == 0:
                        pm.close_all()
                        cur_lev = 1.0

            # 4.c Planlanan emirler → bu bara ait fill (order_id'siz güvenli eşleme)
            plan_for_i = [p for p in planned if p.idx == i]

            for po in plan_for_i:
                # execution_mode'a göre bar(lar)
                target_idxs = (i + 1,) if self.cfg.execution_mode == "next_open" else (i,)

                # 1) idx + filled + price mevcudiyeti
                candidates = [
                    f for f in fills
                    if getattr(f, "filled", False)
                    and getattr(f, "fill_price", None) is not None
                    and getattr(f, "idx", None) in target_idxs
                ]
                # 2) side / order_type alanları varsa daralt
                candidates = [
                    f for f in candidates
                    if getattr(f, "side", po.side) == po.side
                    and getattr(f, "order_type", po.order_type) == po.order_type
                ]
                # 3) limit emirde fiyat uyumu (toleranslı)
                if po.order_type == "limit":
                    req_price = float(po.requested_price or 0.0)
                    candidates = [
                        f for f in candidates
                        if abs(float(getattr(f, "fill_price", 0.0)) - req_price) < 1e-9
                        or getattr(f, "requested_price", None) == po.requested_price
                    ]
                fr = candidates[0] if candidates else None
                if not fr:
                    continue

                incoming_side = "long" if po.side == "buy" else "short"

                pnl = 0.0

                # 1) Önce FLIP kontrolü ve kapatma
                if pm.side and pm.side != incoming_side and pm.total_qty() > 0:
                    close_qty = pm.total_qty()
                    close_price = fr.fill_price
                    pnl_close = (close_price - pm.vwap()) * (1 if pm.side == "long" else -1) * close_qty
                    commission_close = abs(close_qty * close_price) * float(self.cfg.commission)
                    balance += pnl_close - commission_close
                    
                    effective_lev = cur_lev if cur_lev > 0 else 1.0
                    flip_margin = (close_qty * pm.vwap()) / effective_lev
                    flip_pnl_pct = (pnl_close / flip_margin * 100.0) if flip_margin > 0 else 0.0

                    trades.append(TradeEvent(
                        idx=i, type="FLIP_CLOSE",
                        side=("sell" if pm.side == "long" else "buy"),
                        order_type="market", requested_price=None,
                        fill_price=close_price, leverage=effective_lev,
                        used_pct_from=cur_used, used_pct_to=0.0,
                        qty=close_qty, notional=close_qty * close_price,
                        commission=commission_close, pnl_amount=pnl_close, pnl_pct=flip_pnl_pct,
                    ))
                    if test:
                        print(f"Timestamp= {row['timestamp']}, Bar idx={i}: FLIP kapatma -> qty={close_qty}, price={close_price}, pnl={pnl_close}, comm={commission_close}")
                    pm.close_all()
                    cur_used = 0.0
                    cur_dir = 0
                    cur_lev = 1.0  # flat

                # 2) Flip sonucuna göre hedefi ve miktarı ŞİMDİ hesapla
                new_used = float(po.target_used_pct)
                delta_used = new_used - cur_used      # cur_used flip sonrası 0 ise burada doğru olur
                if abs(delta_used) < 1e-12:
                    continue
                
                qty = PNLEngine.compute_qty(
                    self.cfg.initial_balance, abs(delta_used), po.leverage, fr.fill_price
                )

                # 3) Artık delta_used işaretine göre open/scale seç
                if delta_used > 0:
                    # OPEN / SCALE_IN
                    side = incoming_side
                    tp_raw = float(row["take_profit"]) if pd.notna(row.get("take_profit", None)) else None
                    sl_raw = float(row["stop_loss"])  if pd.notna(row.get("stop_loss",  None)) else None
                    tp_val = (tp_raw if (tp_raw is not None and tp_raw != 0.0) else None)
                    sl_val = (sl_raw if (sl_raw is not None and sl_raw != 0.0) else None)
                    pm.open_or_scale(side, qty, fr.fill_price, po.leverage, tp_val, sl_val)
                    cur_lev = float(po.leverage)
                    evt_type = "OPEN" if cur_used == 0 else "SCALE_IN"
                    next_used = new_used
                else:
                    # SCALE_OUT / CLOSE
                    if pm.total_qty() > 0:
                        # Kapanan miktar için kar/zarar hesabı (VWAP maliyetine göre)
                        dir_multiplier = 1 if pm.side == "long" else -1
                        pnl = (fr.fill_price - pm.vwap()) * dir_multiplier * abs(qty)
                        balance += pnl  # Karı bakiyeye ekle

                    pm.scale_out(abs(qty))
                    if pm.total_qty() == 0:
                        pm.close_all()
                        cur_lev = 1.0
                    next_used = max(0.0, cur_used - abs(delta_used))
                    evt_type = "CLOSE" if next_used == 0.0 else "SCALE_OUT"

                # 4) Komisyon ve trade kaydı
                commission = PNLEngine.commission(
                    self.cfg.fee_model, qty, fr.fill_price, po.leverage, float(self.cfg.commission)
                )
                balance -= commission

                effective_lev = cur_lev if cur_lev > 0 else 1.0
                force_margin = (qty * pm.vwap()) / effective_lev
                force_pnl_pct = (pnl / force_margin * 100.0) if force_margin > 0 else 0.0

                trades.append(TradeEvent(
                    idx=i, type=evt_type, side=po.side, order_type=po.order_type,
                    requested_price=po.requested_price, fill_price=fr.fill_price,
                    leverage=po.leverage, used_pct_from=cur_used, used_pct_to=next_used,
                    qty=qty, notional=qty * fr.fill_price,
                    commission=commission, pnl_amount=pnl, pnl_pct=force_pnl_pct,
                ))
                if test:
                    print(f"po: {po}")
                    print(f"Timestamp= {row['timestamp']}, Bar idx={i}: {evt_type} -> side={po.side}, qty={qty}, price={fr.fill_price}, pnl={pnl}, comm={commission}")
                cur_used = next_used
                cur_dir = 0 if cur_used == 0 else (1 if ("buy" == po.side) else -1)

            # 4.d MTM (mark-to-market) ve bar sonu kayıtları
            if pm.total_qty() > 0:
                side_mul = 1 if pm.side == "long" else -1
                pnl_unrealized = (price - pm.vwap()) * side_mul * pm.total_qty()
                equity.append(balance + pnl_unrealized)
            else:
                equity.append(balance)

            used_series.append(cur_used)
            if pm.total_qty() > 0:
                val = cur_lev
                if pm.side == "short":
                    val = -abs(val) # Short ise negatife çevir
            else:
                val = 0.0 # Flat iken 1.0 yerine 0.0 daha doğru bir grafik verir
            
            lev_series.append(val)

        # 5) Son bar: açık pozisyon varsa zorunlu kapat
        if pm.total_qty() > 0:
            qty = pm.total_qty()
            last_price = float(sig.iloc[-1]["close"])
            
            # PnL Hesabı (Zaten vardı)
            pnl = (last_price - pm.vwap()) * (1 if pm.side == "long" else -1) * qty
            commission = abs(qty * last_price) * float(self.cfg.commission)
            balance += pnl - commission

            # --- DÜZELTME BAŞLANGICI ---
            # ROI (PnL %) Hesaplama
            effective_lev = cur_lev if cur_lev > 0 else 1.0
            
            # Pozisyon için kullanılan teminat (Margin) = (Miktar * Giriş Fiyatı) / Kaldıraç
            force_margin = (qty * pm.vwap()) / effective_lev
            
            # Yüzdelik Hesap
            force_pnl_pct = (pnl / force_margin * 100.0) if force_margin > 0 else 0.0
            # --- DÜZELTME BİTİŞİ ---

            trades.append(TradeEvent(
                len(sig) - 1,
                "FORCE_CLOSE",
                "sell" if pm.side == "long" else "buy",
                "market",
                None,
                last_price,
                cur_lev,
                cur_used,
                0.0,
                qty,
                qty * last_price,
                commission,
                pnl,
                force_pnl_pct  # <--- 0.0 yerine hesaplanan değeri yazdık
            ))
            
            if test:
                print(f"Final barda zorunlu kapanış: trade={trades[-1:]} ,qty={qty}, price={last_price}, pnl={pnl}, commission={commission}")
            
            equity[-1] = balance
            # flat normalize
            used_series[-1] = 0.0
            lev_series[-1] = 0.0

        # 6) Metrikler
        eq = pd.Series(equity, index=sig.index)
        m = basic_metrics(eq)
        m["num_trades"] = len(trades)
        m["commission_paid"] = float(sum(t.commission for t in trades))

        return BacktestResult(
            equity_curve=eq,
            trades=trades,
            metrics=m,
            used_pct_series=pd.Series(used_series, index=sig.index),
            leverage_series=pd.Series(lev_series, index=sig.index),
        )
