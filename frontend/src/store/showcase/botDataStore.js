import { create } from 'zustand';

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
  generateSingleBot: (id) => {
    const staticBot1 = {
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
      chartData: Array.from({ length: 31 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: 10000 + i * 150
      })),
      tradingData: [] // Eklendi
    };
    const staticBot2 = {
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
      chartData: Array.from({ length: 31 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: 10000 + i * 150
      })),
      tradingData: [] // Eklendi
    };
    const staticBot3 = {
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
      chartData: Array.from({ length: 31 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: 10000 + i * 150
      })),
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
      chartData: Array.from({ length: 31 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: 10000 + i * 150
      })),
      tradingData: [] // Eklendi
    };
    const staticBot5 = {
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
      chartData: Array.from({ length: 31 }, (_, i) => ({
        time: `2024-01-${String(i + 1).padStart(2, '0')}`,
        value: 10000 + i * 150
      })),
      tradingData: [] // Eklendi
    };

    if (id % 5 === 0) {
    return staticBot1;
  } else if (id % 5 === 1) {
    return staticBot2;
  } else if (id % 5 === 2) {
    return staticBot3;
  } else if (id % 5 === 3) {
    return staticBot4;
  } else {
    return staticBot5;
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




/*import { create } from 'zustand';

const useBotDataStore = create((set, get) => ({
  // State
  currentBotId: "1",
  currentUserData: null,
  currentBotData: null,
  tradingData: [],
  chartData: [],
  isLoading: false,
  error: null,
  availableIds: ["1", "2", "3", "4", "5"], // ✅ 5 ID olmalı
  followedBots: [],
  integratedData: {}, // Başlangıçta boş, dinamik olarak doldurulacak
  currentPage: 0, // Hangi sayfadayız (0-based)
  isLoadingNewBots: false, // Yeni bot yükleme durumu

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

  // Tek bot üretme fonksiyonu
generateSingleBot: (id) => {
  const staticBot1 = {
    user: {
      id: "1",
      username: "trader_1",
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
          id: "bot_1_1",
          name: "GridBotX",
          isActive: true,
          profitRate: "38.5",
          runningTime: 215,
          totalTrades: 1045,
          winRate: "71.2"
        },
        {
          id: "bot_1_2",
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
      bot_id: "1",
      name: "GridBotX",
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
    chartData: Array.from({ length: 31 }, (_, i) => ({
      time: `2024-01-${String(i + 1).padStart(2, '0')}`,
      value: 10000 + i * 150
    }))
  };
  const staticBot2 = {};
  const staticBot3 = {};
  const staticBot4 = {};
  const staticBot5 = {};

  if (id % 5 === 0) {
    return staticBot1;
  } else if (id % 5 === 1) {
    return staticBot2;
  } else if (id % 5 === 2) {
    return staticBot3;
  } else if (id % 5 === 3) {
    return staticBot4;
  } else {
    return staticBot5;
  }
},


  // İlk 2 bot'u yükle
initializeBots: async () => {
  set({ isLoading: true });

  try {
    const bots = {};
    const ids = [];

    for (let i = 1; i <= 5; i++) {
      const id = String(i);
      bots[id] = get().generateSingleBot(id);
      ids.push(id);
    }

    set({
      integratedData: bots,
      availableIds: ids,
      currentBotId: ids[0],
      isLoading: false
    });

    await get().loadBotData(ids[0]);

    console.log('İlk 5 bot başarıyla yüklendi');
  } catch (error) {
    set({
      error: error.message,
      isLoading: false
    });
  }
},


  // Sonraki bot'a geç (yeni navigasyon mantığı)
goToNextBot: async () => {
  const { currentBotId, availableIds } = get();
  const currentIndex = availableIds.indexOf(currentBotId);

  if (currentIndex < availableIds.length - 1) {
    // Sayfa içi geçiş
    const nextId = availableIds[currentIndex + 1];
    console.log(`${currentBotId} -> ${nextId}`);
    get().setCurrentBotId(nextId);
  } else {
    // Yeni 5 bot getir
    console.log('Son bot gösteriliyor, yeni botlar getiriliyor...');
    set({ isLoadingNewBots: true });

    try {
      const lastIdNum = parseInt(availableIds[availableIds.length - 1]);
      const newBots = {};
      const newIds = [];

      for (let i = 1; i <= 5; i++) {
        const id = String(lastIdNum + i);
        newBots[id] = get().generateSingleBot(id);
        newIds.push(id);
      }

      const { integratedData } = get();
      const newIntegratedData = { ...integratedData };

      // Önceki sayfanın botlarını sil
      availableIds.forEach(id => delete newIntegratedData[id]);

      // Yeni botları ekle
      newIds.forEach(id => {
        newIntegratedData[id] = newBots[id];
      });

      set({
        integratedData: newIntegratedData,
        availableIds: newIds,
        currentBotId: newIds[0],
        currentPage: get().currentPage + 1,
        isLoadingNewBots: false
      });

      console.log(`Yeni botlar getirildi: ${newIds.join(', ')}`);
    } catch (error) {
      set({
        error: error.message,
        isLoadingNewBots: false
      });
    }
  }
},


  // Önceki bot'a geç
goToPreviousBot: async () => {
  const { currentBotId, availableIds } = get();
  const currentIndex = availableIds.indexOf(currentBotId);

  if (currentIndex > 0) {
    // Sayfa içi geri
    const prevId = availableIds[currentIndex - 1];
    console.log(`${currentBotId} -> ${prevId}`);
    get().setCurrentBotId(prevId);
  } else if (get().currentPage > 0) {
    // Önceki 5'liyi getir
    set({ isLoadingNewBots: true });

    try {
      const lastIdOfPrevPage = parseInt(availableIds[0]) - 1;
      const startId = lastIdOfPrevPage - 4;
      const newBots = {};
      const newIds = [];

      for (let i = 0; i < 5; i++) {
        const id = String(startId + i);
        newBots[id] = get().generateSingleBot(id);
        newIds.push(id);
      }

      const { integratedData } = get();
      const newIntegratedData = { ...integratedData };

      availableIds.forEach(id => delete newIntegratedData[id]);
      newIds.forEach(id => {
        newIntegratedData[id] = newBots[id];
      });

      set({
        integratedData: newIntegratedData,
        availableIds: newIds,
        currentBotId: newIds[4], // Son bot
        currentPage: get().currentPage - 1,
        isLoadingNewBots: false
      });

      console.log(`Önceki botlar yüklendi: ${newIds.join(', ')}`);
    } catch (error) {
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
      currentBotId: "1",
      currentUserData: null,
      currentBotData: null,
      tradingData: [],
      chartData: [],
      isLoading: false,
      error: null,
      followedBots: [],
      integratedData: {},
      availableIds: ["1", "2", "3", "4", "5"], // ✅ 5 ID olmalı
      currentPage: 0,
      isLoadingNewBots: false
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
    const { currentBotId, availableIds } = get();
    const currentIndex = availableIds.indexOf(currentBotId);
    return currentIndex > 0;
  },

  // İleri gidilip gidilmeyeceğini kontrol et
  canGoForward: () => {
    return true; // Her zaman ileri gidilebilir (yeni bot oluşturulabilir)
  }
}));

export default useBotDataStore;


*/



/*                                 ***********************   RANDOM VERİ  **************************
import { create } from 'zustand';

// İlk yükleme için başlangıç bot verileri
const initialIntegratedData = {
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
          isActive: false,
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
  availableIds: ["1", "2"],
  followedBots: [],
  integratedData: initialIntegratedData, // Dinamik veri yapısı
  currentPage: 0, // Hangi sayfadayız (0-based)
  isLoadingNewBots: false, // Yeni bot yükleme durumu

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

  // Backend'den 2 yeni bot çağırma fonksiyonu
  fetchNewBots: async (page) => {
    set({ isLoadingNewBots: true });
    
    try {
      console.log(`Sayfa ${page} için yeni botlar çağırılıyor...`);
      
      // Backend API çağrısı
      const response = await fetch(`/api/discover/bots?page=${page}&limit=2`);
      
      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }
      
      const newBots = await response.json();
      
      // Yeni bot ID'lerini oluştur
      const nextId1 = String(page * 2 + 1);
      const nextId2 = String(page * 2 + 2);
      
      const newIntegratedData = {
        [nextId1]: newBots[0],
        [nextId2]: newBots[1]
      };
      
      set({
        integratedData: newIntegratedData,
        availableIds: [nextId1, nextId2],
        isLoadingNewBots: false
      });
      
      console.log(`Yeni botlar yüklendi: ${nextId1}, ${nextId2}`);
      
    } catch (error) {
      console.error('Yeni bot çağırma hatası:', error);
      
      // Hata durumunda mock data kullan
      const mockData = get().generateMockBots(page);
      set({
        integratedData: mockData.integratedData,
        availableIds: mockData.availableIds,
        isLoadingNewBots: false
      });
    }
  },

  // Mock bot data üretici (test için)
  generateMockBots: (page) => {
    const nextId1 = String(page * 2 + 1);
    const nextId2 = String(page * 2 + 2);
    
    const mockBots = {
      [nextId1]: {
        user: {
          id: nextId1,
          username: `trader_${nextId1}`,
          displayName: `Trader ${nextId1}`,
          description: `Mock bot ${nextId1} açıklaması`,
          joinDate: "2024-01-01",
          location: "İstanbul, TR",
          email: `trader${nextId1}@example.com`,
          gsm: "+90 555 000 00 00",
          totalFollowers: Math.floor(Math.random() * 5000),
          totalSold: Math.floor(Math.random() * 50),
          totalRented: Math.floor(Math.random() * 200),
          avg_bots_profit_lifetime: Math.floor(Math.random() * 100),
          bots_winRate_LifeTime: Math.floor(Math.random() * 100),
          allbots: Math.floor(Math.random() * 20),
          bots: []
        },
        bot: {
          bot_id: nextId1,
          name: `Mock Bot ${nextId1}`,
          creator: `Trader ${nextId1}`,
          profitRate: (Math.random() * 100).toFixed(1),
          startDate: "2024-01-01 / 00:00",
          runningTime: Math.floor(Math.random() * 365),
          winRate: (Math.random() * 100).toFixed(1),
          totalMargin: (Math.random() * 200).toFixed(1),
          dayMargin: (Math.random() * 10 - 5).toFixed(1),
          weekMargin: (Math.random() * 20 - 10).toFixed(1),
          monthMargin: (Math.random() * 50 - 25).toFixed(1),
          profitFactor: (Math.random() * 3).toFixed(1),
          riskFactor: (Math.random() * 2).toFixed(1),
          totalTrades: Math.floor(Math.random() * 5000),
          dayTrades: Math.floor(Math.random() * 10),
          weekTrades: Math.floor(Math.random() * 50),
          monthTrades: Math.floor(Math.random() * 200),
          strategy: `Strategy_${nextId1}`,
          soldCount: Math.floor(Math.random() * 10),
          rentedCount: Math.floor(Math.random() * 50),
          avg_fullness: Math.floor(Math.random() * 100),
          for_rent: Math.random() > 0.5,
          for_sale: Math.random() > 0.5,
          rent_price: Math.floor(Math.random() * 50),
          sell_price: Math.floor(Math.random() * 1000),
          coins: ["BTC", "ETH", "ADA"],
          trades: [],
          positions: []
        },
        chartData: Array.from({ length: 31 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          value: 10000 + Math.floor(Math.random() * 5000)
        }))
      },
      [nextId2]: {
        user: {
          id: nextId2,
          username: `trader_${nextId2}`,
          displayName: `Trader ${nextId2}`,
          description: `Mock bot ${nextId2} açıklaması`,
          joinDate: "2024-01-01",
          location: "İstanbul, TR",
          email: `trader${nextId2}@example.com`,
          gsm: "+90 555 000 00 00",
          totalFollowers: Math.floor(Math.random() * 5000),
          totalSold: Math.floor(Math.random() * 50),
          totalRented: Math.floor(Math.random() * 200),
          avg_bots_profit_lifetime: Math.floor(Math.random() * 100),
          bots_winRate_LifeTime: Math.floor(Math.random() * 100),
          allbots: Math.floor(Math.random() * 20),
          bots: []
        },
        bot: {
          bot_id: nextId2,
          name: `Mock Bot ${nextId2}`,
          creator: `Trader ${nextId2}`,
          profitRate: (Math.random() * 100).toFixed(1),
          startDate: "2024-01-01 / 00:00",
          runningTime: Math.floor(Math.random() * 365),
          winRate: (Math.random() * 100).toFixed(1),
          totalMargin: (Math.random() * 200).toFixed(1),
          dayMargin: (Math.random() * 10 - 5).toFixed(1),
          weekMargin: (Math.random() * 20 - 10).toFixed(1),
          monthMargin: (Math.random() * 50 - 25).toFixed(1),
          profitFactor: (Math.random() * 3).toFixed(1),
          riskFactor: (Math.random() * 2).toFixed(1),
          totalTrades: Math.floor(Math.random() * 5000),
          dayTrades: Math.floor(Math.random() * 10),
          weekTrades: Math.floor(Math.random() * 50),
          monthTrades: Math.floor(Math.random() * 200),
          strategy: `Strategy_${nextId2}`,
          soldCount: Math.floor(Math.random() * 10),
          rentedCount: Math.floor(Math.random() * 50),
          avg_fullness: Math.floor(Math.random() * 100),
          for_rent: Math.random() > 0.5,
          for_sale: Math.random() > 0.5,
          rent_price: Math.floor(Math.random() * 50),
          sell_price: Math.floor(Math.random() * 1000),
          coins: ["BTC", "ETH", "XRP"],
          trades: [],
          positions: []
        },
        chartData: Array.from({ length: 31 }, (_, i) => ({
          time: `2024-01-${String(i + 1).padStart(2, '0')}`,
          value: 10000 + Math.floor(Math.random() * 5000)
        }))
      }
    };
    
    return {
      integratedData: mockBots,
      availableIds: [nextId1, nextId2]
    };
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

  // Sonraki bot'a geç (dinamik yükleme ile)
  goToNextBot: async () => {
    const { currentBotId, availableIds, currentPage } = get();
    const currentIndex = availableIds.indexOf(currentBotId);
    const nextIndex = (currentIndex + 1) % availableIds.length;
    const nextId = availableIds[nextIndex];
    
    // Eğer 2. bot'a geçiyorsak (çift ID) ve bu ID çift sayıysa yeni botları yükle
    if (parseInt(nextId) % 2 === 0) {
      const nextPage = currentPage + 1;
      set({ currentPage: nextPage });
      
      console.log(`2. bot'a geçildi (ID: ${nextId}), sayfa ${nextPage} için yeni botlar yükleniyor...`);
      
      // Yeni botları yükle
      await get().fetchNewBots(nextPage);
      
      // Yeni yüklenen botların ilkine geç
      const { availableIds: newAvailableIds } = get();
      const newFirstId = newAvailableIds[0];
      get().setCurrentBotId(newFirstId);
    } else {
      // Normal geçiş
      get().setCurrentBotId(nextId);
    }
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
    const mock = Array.from({ length: 31 }, (_, i) => ({
      time: `2024-01-${String(i + 1).padStart(2, '0')}`,
      value: 10000 + Math.floor(Math.random() * 5000)
    }));
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
      followedBots: [],
      integratedData: initialIntegratedData,
      currentPage: 0,
      isLoadingNewBots: false
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
  },

  // Mevcut sayfadaki bot sayısını döndür
  getCurrentPageBotCount: () => {
    const { availableIds } = get();
    return availableIds.length;
  },

  // Yeni bot yükleme durumunu döndür
  getIsLoadingNewBots: () => {
    return get().isLoadingNewBots;
  }
}));

export default useBotDataStore;
*/


/*                                       ************ İLK KOD ***************
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
          isActive: false,
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

*/