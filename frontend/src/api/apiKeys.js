import axios from 'axios';

axios.defaults.withCredentials = true;

// API Key oluşturma fonksiyonu
export const createApiKey = async (apiData) => {
    try {
      const formattedData = {
        exchange: apiData.exchange,
        api_name: apiData.name,
        api_key: apiData.key,
        api_secret: apiData.secretkey,
      };
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/create-api/`, formattedData);
      console.log("API Key oluşturuldu:", response.data);
      return response.data;
    } catch (error) {
      console.error("API Key oluşturulurken hata:", error);
      throw error;
    }
};

export const getApiKeys = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/get-apis/`);
      console.log("API Key listesi alındı:", response.data);
  
      const formattedData = response.data.map(item => {
        // created_at tarihini istediğin formata çevir
        const createdDate = item.created_at 
          ? new Date(item.created_at).toLocaleDateString('tr-TR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })
          : '';
  
        return {
          exchange: item.exchange,
          name: item.api_name,
          key: item.api_key,
          secretkey: item.api_secret,
          createdAt: createdDate,
          lastUsed: item.lastUsed || 'Never',
        };
      });
  
      return formattedData;
    } catch (error) {
      console.error("API Key listesi alınırken hata:", error);
      throw error;
    }
};


export const deleteApiKey = async (name) => {
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/delete-api/`, { name });
    console.log("API Key silindi:", response.data);
    return response.data;
  } catch (error) {
    console.error("API Key silinirken hata:", error);
    throw error;
  }
};
