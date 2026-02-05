/*

//-------------ŞUAN RASGELE VERİ KULLANIYORUZ BUNUN YERİNE API ÇEKİLECEK AŞAĞIDAKİ KODU KULLAN AGA----------//

import { create } from 'zustand';

export const useBotCardStore = create((set) => ({
    bots: [],
    isLoading: false,
    error: null,

    fetchBots: async () => {
        set({ isLoading: true, error: null });
        try {
            // Backend endpointİ
            const response = await fetch('https://api.seninsiten.com/v1/bots'); 
            if (!response.ok) {
                throw new Error(`HTTP hata! durum: ${response.status}`);
            }
            const data = await response.json();
            
            // Eğer backend veriyi direkt dizi olarak değil de 
            // { data: [...] } şeklinde dönüyorsa set({ bots: data.data }) yapmalısın.
            set({ bots: data, isLoading: false }); 
        } catch (error) {
            console.error("Botlar yüklenirken hata:", error);
            set({ error: error.message, isLoading: false });
        }
    },
}));


//-----------------JSON VERİSİ İLE KULLANIM-------------------------------------------------------//

[
  {
    "id": "1",
    "name": "Alpha Trend Pro",
    "publisher": "CryptoWizard",
    "type": "SPOT",
    "powerScore": 85,
    "usageTime": 1250,
    "saleCount": 42,
    "rentalCount": 156,
    "createdAt": "2024-03-15T10:30:00Z",
    "isForSale": true,
    "isForRent": true,
    "salePrice": 499.00,
    "rentalPrice": 49.00,
    "isMine": false,
    "alreadyPurchased": false,
    "alreadyRented": false,
    "profitMargin": {
      "day": 1.25,
      "week": 8.40,
      "month": 22.15,
      "all": 115.50
    }
  }
]

*/
//--------------------BU KODLAR TAMAMEN SİLİNEBİLİR APİ BAĞLANTISI SONRASI---------------------------------

import { create } from 'zustand';

// Mevcut rastgele veri üretme yardımcılarınız (prefix, types, vb.)
const prefixes = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Omega', 'Prime', 'Ultra', 'Mega', 'Quantum', 'Neural', 'Titan', 'Flux'];
const typesArr = ['Trend', 'Scalper', 'Grid', 'Arbitrage', 'Momentum', 'Swing', 'HFT', 'AI', 'Sniper', 'Algo'];
const suffixes = ['Master', 'Pro', 'Bot', 'X', 'Trader', 'Wizard', 'King', 'V2', 'Elite', 'Max', 'Plus', 'Ultimate'];
const publishers = ['CryptoWizard', 'TradingBotX', 'WhaleHunter', 'SatoshiNakamoto', 'BullRun', 'BearMarket', 'HODLer', 'MoonBoy', 'DefiDegens', 'ChartArtist'];

const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomFloat = (min, max) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];

// Gerçek bot verilerini üreten fonksiyon
const generateBots = () => {
    try {
        const count = getRandomInt(6, 12); // Test için 6-12 arası bot
        const bots = [];
        for (let i = 1; i <= count; i++) {
            const isMine = Math.random() < 0.2;
            bots.push({
                id: Math.random().toString(36).substr(2, 9),
                name: `${getRandomItem(prefixes)} ${getRandomItem(typesArr)} ${getRandomItem(suffixes)}`,
                publisher: isMine ? 'Me' : getRandomItem(publishers),
                profitMargin: {
                    day: getRandomFloat(-5, 25),
                    week: getRandomFloat(-10, 60),
                    month: getRandomFloat(10, 150),
                    all: getRandomFloat(50, 500)
                },
                salePrice: getRandomInt(99, 1999),
                rentalPrice: getRandomInt(19, 299),
                powerScore: getRandomInt(0, 100),
                usageTime: getRandomInt(700, 8000),
                createdAt: new Date(Date.now() - getRandomInt(100000000, 31536000000)).toISOString(),
                saleCount: getRandomInt(5, 1000),
                rentalCount: getRandomInt(20, 5000),
                type: Math.random() > 0.5 ? 'SPOT' : 'FUTURES',
                isForSale: Math.random() > 0.4,
                isForRent: Math.random() > 0.4,
                isMine: isMine,
                alreadyPurchased: !isMine && Math.random() < 0.1,
                alreadyRented: !isMine && Math.random() < 0.1
            });
        }
        return bots;
    } catch (e) {
        console.error("Veri üretme hatası:", e);
        return []; // Hata anında boş dizi dön ki uygulama çökmesin
    }
};

// --- STORE TANIMI ---
export const useBotCardStore = create((set) => ({
    bots: [],          // Başlangıçta boş (Spinner'ı görebilmek için)
    isLoading: false,  // Yüklenme durumu
    error: null,       // Hata durumu

    // Backend varmış gibi davranan fonksiyon
    fetchBots: async () => {
        // 1. Yükleniyor durumunu başlat
        set({ isLoading: true, error: null });

        try {
            // 3. Veriyi üret (Sanki API'den geldi)
            const mockData = generateBots();

            // 4. State'i güncelle
            set({ bots: mockData, isLoading: false });
        } catch (err) {
            set({ error: "Botlar yüklenirken bir hata oluştu.", isLoading: false });
        }
    },

    // Manuel güncelleme gerekirse diye
    setBots: (bots) => set({ bots }),
}));


//0537 336 70 51