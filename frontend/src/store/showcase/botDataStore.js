import { create } from 'zustand';

// Integrated data structure for user and bot information
const integratedData = {
  "1": {
    user: {
      id: "1",
      username: "crypto_master",
      displayName: "Ali Kaan Özdemir",
      description: 'Bot, RSI ve MACD sinyallerini birleştirerek otomatik al-sat işlemleri yapar. Uzun vadede düşük riskli kâr hedeflenmiştir.',
      joinDate: "2021-03-15",
      location: "İstanbul, TR",
      email: "ali.kaan@example.com",
      gsm: "+90 555 111 11 11",
      instagram: "@alikaan",
      linkedin: "linkedin.com/alikaan",
      github: "github.com/alikaan",
      totalFollowers: 2847,
      totalSold: 42,
      totalRented: 169,
      avg_bots_profit_lifetime: 22.1,
      bots_winRate_LifeTime: 23.4,
      allbots: 6,
      bots: [
        {
          id: "bot_59_1",
          name: "Bitcoin Master Bot",
          isActive: true,
          profitRate: "99.4",
          runningTime: 164,
          totalTrades: 1247,
          winRate: "78.5"
        },
        {
          id: "bot_59_2", 
          name: "Altcoin Hunter",
          isActive: false,
          profitRate: "-2.1",
          runningTime: 45,
          totalTrades: 234,
          winRate: "65.2"
        }
      ]
    },
    bot: {
      bot_id: "1",
      name: "Bitcoin Master Bot",
      creator: "Ali Kaan Özdemir",
      profitRate: "24.5",
      startDate: "2024-03-01 / 23.01",
      runningTime: 164,
      winRate: "78.5",
      totalMargin: "99.4",
      dayMargin: "1.4",
      weekMargin: "-8.1",
      monthMargin: "12.4",
      profitFactor: "1.4",
      riskFactor: "0.7",
      totalTrades: 1247,
      dayTrades: 1,
      weekTrades: 5,
      monthTrades: 22,
      strategy: "RSI_MACD_Strategy31",
      soldCount: 2,
      rentedCount: 12,
      avg_fullness: 19,
      for_rent: true,
      for_sale: false,
      rent_price: 10,
      sell_price: 299,
      coins: ["BTC", "ETH", "ADA", "SOL", "DOT"],
      trades: [
        {
          id: "trade_1",
          pair: "BTCUSDT",
          type: "LONG",
          action: "Pozisyon Açıldı",
          time: "14:25",
        },
        {
          id: "trade_2",
          pair: "ETHUSDT", 
          type: "SHORT",
          action: "Pozisyon Kapatıldı",
          time: "13:45",
        },
        {
          id: "trade_3",
          pair: "ADAUSDT",
          type: "LONG",
          action: "Pozisyon Açıldı",
          time: "12:30",
        },
        {
          id: "trade_4",
          pair: "SOLUSDT",
          type: "SHORT",
          action: "Pozisyon Kapatıldı",
          time: "11:15",
        }
      ],
      positions: [
        {
          id: "trade_1",
          pair: "BTCUSDT",
          type: "LONG",
          profit: "2.4"
        },
        {
          id: "trade_2",
          pair: "ETHUSDT", 
          type: "SPOT",
          profit: "-1.2"
        },
        {
          id: "trade_3",
          pair: "ADAUSDT",
          type: "SPOT",
          profit: "3.8"
        },
        {
          id: "trade_4",
          pair: "SOLUSDT",
          type: "SHORT",
          profit: "1.5"
        }
      ]
    },
    chartData: [
      { time: '2024-01-01', value: 10000 },
      { time: '2024-01-02', value: 9864 },
      { time: '2024-01-03', value: 9654 },
      { time: '2024-01-04', value: 9660 },
      { time: '2024-01-05', value: 9600 },
      { time: '2024-01-06', value: 9700 },
      { time: '2024-01-07', value: 9950 },
      { time: '2024-01-08', value: 10100 },
      { time: '2024-01-09', value: 10900 },
      { time: '2024-01-10', value: 11080 },
      { time: '2024-01-11', value: 11400 },
      { time: '2024-01-12', value: 11650 },
      { time: '2024-01-13', value: 11500 },
      { time: '2024-01-14', value: 11700 },
      { time: '2024-01-15', value: 12000 },
      { time: '2024-01-16', value: 12250 },
      { time: '2024-01-17', value: 12100 },
      { time: '2024-01-18', value: 12350 },
      { time: '2024-01-19', value: 12500 },
      { time: '2024-01-20', value: 12780 },
      { time: '2024-01-21', value: 12600 },
      { time: '2024-01-22', value: 12850 },
      { time: '2024-01-23', value: 13100 },
      { time: '2024-01-24', value: 13300 },
      { time: '2024-01-25', value: 13200 },
      { time: '2024-01-26', value: 13000 },
      { time: '2024-01-27', value: 12800 },
      { time: '2024-01-28', value: 12950 },
      { time: '2024-01-29', value: 13200 },
      { time: '2024-01-30', value: 13500 },
      { time: '2024-01-31', value: 13750 },
    ]
  },
  "2": {
    user: {
      id: "2",
      username: "trading_pro",
      displayName: "Mehmet Yılmaz",
      description: 'Bu bot, yüksek volatiliteye sahip coinlerde kısa vadeli işlemler yaparak arbitraj fırsatlarını değerlendirir.',
      joinDate: "2020-08-22",
      location: "Ankara, TR",
      email: "mehmet.yilmaz@example.com",
      gsm: "+90 555 555 55 55",
      instagram: "@mehmetyilmaz",
      linkedin: "linkedin.com/mehmetyilmaz",
      github: "github.com/mehmetyilmaz",
      totalFollowers: 1563,
      totalSold: 11,
      totalRented: 146,
      avg_bots_profit_lifetime: 12.6,
      bots_winRate_LifeTime: 60.8,
      allbots: 11,
      bots: [
        {
          id: "bot_60_1",
          name: "Scalping Master",
          isActive: true,
          profitRate: "49.4",
          runningTime: 853,
          totalTrades: 2156,
          winRate: "82.3"
        },
        {
          id: "bot_60_2",
          name: "Momentum Trader",
          isActive: true,
          profitRate: "12.4",
          runningTime: 67,
          totalTrades: 892,
          winRate: "75.8"
        }
      ]
    },
    bot: {
      bot_id: "2",
      name: "Scalping Master",
      creator: "Mehmet Yılmaz",
      profitRate: "18.7",
      startDate: "2024-04-15 / 14:45",
      runningTime: 853,
      winRate: "82.3",
      profitFactor: "0.4",
      riskFactor: "1.7",
      totalMargin: "49.4",
      dayMargin: "-0.9",
      weekMargin: "5.1",
      monthMargin: "2.2",
      totalTrades: 2156,
      dayTrades: 2,
      weekTrades: 12,
      monthTrades: 45,
      strategy: "ScalpingPro123",
      soldCount: 4,
      rentedCount: 32,
      avg_fullness: 45,
      for_rent: true,
      for_sale: true,
      rent_price: 8,
      sell_price: 600,
      coins: ["BTC", "ETH", "BNB", "XRP"],
      trades: [
        {
          id: "trade_1",
          pair: "BTCUSDT",
          type: "SHORT",
          action: "Pozisyon Kapatıldı",
          time: "15:10",
        },
        {
          id: "trade_2",
          pair: "ETHUSDT",
          type: "LONG", 
          action: "Pozisyon Açıldı",
          time: "14:55",
        },
        {
          id: "trade_3",
          pair: "BNBUSDT",
          type: "LONG",
          action: "Pozisyon Kapatıldı",
          time: "14:20",
        },
        {
          id: "trade_4",
          pair: "XRPUSDT",
          type: "SHORT",
          action: "Pozisyon Açıldı",
          time: "13:45",
        }
      ],
      positions: [
        {
          id: "trade_1",
          pair: "BTCUSDT",
          type: "SHORT",
          profit: "1.8"
        },
        {
          id: "trade_2",
          pair: "ETHUSDT",
          type: "LONG", 
          profit: "2.2"
        },
        {
          id: "trade_3",
          pair: "BNBUSDT",
          type: "SPOT",
          profit: "-0.8"
        },
        {
          id: "trade_4",
          pair: "XRPUSDT",
          type: "SHORT",
          profit: "1.1"
        }
      ]
    },
    chartData: [
      { time: '2024-01-01', value: 8000 },
      { time: '2024-01-02', value: 8150 },
      { time: '2024-01-03', value: 8200 },
      { time: '2024-01-04', value: 8100 },
      { time: '2024-01-05', value: 8250 },
      { time: '2024-01-06', value: 8300 },
      { time: '2024-01-07', value: 8450 },
      { time: '2024-01-08', value: 8500 },
      { time: '2024-01-09', value: 8600 },
      { time: '2024-01-10', value: 8700 },
      { time: '2024-01-11', value: 8800 },
      { time: '2024-01-12', value: 8900 },
      { time: '2024-01-13', value: 8850 },
      { time: '2024-01-14', value: 9000 },
      { time: '2024-01-15', value: 9100 },
      { time: '2024-01-16', value: 9200 },
      { time: '2024-01-17', value: 9150 },
      { time: '2024-01-18', value: 9250 },
      { time: '2024-01-19', value: 9300 },
      { time: '2024-01-20', value: 9400 },
      { time: '2024-01-21', value: 9350 },
      { time: '2024-01-22', value: 9450 },
      { time: '2024-01-23', value: 9500 },
      { time: '2024-01-24', value: 9550 },
      { time: '2024-01-25', value: 9525 },
      { time: '2024-01-26', value: 9480 },
      { time: '2024-01-27', value: 9420 },
      { time: '2024-01-28', value: 9460 },
      { time: '2024-01-29', value: 9500 },
      { time: '2024-01-30', value: 9550 },
      { time: '2024-01-31', value: 9600 },
    ]
  }
};

const useBotDataStore = create((set, get) => ({
  // State
  currentBotId: "1",
  currentUserData: null,
  currentBotData: null,
  tradingData: [],
  chartData: [],
  isLoading: false,
  error: null,
  availableIds: ["1", "2"], // Mevcut bot ID'leri
  followedBots: [], // Takip edilen botlar listesi

  // Actions
  setCurrentBotId: (id) => {
    set({ currentBotId: id });
    get().loadBotData(id);
  },

  // Bot takip etme fonksiyonu
  followBot: (botData) => {
    const { followedBots } = get();
    const isAlreadyFollowed = followedBots.some(bot => bot.bot_id === botData.bot_id);
    
    if (!isAlreadyFollowed) {
      const followedBot = {
        id: botData.bot_id,
        name: botData.name,
        creator: botData.creator,
        totalMargin: botData.totalMargin,
        runningTime: botData.runningTime,
        followDate: new Date().toISOString(),
        duration: get().formatDuration(botData.runningTime)
      };
      
      set({ followedBots: [...followedBots, followedBot] });
      console.log('Bot takip edildi:', botData.name);
    } else {
      console.log('Bot zaten takip ediliyor:', botData.name);
    }
  },

  // Bot takipten çıkarma fonksiyonu
  unfollowBot: (botId) => {
    const { followedBots } = get();
    const updatedBots = followedBots.filter(bot => bot.bot_id !== botId);
    set({ followedBots: updatedBots });
    console.log('Bot takipten çıkarıldı:', botId);
  },

  // Bot inceleme fonksiyonu (navigation'a geçiş)
  inspectBot: (botId) => {
    set({ currentBotId: botId });
    get().loadBotData(botId);
    console.log('Bot inceleniyor:', botId);
  },

  // Süre formatı
  formatDuration: (days) => {
    if (days < 1) return 'Bugün';
    if (days === 1) return '1 gün';
    if (days < 7) return `${days} gün`;
    if (days < 30) return `${Math.floor(days / 7)} hafta`;
    if (days < 365) return `${Math.floor(days / 30)} ay`;
    return `${Math.floor(days / 365)} yıl`;
  },

  loadBotData: async (id) => {
    set({ isLoading: true, error: null });
    
    try {
      // Gerçek API çağrısı burada yapılacak
      // const response = await fetch(`/api/bots/${id}`);
      // const data = await response.json();
      // bu keşfet yapısının mk 
  
      // Şimdilik integrated data kullanıyoruz
      const data = integratedData[id];
      
      if (!data) {
        throw new Error(`Bot data not found for ID: ${id}`);
      }
      
      set({
        currentUserData: data.user,
        currentBotData: data.bot,
        tradingData: data.tradingData,
        chartData: data.chartData,
        isLoading: false
      });
    } catch (error) {
      set({ 
        error: error.message,
        isLoading: false 
      });
    }
  },

  // Bir sonraki bot ID'sine geç
  getNextBotId: () => {
    const { currentBotId, availableIds } = get();
    const currentIndex = availableIds.indexOf(currentBotId);
    const nextIndex = (currentIndex + 1) % availableIds.length;
    return availableIds[nextIndex];
  },

  // Bir önceki bot ID'sine geç
  getPreviousBotId: () => {
    const { currentBotId, availableIds } = get();
    const currentIndex = availableIds.indexOf(currentBotId);
    const prevIndex = currentIndex === 0 ? availableIds.length - 1 : currentIndex - 1;
    return availableIds[prevIndex];
  },

  // Sonraki bot'a geç
  goToNextBot: () => {
    const nextId = get().getNextBotId();
    get().setCurrentBotId(nextId);
  },

  // Önceki bot'a geç
  goToPreviousBot: () => {
    const prevId = get().getPreviousBotId();
    get().setCurrentBotId(prevId);
  },

  // Trading data'ya yeni veri ekle
  addTradingData: (newData) => {
    set(state => ({
      tradingData: [...state.tradingData, newData]
    }));
  },

  // Chart data'yı güncelle
  updateChartData: (newChartData) => {
    set({ chartData: newChartData });
  },

  // Chart data'yı set et
  setChartData: (data) => {
    set({ chartData: data });
  },

  // Test amaçlı mock chart data yükleme
  loadMockChartData: () => {
    const mock = [
      { time: '2024-01-01', value: 10000 },
      { time: '2024-01-02', value: 9864 },
      { time: '2024-01-03', value: 9654 },
      { time: '2024-01-04', value: 9660 },
      { time: '2024-01-05', value: 9600 },
      { time: '2024-01-06', value: 9700 },
      { time: '2024-01-07', value: 9950 },
      { time: '2024-01-08', value: 10100 },
      { time: '2024-01-09', value: 10900 },
      { time: '2024-01-10', value: 11080 },
      { time: '2024-01-11', value: 11400 },
      { time: '2024-01-12', value: 11650 },
      { time: '2024-01-13', value: 11500 },
      { time: '2024-01-14', value: 11700 },
      { time: '2024-01-15', value: 12000 },
      { time: '2024-01-16', value: 12250 },
      { time: '2024-01-17', value: 12100 },
      { time: '2024-01-18', value: 12350 },
      { time: '2024-01-19', value: 12500 },
      { time: '2024-01-20', value: 12780 },
      { time: '2024-01-21', value: 12600 },
      { time: '2024-01-22', value: 12850 },
      { time: '2024-01-23', value: 13100 },
      { time: '2024-01-24', value: 13300 },
      { time: '2024-01-25', value: 13200 },
      { time: '2024-01-26', value: 13000 },
      { time: '2024-01-27', value: 12800 },
      { time: '2024-01-28', value: 12950 },
      { time: '2024-01-29', value: 13200 },
      { time: '2024-01-30', value: 13500 },
      { time: '2024-01-31', value: 13750 },
    ];
    set({ chartData: mock });
  },

  // Hata durumunu temizle
  clearError: () => {
    set({ error: null });
  },

  // Store'u sıfırla
  reset: () => {
    set({
      currentBotId: "1",
      currentUserData: null,
      currentBotData: null,
      tradingData: [],
      chartData: [],
      isLoading: false,
      error: null,
      followedBots: []
    });
  },

  // Gerçek API çağrısı için
  fetchBotData: async (id) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await fetch(`/api/bots/${id}`);
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const data = await response.json();
      
      set({
        currentUserData: data.user,
        currentBotData: data.bot,
        tradingData: data.trading || [],
        chartData: data.chart || [],
        isLoading: false
      });
    } catch (error) {
      console.error('Bot data fetch error:', error);
      set({ 
        error: error.message,
        isLoading: false 
      });
    }
  },

  // Kullanıcı ve bot verilerini döndüren helper metodlar
  getUserData: () => {
    return get().currentUserData;
  },

  getBotData: () => {
    return get().currentBotData;
  },

  getTradingData: () => {
    return get().tradingData;
  },

  getChartData: () => {
    return get().chartData;
  },

  // Takip edilen botları döndür
  getFollowedBots: () => {
    return get().followedBots;
  },

  // Bot takip ediliyor mu kontrol et
  isBotFollowed: (botId) => {
    const { followedBots } = get();
    return followedBots.some(bot => bot.bot_id === botId);
  }
}));

export default useBotDataStore;