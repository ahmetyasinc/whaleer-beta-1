import { create } from 'zustand';

// Mock veri üretme fonksiyonu
const generateExtraData = (botId) => {
  return {
    strategyName: 'Trend Following Pro',
    strategyLines: Math.floor(Math.random() * 500) + 100,
    activeUsers: Math.floor(Math.random() * 5000) + 50,
    totalManagedBalance: Math.floor(Math.random() * 10000000) + 100000,
    period: ['1m', '5m', '15m', '1h', '4h', '1d'][Math.floor(Math.random() * 6)],
    cryptos: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'AVAXUSDT', 'XRPUSDT', 'BNBUSDT'],
    publisherUsername: 'CryptoMaster',
    publisherDescription: `Bu bot, piyasa dinamiklerini analiz ederek optimize edilmiş bir alım-satım stratejisi sunar.Gelişmiş teknik göstergeler ve yapay zeka destekli sinyal üretimi sayesinde yüksek performanslı işlemler gerçekleştirir. Risk yönetimi modülleri ile portföyünüzü koruma altına alır. Öne çıkan özellikler:\n\n• Dinamik pozisyon boyutlandırma    \n• Otomatik stop-loss ve take-profit\n• Çoklu zaman dilimi analizi\n• Gerçek zamanlı piyasa takibi`,
    trades: [
      { id: 1, pair: 'BTCUSDT', market: 'Futures', side: 'LONG', type: 'Limit', action: 'OPEN', price: 42350.50, time: '2024-02-05 12:35:22' },
      { id: 2, pair: 'ETHUSDT', market: 'Futures', side: 'SHORT', type: 'Market', action: 'CLOSE', price: 2250.75, time: '2024-02-05 12:28:15' },
      { id: 3, pair: 'SOLUSDT', market: 'Spot', side: 'BUY', type: 'Market', action: 'OPEN', price: 98.45, time: '2024-02-05 12:15:08' },
      { id: 4, pair: 'AVAXUSDT', market: 'Futures', side: 'SHORT', type: 'Limit', action: 'CLOSE', price: 35.80, time: '2024-02-05 11:58:42' },
      { id: 5, pair: 'BTCUSDT', market: 'Spot', side: 'SELL', type: 'Market', action: 'OPEN', price: 42280.00, time: '2024-02-05 11:45:30' },
      { id: 6, pair: 'ETHUSDT', market: 'Futures', side: 'SHORT', type: 'Market', action: 'OPEN', price: 2230.00, time: '2024-02-05 11:30:15' },
      { id: 7, pair: 'BNBUSDT', market: 'Spot', side: 'BUY', type: 'Limit', action: 'CLOSE', price: 310.25, time: '2024-02-05 11:15:00' },
      { id: 8, pair: 'XRPUSDT', market: 'Futures', side: 'LONG', type: 'Limit', action: 'OPEN', price: 0.52, time: '2024-02-05 11:00:45' },
    ],
    chartDataByPeriod: {
      weekly: [
        { time: 1709542800, value: 12800 },
        { time: 1709546400, value: 12820 },
        { time: 1709550000, value: 12780 },
        { time: 1709553600, value: 12850 },
        { time: 1709557200, value: 12890 }

      ],
      monthly: [
        { time: 1707552000, value: 11380 },
        { time: 1707566400, value: 11420 },
        { time: 1707638400, value: 11480 },
        { time: 1707652800, value: 11520 },
        { time: 1707724800, value: 11580 }
      ],
      sixMonths: [
        { time: '2023-09-10', value: 7800 },
        { time: '2023-09-15', value: 7950 },
        { time: '2023-09-20', value: 8100 },
        { time: '2023-09-25', value: 8250 },
        { time: '2023-10-01', value: 8500 }

      ],
      all: [
        { time: '2023-06-01', value: 5000 },
        { time: '2023-07-01', value: 5800 },
        { time: '2023-08-01', value: 6500 },
        { time: '2023-09-01', value: 7200 },
        { time: '2023-10-01', value: 8500 }
      ]
    }
  };
};

const useBotExamineModalStore = create((set, get) => ({
  extraData: null,
  isLoading: false,
  error: null,

  fetchExtraData: async (botId) => {
    set({ isLoading: true, error: null });

    try {
      // Simüle edilmiş API gecikmesi (kısa)
      await new Promise((resolve) => setTimeout(resolve, 300));

      const data = generateExtraData(botId);
      set({ extraData: data, isLoading: false });
    } catch (error) {
      console.error('Error fetching extra data:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  clearExtraData: () => {
    set({ extraData: null, isLoading: false, error: null });
  }
}));

export default useBotExamineModalStore;



//------------------------------backend json yapısı-----------------------*/
//------------------------------ ikinci vitrin sayfası vakası geliyor -----------------------*/

/*


{
  "strategyName": "Grid Deneme",
  "strategyLines": 342,
  "activeUsers": 1250,
  "totalManagedBalance": 459685,
  "period": "5m",
  "cryptos": ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "XRPUSDT", "BNBUSDT"],
  "publisherUsername": "ahmetyasin",
  "publisherDescription": "Bu bot, piyasa dinamiklerini analiz ederek optimize edilmiş bir alım-satım stratejisi sunar.\n\n• Dinamik pozisyon boyutlandırma\n• Otomatik stop-loss ve take-profit\n• Çoklu zaman dilimi analizi\n• Gerçek zamanlı piyasa takibi",
  "trades": [
    {
      "id": 1,
      "pair": "BTCUSDT",
      "market": "Futures",
      "side": "LONG",
      "type": "Limit",
      "action": "OPEN",
      "price": 42350.50,
      "time": "2024-02-05 12:35:22"
    },
    {
      "id": 2,
        .
        .
    }   
  ],
  "chartDataByPeriod": {
    "weekly": [
      {"time": 1709542800, "value": 12800},
      {"time": 1709546400, "value": 12820}
    ],
    "monthly": [
      {"time": 1707552000, "value": 11380},
      {"time": 1707566400, "value": 11420}
    ],
    "sixMonths": [
      {"time": "2023-09-10", "value": 7800},
      {"time": "2023-09-15", "value": 7950}
    ],
    "all": [
      {"time": "2023-06-01", "value": 5000},
      {"time": "2023-10-01", "value": 8500}
    ]
  }
}

AGA SATIN AL VE KİRALA BUTONLARI DA ŞUAN BOŞ DURUYOR ONLARA DA İŞLEV VERiLMESİ GEREKİYOR 
SHOWCASE BİLEŞENLERİNİN İÇİNDEN BOTMARKET KLASÖRÜNÜN İÇİNE TAŞIDIM DOSYALARI 
PHANTOM CÜZDAN YÖNETİMİ İLE SATIN AL VE KİRALA BUTONLARINA BLOKE KOYMA KODLARINI YORUM SATIRINA ALDIM AYAK BAĞI OLMASIN DİYE, SATIN AL VE KİRALA BUTONLARINI DOLDURUNCA ONU YORUMDAN KALDIRIRSIN /(botmarket)/botCard.js Line: 191-207


*/