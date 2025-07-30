import axios from 'axios';

axios.defaults.withCredentials = true;

export const post_follow_bot = async (bot_id) => {
  try {
    const response = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/bot/follow`,
      { bot_id }
    );
    return response.data;
  } catch (error) {
    console.error('post_follow_bot error:', error.response?.data || error.message);
    throw error;
  }
};
