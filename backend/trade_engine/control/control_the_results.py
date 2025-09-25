from collections import defaultdict
from backend.trade_engine.data.bot_features import load_bot_context
from backend.trade_engine.log.log import log_info, log_warning, log_error
import asyncio
from backend.trade_engine.log.telegram.telegram_service import notify_user_by_telegram


def control_the_results(user_id, bot_id, results, min_usd=10.0, ctx=None):
    """
    Spot bot:
      - SADECE spot (holdings) dikkate alınır.
      - Hedef: target_spot% = curr_pos(0..1) * curr_per(0..100)

    Futures bot:
      - SADECE futures (positions) dikkate alınır.
      - Tek leverage kuralı: hedef leverage != mevcut leverage ise önce TAM kapat, sonra hedef leverage ile aç.
        Eğer kapatma min_usd sebebiyle gerçekleşmezse, açma o bacakta BLOKLANIR.

    Kapatma min_usd altı kaldıysa:
      - fulness DEĞİŞMEZ
      - mevcut yüzde/levrage DEĞİŞMEZ
      - açma fazı mevcut duruma göre karar verir.
    """

    def _get_min_frac_for_action(act):
        # 1) min_usd (dict ise coin/tip'e özgü, değilse sabit)
        local_min_usd = None
        if isinstance(min_usd, dict):
            sym = act.get("coin_id")
            tt  = act.get("trade_type")  # 'spot' | 'futures'
            local_min_usd = (
                min_usd.get((tt, sym)) if (tt, sym) in min_usd else
                min_usd.get(sym)
            )
        if local_min_usd is None:
            try:
                local_min_usd = float(min_usd)
            except Exception:
                local_min_usd = 10.0  # güvenli varsayılan
    
        # 2) FUTURES için leverage etkisi: notional = margin × leverage → margin eşiği = min_usd / lev
        if (act.get("trade_type") == "futures"):
            lev = act.get("leverage")  # open fazında set ediliyor, bkz. aşağıda
            try:
                lev = float(lev) if lev is not None else 1.0
            except Exception:
                lev = 1.0
            if lev > 0:
                local_min_usd = local_min_usd / lev
    
        # 3) fraction'a çevir (current_value > 0 ise)
        if current_value > 0:
            return local_min_usd / current_value
        return float("inf")

    def _fire_and_forget(coro):
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(coro)
        except RuntimeError:
            # Çalışan loop yoksa ayrı bir task olarak başlat
            asyncio.run(coro)
    
    # ---------- context ----------
    ctx = ctx or load_bot_context(bot_id)
    bot_type = ctx["bot_type"]           # "spot" | "futures"
    current_value = float(ctx["current_value"] or 0.0)
    fulness = float(ctx["fulness"] or 0.0)  # 0..1

    holdings = ctx.get("holdings", [])
    positions = ctx.get("positions", [])

    # ---------- helpers ----------
    def clamp_pct(p):
        try:
            p = float(p)
        except (TypeError, ValueError):
            return 0.0
        if p < 0:   return 0.0
        if p > 100: return 100.0
        return p

    def get_state(pos, pct):
        pct = clamp_pct(pct)
        try:
            pos = float(pos)
        except (TypeError, ValueError):
            return "none"
        if pct == 0 or pos == 0:
            return "none"
        if pos < 0:  return "short"
        if pos > 1:  return "long"
        if 0 < pos <= 1: return "spot"
        return "none"

    def sanitize_result(res):
        return {k: v for k, v in res.items()
                if k not in ("last_positions", "last_percentage")}

    # USD eşiğini fraction (global). Dict gelirse global değer yok; coin-bazlı hesaplanacak.
    if isinstance(min_usd, dict):
        base_min_usd = None
    else:
        try:
            base_min_usd = float(min_usd)
        except Exception:
            base_min_usd = 10.0

    if isinstance(min_usd, dict):
        base_min_frac = None
    else:
        try:
            base_min_frac = (float(min_usd) / current_value) if current_value > 0 else float("inf")
        except Exception:
            base_min_frac = (10.0 / current_value) if current_value > 0 else float("inf")


    # ---------- mevcutı haritalama ----------
    holding_map = {
        h["symbol"]: {
            "spot_pct": clamp_pct(((h.get("percentage")/100) or 0.0)),
            "spot_amount": float(h.get("amount") or 0.0),
        }
        for h in holdings
    }

    pos_map = {}  # {sym: {...}}
    for p in positions:
        sym = p["symbol"]
        side = (p.get("position_side") or "").lower()
        pct  = clamp_pct(p.get("percentage"))
        amt  = float(p.get("amount") or 0.0)
        lev  = p.get("leverage")  # None olabilir

        entry = pos_map.setdefault(sym, {
            "long_pct": 0.0, "long_amount": 0.0, "long_lev": None,
            "short_pct": 0.0, "short_amount": 0.0, "short_lev": None,
        })
        if side == "long":
            entry["long_pct"] = pct
            entry["long_amount"] = amt
            entry["long_lev"] = lev
        elif side == "short":
            entry["short_pct"] = pct
            entry["short_amount"] = amt
            entry["short_lev"] = lev

    # ---------- hedef kurulumu ----------
    targets = {}
    print("results:", results)

    for res in (results or []):
        lp = res.get("last_positions")
        lper = res.get("last_percentage")
        print("last_positions:", lp, "last_percentage:", lper)
        if not (isinstance(lp, (list, tuple)) and isinstance(lper, (list, tuple)) and len(lp) == 2 and len(lper) == 2):
            continue

        curr_pos = float(lp[1])      # spot: 0..1, futures: leverage
        curr_per = clamp_pct(lper[1])
        state = get_state(curr_pos, curr_per)

        sym = res.get("coin_id")
        if not sym:
            continue

        t = targets.setdefault(sym, {
            "spot": 0.0,
            "long": {"pct": 0.0, "lev": None},
            "short": {"pct": 0.0, "lev": None},
            "meta": sanitize_result(res),
        })

        if bot_type == "spot":
            if state == "spot":
                t["spot"] = (max(0.0, curr_pos * curr_per))/100
        else:  # futures
            if state == "long":
                t["long"]["pct"] = curr_per
                t["long"]["lev"] = curr_pos
            elif state == "short":
                t["short"]["pct"] = curr_per
                t["short"]["lev"] = curr_pos

    actions = []
    #print("bot_type:", bot_type)
    print("pos_map:", pos_map)
    print("targets:", targets)
    # Leverage değişimi kapatması min_usd’a takılırsa ilgili bacağı açmayı engellemek için:
    blocked_open = defaultdict(lambda: {"long": False, "short": False})

    def maybe_append(act, frac):
        if frac <= 0:
            return False
    
        # Yerel eşik (fraction): dict ise helper, değilse base_min_usd'den üret
        if isinstance(min_usd, dict):
            local_min_frac = _get_min_frac_for_action(act)
        else:
            # futures ise base_min_usd / lev; spot ise lev=1
            if act.get("trade_type") == "futures":
                lev = act.get("leverage")
                try:
                    lev = float(lev) if lev is not None else 1.0
                except Exception:
                    lev = 1.0
            else:
                lev = 1.0
            local_min_frac = (base_min_usd / lev) / current_value if current_value > 0 else float("inf")
    
        required_usd = (local_min_frac * current_value) if (current_value > 0 and local_min_frac not in (None, float("inf"))) else float("inf")
        usd = current_value * frac if current_value > 0 else 0.0
    
        if local_min_frac is None or frac < local_min_frac:
            # Telegram bildirimi (usd>10 ve eşik altı) aynı kaldı
            if usd > 10 and usd < required_usd:
                log_warning(
                    bot_id=bot_id,
                    message="Minimum USD altı işlem engellendi",
                    symbol=act.get("coin_id"),
                    details={"frac": frac, "min_frac": local_min_frac, "action": act, "usd": usd, "required_usd": required_usd}
                )
                _msg = (
                    f"⚠️ <b>Emir Eşik Altında Kaldı</b>\n\n"
                    f"🤖 Bot: <b>#{bot_id}</b>\n"
                    f"📈 Sembol: <b>{act.get('coin_id','N/A')}</b>\n"
                    f"🧾 Tür: <b>{(act.get('trade_type') or 'N/A').upper()}</b>\n"
                    f"↔️ Yön: <b>{(act.get('side') or 'N/A').upper()}</b>\n"
                    f"📉 Kaldıraç: <b>{act.get('leverage','1')}</b>\n"
                    f"💵 Hesaplanan Margin: <b>{usd:.2f} USD</b>\n"
                    f"🔺 Gerekli Minimum Margin: <b>{required_usd:.2f} USD</b>\n\n"
                    f"ℹ️ Bu emir, aracı kurumun minimum eşik değerinin altında kalması nedeniyle gönderilemedi."
                )
                _fire_and_forget(notify_user_by_telegram(text=_msg, bot_id=int(bot_id)))
            return False
    
        # ✅ eşik geçildi → normal akış (değişmedi)
        a = act.copy()
        a["value"] = usd
        a["status"] = "success"
        actions.append(a)
        log_info(
            bot_id=bot_id,
            message="İşlem eklendi",
            symbol=act.get("coin_id"),
            details={"frac": frac, "usd_value": usd, "action": act}
        )
        return True


    # ---------- 1) REDUCE/CLOSE ----------
    if bot_type == "spot":
        for sym, tgt in targets.items():
            meta = tgt["meta"]
            cur = holding_map.get(sym, {"spot_pct": 0.0, "spot_amount": 0.0})
            delta_spot = (tgt["spot"] - cur["spot_pct"])

            if delta_spot < 0:
                reduce_frac = -delta_spot
                act = {"coin_id": sym, "trade_type": "spot", "side": "sell", **meta}
                #if cur["spot_amount"] > 0:
                #    act["amount"] = (cur["spot_amount"] * reduce_frac / (cur["spot_pct"] / 100.0)) if cur["spot_pct"] else cur["spot_amount"]
                ok = maybe_append(act, reduce_frac)
                if ok:
                    fulness = max(0.0, fulness - reduce_frac)
                    cur["spot_pct"] = max(0.0, cur["spot_pct"] - reduce_frac)

    else:  # futures
        for sym, tgt in targets.items():
            meta = tgt["meta"]
            cur = pos_map.get(sym, {
                "long_pct": 0.0, "long_amount": 0.0, "long_lev": None,
                "short_pct": 0.0, "short_amount": 0.0, "short_lev": None
            })

            # ---- LONG reduce ----
            target_pct = tgt["long"]["pct"]
            target_lev = tgt["long"]["lev"]
            cur_pct = cur["long_pct"]
            cur_lev = cur["long_lev"]

            if cur_pct > 0 and target_pct > 0 and (cur_lev is not None and target_lev is not None) and (cur_lev != target_lev):
                reduce_frac = cur_pct / 100.0
                act = {"coin_id": sym, "trade_type": "futures", "positionside": "long", "side": "sell", "reduceOnly": True, **meta}
                #if cur["long_amount"] > 0:
                #    act["amount"] = cur["long_amount"]
                ok = maybe_append(act, reduce_frac)
                if ok:
                    fulness = max(0.0, fulness - reduce_frac)
                    cur["long_pct"] = 0.0
                    cur["long_lev"] = None
                else:
                    blocked_open[sym]["long"] = True

            delta_long = (target_pct - cur_pct) / 100.0
            if delta_long < 0:
                reduce_frac = -delta_long
                act = {"coin_id": sym, "trade_type": "futures", "positionside": "long", "side": "sell", "reduceOnly": True, **meta}
                #if cur["long_amount"] > 0:
                #    act["amount"] = (cur["long_amount"] * reduce_frac / (cur_pct / 100.0)) if cur_pct else cur["long_amount"]
                ok = maybe_append(act, reduce_frac)
                if ok:
                    fulness = max(0.0, fulness - reduce_frac)
                    cur["long_pct"] = max(0.0, cur["long_pct"] - reduce_frac * 100.0)

            # ---- SHORT reduce ----
            target_pct = tgt["short"]["pct"]
            target_lev = tgt["short"]["lev"]
            cur_pct = cur["short_pct"]
            cur_lev = cur["short_lev"]

            if cur_pct > 0 and target_pct > 0 and (cur_lev is not None and target_lev is not None) and (cur_lev != target_lev):
                reduce_frac = cur_pct / 100.0
                act = {"coin_id": sym, "trade_type": "futures", "positionside": "short", "side": "buy", "reduceOnly": True, **meta}
                #if cur["short_amount"] > 0:
                #    act["amount"] = cur["short_amount"]
                ok = maybe_append(act, reduce_frac)
                if ok:
                    fulness = max(0.0, fulness - reduce_frac)
                    cur["short_pct"] = 0.0
                    cur["short_lev"] = None
                else:
                    blocked_open[sym]["short"] = True

            delta_short = (target_pct - cur_pct) / 100.0
            if delta_short < 0:
                reduce_frac = -delta_short
                act = {"coin_id": sym, "trade_type": "futures", "positionside": "short", "side": "buy", "reduceOnly": True, **meta}
                #if cur["short_amount"] > 0:
                #    act["amount"] = (cur["short_amount"] * reduce_frac / (cur_pct / 100.0)) if cur_pct else cur["short_amount"]
                ok = maybe_append(act, reduce_frac)
                if ok:
                    fulness = max(0.0, fulness - reduce_frac)
                    cur["short_pct"] = max(0.0, cur["short_pct"] - reduce_frac * 100.0)

    # ---------- 2) INCREASE/OPEN ----------
    if bot_type == "spot":
        for sym, tgt in targets.items():
            meta = tgt["meta"]
            cur = holding_map.get(sym, {"spot_pct": 0.0, "spot_amount": 0.0})
            delta_spot = (tgt["spot"] - cur["spot_pct"])

            if delta_spot > 0:
                add_frac = min(delta_spot, max(0.0, 1.0 - fulness))
                act = {"coin_id": sym, "trade_type": "spot", "side": "buy", **meta}
                ok = maybe_append(act, add_frac)
                if ok:
                    fulness = min(1.0, fulness + add_frac)
                    cur["spot_pct"] = min(100.0, cur["spot_pct"] + add_frac)

    else:
        for sym, tgt in targets.items():
            meta = tgt["meta"]
            cur = pos_map.get(sym, {
                "long_pct": 0.0, "long_amount": 0.0, "long_lev": None,
                "short_pct": 0.0, "short_amount": 0.0, "short_lev": None
            })

            # LONG open
            if not blocked_open[sym]["long"]:
                target_pct = tgt["long"]["pct"]
                target_lev = tgt["long"]["lev"]
                cur_pct = cur["long_pct"]
                delta_long = (target_pct - cur_pct) / 100.0
                if delta_long > 0:
                    add_frac = min(delta_long, max(0.0, 1.0 - fulness))
                    act = {"coin_id": sym, "trade_type": "futures", "positionside": "long", "side": "buy", **meta}
                    if target_lev is not None:
                        act["leverage"] = target_lev
                    ok = maybe_append(act, add_frac)
                    if ok:
                        fulness = min(1.0, fulness + add_frac)
                        cur["long_pct"] = min(100.0, cur["long_pct"] + add_frac * 100.0)
                        cur["long_lev"] = target_lev if target_lev is not None else cur["long_lev"]

            # SHORT open
            if not blocked_open[sym]["short"]:
                target_pct = tgt["short"]["pct"]
                target_lev = tgt["short"]["lev"]
                cur_pct = cur["short_pct"]
                delta_short = (target_pct - cur_pct) / 100.0
                if delta_short > 0:
                    add_frac = min(delta_short, max(0.0, 1.0 - fulness))
                    act = {"coin_id": sym, "trade_type": "futures", "positionside": "short", "side": "sell", **meta}
                    if target_lev is not None:
                        act["leverage"] = target_lev
                    ok = maybe_append(act, add_frac)
                    if ok:
                        fulness = min(1.0, fulness + add_frac)
                        cur["short_pct"] = min(100.0, cur["short_pct"] + add_frac * 100.0)
                        cur["short_lev"] = target_lev if target_lev is not None else cur["short_lev"]

    return actions
