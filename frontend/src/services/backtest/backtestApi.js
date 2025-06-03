import axios from 'axios';

axios.defaults.withCredentials = true;

export const runBacktestApi = async ({ strategy, period, crypto }) => {
  try {
    strategy= strategy.id
    console.log(crypto)
    //crypto = crypto.binance_symbol
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/run-backtest/`,
      {
        strategy,
        period,
        crypto,
      }
    );
    return response.data;
  } catch (error) {
    console.error("Backtest API hatası:", error);
    throw error;
  }
};

export const saveArchivedBacktest = async (backtestData) => {
  console.log("Arşivleme verisi:", backtestData);
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
}

export const fetchArchivedBacktests = async () => {
  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/archived-backtests/`
    );
    console.log("Arşivlenmiş backtestler:", response.data);
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