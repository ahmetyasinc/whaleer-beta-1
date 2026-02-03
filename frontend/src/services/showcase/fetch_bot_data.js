import api from '@/api/axios';

// axios.defaults.withCredentials = true;

export const fetch_bot_data = async (limit, filters = {}) => {
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
      profit_margin_unit: null,
      min_uptime_minutes: null,
      demand: null,
      limit: limit || 5,
      ...filters, // gelen filtreleri override et
    };
    const response = await api.post(
      "/showcase/newdata",
      payload
    );
    return response.data;
  } catch (error) {
    console.error('fetch_bot_data error:', error);
    throw error;
  }
};

