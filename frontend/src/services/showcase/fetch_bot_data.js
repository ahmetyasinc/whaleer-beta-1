import axios from 'axios';

axios.defaults.withCredentials = true;

export const fetch_bot_data = async () => {
  try {
    const payload = {
      bot_type: null,
      active: null,
      min_sell_price: null,
      max_sell_price: null,
      min_rent_price: null,
      max_rent_price: null,
      min_profit_factor: null,
      max_risk_factor: null,
      min_created_minutes_ago: null,
      min_trade_frequency: null,
      min_profit_margin: null,
      min_uptime_minutes: null,
      demand: null,
      limit: 5
    };

    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/showcase/newdata`,
      payload
    );
    console.log('fetch_bot_data response:', response.data);
    return response.data;
  } catch (error) {
    console.error('fetch_bot_data error:', error);
    throw error;
  }
};
