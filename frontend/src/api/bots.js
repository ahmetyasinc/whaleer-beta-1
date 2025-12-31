import axios from 'axios';
import useApiStore from '@/store/api/apiStore';
import useStrategyStore from '@/store/indicator/strategyStore';

axios.defaults.withCredentials = true;

export const getBots = async () => {
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/get-bots`);
    console.log("getBots response:", response.data);
    const { apiList } = useApiStore.getState();
    const { all_strategies } = useStrategyStore.getState();

    const formattedData = response.data.map(item => {
      const [startTime, endTime] = item.active_hours.split('-');

      const apiName = apiList.find(api => api.id === item.api_id)?.name;
      const strategyName = all_strategies.find(strategy => strategy.id === item.strategy_id)?.name || 'Not Found';
      return {
        id: item.id,
        user_id: item.user_id,
        name: item.name,
        isActive: item.active,
        days: item.active_days,
        startTime,
        endTime,
        api: apiName,
        strategy: strategyName,
        candleCount: item.candle_count,
        createdAt: item.created_at,
        period: item.period,
        cryptos: item.stocks,
        initial_usd_value: item.initial_usd_value,
        current_usd_value: item.current_usd_value,
        type: item.bot_type,
        for_sale: item.for_sale,
        for_rent: item.for_rent,
        sell_price: item.sell_price,
        rent_price: item.rent_price,
        revenue_wallet : item.revenue_wallet,
        acquisition_type: item.acquisition_type,
        rent_expires_at: item.rent_expires_at,
        enterOnCurrentSignal: item.enter_on_start,
        description: item.description,
        profit_share_only: item.is_profit_share,   // kardan komisyon modu
        deposit_balance: item.deposit,           // depozito bakiyesi
      };
    });

    return formattedData;
  } catch (error) {
    console.error("Botlar alınırken hata:", error);
    throw error;
  }
};

export const createBot = async (botData) => {
  try {
    // api_id ve strategy_id'yi isimlerden bul
    const apiList = useApiStore.getState().apiList;
    const strategies = useStrategyStore.getState().all_strategies;

    const selectedApi = apiList.find((item) => item.name === botData.api);
    let selectedStrategy;
    if (botData.strategy && typeof botData.strategy === 'string') {
      selectedStrategy = strategies.find((item) => String(item.name) === String(botData.strategy));
    } else if (typeof botData.strategy === 'object' && botData.strategy.id) {
      selectedStrategy = botData.strategy;
    }

    if (!selectedApi || !selectedStrategy) {
      throw new Error('Geçersiz API veya strateji seçimi.');
    }

    // Yeni formatta veri oluştur
    const payload = {
      name: botData.name,
      strategy_id: selectedStrategy.id,
      api_id: selectedApi.id,
      period: botData.period,
      stocks: botData.cryptos,
      active: botData.isActive,
      candle_count: botData.candleCount,
      active_days: botData.days,
      active_hours: `${botData.startTime}-${botData.endTime}`,
      initial_usd_value: Number(botData.initial_usd_value),
      current_usd_value: Number(botData.initial_usd_value),
      maximum_usd_value: Number(botData.initial_usd_value),
      balance: Number(botData.balance),
      bot_type: botData.type || {},  // Yeni alan
      enter_on_start: botData.enterOnCurrentSignal || false
    };

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/create-bots`,
      payload
    );
    return response.data;

  } catch (error) {
    console.error("Bot oluşturulurken hata:", error);
    throw error;
  }
};

export const updateBotDepositBalance = async (id, deposit_balance) => {
  try {
    const res = await axios.patch(
      `${process.env.NEXT_PUBLIC_API_URL}/bots/${id}/deposit-balance`,
      { deposit_balance }
    );
    return res.data; // { id, deposit_balance }
  } catch (error) {
    console.error("Deposit balance güncellenirken hata:", error);
    throw error;
  }
};

export const updateBot = async (id, botData) => {
  try {
    // 🔹 SADECE deposit_balance güncellenecekse:
    // backende gitme, direkt return et (store local state'i zaten merge ediyor).
    console.log("updateBot called with:", id); // DEBUG
    console.log("updateBot botData:", botData); // DEBUG
    if (
      botData &&
      Object.keys(botData).length === 1 &&
      Object.prototype.hasOwnProperty.call(botData, "deposit_balance")
    ) {
      // Burada axios çağrısı yok; sadece "başarılı" gibi davranıyoruz.
      return { id, ...botData };
    }

    // 🔹 Normal (tam) update flow:
    const apiList = useApiStore.getState().apiList;
    const strategies = useStrategyStore.getState().all_strategies;

    const selectedApi = apiList.find((item) => item.name === botData.api);
    let selectedStrategy;
    if (botData.strategy && typeof botData.strategy === 'string') {
      selectedStrategy = strategies.find((item) => String(item.name) === String(botData.strategy));
    } else {
      selectedStrategy = strategies.find((item) => String(item.id) === String(botData.strategy));
    }

    if (!selectedApi) {
      throw new Error('Unvalid API.');
    }

    let selected_strategy_id = null;
    if (selectedStrategy) {
      selected_strategy_id = selectedStrategy.id;
    }

    const payload = {
      name: botData.name,
      strategy_id: selected_strategy_id,
      api_id: selectedApi.id,
      period: botData.period,
      stocks: botData.cryptos,
      active: botData.isActive,
      candle_count: botData.candleCount,
      active_days: botData.days,
      active_hours: `${botData.startTime}-${botData.endTime}`,
      initial_usd_value: Number(botData.initial_usd_value),
      current_usd_value: Number(botData.initial_usd_value),
      maximum_usd_value: Number(botData.initial_usd_value),

      bot_type: botData.bot_type || {},
    };

    const response = await axios.put(
      `${process.env.NEXT_PUBLIC_API_URL}/update-bot/${id}`,
      payload
    );
    console.log("updateBot response:", response.data); // DEBUG
    return response.data;

  } catch (error) {
    console.error("Bot güncellenirken hata:", error);
    throw error;
  }
};


export const deleteBot = async (id) => {// GELİŞTİRİCİ MODU
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/bots/delete/${id}`); //const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/bots/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error occured while deleting:", error);
    throw error;
  }
};

export const shutdownBots = async ({ scope = "bot", id }) => {
  // scope: "bot" | "api" | "user"
  if (!id) throw new Error("shutdownBots: id gerekli.");
  const url = `${process.env.NEXT_PUBLIC_API_URL}/shutdown/bots`;
  const { data } = await axios.post(url, { scope, id });
  // beklenen response örn: { affected_bot_ids: [..], closed_positions: 5 }
  return data;
};

export const toggleBotActiveApi = async (id, isActive) => {
  try {
    const endpoint = isActive ? "deactivate" : "activate";
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/bots/${id}/${endpoint}`);
    return response.data;
  } catch (error) {
    console.error("Bot durumu değiştirilirken hata:", error);
    throw error;
  }
};

export async function patchBotListing(botId, payload) {
  console.log("patchBotListing called:", botId, payload); // DEBUG
  const { data } = await axios.patch(
    `${process.env.NEXT_PUBLIC_API_URL}/bots/${botId}/listing`,
    payload,
    { withCredentials: true }
  );
  return data;
}

export async function acquireBot(botId, payload /* { action: 'buy'|'rent', price_paid: number, tx: string, rent_duration_days?: number } */) {
  const { data } = await axios.post(
    `${process.env.NEXT_PUBLIC_API_URL}/bots/${botId}/acquire`,
    payload,
    { withCredentials: true }
  );
  return data;
}
