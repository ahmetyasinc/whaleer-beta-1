// services/showcase/post_unfollow_bot.js
import api from '@/api/axios';

// axios.defaults.withCredentials = true;

export const post_unfollow_bot = async (bot_id) => {
  try {
    const response = await api.post(
      "/bot/unfollow",
      { bot_id }
    );
    return response.data;
  } catch (error) {
    console.error('post_unfollow_bot error:', error.response?.data || error.message);
    throw error;
  }
};
