import axios from 'axios';

axios.defaults.withCredentials = true;

export const runBacktestApi = async ({ strategy, period, crypto, initial_balance }) => {
  try {
    strategy = strategy.id;

    const payload = { strategy, period, crypto };
    if (typeof initial_balance === 'number' && Number.isFinite(initial_balance)) {
      payload.initial_balance = initial_balance; // only send if provided/valid
    }

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/run-backtest/`,
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
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/archive-backtest/`,
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
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/archived-backtests/`
    );
    return response.data;
  } catch (error) {
    console.error("Arşivlenmiş backtestleri getirme hatası:", error);
    throw error;
  }
};

export const deleteArchivedBacktestApi = async (id) => {
  try {
    const response = await axios.delete(
      `${process.env.NEXT_PUBLIC_API_URL}/api/delete-backtest/${id}`
    );
    return response.data;
  } catch (error) {
    console.error("Arşivlenmiş backtest silme hatası:", error);
    throw error;
  }
};
