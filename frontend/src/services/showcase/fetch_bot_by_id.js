import api from '@/api/axios';

// axios.defaults.withCredentials = true;

export const fetch_bot_by_id = async (botId) => {
  try {
    const response = await api.get(
      `/showcase/bot/${botId}`
    );
    return response.data;
  } catch (error) {
    console.error('fetch_bot_by_id error:', error);
    throw error;
  }
};
