from collections import defaultdict
from backend.trade_engine.data.bot_features import load_bot_context

def control_the_results(bot_id, results, min_usd=10.0, ctx=None):
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

    # USD eşiğini fraction
    min_frac = (min_usd / current_value) if current_value > 0 else float("inf")

    # ---------- mevcutı haritalama ----------
    holding_map = {
        h["symbol"]: {
            "spot_pct": clamp_pct((h.get("percentage") or 0.0)),
            "spot_amount": float(h.get("amount") or 0.0),
        }
        for h in holdings
    }

    pos_map = {}  # {sym: {"long_pct":..,"long_amount":..,"long_lev":..,"short_pct":..,"short_amount":..,"short_lev":..}}
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
    targets = {}  # {symbol: {"spot": pct, "long": {"pct":..,"lev":..}, "short": {"pct":..,"lev":..}, "meta": {...}}}

    for res in (results or []):
        lp = res.get("last_positions")
        lper = res.get("last_percentage")
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
                t["spot"] = max(0.0, curr_pos * curr_per)
        else:  # futures
            if state == "long":
                t["long"]["pct"] = curr_per
                t["long"]["lev"] = curr_pos
            elif state == "short":
                t["short"]["pct"] = curr_per
                t["short"]["lev"] = curr_pos

    actions = []

    # Leverage değişimi kapatması min_usd’a takılırsa ilgili bacağı açmayı engellemek için:
    blocked_open = defaultdict(lambda: {"long": False, "short": False})

    def maybe_append(act, frac):
        """Emri uygunsa ekle ve True döndür; değilse False."""
        if frac <= 0:
            return False
        if frac < min_frac:
            # print("Minimum şartı sağlanmadı:", act, "frac=", frac)
            return False
        usd = current_value * frac
        a = act.copy()
        a["value"] = usd
        actions.append(a)
        return True

    # ---------- 1) REDUCE/CLOSE ----------
    if bot_type == "spot":
        for sym, tgt in targets.items():
            meta = tgt["meta"]
            cur = holding_map.get(sym, {"spot_pct": 0.0, "spot_amount": 0.0})

            delta_spot = (tgt["spot"] - cur["spot_pct"]) / 100.0
            if delta_spot < 0:
                reduce_frac = -delta_spot
                act = {"coin_id": sym, "trade_type": "spot", "side": "sell", **meta}
                if cur["spot_amount"] > 0:
                    act["amount"] = (cur["spot_amount"] * reduce_frac /
                                     (cur["spot_pct"] / 100.0)) if cur["spot_pct"] else cur["spot_amount"]
                ok = maybe_append(act, reduce_frac)
                if ok:
                    # Kapama gerçekleştiyse fulness ve mevcut yüzdeleri güncelle
                    fulness = max(0.0, fulness - reduce_frac)
                    cur["spot_pct"] = max(0.0, cur["spot_pct"] - reduce_frac * 100.0)

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

            # Leverage mismatch → önce FULL CLOSE dene
            if cur_pct > 0 and target_pct > 0 and (cur_lev is not None and target_lev is not None) and (cur_lev != target_lev):
                reduce_frac = cur_pct / 100.0
                act = {"coin_id": sym, "trade_type": "futures", "positionside": "long", "side": "sell", "reduceOnly": True, **meta}
                if cur["long_amount"] > 0:
                    act["amount"] = cur["long_amount"]  # tam kapat
                ok = maybe_append(act, reduce_frac)
                if ok:
                    fulness = max(0.0, fulness - reduce_frac)
                    cur["long_pct"] = 0.0
                    cur["long_lev"] = None
                    cur_pct = 0.0
                    cur_lev = None
                else:
                    # Kapatma olmadı → bu bacağı açmayı blokla (lev karışmasın)
                    blocked_open[sym]["long"] = True

            # Normal delta azaltma
            delta_long = (target_pct - cur_pct) / 100.0
            if delta_long < 0:
                reduce_frac = -delta_long
                act = {"coin_id": sym, "trade_type": "futures", "positionside": "long", "side": "sell", "reduceOnly": True, **meta}
                if cur["long_amount"] > 0:
                    act["amount"] = (cur["long_amount"] * reduce_frac /
                                     (cur_pct / 100.0)) if cur_pct else cur["long_amount"]
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
                if cur["short_amount"] > 0:
                    act["amount"] = cur["short_amount"]
                ok = maybe_append(act, reduce_frac)
                if ok:
                    fulness = max(0.0, fulness - reduce_frac)
                    cur["short_pct"] = 0.0
                    cur["short_lev"] = None
                    cur_pct = 0.0
                    cur_lev = None
                else:
                    blocked_open[sym]["short"] = True

            delta_short = (target_pct - cur_pct) / 100.0
            if delta_short < 0:
                reduce_frac = -delta_short
                act = {"coin_id": sym, "trade_type": "futures", "positionside": "short", "side": "buy", "reduceOnly": True, **meta}
                if cur["short_amount"] > 0:
                    act["amount"] = (cur["short_amount"] * reduce_frac /
                                     (cur_pct / 100.0)) if cur_pct else cur["short_amount"]
                ok = maybe_append(act, reduce_frac)
                if ok:
                    fulness = max(0.0, fulness - reduce_frac)
                    cur["short_pct"] = max(0.0, cur["short_pct"] - reduce_frac * 100.0)

    # ---------- 2) INCREASE/OPEN ----------
    if bot_type == "spot":
        for sym, tgt in targets.items():
            meta = tgt["meta"]
            cur = holding_map.get(sym, {"spot_pct": 0.0, "spot_amount": 0.0})

            delta_spot = (tgt["spot"] - cur["spot_pct"]) / 100.0
            if delta_spot > 0:
                add_frac = min(delta_spot, max(0.0, 1.0 - fulness))
                if add_frac >= min_frac:
                    act = {"coin_id": sym, "trade_type": "spot", "side": "buy", **meta}
                    ok = maybe_append(act, add_frac)
                    if ok:
                        fulness = min(1.0, fulness + add_frac)
                        cur["spot_pct"] = min(100.0, cur["spot_pct"] + add_frac * 100.0)

    else:
        for sym, tgt in targets.items():
            meta = tgt["meta"]
            cur = pos_map.get(sym, {
                "long_pct": 0.0, "long_amount": 0.0, "long_lev": None,
                "short_pct": 0.0, "short_amount": 0.0, "short_lev": None
            })

            # LONG open (leverage bloğu yoksa)
            if not blocked_open[sym]["long"]:
                target_pct = tgt["long"]["pct"]
                target_lev = tgt["long"]["lev"]
                cur_pct = cur["long_pct"]
                delta_long = (target_pct - cur_pct) / 100.0
                if delta_long > 0:
                    add_frac = min(delta_long, max(0.0, 1.0 - fulness))
                    if add_frac >= min_frac:
                        act = {"coin_id": sym, "trade_type": "futures", "positionside": "long", "side": "buy", **meta}
                        if target_lev is not None:
                            act["leverage"] = target_lev
                        ok = maybe_append(act, add_frac)
                        if ok:
                            fulness = min(1.0, fulness + add_frac)
                            cur["long_pct"] = min(100.0, cur["long_pct"] + add_frac * 100.0)
                            cur["long_lev"] = target_lev if target_lev is not None else cur["long_lev"]

            # SHORT open (leverage bloğu yoksa)
            if not blocked_open[sym]["short"]:
                target_pct = tgt["short"]["pct"]
                target_lev = tgt["short"]["lev"]
                cur_pct = cur["short_pct"]
                delta_short = (target_pct - cur_pct) / 100.0
                if delta_short > 0:
                    add_frac = min(delta_short, max(0.0, 1.0 - fulness))
                    if add_frac >= min_frac:
                        act = {"coin_id": sym, "trade_type": "futures", "positionside": "short", "side": "sell", **meta}
                        if target_lev is not None:
                            act["leverage"] = target_lev
                        ok = maybe_append(act, add_frac)
                        if ok:
                            fulness = min(1.0, fulness + add_frac)
                            cur["short_pct"] = min(100.0, cur["short_pct"] + add_frac * 100.0)
                            cur["short_lev"] = target_lev if target_lev is not None else cur["short_lev"]

    return actions
