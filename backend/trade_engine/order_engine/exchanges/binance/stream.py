import asyncio
import json
import websockets
import time
from backend.trade_engine.order_engine.core.price_store import price_store, PriceTicker

class BinanceStreamer:
    def __init__(self, spot_symbols: list = None, futures_symbols: list = None):
        """
        Hem Spot hem Futures sembollerini ayrı listeler olarak alır.
        Örnek:
        spot_symbols=['BTCUSDT', 'ETHUSDT']
        futures_symbols=['BTCUSDT', 'ETHUSDT']
        """
        self.spot_symbols = [s.lower() for s in (spot_symbols or [])]
        self.futures_symbols = [s.lower() for s in (futures_symbols or [])]
        
        self.running = False

        # --- URL TANIMLAMALARI ---
        self.SPOT_WS_URL = "wss://stream.binance.com:9443/ws"
        self.FUTURES_WS_URL = "wss://fstream.binance.com/ws"
        
        # --- MARGIN NOTU ---
        # Margin işlemleri (Isolated/Cross) Binance'de SPOT piyasa likiditesini kullanır.
        # Yani Margin için ayrı bir WebSocket bağlantısına gerek yoktur.
        # Spot verisini 'BINANCE_MARGIN' etiketiyle kullanmak isterseniz,
        # Spot verisi geldiğinde duplicate edebilirsiniz.
        
    async def start(self):
        """Tüm bağlantıları asenkron olarak başlatır."""
        self.running = True
        tasks = []

        # Spot Socket Başlat (Eğer sembol varsa)
        if self.spot_symbols:
            spot_stream_url = self._create_url(self.SPOT_WS_URL, self.spot_symbols)
            tasks.append(self._connect_socket(spot_stream_url, "SPOT"))

        # Futures Socket Başlat (Eğer sembol varsa)
        if self.futures_symbols:
            futures_stream_url = self._create_url(self.FUTURES_WS_URL, self.futures_symbols)
            tasks.append(self._connect_socket(futures_stream_url, "FUTURES"))

        # Hepsini aynı anda çalıştır
        print(f"🚀 Binance Streamer Başlatılıyor... (Spot: {len(self.spot_symbols)}, Futures: {len(self.futures_symbols)})")
        await asyncio.gather(*tasks)

    def _create_url(self, base_url, symbols):
        """API için stream URL'ini oluşturur."""
        streams = "/".join([f"{s}@bookTicker" for s in symbols])
        return f"{base_url}/{streams}"

    async def _connect_socket(self, url, market_type):
        """
        Generic Socket Bağlantı Yöneticisi.
        market_type: 'SPOT' veya 'FUTURES'
        """
        print(f"🔌 Binance {market_type} bağlanıyor...")
        
        while self.running:
            try:
                async with websockets.connect(url) as ws:
                    print(f"✅ Binance {market_type} Bağlandı!")
                    
                    while self.running:
                        message = await ws.recv()
                        self._process_message(message, market_type)
                        
            except Exception as e:
                print(f"⚠️ Binance {market_type} Hatası: {e}. 5sn bekliyor...")
                await asyncio.sleep(5)

    def _process_message(self, message, market_type):
        """Gelen veriyi parse eder ve RAM'e (PriceStore) yazar."""
        try:
            data = json.loads(message)
            
            # Veri formatı (Spot ve Futures bookTicker yapısı aynıdır):
            # s: Symbol, b: Best Bid, a: Best Ask
            if 's' in data:
                symbol = data['s']
                bid = float(data['b'])
                ask = float(data['a'])
                
                ticker = PriceTicker(
                    bid=bid,
                    ask=ask,
                    last=(bid + ask) / 2,
                    timestamp=time.time()
                )

                # RAM'DEKİ ETİKETLEME ÖNEMLİ:
                # Spot verisini -> "BINANCE_SPOT" altında
                # Futures verisini -> "BINANCE_FUTURES" altında saklıyoruz.
                exchange_key = f"BINANCE_{market_type}"
                
                price_store.update_price(exchange_key, symbol, ticker)

                # --- MARGIN NOTU UYGULAMASI ---
                # Eğer margin trade yapacaksak ve kodu ayrıştırmak istiyorsak
                # Spot verisini aynı zamanda margin olarak da kaydedebiliriz:
                # if market_type == "SPOT":
                #     price_store.update_price("BINANCE_MARGIN", symbol, ticker)

        except Exception as e:
            pass # Hızlı akışta log kirliliği yapmaması için pass geçilebilir veya loglanabilir.

    def stop(self):
        self.running = False