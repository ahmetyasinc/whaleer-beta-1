import logging
from decimal import Decimal, ROUND_DOWN, ROUND_FLOOR, Context
from typing import Dict, Any, Optional, Tuple

logger = logging.getLogger(__name__)

class OrderNormalizer:
    """
    Gelen ham emir verilerini borsa kurallarına (Filters) göre 
    işleyen ve temizleyen matematiksel katman.
    """

    @staticmethod
    def _get_decimal_places(value: float) -> int:
        try:
            d = Decimal(str(value)).normalize()
            return abs(d.as_tuple().exponent)
        except:
            return 8

    @staticmethod
    def round_step_size(quantity: Decimal, step_size: Decimal) -> Decimal:
        if step_size == 0: return quantity
        precision = Decimal(str(step_size)).normalize()
        return (quantity // precision) * precision

    @staticmethod
    def round_tick_size(price: Decimal, tick_size: Decimal) -> Decimal:
        if tick_size == 0: return price
        precision = Decimal(str(tick_size)).normalize()
        return (price // precision) * precision

    @classmethod
    def normalize_order(cls, 
                        order: Dict[str, Any], 
                        filters: Dict[str, Any], 
                        current_price: float) -> Optional[Dict[str, Any]]:
        """
        Tek bir emri alır, hesaplar ve API'ye hazır hale getirir.
        """
        try:
            symbol = order.get("coin_id")
            trade_type = order.get("trade_type", "spot")
            
            # 1. Filtreyi Bul
            symbol_filters = filters.get(symbol, {})
            market_type = "futures" if "futures" in trade_type else "spot"
            selected_filter = symbol_filters.get(market_type)

            if not selected_filter:
                logger.error(f"❌ {symbol} için {market_type} filtresi bulunamadı.")
                selected_filter = {"step_size": "0.00001", "tick_size": "0.01", "min_qty": "0.00001"}

            step_size = Decimal(str(selected_filter["step_size"]))
            tick_size = Decimal(str(selected_filter["tick_size"]))
            min_qty = Decimal(str(selected_filter["min_qty"]))
            
            # 🔥 GÜNCELLEME BURADA YAPILDI 🔥
            cur_price_d = Decimal(str(current_price))
            if cur_price_d <= 0:
                 logger.warning(f"⚠️ {symbol} Geçersiz fiyat: {cur_price_d}, işlem riskli.")

            # Öncelik: Explicit Amount (Tam kapatma için)
            explicit_amount = order.get("amount")
            
            if explicit_amount is not None:
                # Tam Miktar -> En yakın step'e yuvarla (Örn: 0.16999998 -> 0.17)
                raw_qty = Decimal(str(explicit_amount))
                # Quantize ile ROUND_HALF_UP yapıyoruz
                # Ancak quantize exponent bekler, bizim elimizde step_size (örn: 0.01) var.
                # O yüzden round_step_size modifiye edilmeli veya burada özel işlem yapılmalı.
                
                # Pratik çözüm: Decimal'in quantize metodunu kullanmak için step_size'ın exponent'ini alıyoruz.
                if step_size > 0:
                     q = raw_qty.quantize(step_size, rounding='ROUND_HALF_UP')
                     final_qty = q
                else:
                     final_qty = raw_qty
            else:
                # Fallback: Value / Price -> Aşağı yuvarla (Güvenli alım)
                val_usd = Decimal(str(order.get("value", 0)))
                raw_qty = val_usd / cur_price_d
                final_qty = cls.round_step_size(raw_qty, step_size) # Default: FLOOR

            # Min Qty Kontrolü
            if final_qty < min_qty:
                logger.warning(f"⚠️ {symbol} Hesaplanan miktar ({final_qty}) min_qty ({min_qty}) altında.")
                return None

            # 3. Fiyat Formatlama
            formatted_price = None
            if order.get("price"):
                formatted_price = str(cls.round_tick_size(Decimal(str(order["price"])), tick_size))
            
            formatted_stop = None
            if order.get("stopPrice"):
                formatted_stop = str(cls.round_tick_size(Decimal(str(order["stopPrice"])), tick_size))

            # 4. Çıktı Parametrelerini Hazırla
            normalized_params = {
                "symbol": symbol,
                "side": order.get("side", "").upper(),
                "type": order.get("order_type", "MARKET").upper(),
                "quantity": f"{final_qty:f}",
            }

            if formatted_price: normalized_params["price"] = formatted_price
            if formatted_stop: normalized_params["stopPrice"] = formatted_stop
            
            if normalized_params["type"] == "LIMIT":
                normalized_params["timeInForce"] = order.get("timeInForce", "GTC")

            # Metadata
            metadata = {
                "original_order": order,
                "calculated_qty": float(final_qty),
                "leverage": int(order.get("leverage", 1)) if market_type == "futures" else 1,
                "market_type": market_type,
                # Not: positionSide artık ExchangeDefinition tarafından yönetiliyor, burada sadece bilgi amaçlı durabilir.
            }

            return {
                "api_params": normalized_params,
                "metadata": metadata
            }

        except Exception as e:
            logger.error(f"❌ {order.get('coin_id')} Normalizasyon Hatası: {e}")
            return None