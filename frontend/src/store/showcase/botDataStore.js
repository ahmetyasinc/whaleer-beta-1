import { create } from 'zustand';
import { chartData } from "@/store/showcase/randomData";

import { fetch_bot_data } from '@/services/showcase/fetch_bot_data'; // path'i doğru şekilde güncelle


const useBotDataStore = create((set, get) => ({
  // State
  currentBotId: null,
  currentUserData: null,
  currentBotData: null,
  tradingData: [],
  chartData: [],
  isLoading: false,
  error: null,
  availableIds: [], // Backend'den gelecek bot ID'leri
  followedBots: [],
  integratedData: {}, // Bot verileri cache
  currentPage: 0, // Hangi sayfadayız (0-based)
  isLoadingNewBots: false, // Yeni bot yükleme durumu
  hasMoreBots: true, // Daha fazla bot var mı?

  // Actions
  setCurrentBotId: (id) => {
    set({ currentBotId: id });
    get().loadBotData(id);
  },
  

  followBot: (botData) => {
    const { followedBots } = get();
    const isAlreadyFollowed = followedBots.some(bot => bot.bot_id === botData.bot_id);
    
    if (!isAlreadyFollowed) {
      const followedBot = {
        bot_id: botData.bot_id,
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

  unfollowBot: (botId) => {
    const { followedBots } = get();
    const updatedBots = followedBots.filter(bot => bot.bot_id !== botId);
    set({ followedBots: updatedBots });
    console.log('Bot takipten çıkarıldı:', botId);
  },

  inspectBot: (botId) => {
    set({ currentBotId: botId });
    get().loadBotData(botId);
    console.log('Bot inceleniyor:', botId);
  },

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
      const { integratedData } = get();
      let data = integratedData[id];
      
      // Eğer bot verisi yoksa yeni bot oluştur
      if (!data) {
        console.log(`Bot ${id} bulunamadı, yeni bot oluşturuluyor...`);
        data = get().generateSingleBot(id);
        set(state => ({
          integratedData: {
            ...state.integratedData,
            [id]: data
          }
        }));
      }
      
      set({
        currentUserData: data.user,
        currentBotData: data.bot,
        tradingData: data.tradingData || [],
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

  // Tek bot verisi oluştur (şimdilik static)
  generateSingleBot: async (id) => {
    const staticBot1 = {
      user: {
      id: "u_001",
      username: "ayse_trader",
      displayName: "Ayşe Demir",
      description: "MomentumX ile yüksek hacimli momentum fırsatlarını değerlendiriyorum.",
      joinDate: "2022-01-05",
      location: "Ankara",
      email: "ayse@example.com",
      gsm: "+90 533 111 22 33",
      instagram: "@ayse_trader",
      linkedin: "linkedin.com/in/aysedemir",
      github: "github.com/aysedemir",
      totalFollowers: 2345,
      totalSold: 15,
      totalRented: 42,
      avg_bots_profit_lifetime: 58.4,
      bots_winRate_LifeTime: 81.6,
      allbots: 3,
      bots: [
        {
          id: "bot_u001_1",
          name: "MomentumX",
          isActive: true,
          profitRate: "52.3",
          runningTime: 178,
          totalTrades: 890,
          winRate: "79.1"
        },
        {
          id: "bot_u001_2",
          name: "ReboundSniper",
          isActive: false,
          profitRate: "12.8",
          runningTime: 74,
          totalTrades: 320,
          winRate: "69.5"
        }
      ]
    },
      bot: {
        bot_id: "b_001",
        name: "MomentumX",
        creator: "AyşeDemir",
        profitRate: 52.3,
        startDate: "2024-02-10 / 10:12",
        runningTime: 178,
        winRate: 79.1,
        totalMargin: 156.7,
        dayMargin: 2.2,
        weekMargin: 8.4,
        monthMargin: 21.9,
        profitFactor: 3.1,
        riskFactor: 0.9,
        totalTrades: 890,
        dayTrades: 6,
        weekTrades: 31,
        monthTrades: 103,
        strategy: "Momentum + Volume Spike",
        soldCount: 15,
        rentedCount: 42,
        avg_fullness: 87,
        for_rent: true,
        for_sale: true,
        rent_price: 39,
        sell_price: 620,
        coins: ["BTC", "LTC", "ADA"],
        trades: [
          { id: "trade_1", pair: "BTCUSDT", type: "LONG", action: "Pozisyon Açıldı", time: "09:05" },
          { id: "trade_2", pair: "ADAUSDT", type: "LONG", action: "Pozisyon Kapatıldı", time: "11:23" }
        ],
        positions: [
          { id: "position_1", pair: "BTCUSDT", type: "LONG", profit: 4.5 },
          { id: "position_2", pair: "ADAUSDT", type: "LONG", profit: 2.1 }
        ]
      },
      chartData: chartData,
      tradingData: [] // Eklendi
    };
    const staticBot2 = {
      user: {
    id: "u_002",
    username: "bkaya",
    displayName: "Baran Kaya",
    description: "ScalperOne ile düşük riskli ve hızlı işlemler üzerine çalışıyorum.",
    joinDate: "2023-03-12",
    location: "İzmir",
    email: "baran@example.com",
    gsm: "+90 542 222 33 44",
    instagram: "@baran.trader",
    linkedin: "linkedin.com/in/barankaya",
    github: "github.com/barankaya",
    totalFollowers: 842,
    totalSold: 8,
    totalRented: 27,
    avg_bots_profit_lifetime: 26.1,
    bots_winRate_LifeTime: 65.4,
    allbots: 2,
    bots: [
      {
        id: "bot_u002_1",
        name: "ScalperOne",
        isActive: true,
        profitRate: "22.9",
        runningTime: 89,
        totalTrades: 2023,
        winRate: "66.7"
      }
    ]
  },
      bot: {
    bot_id: "b_002",
    name: "ScalperOne",
    creator: "Baran Kaya",
    profitRate: 22.9,
    startDate: "2024-05-01 / 09:00",
    runningTime: 89,
    winRate: 66.7,
    totalMargin: 42.3,
    dayMargin: 0.8,
    weekMargin: 3.1,
    monthMargin: 9.2,
    profitFactor: 1.6,
    riskFactor: 0.7,
    totalTrades: 2023,
    dayTrades: 31,
    weekTrades: 150,
    monthTrades: 620,
    strategy: "High-Frequency Scalping",
    soldCount: 8,
    rentedCount: 27,
    avg_fullness: 74,
    for_rent: true,
    for_sale: false,
    rent_price: 22,
    sell_price: 490,
    coins: ["SOL", "DOGE", "BNB"],
    trades: [
      { id: "trade_1", pair: "SOLUSDT", type: "SHORT", action: "Pozisyon Açıldı", time: "14:10" },
      { id: "trade_2", pair: "DOGEUSDT", type: "LONG", action: "Pozisyon Kapatıldı", time: "15:42" }
    ],
    positions: [
      { id: "position_1", pair: "SOLUSDT", type: "SHORT", profit: 0.9 },
      { id: "position_2", pair: "DOGEUSDT", type: "LONG", profit: 1.4 }
    ]
  },
      chartData: chartData,
      tradingData: [] // Eklendi
    };
    const staticBot3 = {
      user: {
    id: "u_003",
    username: "ecey",
    displayName: "Ece Yılmaz",
    description: "TrendMaster ile orta-uzun vadeli trend dönüşlerini takip ediyorum.",
    joinDate: "2021-11-22",
    location: "Bursa",
    email: "ece@example.com",
    gsm: "+90 546 987 12 34",
    instagram: "@trendgirl",
    linkedin: "linkedin.com/in/eceyilmaz",
    github: "github.com/eceyilmaz",
    totalFollowers: 3180,
    totalSold: 21,
    totalRented: 55,
    avg_bots_profit_lifetime: 61.9,
    bots_winRate_LifeTime: 78.4,
    allbots: 4,
    bots: [
      {
        id: "bot_u003_1",
        name: "TrendMaster",
        isActive: true,
        profitRate: "61.9",
        runningTime: 301,
        totalTrades: 540,
        winRate: "78.4"
      }
    ]
  },
      bot: {
    bot_id: "b_003",
    name: "TrendMaster",
    creator: "Ece Yılmaz",
    profitRate: 61.9,
    startDate: "2023-10-15 / 16:45",
    runningTime: 301,
    winRate: 78.4,
    totalMargin: 189.5,
    dayMargin: 1.1,
    weekMargin: 7.9,
    monthMargin: 24.6,
    profitFactor: 3.3,
    riskFactor: 1.1,
    totalTrades: 540,
    dayTrades: 3,
    weekTrades: 14,
    monthTrades: 58,
    strategy: "Trend Reversal + MACD",
    soldCount: 21,
    rentedCount: 55,
    avg_fullness: 92,
    for_rent: true,
    for_sale: true,
    rent_price: 52,
    sell_price: 720,
    coins: ["BTC", "ETH", "AVAX"],
    trades: [
      { id: "trade_1", pair: "AVAXUSDT", type: "LONG", action: "Pozisyon Açıldı", time: "12:33" },
      { id: "trade_2", pair: "ETHUSDT", type: "SHORT", action: "Pozisyon Kapatıldı", time: "17:20" }
    ],
    positions: [
      { id: "position_1", pair: "AVAXUSDT", type: "LONG", profit: 5.6 },
      { id: "position_2", pair: "ETHUSDT", type: "SHORT", profit: 1.2 }
    ]
  },
      chartData: chartData,
      tradingData: [] // Eklendi
    };
    const staticBot4 = {
      user: {
        id: id,
        username: `trader_${id}`,
        displayName: "Mehmet Yıldız",
        description: "GridBotX ile profesyonel kripto trading. EMA Crossover stratejisi kullanarak otomatik alım-satım işlemleri gerçekleştiriyorum.",
        joinDate: "2021-06-15",
        location: "İstanbul",
        email: "trader1@example.com",
        gsm: "+90 555 123 45 67",
        instagram: "@trader1",
        linkedin: "linkedin.com/in/trader1",
        github: "github.com/trader1",
        totalFollowers: 1342,
        totalSold: 23,
        totalRented: 58,
        avg_bots_profit_lifetime: 47.8,
        bots_winRate_LifeTime: 76.2,
        allbots: 5,
        bots: [
          {
            id: `bot_${id}_1`,
            name: "GridBotX",
            isActive: true,
            profitRate: "38.5",
            runningTime: 215,
            totalTrades: 1045,
            winRate: "71.2"
          },
          {
            id: `bot_${id}_2`,
            name: "BreakoutHunter",
            isActive: false,
            profitRate: "-12.3",
            runningTime: 118,
            totalTrades: 764,
            winRate: "63.9"
          }
        ]
      },
      bot: {
        bot_id: id,
        name: `GridBotX ${id}`,
        creator: "Mehmet Yıldız",
        profitRate: 38.5,
        startDate: "2024-03-08 / 14:23",
        runningTime: 142,
        winRate: 71.2,
        totalMargin: 124.6,
        dayMargin: 1.5,
        weekMargin: 6.8,
        monthMargin: 18.3,
        profitFactor: 2.6,
        riskFactor: 1.2,
        totalTrades: 1045,
        dayTrades: 5,
        weekTrades: 23,
        monthTrades: 89,
        strategy: "EMA Crossover",
        soldCount: 12,
        rentedCount: 34,
        avg_fullness: 82,
        for_rent: true,
        for_sale: false,
        rent_price: 45,
        sell_price: 560,
        coins: ["BTC", "ETH", "SOL"],
        trades: [
          {
            id: "trade_1",
            pair: "BTCUSDT",
            type: "LONG",
            action: "Pozisyon Açıldı",
            time: "10:45"
          },
          {
            id: "trade_2",
            pair: "ETHUSDT",
            type: "SHORT",
            action: "Pozisyon Kapatıldı",
            time: "13:17"
          }
        ],
        positions: [
          {
            id: "position_1",
            pair: "BTCUSDT",
            type: "LONG",
            profit: 3.4
          },
          {
            id: "position_2",
            pair: "ETHUSDT",
            type: "SHORT",
            profit: -1.9
          }
        ]
      },
      chartData: chartData,
      tradingData: [] // Eklendi
    };
    const staticBot5 = {
      user: {
        id: id,
        username: `trader_${id}`,
        displayName: "Kemal Bayat",
        description: "GridBotX ile profesyonel kripto trading. EMA Crossover stratejisi kullanarak otomatik alım-satım işlemleri gerçekleştiriyorum.",
        joinDate: "2021-06-15",
        location: "İstanbul",
        email: "trader1@example.com",
        gsm: "+90 555 123 45 67",
        instagram: "@trader1",
        linkedin: "linkedin.com/in/trader1",
        github: "github.com/trader1",
        totalFollowers: 1342,
        totalSold: 23,
        totalRented: 58,
        avg_bots_profit_lifetime: 47.8,
        bots_winRate_LifeTime: 76.2,
        allbots: 5,
        bots: [
          {
            id: `bot_${id}_1`,
            name: "GridBotX",
            isActive: true,
            profitRate: "38.5",
            runningTime: 215,
            totalTrades: 1045,
            winRate: "71.2"
          },
          {
            id: `bot_${id}_2`,
            name: "BreakoutHunter",
            isActive: false,
            profitRate: "-12.3",
            runningTime: 118,
            totalTrades: 764,
            winRate: "63.9"
          }
        ]
      },
      bot: {
        bot_id: id,
        name: `GridBotX ${id}`,
        creator: "Kemal Bayat",
        profitRate: 38.5,
        startDate: "2024-03-08 / 14:23",
        runningTime: 142,
        winRate: 71.2,
        totalMargin: 124.6,
        dayMargin: 1.5,
        weekMargin: 6.8,
        monthMargin: 18.3,
        profitFactor: 2.6,
        riskFactor: 1.2,
        totalTrades: 1045,
        dayTrades: 5,
        weekTrades: 23,
        monthTrades: 89,
        strategy: "EMA Crossover",
        soldCount: 12,
        rentedCount: 34,
        avg_fullness: 82,
        for_rent: true,
        for_sale: false,
        rent_price: 45,
        sell_price: 560,
        coins: ["BTC", "ETH", "SOL"],
        trades: [
          {
            id: "trade_1",
            pair: "BTCUSDT",
            type: "LONG",
            action: "Pozisyon Açıldı",
            time: "10:45"
          },
          {
            id: "trade_2",
            pair: "ETHUSDT",
            type: "SHORT",
            action: "Pozisyon Kapatıldı",
            time: "13:17"
          }
        ],
        positions: [
          {
            id: "position_1",
            pair: "BTCUSDT",
            type: "LONG",
            profit: 3.4
          },
          {
            id: "position_2",
            pair: "ETHUSDT",
            type: "SHORT",
            profit: -1.9
          }
        ]
      },
      chartData: chartData,
      tradingData: [] // Eklendi
    };
    const response = await fetch_bot_data();
    const bots = response?.bots || response;
    const thirdBot = bots[1];
    console.log('2. bot verisi:', thirdBot);

    if (id % 5 === 0) {
    return staticBot1;
  } else if (id % 5 === 1) {
    return staticBot2;
  } else if (id % 5 === 2) {
    return staticBot3;
  } else if (id % 5 === 3) {
    return staticBot4;
  } else {
    return {
      staticBot5

    };
  }

   //return staticBot1;
  },

  // 5 bot listesi oluştur (şimdilik static)
  generateBotsList: (page = 0, limit = 5) => {
    const startId = page * limit + 1;
    const bots = [];
    
    for (let i = 0; i < limit; i++) {
      const id = String(startId + i);
      const botData = get().generateSingleBot(id);
      bots.push({
        id: id,
        bot_id: id,
        name: botData.bot.name,
        creator: botData.bot.creator,
        totalMargin: botData.bot.totalMargin,
        runningTime: botData.bot.runningTime,
        profitRate: botData.bot.profitRate,
        winRate: botData.bot.winRate
      });
    }
    
    return {
      bots: bots,
      hasMore: true, // Şimdilik her zaman true
      total: 1000 // Örnek toplam
    };
  },

  // İlk 5 bot'u yükle
  initializeBots: async () => {
    set({ isLoading: true, error: null });

    try {
      const result = get().generateBotsList(0, 5);
      
      if (result.bots.length > 0) {
        const botIds = result.bots.map(bot => bot.id);
        const botsData = {};
        
        // Her bot için detay verisi oluştur
        for (const botInfo of result.bots) {
          const botId = botInfo.id;
          botsData[botId] = get().generateSingleBot(botId);
        }

        set({
          integratedData: botsData,
          availableIds: botIds,
          currentBotId: botIds[0],
          currentPage: 0,
          hasMoreBots: result.hasMore,
          isLoading: false
        });

        // İlk bot'u yükle
        await get().loadBotData(botIds[0]);
        console.log('İlk 5 bot başarıyla yüklendi:', botIds);
      } else {
        set({
          error: 'Hiç bot bulunamadı',
          isLoading: false
        });
      }
    } catch (error) {
      console.error('Initialize bots error:', error);
      set({
        error: error.message,
        isLoading: false
      });
    }
  },

  // Sonraki bot'a geç
  goToNextBot: async () => {
    const { currentBotId, availableIds, hasMoreBots } = get();
    const currentIndex = availableIds.indexOf(currentBotId);

    if (currentIndex < availableIds.length - 1) {
      // Sayfa içi geçiş
      const nextId = availableIds[currentIndex + 1];
      console.log(`${currentBotId} -> ${nextId}`);
      get().setCurrentBotId(nextId);
    } else if (hasMoreBots) {
      // Yeni 5 bot getir
      console.log('Son bot gösteriliyor, yeni botlar getiriliyor...');
      set({ isLoadingNewBots: true });

      try {
        const nextPage = get().currentPage + 1;
        const result = get().generateBotsList(nextPage, 5);

        if (result.bots.length > 0) {
          const newBotIds = result.bots.map(bot => bot.id);
          const newBotsData = {};
          
          // Yeni bot verilerini oluştur
          for (const botInfo of result.bots) {
            const botId = botInfo.id;
            newBotsData[botId] = get().generateSingleBot(botId);
          }

          // Önceki botları sil, yeni botları ekle
          set({
            integratedData: newBotsData,
            availableIds: newBotIds,
            currentBotId: newBotIds[0],
            currentPage: nextPage,
            hasMoreBots: result.hasMore,
            isLoadingNewBots: false
          });

          // İlk yeni bot'u yükle
          await get().loadBotData(newBotIds[0]);
          console.log(`Yeni botlar getirildi: ${newBotIds.join(', ')}`);
        } else {
          set({
            hasMoreBots: false,
            isLoadingNewBots: false
          });
          console.log('Daha fazla bot yok');
        }
      } catch (error) {
        console.error('Next bots fetch error:', error);
        set({
          error: error.message,
          isLoadingNewBots: false
        });
      }
    } else {
      console.log('Son bot gösteriliyor, daha fazla bot yok');
    }
  },

  // Önceki bot'a geç
  goToPreviousBot: async () => {
    const { currentBotId, availableIds, currentPage } = get();
    const currentIndex = availableIds.indexOf(currentBotId);

    if (currentIndex > 0) {
      // Sayfa içi geri
      const prevId = availableIds[currentIndex - 1];
      console.log(`${currentBotId} -> ${prevId}`);
      get().setCurrentBotId(prevId);
    } else if (currentPage > 0) {
      // Önceki 5'liyi getir
      console.log('İlk bot gösteriliyor, önceki botlar getiriliyor...');
      set({ isLoadingNewBots: true });

      try {
        const prevPage = currentPage - 1;
        const result = get().generateBotsList(prevPage, 5);

        if (result.bots.length > 0) {
          const prevBotIds = result.bots.map(bot => bot.id);
          const prevBotsData = {};
          
          // Önceki bot verilerini oluştur
          for (const botInfo of result.bots) {
            const botId = botInfo.id;
            prevBotsData[botId] = get().generateSingleBot(botId);
          }

          // Mevcut botları sil, önceki botları ekle
          set({
            integratedData: prevBotsData,
            availableIds: prevBotIds,
            currentBotId: prevBotIds[prevBotIds.length - 1], // Son bot'u seç
            currentPage: prevPage,
            hasMoreBots: true, // Önceki sayfaya gidiyorsak daha fazla bot var demektir
            isLoadingNewBots: false
          });

          // Son bot'u yükle
          await get().loadBotData(prevBotIds[prevBotIds.length - 1]);
          console.log(`Önceki botlar yüklendi: ${prevBotIds.join(', ')}`);
        } else {
          set({ isLoadingNewBots: false });
          console.log('Önceki bot verileri getirilemedi');
        }
      } catch (error) {
        console.error('Previous bots fetch error:', error);
        set({
          error: error.message,
          isLoadingNewBots: false
        });
      }
    } else {
      console.log('İlk sayfadayız, daha geri gidilemez.');
    }
  },

  // Bir sonraki bot ID'sine geç
  getNextBotId: () => {
    const { currentBotId, availableIds } = get();
    const currentIndex = availableIds.indexOf(currentBotId);
    if (currentIndex < availableIds.length - 1) {
      return availableIds[currentIndex + 1];
    }
    return null; // Son bot ise null döner
  },

  // Bir önceki bot ID'sine geç
  getPreviousBotId: () => {
    const { currentBotId, availableIds } = get();
    const currentIndex = availableIds.indexOf(currentBotId);
    if (currentIndex > 0) {
      return availableIds[currentIndex - 1];
    }
    return null; // İlk bot ise null döner
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

  // Hata durumunu temizle
  clearError: () => {
    set({ error: null });
  },

  // Store'u sıfırla
  reset: () => {
    set({
      currentBotId: null,
      currentUserData: null,
      currentBotData: null,
      tradingData: [],
      chartData: [],
      isLoading: false,
      error: null,
      followedBots: [],
      integratedData: {},
      availableIds: [],
      currentPage: 0,
      isLoadingNewBots: false,
      hasMoreBots: true
    });
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
  },

  // Mevcut sayfadaki bot sayısını döndür
  getCurrentPageBotCount: () => {
    const { availableIds } = get();
    return availableIds.length;
  },

  // Yeni bot yükleme durumunu döndür
  getIsLoadingNewBots: () => {
    return get().isLoadingNewBots;
  },

  // Geri gidilip gidilmeyeceğini kontrol et
  canGoBack: () => {
    const { currentBotId, availableIds, currentPage } = get();
    const currentIndex = availableIds.indexOf(currentBotId);
    return currentIndex > 0 || currentPage > 0;
  },

  // İleri gidilip gidilmeyeceğini kontrol et
  canGoForward: () => {
    const { currentBotId, availableIds, hasMoreBots } = get();
    const currentIndex = availableIds.indexOf(currentBotId);
    return currentIndex < availableIds.length - 1 || hasMoreBots;
  },

  // Mevcut bot pozisyonu bilgisi
  getCurrentBotPosition: () => {
    const { currentBotId, availableIds, currentPage } = get();
    const currentIndex = availableIds.indexOf(currentBotId);
    return {
      currentIndex: currentIndex + 1, // 1-based
      totalInPage: availableIds.length,
      currentPage: currentPage + 1, // 1-based
      isFirstInPage: currentIndex === 0,
      isLastInPage: currentIndex === availableIds.length - 1
    };
  }
}));

export default useBotDataStore;