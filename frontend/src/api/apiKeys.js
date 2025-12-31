import axios from 'axios';
import { toast } from 'react-toastify';

axios.defaults.withCredentials = true;

export const createApiKey = async (apiData) => {
  try {
    const payload = {
      exchange: apiData.exchange,
      api_name: apiData.name,

      // HMAC
      api_key: apiData.key || null,
      api_secret: apiData.secretkey || null,

      // ED
      ed_public: apiData.edKey || null,          // "ED Key" kısa string
      ed_public_pem: apiData.edPublicPem || null,
      ed_private_pem: apiData.edPrivatePem || null,

      // balances
      spot_balance: Number(apiData.spot_balance || 0),
      futures_balance: Number(apiData.futures_balance || 0),
    };

    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/create-api/`, payload);
    return res.data; // { id }
  } catch (err) {
    if (err.response && err.response.status === 400) {
      throw new Error("Bu API zaten ekli.");
    }
    console.error("API Key oluşturulurken hata:", err);
    throw err;
    }
};


export const getApiKeys = async () => {
    try {
      const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/get-apis/`);  
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
          createdAt: createdDate,
          id: item.id,
          spot_balance: item.spot_usdt_balance || 0,
          futures_balance: item.futures_usdt_balance || 0, 
          default: item.default
        };
      });
  
      return formattedData;
    } catch (error) {
      console.error("API Key listesi alınırken hata:", error);
      throw error;
    }
};

export const changeDefaultApi = async (id) => {
  try {
    const res = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/change-default-api`, { id });
    return res.data;
  } catch (error) {
    console.error("Default API değiştirme hatası:", error);
    throw error;
  }
};

export const updateApiKey = async (id, name) => {
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/update-api/`, {
      id,
      name,
    });
    return response.data;
  } catch (error) {
    console.error("API Key güncellenirken hata:", error);
    throw error;
  }
};

export const getApiBots = async (apiId) => {
  const { data } = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}-bots/${apiId}`);
  return data; // [{id,name,active,strategy_id}, ...]
};

export const deleteApiKeyCascade = async (id) => {
  const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/delete-api/`, { id, cascade: true });
  return data; // { deleted_bots: [...], default_reassigned_to: 123 | null }
};

// (mevcut) deleteApiKey istersen kalsın, ama artık cascade'i kullanacağız
export const deleteApiKey = async (id) => {
  const { data } = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/delete-api/`, { id }); // cascade:false
  return data;
};
