import axios from 'axios';
import { toast } from 'react-toastify';

axios.defaults.withCredentials = true;

export const createApiKey = async (apiData) => {
  try {
    const formattedData = {
      exchange: apiData.exchange,
      api_name: apiData.name,
      api_key: apiData.key,
      api_secret: apiData.secretkey,
    };
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/create-api/`, formattedData);
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      throw new Error("Bu API zaten ekli.");
    }
    console.error("API Key oluşturulurken hata:", error);
    throw error;
  }
};


export const getApiKeys = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/get-apis/`);  
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
          id: item.id,
          spot_balance: item.spot_balance || 0, // Eğer balance yoksa 0 olarak ayarla
          futures_balance: item.futures_balance || 0, // Eğer balance yoksa 0 olarak ayarla
        };
      });
  
      return formattedData;
    } catch (error) {
      console.error("API Key listesi alınırken hata:", error);
      throw error;
    }
};

export const deleteApiKey = async (id) => {
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/delete-api/`, { id });
    return response.data;
  } catch (error) {
    console.error("API Key silinirken hata:", error);
    throw error;
  }
};

export const updateApiKey = async (id, name) => {
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/update-api/`, {
      id,
      name,
    });
    return response.data;
  } catch (error) {
    console.error("API Key güncellenirken hata:", error);
    throw error;
  }
};

export const getTotalUSDBalance = async (key, secretkey) => {
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/get-balance/`, {
      key,
      secretkey,
    });
    return response.data.balance; // API'den dönen bakiyeyi döndür
  } catch (error) {
    toast.error("API Anahtarlarınızı Kontrol ediniz!", {
      position: "top-center",
      autoClose: 3500,
    });
    return null; // Hata durumunda null döndür
  }
};
