import api from '@/api/axios';

// axios.defaults.withCredentials = true;

export const post_follow_bot = async (bot_id) => {
  try {
    const response = await api.post(
      "/bot/follow",
      { bot_id }
    );
    return response.data;
  } catch (error) {
    console.error('post_follow_bot error:', error.response?.data || error.message);
    throw error;
  }
};
