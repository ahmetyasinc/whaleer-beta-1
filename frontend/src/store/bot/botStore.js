import { create } from 'zustand';
import { getBots, createBot, updateBot, toggleBotActiveApi, deleteBot, shutdownBots } from '../../api/bots';
import useApiStore from '@/store/api/apiStore';
import useStrategyStore from '@/store/indicator/strategyStore';
import { useAccountDataStore } from "@/store/profile/accountDataStore";
import { useProfileStore } from "@/store/profile/profileStore";
import { toast } from "react-toastify";
import { updateBotDepositBalance } from "@/api/bots";
export const useBotStore = create((set) => ({
  bots: [],

  hydrateFromProfileMaps: (botsByApiId) => {
    const merged = Object.values(botsByApiId || {}).flat();
    set({ bots: merged });
  },

  addBot: async (botData) => {
    try {
      const createdBot = await createBot(botData);
      if (!createdBot || !createdBot.id) return;

      const apiList = useApiStore.getState().apiList || [];
      const strategies = useStrategyStore.getState().all_strategies || [];

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
        initial_usd_value: createdBot.initial_usd_value,
        total_balance: matchedApi?.balance || 0,
        acquisition_type: createdBot.acquisition_type,
        bot_type: createdBot.bot_type,
        current_usd_value: createdBot.current_usd_value,
        enterOnCurrentSignal: createdBot.enter_on_start,
      };

      // local cache
      set((state) => ({ bots: [...state.bots, newBot] }));

      // tek kaynaklı görünüm için accountDataStore’u güncelle
      const activeApiId = useProfileStore.getState().activeApiId;
      const { botsByApiId } = useAccountDataStore.getState();
      const rawNew = {
        id: createdBot.id,
        name: createdBot.name,
        api_id: createdBot.api_id,
        created_at: createdBot.created_at,
        status: createdBot.active ? "active" : "inactive",
      };
      useAccountDataStore.setState({
        botsByApiId: {
          ...botsByApiId,
          [activeApiId]: [...(botsByApiId[activeApiId] || []), rawNew],
        }
      });
    } catch (error) {
      console.error("Bot eklenirken hata:", error);
    }
  },

  removeBot: async (id) => {
    try {
      await deleteBot(id);
      set((state) => ({ bots: state.bots.filter((bot) => bot.id !== id) }));

      const activeApiId = useProfileStore.getState().activeApiId;
      const { botsByApiId } = useAccountDataStore.getState();
      useAccountDataStore.setState({
        botsByApiId: {
          ...botsByApiId,
          [activeApiId]: (botsByApiId[activeApiId] || []).filter(b => b.id !== id),
        }
      });
    } catch (error) {
      console.error("Bot silinirken hata:", error);
    }
  },

  // TÜM "shutdown" senaryoları (bot/api/user) için tek giriş noktası
  shutDownBot: async ({ scope = "bot", id } = {}) => {
    try {
      const res = await shutdownBots({ scope, id });
      const affected = Array.isArray(res?.affected_bot_ids) ? res.affected_bot_ids : [];

      if (affected.length) {
        // 1) UI'daki bot kartlarını pasif yap
        set((state) => ({
          bots: state.bots.map(b => affected.includes(b.id) ? { ...b, isActive: false } : b)
        }));

        // 2) Tek kaynaklı görünüm için accountDataStore'ı güncelle (opsiyonel)
        const { botsByApiId } = useAccountDataStore.getState();
        const updated = Object.fromEntries(
          Object.entries(botsByApiId || {}).map(([apiId, list]) => [
            apiId,
            (list || []).map(x =>
              affected.includes(x.id) ? { ...x, status: "inactive" } : x
            ),
          ])
        );
        useAccountDataStore.setState({ botsByApiId: updated });
      }

      const msg = res?.message || "Seçilen kapsamda bot(lar) kapatıldı.";
      toast.success(msg, { position: "top-center", autoClose: 2200 });
      return res;
    } catch (err) {
      console.error("Shutdown error:", err);
      toast.error(err?.response?.data?.detail || "Kapatma işlemi başarısız.", { position: "top-center" });
      throw err;
    }
  },

  setBotDepositBalance: async (botId, newBalance) => {
    try {
      // 1) Veritabanında güncelle
      const result = await updateBotDepositBalance(botId, newBalance);
      // result: { id, deposit_balance }

      // 2) Store'da güncelle
      set((state) => ({
        bots: state.bots.map((bot) =>
          bot.id === botId
            ? { ...bot, deposit_balance: result.deposit_balance }
            : bot
        ),
      }));
    } catch (err) {
      console.error("setBotDepositBalance hata:", err);
      // istersen burada toast da atabilirsin
    }
  },

  updateBot: async (updatedBot) => {
    try {
      console.log("updateBot botData:", updatedBot); // DEBUG
      //console.log("Updating bot with data:", updatedBot);
      const result = await updateBot(updatedBot.id, updatedBot);
      if (!result || !result.id) return;

      const apiList = useApiStore.getState().apiList || [];
      const strategies = useStrategyStore.getState().all_strategies || [];
      const matchedApi = apiList.find((api) => api.id === result.api_id);
      const matchedStrategy = strategies.find((s) => s.id === result.strategy_id);
      //console.log("result:", result);
      const newBot = {
        id: result.id,
        name: result.name,
        api: matchedApi?.name || "",
        strategy: String(matchedStrategy?.name || ""),
        period: result.period,
        isActive: result.active,
        days: result.active_days,
        startTime: result.active_hours?.split('-')[0] || "",
        endTime: result.active_hours?.split('-')[1] || "",
        cryptos: result.stocks || [],
        candleCount: result.candle_count,
        initial_usd_value: result.initial_usd_value,
        total_balance: matchedApi?.balance || 0,
        acquisition_type: result.acquisition_type,
        type: result.bot_type,
        rent_expires_at: result.rent_expires_at,
        current_usd_value: result.current_usd_value,
      };

      set((state) => ({
        bots: state.bots.map((bot) => (bot.id === result.id ? newBot : bot)),
      }));

      const activeApiId = useProfileStore.getState().activeApiId;
      const { botsByApiId } = useAccountDataStore.getState();
      const rawUpdated = {
        id: result.id,
        name: result.name,
        api_id: result.api_id,
        created_at: result.created_at,
        status: result.active ? "active" : "inactive",
      };
      useAccountDataStore.setState({
        botsByApiId: {
          ...botsByApiId,
          [activeApiId]: (botsByApiId[activeApiId] || []).map(b => b.id === result.id ? rawUpdated : b),
        }
      });
    } catch (error) {
      console.error("Bot güncellenirken hata:", error);
    }
  },

  toggleBotActive: async (id) => {
    try {
      const bot = useBotStore.getState().bots.find((b) => b.id === id);
      if (!bot) return;

      await toggleBotActiveApi(id, bot.isActive);

      set((state) => ({
        bots: state.bots.map((b) => (b.id === id ? { ...b, isActive: !b.isActive } : b)),
      }));

      const activeApiId = useProfileStore.getState().activeApiId;
      const { botsByApiId } = useAccountDataStore.getState();
      useAccountDataStore.setState({
        botsByApiId: {
          ...botsByApiId,
          [activeApiId]: (botsByApiId[activeApiId] || []).map(b =>
            b.id === id ? { ...b, status: bot.isActive ? "inactive" : "active" } : b
          ),
        }
      });
    } catch (error) {
      console.error("Bot aktiflik değiştirilirken hata:", error);
    }
  },

  loadBots: async () => {
    try {
      const userBots = await getBots();
      if (Array.isArray(userBots)) {
        set({ bots: userBots });
      } else {
        console.warn("Beklenmeyen veri formatı:", userBots);
      }
    } catch (error) {
      console.error("API Key'ler yüklenirken hata:", error);
    }
  },

  deactivateAllBots: async () => {
    try {
      const state = useBotStore.getState();
      const activeBots = state.bots.filter(bot => bot.isActive);

      for (const bot of activeBots) {
        await toggleBotActiveApi(bot.id, true);
      }

      set((state) => ({
        bots: state.bots.map(bot => ({ ...bot, isActive: false })),
      }));

      const activeApiId = useProfileStore.getState().activeApiId;
      const { botsByApiId } = useAccountDataStore.getState();
      useAccountDataStore.setState({
        botsByApiId: {
          ...botsByApiId,
          [activeApiId]: (botsByApiId[activeApiId] || []).map(b => ({ ...b, status: "inactive" })),
        }
      });
    } catch (error) {
      console.error("Tüm botları durdururken hata:", error);
    }
  },
}));
