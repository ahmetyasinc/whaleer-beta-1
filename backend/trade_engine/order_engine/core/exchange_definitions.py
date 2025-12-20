from abc import ABC, abstractmethod
from typing import Dict, Any, Tuple, List, Optional
import logging

logger = logging.getLogger("ExchangeDefinitions")

class BaseExchangeDefinition(ABC):
    """
    Her borsa tanımı için temel şablon.
    """
    @abstractmethod
    def prepare_request(self, req, formatted_price: str, formatted_qty: str,client_order_id: str = None) -> Tuple[str, Dict[str, Any]]:
        pass

    def _apply_rules(self, params: Dict, required: List[str], forbidden: List[str], optional: Dict[str, Any]):
        """
        Zorunlu, Yasaklı ve Opsiyonel alanları denetleyen ve temizleyen motor.
        """
        # 1. Yasaklıları Temizle
        for key in forbidden:
            if key in params:
                del params[key]

        # 2. Opsiyonelleri Ekle
        for api_key, value in optional.items():
            if value is not None:
                params[api_key] = value

        # 3. Zorunluları Kontrol Et
        missing = [key for key in required if key not in params or params[key] is None]
        if missing:
            raise ValueError(f"Eksik Zorunlu Parametreler: {missing}")
            
        return params

# ==============================================================================
# 1. BINANCE SPOT TANIMLARI
# ==============================================================================
class BinanceSpotDefinition(BaseExchangeDefinition):
    
    def prepare_request(self, req, formatted_price: str, formatted_qty: str,client_order_id: str = None) -> Tuple[str, Dict[str, Any]]:
        
        # Endpoint: Spot API v3
        endpoint = "/order" 
        order_type = req.order_type.upper()
        
        base_params = {
            "symbol": req.symbol,
            "side": req.side.upper(),
            "quantity": formatted_qty,
        }

        if client_order_id:
            base_params["newClientOrderId"] = client_order_id

        # Güvenli erişimler
        stop_limit_price = getattr(req, 'stop_limit_price', None)
        iceberg_qty = getattr(req, 'iceberg_qty', None)
        list_client_order_id = getattr(req, 'list_client_order_id', None)

        # --- A) LIMIT ---
        if order_type == "LIMIT":
            base_params["type"] = "LIMIT"
            self._apply_rules(
                params=base_params,
                required=["price", "timeInForce"],
                forbidden=["stopPrice", "stopLimitPrice"],
                optional={
                    "price": formatted_price,
                    "timeInForce": req.time_in_force or "GTC",
                    "icebergQty": iceberg_qty
                }
            )

        # --- B) MARKET ---
        elif order_type == "MARKET":
            base_params["type"] = "MARKET"
            self._apply_rules(
                params=base_params,
                required=[], 
                forbidden=["price", "stopPrice", "timeInForce", "icebergQty"],
                optional={}
            )

        # --- C) STOP_LOSS (Market) ---
        elif order_type == "STOP_LOSS":
            base_params["type"] = "STOP_LOSS"
            self._apply_rules(
                params=base_params,
                required=["stopPrice"],
                forbidden=["price"],
                optional={
                    "stopPrice": str(req.stop_price) if req.stop_price else None
                }
            )

        # --- D) STOP_LOSS_LIMIT ---
        elif order_type == "STOP_LOSS_LIMIT":
            base_params["type"] = "STOP_LOSS_LIMIT"
            self._apply_rules(
                params=base_params,
                required=["price", "stopPrice", "timeInForce"],
                forbidden=[],
                optional={
                    "price": formatted_price,
                    "stopPrice": str(req.stop_price) if req.stop_price else None,
                    "timeInForce": req.time_in_force or "GTC"
                }
            )

        # --- E) TAKE_PROFIT (Market) ---
        elif order_type == "TAKE_PROFIT":
            base_params["type"] = "TAKE_PROFIT"
            self._apply_rules(
                params=base_params,
                required=["stopPrice"],
                forbidden=["price"],
                optional={
                    "stopPrice": str(req.stop_price) if req.stop_price else None
                }
            )

        # --- F) TAKE_PROFIT_LIMIT ---
        elif order_type == "TAKE_PROFIT_LIMIT":
            base_params["type"] = "TAKE_PROFIT_LIMIT"
            self._apply_rules(
                params=base_params,
                required=["price", "stopPrice", "timeInForce"],
                forbidden=[],
                optional={
                    "price": formatted_price,
                    "stopPrice": str(req.stop_price) if req.stop_price else None,
                    "timeInForce": req.time_in_force or "GTC"
                }
            )
            
        # --- G) LIMIT_MAKER ---
        elif order_type == "LIMIT_MAKER":
            base_params["type"] = "LIMIT_MAKER"
            self._apply_rules(
                params=base_params,
                required=["price"],
                forbidden=["timeInForce"],
                optional={
                    "price": formatted_price
                }
            )

        # --- H) OCO ---
        elif order_type == "OCO":
            endpoint = "/order/oco"
            self._apply_rules(
                params=base_params,
                required=["price", "stopPrice"],
                forbidden=["type"],
                optional={
                    "price": formatted_price,
                    "stopPrice": str(req.stop_price) if req.stop_price else None,
                    "stopLimitPrice": str(stop_limit_price or req.stop_price) if stop_limit_price or req.stop_price else None,
                    "stopLimitTimeInForce": "GTC",
                    "listClientOrderId": list_client_order_id
                }
            )

        else:
            raise ValueError(f"Binance Spot için desteklenmeyen emir tipi: {order_type}")

        return endpoint, base_params


# ==============================================================================
# 2. BINANCE FUTURES TANIMLARI
# ==============================================================================
class BinanceFuturesDefinition(BaseExchangeDefinition):
    
    def prepare_request(self, req, formatted_price: str, formatted_qty: str,client_order_id: str = None) -> Tuple[str, Dict[str, Any]]:
        
        # Endpoint: Futures API v1
        endpoint = "/order"
        order_type = req.order_type.upper()
        
        # Pozisyon Yönü ve ReduceOnly Mantığı
        p_side = getattr(req, "position_side", None)
        if not p_side:
            p_side = "BOTH" # One-Way Mode varsayılanı
        
        base_params = {
            "symbol": req.symbol,
            "side": req.side.upper(),
            "quantity": formatted_qty,
            "positionSide": p_side.upper()
        }

        if client_order_id:
                base_params["clientAlgoId"] = client_order_id

        # GÜNCELLEME: ReduceOnly sadece One-Way Mode (BOTH) ise gönderilmelidir.
        # Hedge Mode'da (LONG/SHORT) pozisyon kapatmak için ters işlem açılır.
        if req.reduce_only and p_side.upper() == "BOTH":
            base_params["reduceOnly"] = "true"

        # GÜNCELLEME: Working Type (MARK_PRICE veya CONTRACT_PRICE)
        # Varsayılan CONTRACT_PRICE (Son Fiyat), ancak req içinde varsa onu kullan.
        working_type = getattr(req, "working_type", "CONTRACT_PRICE")

        # --- A) LIMIT ---
        if order_type == "LIMIT":
            base_params["type"] = "LIMIT"
            self._apply_rules(
                params=base_params,
                required=["price", "timeInForce"],
                forbidden=["stopPrice", "callbackRate"],
                optional={
                    "price": formatted_price,
                    "timeInForce": req.time_in_force or "GTC"
                }
            )

        # --- B) MARKET ---
        elif order_type == "MARKET":
            base_params["type"] = "MARKET"
            self._apply_rules(
                params=base_params,
                required=[],
                forbidden=["price", "stopPrice", "timeInForce"],
                optional={}
            )

        # --- C) ALGO / KOŞULLU EMİRLER (STOP, TP vb.) ---
        elif order_type in ["STOP", "STOP_LIMIT", "TAKE_PROFIT", "TAKE_PROFIT_LIMIT", "STOP_MARKET", "TAKE_PROFIT_MARKET"]:
            
            # 1. ENDPOINT GÜNCELLEMESİ
            endpoint = "/algoOrder"
            base_params["algoType"] = "CONDITIONAL"

            # 2. TİP EŞLEMESİ (Mapping)
            # Bizim sistemdeki "STOP_LIMIT" -> Binance'in dilinde "STOP" (+ fiyat)
            if "STOP" in order_type:
                base_params["type"] = "STOP_MARKET" if "MARKET" in order_type else "STOP"
            elif "PROFIT" in order_type:
                base_params["type"] = "TAKE_PROFIT_MARKET" if "MARKET" in order_type else "TAKE_PROFIT"

            # 3. PARAMETRE ADI EŞLEMESİ (Mapping: Old -> New)
            # req.stop_price verisini alıyoruz (Bu veri JSON'dan stopPrice veya triggerPrice olarak gelmiş olabilir)
            trigger_val = str(req.stop_price) if req.stop_price else None

            # 4. Limit/Market Ayrımı
            is_market = "MARKET" in base_params["type"]
            
            # 5. KURALLAR: ESKİYİ YASAKLA, YENİYİ GÖNDER
            self._apply_rules(
                params=base_params,
                # Yeni parametre adı: triggerPrice (Zorunlu)
                required=["triggerPrice"] if is_market else ["triggerPrice", "price"],
                
                # Eski parametre adı: stopPrice (YASAK - API hata verir)
                forbidden=["stopPrice", "callbackRate"] + (["price"] if is_market else []),
                
                optional={
                    "price": formatted_price if not is_market else None,
                    
                    # KRİTİK NOKTA: Veriyi 'triggerPrice' anahtarına atıyoruz
                    "triggerPrice": trigger_val,
                    
                    "timeInForce": req.time_in_force or "GTC",
                    "workingType": working_type 
                }
            )

        else:
            raise ValueError(f"Binance Futures için desteklenmeyen emir tipi: {order_type}")

        return endpoint, base_params

# ==============================================================================
# 3. FABRİKA (FACTORY)
# ==============================================================================
class ExchangeDefinitionFactory:
    _definitions = {
        ("binance", "spot"): BinanceSpotDefinition(),
        ("binance", "futures"): BinanceFuturesDefinition(),
    }

    @classmethod
    def get_definition(cls, exchange_name: str, trade_type: str) -> BaseExchangeDefinition:
        normalized_type = "futures" if "futures" in trade_type.lower() else "spot"
        key = (exchange_name.lower(), normalized_type)
        
        definition = cls._definitions.get(key)
        if definition:
            return definition
        raise ValueError(f"Tanım bulunamadı: {exchange_name} {normalized_type}")