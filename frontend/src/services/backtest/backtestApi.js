import axios from 'axios';

axios.defaults.withCredentials = true;

export const runBacktestApi = async ({ strategy, period, crypto }) => {
  try {
    strategy= strategy.id
    crypto = crypto.binance_symbol
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
