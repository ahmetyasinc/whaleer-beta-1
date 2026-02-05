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
            // Haftalık - Saatlik veri (son 7 gün, her saat)
            weekly: [
                { time: 1709542800, value: 12800 }, // 2024-03-04 09:00
                { time: 1709546400, value: 12820 }, // 10:00
                { time: 1709550000, value: 12780 }, // 11:00
                { time: 1709553600, value: 12850 }, // 12:00
                { time: 1709557200, value: 12890 }, // 13:00
                { time: 1709560800, value: 12920 }, // 14:00
                { time: 1709564400, value: 12880 }, // 15:00
                { time: 1709568000, value: 12950 }, // 16:00
                { time: 1709629200, value: 12980 }, // 2024-03-05 09:00
                { time: 1709632800, value: 13020 }, // 10:00
                { time: 1709636400, value: 12990 }, // 11:00
                { time: 1709640000, value: 13050 }, // 12:00
                { time: 1709643600, value: 13080 }, // 13:00
                { time: 1709647200, value: 13020 }, // 14:00
                { time: 1709650800, value: 13100 }, // 15:00
                { time: 1709654400, value: 13150 }, // 16:00
                { time: 1709715600, value: 13120 }, // 2024-03-06 09:00
                { time: 1709719200, value: 13180 }, // 10:00
                { time: 1709722800, value: 13200 }, // 11:00
                { time: 1709726400, value: 13250 }, // 12:00
            ],
            // Aylık - 4 Saatlik veri (son 30 gün)
            monthly: [
                { time: 1707552000, value: 11380 }, // 2024-02-10 12:00
                { time: 1707566400, value: 11420 }, // 16:00
                { time: 1707638400, value: 11480 }, // 2024-02-11 12:00
                { time: 1707652800, value: 11520 }, // 16:00
                { time: 1707724800, value: 11580 }, // 2024-02-12 12:00
                { time: 1707811200, value: 11650 }, // 2024-02-13 12:00
                { time: 1707897600, value: 11720 }, // 2024-02-14 12:00
                { time: 1707984000, value: 11800 }, // 2024-02-15 12:00
                { time: 1708070400, value: 11870 }, // 2024-02-16 12:00
                { time: 1708156800, value: 11950 }, // 2024-02-17 12:00
                { time: 1708243200, value: 12020 }, // 2024-02-18 12:00
                { time: 1708329600, value: 12100 }, // 2024-02-19 12:00
                { time: 1708416000, value: 12180 }, // 2024-02-20 12:00
                { time: 1708502400, value: 12250 }, // 2024-02-21 12:00
                { time: 1708588800, value: 12320 }, // 2024-02-22 12:00
                { time: 1708675200, value: 12400 }, // 2024-02-23 12:00
                { time: 1708761600, value: 12480 }, // 2024-02-24 12:00
                { time: 1708848000, value: 12550 }, // 2024-02-25 12:00
                { time: 1708934400, value: 12620 }, // 2024-02-26 12:00
                { time: 1709020800, value: 12700 }, // 2024-02-27 12:00
                { time: 1709107200, value: 12780 }, // 2024-02-28 12:00
                { time: 1709193600, value: 12850 }, // 2024-02-29 12:00
                { time: 1709280000, value: 12920 }, // 2024-03-01 12:00
                { time: 1709366400, value: 13000 }, // 2024-03-02 12:00
                { time: 1709452800, value: 13080 }, // 2024-03-03 12:00
                { time: 1709539200, value: 13150 }, // 2024-03-04 12:00
                { time: 1709625600, value: 13220 }, // 2024-03-05 12:00
                { time: 1709712000, value: 13250 }, // 2024-03-06 12:00
            ],
            // 6 Aylık - Günlük veri
            sixMonths: [
                { time: '2023-09-10', value: 7800 },
                { time: '2023-09-15', value: 7950 },
                { time: '2023-09-20', value: 8100 },
                { time: '2023-09-25', value: 8250 },
                { time: '2023-10-01', value: 8500 },
                { time: '2023-10-05', value: 8620 },
                { time: '2023-10-10', value: 8700 },
                { time: '2023-10-15', value: 8750 },
                { time: '2023-10-20', value: 8850 },
                { time: '2023-10-25', value: 8950 },
                { time: '2023-11-01', value: 9100 },
                { time: '2023-11-05', value: 9180 },
                { time: '2023-11-10', value: 9250 },
                { time: '2023-11-15', value: 9350 },
                { time: '2023-11-20', value: 9450 },
                { time: '2023-11-25', value: 9520 },
                { time: '2023-12-01', value: 9600 },
                { time: '2023-12-05', value: 9680 },
                { time: '2023-12-10', value: 9750 },
                { time: '2023-12-15', value: 9850 },
                { time: '2023-12-20', value: 9920 },
                { time: '2023-12-25', value: 9980 },
                { time: '2024-01-01', value: 10000 },
                { time: '2024-01-05', value: 10150 },
                { time: '2024-01-10', value: 10300 },
                { time: '2024-01-15', value: 10520 },
                { time: '2024-01-20', value: 10680 },
                { time: '2024-01-25', value: 10850 },
                { time: '2024-02-01', value: 11200 },
                { time: '2024-02-05', value: 11350 },
                { time: '2024-02-10', value: 11500 },
                { time: '2024-02-15', value: 11820 },
                { time: '2024-02-20', value: 12000 },
                { time: '2024-02-25', value: 12200 },
                { time: '2024-03-01', value: 12350 },
                { time: '2024-03-05', value: 12800 },
                { time: '2024-03-10', value: 13250 },
            ],
            // Tüm Zamanlar
            all: [
                { time: '2023-06-01', value: 5000 },
                { time: '2023-07-01', value: 5800 },
                { time: '2023-08-01', value: 6500 },
                { time: '2023-09-01', value: 7200 },
                { time: '2023-10-01', value: 8500 },
                { time: '2023-11-01', value: 9100 },
                { time: '2023-12-01', value: 9600 },
                { time: '2024-01-01', value: 10000 },
                { time: '2024-02-01', value: 11200 },
                { time: '2024-03-01', value: 12350 },
                { time: '2024-03-10', value: 13250 },
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
