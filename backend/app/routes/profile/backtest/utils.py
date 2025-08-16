import pandas as pd

def calculate_performance(
    df: pd.DataFrame,
    commission: float = 0.0,
    risk_free_rate: float = 0.02,
    debug: bool = False,
    initial_balance: float = 10000.0,
    fifo_scaleout: bool = True,   # scale-out dağıtım kuralı: True=FIFO, False=LIFO
):
    """
    - Kısmi açılışları 'tranche' olarak ayrı ayrı takip eder.
    - Her tranche kendi TP/SL seviyesine sahiptir; tetiklenirse sadece o tranche kapanır.
    - TP/SL kapanışında gelecekte 'percentage' değerlerini, kapanan yüzde kadar düşürerek tekrar açılmayı engeller.
      (Bu indirim, orijinal yüzdeler o eşiğin altına inene kadar sürer.)
    """

    def log(*args, **kwargs):
        if debug:
            print(*args, **kwargs)

    def pnl_pct_from(entry_price: float, exit_price: float, side: float) -> float:
        if entry_price == 0:
            return 0.0
        raw = (exit_price - entry_price) / entry_price
        return (raw * 100.0) if side > 0 else (-raw * 100.0)

    def pnl_amount_from(entry_price: float, exit_price: float, side: float, qty: float) -> float:
        if qty <= 0 or entry_price == 0:
            return 0.0
        diff = (exit_price - entry_price)
        return diff * qty if side > 0 else (-diff * qty)

    def pct_change_str(old_p01: float, new_p01: float) -> str:
        def pct_str(p01: float) -> str:
            p01 = max(0.0, min(1.0, float(p01)))
            return f"%{int(round(p01 * 100))}"
        return f"{pct_str(old_p01)} -> {pct_str(new_p01)}"

    # --- validate
    for col in ['position', 'close', 'percentage']:
        df[col] = pd.to_numeric(df[col], errors='coerce')
    mismatch_mask = (
        ((df['position'] == 0) & (df['percentage'] != 0)) |
        ((df['position'] != 0) & (df['percentage'] == 0))
    )
    if mismatch_mask.any() and debug:
        log(f"Aligned {int(mismatch_mask.sum())} rows where only one of (position, percentage) was zero -> set both to 0.")
    df.loc[mismatch_mask, ['position', 'percentage']] = 0

    if df[['position', 'close', 'percentage']].isna().any().any():
        raise ValueError("position/close/percentage contain non-numeric values.")

    has_tp_col = 'take_profit' in df.columns
    has_sl_col = 'stop_loss' in df.columns

    # --- prep
    df = df.copy()
    df['timestamp'] = pd.to_datetime(df['timestamp'], errors='coerce')
    df = df.sort_values(by='timestamp').reset_index(drop=True)
    df[['position', 'close', 'percentage']] = df[['position', 'close', 'percentage']].astype(float)
    df['position_prev'] = df['position'].shift(fill_value=0)
    df['price_prev']    = df['close'].shift(fill_value=0)

    # Orijinal yüzdeleri sakla (ileri manipülasyon için referans)
    df['percentage_base'] = df['percentage']

    # Bu fonksiyon, i satırından itibaren percentage değerlerinden reduction_pct puan düşer;
    # orijinal yüzdeler reduction_pct altına ininceye kadar sürer.
    def forward_reduce_percentage(start_idx: int, reduction_pct: float):
        if reduction_pct <= 0:
            return
        j = start_idx
        while j < len(df):
            base = float(df.at[j, 'percentage_base'])
            if base < reduction_pct:
                break  # artık strateji doğal olarak bu indirimden daha düşük hedefliyor; dur.
            df.at[j, 'percentage'] = max(0.0, float(df.at[j, 'percentage']) - reduction_pct)
            j += 1

    # --- state
    time_in_trade_seconds = 0.0   # İşlemde geçen toplam süre (saniye)
    prev_ts = None                # Bir önceki barın timestamp'i
    used_pct_after_prev = 0.0     # Bir önceki bar sonunda toplam kullanılan yüzde (0..1)
    balance = float(initial_balance)
    balance_prev = float(initial_balance)
    balances = []
    trades = []
    returns = []
    total_volume = 0.0
    commission_paid_total = 0.0

    # Aktif tranche listesi (aynı yönde birden fazla kısmi açılış)
    # Her eleman: {
    #   'pct': 0..1, 'qty': float, 'entry': float, 'side': +1/-1, 'lev': float,
    #   'tp': float|None, 'sl': float|None, 'time': ts
    # }
    tranches = []

    # Yardımcı: toplam kullanılan yüzde ve toplam adet
    def total_used_pct():
        return sum(t['pct'] for t in tranches)

    def total_position_qty():
        return sum(t['qty'] for t in tranches)

    def current_side():
        # Tüm tranche’ler aynı yönde olmalı; yoksa 0
        if not tranches:
            return 0.0
        s = tranches[0]['side']
        return s if all(t['side'] == s for t in tranches) else 0.0

    first_close = float(df['close'].iloc[0])
    last_close  = float(df['close'].iloc[-1])
    last_idx = len(df) - 1

    for i in range(len(df)):
        row = df.iloc[i]
        ts  = row['timestamp']
        # --- (YENİ) İşlemde geçen süreyi biriktir ---
        if prev_ts is not None:
            dt_sec = (ts - prev_ts).total_seconds()
            if used_pct_after_prev > 1e-12:   # önceki bar sonunda pozisyon vardıysa
                time_in_trade_seconds += max(0.0, dt_sec)


        price = float(row['close'])
        price_prev = float(row['price_prev'])
        pos = float(row['position'])              # hedef kaldıraç işareti (yön)
        pct_target = float(row['percentage'])/100 # hedef kullanım (manipüle edilmiş olabilir)
        

        # Bu bar için girilen TP/SL (sadece yeni açılan tranche için kullanılacak)
        tp = None
        sl = None
        if has_tp_col:
            val = row['take_profit']; tp = None if pd.isna(val) or float(val) == 0.0 else float(val)
        if has_sl_col:
            val = row['stop_loss'];   sl = None if pd.isna(val) or float(val) == 0.0 else float(val)

        side_now = current_side()

        # 1) MTM: tüm tranche’leri fiyat değişimine göre değerle
        if tranches and price_prev != 0:
            price_change = (price - price_prev) / price_prev
            # Short için işaret ters
            mtm_gain_p01 = 0.0
            for t in tranches:
                pc = price_change if t['side'] > 0 else -price_change
                mtm_gain_p01 += t['lev'] * t['pct'] * pc
            balance *= (1 + mtm_gain_p01)

        # 2) Tranche bazlı TP/SL kontrolleri → kapananları topla
        closed_tranches = []
        # BURADA EK: toplama başlamadan önce toplam kullanılan yüzdeyi al
        rolling_used_pct_before = total_used_pct()  # 0..1
        for idx_t, t in list(enumerate(tranches)):
            hit_tp = (t['tp'] is not None) and ((price >= t['tp']) if t['side'] > 0 else (price <= t['tp']))
            hit_sl = (t['sl'] is not None) and ((price <= t['sl']) if t['side'] > 0 else (price >= t['sl']))
            if hit_tp or hit_sl:
                exit_price = t['tp'] if hit_tp else t['sl']
                qty = t['qty']
                pnl_pct = pnl_pct_from(t['entry'], exit_price, t['side'])
                pnl_amount = pnl_amount_from(t['entry'], exit_price, t['side'], qty)

                trade_type = (
                    "LONG_TP_CLOSE"  if (hit_tp and t['side'] > 0) else
                    "SHORT_TP_CLOSE" if (hit_tp and t['side'] < 0) else
                    "LONG_SL_CLOSE"  if (hit_sl and t['side'] > 0) else
                    "SHORT_SL_CLOSE"
                )

                trade_volume = abs(qty * exit_price)
                total_volume += trade_volume
                commission_fee = trade_volume * commission
                commission_paid_total += commission_fee

                # --- YENİ: "usedPercentage" alanını TOPLAMDAN-TOPlAMA yaz
                used_before = rolling_used_pct_before                   # 0..1
                used_after  = max(0.0, used_before - t['pct'])          # 0..1
                used_change_str = pct_change_str(used_before, used_after)

                #log(f"Tranche kapandı: {trade_type} @ {exit_price}, qty={qty}, pnl_pct={pnl_pct:.2f}, used={used_change_str}")
                log(f"Amount: {qty}")
                trades.append({
                    "id": len(trades) + 1,
                    "date": ts,
                    "type": trade_type,
                    "leverage": t['lev'],
                    "usedPercentage": used_change_str,   # <-- burada artık toplamdan-toplama
                    "amount": qty,
                    "price": exit_price,
                    "commission": round(commission_fee, 6),
                    "pnlPercentage": round(pnl_pct, 2),
                    "pnlAmount": round(pnl_amount, 2),
                })
                balance -= commission_fee

                # Sıralı kapanışlarda bir sonraki kayıt için "önce" toplamı güncelle
                rolling_used_pct_before = used_after

                closed_tranches.append((idx_t, t))

        # 2b) Kapanan tranche’leri kaldır ve ileriye dönük yüzdeyi düşür
        if closed_tranches:
            for idx_t, t in sorted(closed_tranches, key=lambda x: x[0], reverse=True):
                del tranches[idx_t]
            total_closed_pct = sum(t['pct'] for _, t in closed_tranches) * 100.0  # puan
            forward_reduce_percentage(i, total_closed_pct)
            # hedef yüzde yeniden okunsun (manipülasyon sonrası)
            pct_target = float(df.at[i, 'percentage'])/100.0

        side_now = current_side()
        used_pct_now = total_used_pct()

        # 3) Yön değişimi (flip)
        if i < last_idx and pos != 0 and ((side_now == 0 and used_pct_now == 0) or (pos * side_now <= 0 and used_pct_now > 0)):
            # Mevcut tüm tranche’leri cari fiyattan TEK KAYITLA kapat
            if tranches:
                total_pct = sum(t['pct'] for t in tranches)           # 0..1
                total_qty = sum(t['qty'] for t in tranches)
                side_all  = tranches[0]['side'] if tranches else 0.0
                lev_all   = tranches[0]['lev']  if tranches else 0.0

                # VWAP giriş
                vwap_entry = (sum(t['qty'] * t['entry'] for t in tranches) / total_qty) if total_qty > 0 else 0.0

                # Toplam parasal PnL (tranche bazında toparla)
                total_pnl_amount = sum(
                    pnl_amount_from(t['entry'], price, t['side'], t['qty']) for t in tranches
                )
                pnl_pct = pnl_pct_from(vwap_entry, price, side_all)

                # Hacim / komisyon (tek işlem)
                trade_volume  = abs(total_qty * price)
                total_volume += trade_volume
                commission_fee = trade_volume * commission
                commission_paid_total += commission_fee

                # usedPercentage: TOPLAM -> 0
                used_change_str = pct_change_str(total_pct, 0.0)

                trades.append({
                    "id": len(trades) + 1,
                    "date": ts,
                    "type": "LONG_CLOSE" if side_all > 0 else "SHORT_CLOSE",
                    "leverage": lev_all,                # ilk tranche’in kaldıraç değeri
                    "usedPercentage": used_change_str,  # %Toplam -> %0
                    "amount": total_qty,
                    "price": price,
                    "commission": round(commission_fee, 6),
                    "pnlPercentage": round(pnl_pct, 2),
                    "pnlAmount": round(total_pnl_amount, 2),
                })

                balance -= commission_fee
                tranches.clear()
                used_pct_now = 0.0
                side_now = 0.0

        # 4) Aynı yönde yeniden dengeleme (scale-in / scale-out)
        #    Hedef yüzde (pct_target) ile mevcut kullanılan yüzde karşılaştır
        if i < last_idx:
            if pos == 0:
                # sinyal flat: TÜM tranche'leri tek seferde kapat
                if tranches:
                    total_pct = sum(t['pct'] for t in tranches)           # 0..1
                    total_qty = sum(t['qty'] for t in tranches)
                    side_all  = tranches[0]['side'] if tranches else 0.0
                    lev_all   = tranches[0]['lev']  if tranches else 0.0

                    # VWAP giriş
                    vwap_entry = (sum(t['qty'] * t['entry'] for t in tranches) / total_qty) if total_qty > 0 else 0.0

                    # Toplam parasal PnL (güvenli yol: tranche bazında topla)
                    total_pnl_amount = sum(
                        pnl_amount_from(t['entry'], price, t['side'], t['qty']) for t in tranches
                    )
                    pnl_pct = pnl_pct_from(vwap_entry, price, side_all)

                    # Hacim / komisyon
                    trade_volume  = abs(total_qty * price)
                    total_volume += trade_volume
                    commission_fee = trade_volume * commission
                    commission_paid_total += commission_fee

                    # usedPercentage: TOPLAM -> 0
                    used_change_str = pct_change_str(total_pct, 0.0)

                    trades.append({
                        "id": len(trades) + 1,
                        "date": ts,
                        "type": "LONG_CLOSE" if side_all > 0 else "SHORT_CLOSE",
                        "leverage": lev_all,                    # ilk tranche'in kaldıraç değeri
                        "usedPercentage": used_change_str,      # %Toplam -> %0
                        "amount": total_qty,
                        "price": price,
                        "commission": round(commission_fee, 6),
                        "pnlPercentage": round(pnl_pct, 2),
                        "pnlAmount": round(total_pnl_amount, 2),
                    })

                    balance -= commission_fee
                    tranches.clear()
                    used_pct_now = 0.0
                    side_now = 0.0

            else:
                # Aynı yön mü?
                same_side = (side_now == 0) or (pos * side_now > 0)

                if same_side:
                    # Scale-in
                    if pct_target > used_pct_now + 1e-12:
                        add_pct = pct_target - used_pct_now
                        # Yeni tranche
                        lev = abs(pos)
                        qty = (add_pct * balance) / price if price != 0 else 0.0
                        trade_volume = abs(qty * price)
                        total_volume += trade_volume
                        commission_fee = trade_volume * commission
                        commission_paid_total += commission_fee

                        tranches.append({
                            'pct': add_pct,
                            'qty': qty,
                            'entry': price,
                            'side': 1.0 if pos > 0 else -1.0,
                            'lev': lev,
                            'tp': tp,
                            'sl': sl,
                            'time': ts,
                        })

                        trades.append({
                            "id": len(trades)+1,
                            "date": ts,
                            "type": "LONG_OPEN" if pos > 0 else "SHORT_OPEN",
                            "leverage": lev,
                            "usedPercentage": pct_change_str(used_pct_now, pct_target),
                            "amount": qty,
                            "price": price,
                            "commission": round(commission_fee, 6)
                        })
                        balance -= commission_fee
                        used_pct_now = pct_target

                    # Scale-out (sinyal yüzdesi düştü)
                    elif pct_target < used_pct_now - 1e-12 and tranches:
                        reduce_pct = used_pct_now - pct_target  # 0..1 aralığında azaltılacak toplam yüzde
                        # FIFO/LIFO üzerinde çalış, ama TEK trade kaydı yaz
                        idxs = range(len(tranches)) if fifo_scaleout else range(len(tranches)-1, -1, -1)

                        total_close_pct = 0.0         # 0..1, kapatılan toplam yüzde
                        total_close_qty = 0.0          # toplam kapatılan adet
                        total_pnl_amount = 0.0         # kapatılanların toplam parasal PnL'i
                        weighted_entry_value = 0.0     # VWAP için: sum(entry * close_qty)
                        side_all = side_now            # tüm tranche'ler aynı yönde varsayımı

                        # Tranche'leri içerde azalt; ama trade'i toplu yazacağız
                        for k in idxs:
                            if reduce_pct <= 1e-12:
                                break
                            t = tranches[k]
                            if t['pct'] <= 1e-12 or t['qty'] <= 1e-12:
                                continue

                            take = min(t['pct'], reduce_pct)   # bu tranche'ten kapatılacak yüzde
                            if take <= 0:
                                continue

                            close_frac = take / t['pct']       # bu tranche'in ne kadarı kapanıyor
                            close_qty  = t['qty'] * close_frac

                            # PnL ve VWAP bileşenleri
                            pnl_pct_t  = pnl_pct_from(t['entry'], price, t['side'])
                            pnl_amt_t  = pnl_amount_from(t['entry'], price, t['side'], close_qty)

                            total_close_pct   += take
                            total_close_qty   += close_qty
                            total_pnl_amount  += pnl_amt_t
                            weighted_entry_value += (t['entry'] * close_qty)

                            # Tranche küçült
                            t['pct'] -= take
                            t['qty'] -= close_qty
                            reduce_pct -= take

                        # Sıfırlanan tranche'leri temizle
                        tranches = [t for t in tranches if t['pct'] > 1e-12 and t['qty'] > 1e-12]

                        # Toplu trade kaydı: herhangi bir kapanış olduysa yaz
                        if total_close_qty > 1e-12 and total_close_pct > 1e-12:
                            vwap_entry_closed = (weighted_entry_value / total_close_qty) if total_close_qty > 0 else 0.0
                            pnl_pct_agg = pnl_pct_from(vwap_entry_closed, price, side_all)

                            trade_type = "LONG_CLOSE" if side_all > 0 else "SHORT_CLOSE"  # öncekiyle uyumlu isim
                            trade_volume  = abs(total_close_qty * price)
                            total_volume += trade_volume
                            commission_fee = trade_volume * commission
                            commission_paid_total += commission_fee

                            # usedPercentage: TOPLAM → HEDEF (tek adımda)
                            used_change_str = pct_change_str(used_pct_now, pct_target)

                            trades.append({
                                "id": len(trades)+1,
                                "date": ts,
                                "type": trade_type,
                                "leverage": (tranches[0]['lev'] if tranches else 0.0),
                                "usedPercentage": used_change_str,   # <-- %Toplam -> %Hedef
                                "amount": total_close_qty,
                                "price": price,
                                "commission": round(commission_fee, 6),
                                "pnlPercentage": round(pnl_pct_agg, 2),
                                "pnlAmount": round(total_pnl_amount, 2),
                            })
                            balance -= commission_fee

                            # Artık toplam kullanılan yüzde hedefe eşitlendi
                            used_pct_now = pct_target

                else:
                    # Farklı işaret: üstte flip logic zaten kapatıyordu; burada yeni açılış (tam açılış gibi) yapılır
                    if pct_target > 1e-12:
                        lev = abs(pos)
                        qty = (pct_target * balance) / price if price != 0 else 0.0
                        #log(f"Amount: {qty}")
                        #log(f"Tranches: {pct_target, balance}")
                        trade_volume = abs(qty * price)
                        total_volume += trade_volume
                        commission_fee = trade_volume * commission
                        commission_paid_total += commission_fee

                        tranches = [{
                            'pct': pct_target,
                            'qty': qty,
                            'entry': price,
                            'side': 1.0 if pos > 0 else -1.0,
                            'lev': lev,
                            'tp': tp,
                            'sl': sl,
                            'time': ts,
                        }]

                        trades.append({
                            "id": len(trades)+1,
                            "date": ts,
                            "type": "LONG_OPEN" if pos > 0 else "SHORT_OPEN",
                            "leverage": lev,
                            "usedPercentage": pct_change_str(0.0, pct_target),
                            "amount": qty,
                            "price": price,
                            "commission": round(commission_fee, 6)
                        })
                        balance -= commission_fee
                        used_pct_now = pct_target

        # 5) Son barda zorunlu kapanış - TÜM TRANCHE'LERİ TEK KAYITTA KAPAT
        if i == last_idx and tranches:
            # Tüm tranche'lerin toplam yüzdesi ve adetleri
            total_pct = sum(t['pct'] for t in tranches)              # 0..1
            total_qty = sum(t['qty'] for t in tranches)
            
            log(f"Amount: {total_qty}")
            log(f"Tranches: {tranches}")

            # Yön kontrolü (tasarım gereği hepsi aynı yönde)
            side_all = tranches[0]['side'] if tranches else 0.0

            # VWAP giriş fiyatı (tek yüzde PnL için)
            vwap_entry = (
                sum(t['qty'] * t['entry'] for t in tranches) / total_qty
                if total_qty > 0 else 0.0
            )

            # Güvenli PnL: (1) toplam parasal PnL, (2) VWAP'e göre yüzde PnL
            total_pnl_amount = sum(
                pnl_amount_from(t['entry'], price, t['side'], t['qty']) for t in tranches
            )
            pnl_pct = pnl_pct_from(vwap_entry, price, side_all)

            # İşlem tipi
            close_type = "LONG_END_CLOSE" if side_all > 0 else "SHORT_END_CLOSE"

            # Hacim / komisyon (tek işlem)
            trade_volume  = abs(total_qty * price)
            total_volume += trade_volume
            commission_fee = trade_volume * commission
            commission_paid_total += commission_fee

            # usedPercentage: TOPLAMDAN → 0
            used_before = total_pct
            used_after  = 0.0
            used_change_str = pct_change_str(used_before, used_after)
            #log(f"amoun: {total_qty}, used: {used_change_str}, pnl_pct: {pnl_pct:.2f}")
            trades.append({
                "id": len(trades) + 1,
                "date": ts,
                "type": close_type,
                # İsteğe bağlı: kaldıraç için basit bir gösterim (ağırlıklı ortalama)
                "leverage": (tranches[0]['lev'] if tranches else 0.0),
                "usedPercentage": used_change_str,        # <-- TOPLAMDAN → 0
                "amount": total_qty,
                "price": price,
                "commission": round(commission_fee, 6),
                "pnlPercentage": round(pnl_pct, 2),
                "pnlAmount": round(total_pnl_amount, 2),
            })

            balance -= commission_fee
            tranches.clear()


        # 6) Getiri/bakiye serileri
        if balance == balance_prev or (balance_prev == 0):
            ret_val = 0.0
        else:
            ret_val = (balance - balance_prev) / balance_prev * 100.0

        # Görselleştirme için anlık yön ve yüzde (toplam)
        viz_side = current_side()
        viz_pct  = total_used_pct() * 100.0

        # (YENİ) Bir sonraki aralık için: bu bar SONUNDA kullanılan yüzdeyi kaydet
        used_pct_after_prev = total_used_pct()
        prev_ts = ts

        returns.append((
            int(ts.timestamp()) if pd.notna(ts) else 0,
            round(ret_val, 4),
            viz_side,
            round(viz_pct, 6),
        ))

        balances.append((int(ts.timestamp()) if pd.notna(ts) else 0, balance))
        balance_prev = balance

    # ---------- Metrikler (mevcut hesaplamaları korudum) ----------
    pnl_list = [t.get('pnlPercentage', 0) for t in trades if 'pnlPercentage' in t]
    wins = [p for p in pnl_list if p > 0]
    losses = [p for p in pnl_list if p < 0]
    most_win = max(wins) if wins else 0
    most_loss = min(losses) if losses else 0
    winRate = (
        100 if wins and not losses else
        0 if losses and not wins else
        round(len(wins) / (len(wins) + len(losses)) * 100, 2) if wins or losses else 0
    )

    max_drawdown = 0.0
    peak = balances[0][1]
    for _, b in balances:
        if b > peak:
            peak = b
        dd = (peak - b) / peak if peak != 0 else 0.0
        if dd > max_drawdown:
            max_drawdown = dd

    if len(returns) > 1:
        return_values = [r[1] / 100 for r in returns]
        mean_return = sum(return_values) / len(return_values)
        daily_risk_free = (1 + risk_free_rate) ** (1 / 365) - 1
        if len(return_values) > 1:
            variance = sum((r - mean_return) ** 2 for r in return_values) / (len(return_values) - 1)
            std_dev = variance ** 0.5
            sharpe_ratio = (mean_return - daily_risk_free) / std_dev if std_dev > 0 else 0
        else:
            sharpe_ratio = 0
    else:
        sharpe_ratio = 0

    if len(returns) > 1:
        return_values = [r[1] / 100 for r in returns]
        mean_return = sum(return_values) / len(return_values)
        daily_risk_free = (1 + risk_free_rate) ** (1 / 365) - 1
        negative_returns = [r for r in return_values if r < 0]
        if len(negative_returns) > 1:
            downside_variance = sum((r - 0) ** 2 for r in negative_returns) / len(negative_returns)
            downside_deviation = downside_variance ** 0.5
            sortino_ratio = (mean_return - daily_risk_free) / downside_deviation if downside_deviation > 0 else 0
        else:
            sortino_ratio = sharpe_ratio
    else:
        sortino_ratio = 0

    total_period_seconds = (df['timestamp'].iloc[-1] - df['timestamp'].iloc[0]).total_seconds()

    duration_ratio = (time_in_trade_seconds / total_period_seconds) if total_period_seconds > 0 else 0.0
    log(f"Total time in trade: {time_in_trade_seconds,total_period_seconds} seconds, duration ratio: {duration_ratio:.4f}")

    buy_hold_return = ((last_close / first_close) - 1.0) * 100.0 if first_close > 0 else 0.0

    return {
        "chartData": [{"time": t, "value": round(b, 2)} for t, b in balances],
        "performance": {
            "returnPercentage": round((balance - initial_balance) / initial_balance * 100, 2),
            "totalPnL": round(balance - initial_balance, 2),
            "totalTrades": len([t for t in trades if 'CLOSE' in t['type']]),
            "winningTrades": len(wins),
            "losingTrades": len(losses),
            "winRate": round(winRate, 2),
            "initialBalance": round(initial_balance, 2),
            "finalBalance": round(balance, 2),
            "maxDrawdown": round(-max_drawdown * 100, 2),
            "sharpeRatio": round(sharpe_ratio, 3),
            "profitFactor": round(sum(wins) / abs(sum(losses)), 2) if losses else None,
            "buyHoldReturn": round(buy_hold_return, 2),
            "sortinoRatio": round(sortino_ratio, 3),
            "mostProfitableTrade": round(most_win, 2),
            "mostLosingTrade": round(most_loss, 2),
            "durationOftradeRatio": round(duration_ratio, 4),
            "commissionCost": round(commission_paid_total, 2),
            "volume": round(total_volume, 2)
        },
        "trades": trades[::-1],
        "returns": returns
    }
