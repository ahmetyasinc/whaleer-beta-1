import axios from 'axios';
import useApiStore from '@/store/api/apiStore';
import useStrategyStore from '@/store/indicator/strategyStore';

axios.defaults.withCredentials = true;

export const getBots = async () => {
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/get-bots/`);
    console.log("Botlar başarıyla alındı:", response.data);

    const { apiList } = useApiStore.getState();
    const { all_strategies } = useStrategyStore.getState();

    const formattedData = response.data.map(item => {
      const [startTime, endTime] = item.active_hours.split('-');

      const apiName = apiList.find(api => api.id === item.api_id)?.name || 'Bulunamadı';
      const strategyName = all_strategies.find(strategy => strategy.id === item.strategy_id)?.name || 'Bulunamadı';
      return {
        id: item.id,
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
        balance: item.initial_usd_value,
        total_balance: item.balance,
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
    const selectedStrategy = strategies.find((item) => String(item.id) === String(botData.strategy));

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
      balance: Number(botData.balance),
    };

    console.log("Sunucuya gönderilen veri:", payload);

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/create-bots/`,
      payload
    );

    console.log("Bot başarıyla oluşturuldu:", response.data);
    return response.data;

  } catch (error) {
    console.error("Bot oluşturulurken hata:", error);
    throw error;
  }
};

export const updateBot = async (id, botData) => {
  try {
    const apiList = useApiStore.getState().apiList;
    const strategies = useStrategyStore.getState().all_strategies;

    const selectedApi = apiList.find((item) => item.name === botData.api);
    const selectedStrategy = strategies.find((item) => String(item.name) === String(botData.strategy));

    if (!selectedApi || !selectedStrategy) {
      throw new Error('Geçersiz API veya strateji seçimi.');
    }

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
      balance: Number(botData.balance),
    };

    console.log("Güncelleme için gönderilen veri:", payload);
    const response = await axios.put(
      `${process.env.NEXT_PUBLIC_API_URL}/api/update-bot/${id}/`,
      payload
    );

    console.log("Bot başarıyla güncellendi:", response.data);
    return response.data;

  } catch (error) {
    console.error("Bot güncellenirken hata:", error);
    throw error;
  }
};

export const deleteBot = async (id) => {
  try {
    const response = await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${id}`);
    console.log("Bot başarıyla silindi:", response.data);
    return response.data;
  } catch (error) {
    console.error("Bot silinirken hata:", error);
    throw error;
  }
};

export const toggleBotActiveApi = async (id, isActive) => {
  try {
    const endpoint = isActive ? "deactivate" : "activate";
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/bots/${id}/${endpoint}`);
    console.log(`Bot başarıyla ${isActive ? "pasif" : "aktif"} hale getirildi:`, response.data);
    return response.data;
  } catch (error) {
    console.error("Bot durumu değiştirilirken hata:", error);
    throw error;
  }
};

