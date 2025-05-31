import axios from 'axios';

// Çerezleri otomatik olarak isteğe dahil et
axios.defaults.withCredentials = true;

export const getStrategies = async () => {
  try {
    const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/all-strategies/`);

    // Backend'den dönen veriyi kategorilere ayır
    const tecnic_strategies = response.data.tecnic_strategies || [];
    const personal_strategies = response.data.personal_strategies || [];
    const public_strategies = response.data.public_strategies || [];

    return {
      tecnic: tecnic_strategies,
      personal: personal_strategies,
      public: public_strategies,
    };
  } catch (error) {
    console.error("Stratejiler alınırken hata oluştu:", error);
    return {
      tecnic: [],
      personal: [],
      public: [],
    };
  }
};
