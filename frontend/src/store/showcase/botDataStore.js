import { create } from 'zustand';
import { fetch_bot_data } from '@/services/showcase/fetch_bot_data';
import { fetch_my_bot_data } from '@/services/showcase/fetch_my_bot_data'; // ✅ YENİ
import { fetch_followed_bots } from '@/services/showcase/fetch_followed_bots';
import { fetch_bot_by_id } from '@/services/showcase/fetch_bot_by_id';
import { post_follow_bot } from '@/services/showcase/post_follow_bot';
import { post_unfollow_bot } from '@/services/showcase/unfollow_bot';

const useBotDataStore = create((set, get) => ({
  // --- State ---
  viewMode: 'all', // 'all' | 'mine'  ✅ YENİ
  filters: {},
  followedBots: [],
  allBots: [],
  currentIndex: 1,
  isLoading: false,
  hasMoreBots: true,
  error: null,

  // --- Helpers ---
  setViewMode: (mode) => set({ viewMode: mode }), // ✅ YENİ

  getCurrentBot: () => {
    const { allBots, currentIndex } = get();
    return allBots[currentIndex] || null;
  },

  // İlk yükleme veya viewMode değişiminde veri çek
  initializeBots: async () => {
    const { viewMode, filters } = get();
    set({ isLoading: true, error: null });

    try {
      let response = [];

      if (viewMode === 'mine') {
        // Sadece benim verilerim: GET /showcase/mydata (filtre yok)
        response = await fetch_my_bot_data();
      } else {
        // Tümü: POST /showcase/newdata (filtre kullanılabilir)
        response = await fetch_bot_data(5, filters);
      }

      set({
        allBots: response || [],
        currentIndex: 0,
        // 'mine' modunda sonsuz kaydırma yok:
        hasMoreBots: viewMode === 'all' ? (response?.length > 0) : false,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false, allBots: [], currentIndex: 0 });
    }
  },

  // Filtre uygula (yalnızca 'all' modunda anlamlı)
  fetchFilteredBots: async () => {
    const { viewMode, filters } = get();
    if (viewMode !== 'all') {
      // 'mine' modunda filtre yok; sadece yeniden yükle
      return get().initializeBots();
    }

    set({ isLoading: true });
    try {
      const response = await fetch_bot_data(null, filters);
      set({
        allBots: response || [],
        currentIndex: 0,
        hasMoreBots: response.length > 0,
        isLoading: false,
      });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Filtre dönüşümü (yalnızca 'all' modu için kaydet & uygula)
  applyFilters: async (rawFilters) => {
    const { viewMode } = get();

    // 'mine' modunda filtreleme yok → sadece initialize
    if (viewMode !== 'all') {
      return get().initializeBots();
    }

    const convertToMinutes = (value, unit) => {
      const val = parseInt(value);
      if (isNaN(val)) return null;
      switch (unit) {
        case 'gün': return val * 24 * 60;
        case 'hafta': return val * 7 * 24 * 60;
        case 'ay': return val * 30 * 24 * 60;
        default: return null;
      }
    };

    const transformed = {
      bot_type: rawFilters.botType || null,
      active: rawFilters.isActive || null,
      min_sell_price: rawFilters.priceMin ? parseFloat(rawFilters.priceMin) : null,
      max_sell_price: rawFilters.priceMax ? parseFloat(rawFilters.priceMax) : null,
      min_rent_price: rawFilters.rentMin ? parseFloat(rawFilters.rentMin) : null,
      max_rent_price: rawFilters.rentMax ? parseFloat(rawFilters.rentMax) : null,
      min_profit_factor: rawFilters.profitFactor || null,
      max_risk_factor: rawFilters.riskFactor || null,
      min_created_minutes_ago: convertToMinutes(rawFilters.creationTime, rawFilters.creationUnit),
      min_uptime_minutes: rawFilters.usageTime ? parseInt(rawFilters.usageTime) * 60 : null,
      min_trade_frequency: rawFilters.transactionFrequency ? parseFloat(rawFilters.transactionFrequency) : null,
      min_profit_margin: rawFilters.profitMargin ? parseFloat(rawFilters.profitMargin) / 100 : null,
      profit_margin_unit: rawFilters.profitMarginUnit || null,
      demand: rawFilters.demand || null,
      limit: 10,
    };

    set({ filters: transformed });
    await get().fetchFilteredBots();
  },

  // Navigasyon (sonsuz kaydırma sadece 'all' modunda)
  navigateBot: async (direction) => {
    const { currentIndex, allBots, hasMoreBots, isLoading, viewMode } = get();
    if (isLoading) return;

    if (direction === 'up' && currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 });
      return;
    }

    if (direction === 'down') {
      if (currentIndex < allBots.length - 1) {
        set({ currentIndex: currentIndex + 1 });
        return;
      }

      // liste sonu → yalnızca 'all' modunda yeni sayfa çek
      if (viewMode === 'all' && hasMoreBots) {
        try {
          const { filters } = get();
          const response = await fetch_bot_data(5, filters);
          const newBots = response || [];
          set((state) => ({
            allBots: [...state.allBots, ...newBots],
            currentIndex: state.currentIndex + 1, // bir sonrakine geç
            hasMoreBots: newBots.length > 0,
            isLoading: false,
          }));
        } catch (error) {
          set({ error: error.message, isLoading: false });
        }
      }
    }
  },
  
  getFollowedBots: async () => {
    try {
      const response = await fetch_followed_bots();
      const bots = response.map(bot => ({
        ...bot,
        id: bot.bot_id,
        duration: get().formatDuration(bot.runningTime)
      }));
      set({ followedBots: bots });
      return bots;
    } catch (error) {
      console.error('getFollowedBots error:', error);
      set({ error: error.message });
      return [];
    }
  },

  followBot: async (botData) => {
    const { followedBots, formatDuration } = get();
    const isAlreadyFollowed = followedBots.some(bot => bot.bot_id === botData.bot_id);

    if (isAlreadyFollowed) {
      return;
    }

    try {
      // Backend'e takip isteği gönder
      await post_follow_bot(botData.bot_id);

      // Yerel state'e ekle
      const followedBot = {
        bot_id: botData.bot_id,
        id: botData.bot_id,
        name: botData.name,
        creator: botData.creator,
        totalMargin: botData.totalMargin,
        runningTime: botData.runningTime,
        duration: formatDuration(botData.runningTime)
      };

      set({ followedBots: [...followedBots, followedBot] });
    } catch (error) {
      set({ error: error.message });
      console.error('followBot API hatası:', error);
    }
  },

  unfollowBot: async (botId) => {
    const { followedBots } = get();

    try {
      // Backend'e takipten çıkarma isteği gönder
      await post_unfollow_bot(botId);

      // Local state güncelle
      const updatedBots = followedBots.filter(bot =>
        bot.bot_id !== botId &&
        bot.id !== botId &&
        bot?.bot?.bot_id !== botId // farklı yapıdaki item'ları da filtrele
      );

      set({ followedBots: updatedBots });
    } catch (error) {
      set({ error: error.message });
      console.error('unfollowBot API hatası:', error);
    }
  },

  inspectBot: async (botId) => {
    const { allBots, formatDuration } = get();

    const existingIndex = allBots.findIndex(entry =>
      entry.bot?.bot_id === botId || entry.bot?.id === botId
    );
    if (existingIndex !== -1) {
      set({ currentIndex: existingIndex });
      return;
    }

    try {
      const response = await fetch_bot_by_id(botId);

      if (!response || !response.bot) {
        console.warn('Bot verisi alınamadı.');
        return;
      }

      // Tam anlamıyla allBots formatına uyan yapı
      const newBotEntry = {
        bot: {
          ...response.bot,
          id: response.bot.bot_id,
          duration: formatDuration(response.bot.runningTime),
          trades: response.bot.trades || [],
          positions: response.bot.positions || [],
        },
        chartData: response.chartData || [],
        tradingData: response.tradingData || [],
        user: response.user || {},
      };

      set((state) => ({
        allBots: [...state.allBots, newBotEntry],
        currentIndex: state.allBots.length,
      }));

    } catch (error) {
      set({ error: error.message });
      console.error('inspectBot error:', error);
    }
  },

  formatDuration: (days) => {
    if (days < 1) return 'Bugün';
    if (days === 1) return '1 gün';
    if (days < 7) return `${days} gün`;
    if (days < 30) return `${Math.floor(days / 7)} hafta`;
    if (days < 365) return `${Math.floor(days / 30)} ay`;
    return `${Math.floor(days / 365)} yıl`;
  },

  // Store'u sıfırla
  reset: () => {
    set({
      followedBots: [],
      allBots: [],
      currentIndex: 0,
      isLoading: false,
      hasMoreBots: true,
      error: null,
    });
  },

  // Kullanıcı ve bot verilerini döndüren helper metodlar
  getUserData: () => {
    return get().currentUserData;
  },

  // Bot takip ediliyor mu kontrol et
  isBotFollowed: (botId) => {
    const { followedBots } = get();
    return followedBots.some(bot => bot.bot_id === botId);
  },

}));

export default useBotDataStore;