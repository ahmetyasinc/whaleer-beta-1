import { create } from 'zustand';
import { getBots ,createBot, updateBot, toggleBotActiveApi, deleteBot } from '../../api/bots';
import useApiStore from '@/store/api/apiStore';
import useStrategyStore from '@/store/indicator/strategyStore';

export const useBotStore = create((set) => ({
  bots: [],

  addBot: async (botData) => {
    try {
      const createdBot = await createBot(botData);

      if (!createdBot || !createdBot.id) return;

      const apiList = useApiStore.getState().apiList;
      const strategies = useStrategyStore.getState().all_strategies;

      const matchedApi = apiList.find((api) => api.id === createdBot.api_id);
      const matchedStrategy = strategies.find((s) => s.id === createdBot.strategy_id);

      const newBot = {
        id: createdBot.id,
        name: createdBot.name,
        api: matchedApi?.name || "",
        strategy: matchedStrategy?.name || "",
        period: createdBot.period,
        isActive: createdBot.active,
        days: createdBot.active_days,
        startTime: createdBot.active_hours?.split('-')[0] || "",
        endTime: createdBot.active_hours?.split('-')[1] || "",
        cryptos: createdBot.stocks || [],
        candleCount: createdBot.candle_count,
        balance: createdBot.initial_usd_value,
        total_balance: matchedApi?.balance || 0,
      };

      set((state) => ({ bots: [...state.bots, newBot] }));

    } catch (error) {
      console.error("Bot eklenirken hata:", error);
    }
  },

  removeBot: async (id) => {
    try {
      await deleteBot(id);
      set((state) => ({ bots: state.bots.filter((bot) => bot.id !== id) }));
    } catch (error) {
      console.error("Bot silinirken hata:", error);
    }
  },

  updateBot: async (updatedBot) => {
    try {
      const result = await updateBot(updatedBot.id, updatedBot); // backend güncellemesi

      if (!result || !result.id) return;

      const apiList = useApiStore.getState().apiList;
      const strategies = useStrategyStore.getState().all_strategies;

      const matchedApi = apiList.find((api) => api.id === result.api_id);
      const matchedStrategy = strategies.find((s) => s.id === result.strategy_id);

      const newBot = {
        id: result.id,
        name: result.name,
        api: matchedApi?.name || "",
        strategy: String(matchedStrategy?.name),
        period: result.period,
        isActive: result.active,
        days: result.active_days,
        startTime: result.active_hours?.split('-')[0] || "",
        endTime: result.active_hours?.split('-')[1] || "",
        cryptos: result.stocks || [],
        candleCount: result.candle_count,
        balance: result.initial_usd_value,
        total_balance: matchedApi?.balance || 0,
      };

      set((state) => ({
        bots: state.bots.map((bot) =>
          bot.id === result.id ? newBot : bot
        ),
      }));

    } catch (error) {
      console.error("Bot güncellenirken hata:", error);
    }
  },


  toggleBotActive: async (id) => {
    try {
      const bot = useBotStore.getState().bots.find((b) => b.id === id);
      if (!bot) return;

      await toggleBotActiveApi(id, bot.isActive); // Şu anki duruma göre API çağrısı yapar

      set((state) => ({
        bots: state.bots.map((b) =>
          b.id === id ? { ...b, isActive: !b.isActive } : b
        ),
      }));
    } catch (error) {
      console.error("Bot aktiflik durumu değiştirilirken hata:", error);
    }
  },


  loadBots: async () => {
    try {
      const userBots = await getBots();
      console.log("Yüklenen Botlar:", userBots);
      if (Array.isArray(userBots)) {
        set({ bots: userBots });
      } else {
        console.warn("Beklenmeyen veri formatı:", userBots);
      }
    } catch (error) {
      console.error("API Key'ler yüklenirken hata:", error);
    }
  },

}));