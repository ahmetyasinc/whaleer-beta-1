import api from '@/api/axios';

// axios.defaults.withCredentials = true;

export const fetch_followed_bots = async () => {
  try {
    const response = await api.get(
      "/user/following-bots"
    );
    return response.data;
  } catch (error) {
    console.error('fetch_followed_bots error:', error);
    throw error;
  }
};
