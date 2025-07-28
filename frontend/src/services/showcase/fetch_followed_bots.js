import axios from 'axios';

axios.defaults.withCredentials = true;

export const fetch_followed_bots = async () => {
  try {
    const response = await axios.get(
      `${process.env.NEXT_PUBLIC_API_URL}/user/following-bots`
    );
    return response.data;
  } catch (error) {
    console.error('fetch_followed_bots error:', error);
    throw error;
  }
};
