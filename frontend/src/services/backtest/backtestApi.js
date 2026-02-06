import api from '@/api/axios';

// axios.defaults.withCredentials = true;

export const runBacktestApi = async ({ strategy, period, crypto, initial_balance }) => {
  try {
    strategy = strategy.id;
    console.log("Running backtest with:", { strategy, period, crypto, initial_balance });
    crypto = crypto?.binance_symbol;
    const payload = { strategy, period, crypto };
    if (typeof initial_balance === 'number' && Number.isFinite(initial_balance)) {
      payload.initial_balance = initial_balance; // only send if provided/valid
    }

    const response = await api.post(
      "/run-backtest/",
      payload
    );
    return response.data;
  } catch (error) {
    console.error("Backtest API hatası:", error);
    throw error;
  }
};

export const saveArchivedBacktest = async (backtestData) => {
  try {
    const response = await api.post(
      "/archive-backtest/",
      {
        commission: backtestData.commission,
        data: backtestData
      }
    );
    return response.data;
  } catch (error) {
    console.error("Arşivleme API hatası:", error);
    throw error;
  }
};

export const fetchArchivedBacktests = async () => {
  try {
    const response = await api.get(
      "/archived-backtests/"
    );
    return response.data;
  } catch (error) {
    console.error("Arşivlenmiş backtestleri getirme hatası:", error);
    throw error;
  }
};

export const deleteArchivedBacktestApi = async (id) => {
  try {
    const response = await api.delete(
      `/delete-backtest/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Arşivlenmiş backtest silme hatası:", error);
    throw error;
  }
};
