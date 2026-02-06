import { create } from "zustand";
import api from "@/api/axios";

const useBotExamineStore = create((set, get) => ({
  bots: {},
  selectedBotId: null,

  addOrUpdateBot: (botId, data) => {
    set((state) => ({
      bots: {
        ...state.bots,
        [botId]: {
          ...state.bots[botId],
          ...data,
        },
      },
    }));
  },

  getBot: (botId) => get().bots[botId] || null,
  getAllBots: () => get().bots,

  setSelectedBotId: (botId) => set({ selectedBotId: botId }),

  getSelectedBot: () => {
    const { bots, selectedBotId } = get();
    return selectedBotId ? bots[selectedBotId] : null;
  },

  setChartData: (botId, chartData) => {
    set((state) => ({
      bots: {
        ...state.bots,
        [botId]: {
          ...state.bots[botId],
          chartData,
        },
      },
    }));
  },

  removeBot: (botId) => {
    const botsCopy = { ...get().bots };
    delete botsCopy[botId];
    set({ bots: botsCopy });
  },

  // ✅ Yeni fonksiyon: Analiz verilerini çek ve store'a ekle
  fetchAndStoreBotAnalysis: async (botId) => {
    try {
      // axios.defaults.withCredentials = true; // api instance already handles this

      const response = await api.get(`/bots/${botId}/analysis`);

      const botData = response.data;

      get().addOrUpdateBot(botId, {
        ...botData,
        chartData: botData.pnl_data || [],
      });
    } catch (error) {
      console.error("Bot analiz verisi çekilemedi:", error);
    }
  },
}));

export default useBotExamineStore;
