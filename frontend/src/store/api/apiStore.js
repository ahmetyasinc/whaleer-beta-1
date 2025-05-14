import { create } from 'zustand';
import { createApiKey, getApiKeys } from '../../api/apiKeys';

const useApiStore = create((set) => ({
  apiList: [],

  loadApiKeys: async () => {
    try {
      const keys = await getApiKeys();
      if (Array.isArray(keys)) {
        set({ apiList: keys });
      } else {
        console.warn("Beklenmeyen veri formatı:", keys);
      }
    } catch (error) {
      console.error("API Key'ler yüklenirken hata:", error);
    }
  },

  addApi: async (apiData) => {
    try {
      console.log(apiData)
      const result = await createApiKey(apiData);
  
      if (result) {
        set((state) => ({
          apiList: [...state.apiList, apiData],
        }));
      } else {
        console.warn("API'den boş sonuç döndü, state güncellenmedi.");
      }
    } catch (error) {
      console.error("API ekleme sırasında hata:", error);
      // İstersen hata durumunu state'e de yazabilirsin
    }
  },
  

  deleteApi: (name) =>
    set((state) => ({
      apiList: state.apiList.filter((api) => api.name !== name),
    })),
    

  updateApi: (name, updatedData) =>
    set((state) => ({
      apiList: state.apiList.map((api) =>
        api.name === name ? { ...api, ...updatedData } : api
      ),
    })),
}));

export default useApiStore;
