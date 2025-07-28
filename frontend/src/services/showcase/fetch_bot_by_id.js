import axios from 'axios';

axios.defaults.withCredentials = true;

export const fetch_bot_by_id = async (botId) => {
  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/showcase/bot/${botId}`
    );
    return response.data;
  } catch (error) {
    console.error('fetch_bot_by_id error:', error);
    throw error;
  }
};
