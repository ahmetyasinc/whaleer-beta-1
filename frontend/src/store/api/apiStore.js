import { create } from 'zustand';
import { createApiKey, getApiKeys, deleteApiKey, updateApiKey } from '../../api/apiKeys';

const useApiStore = create((set,get) => ({
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
  

  deleteApi: async (index) => {
    try {
      // 1. İlgili API nesnesini al
      const apiToDelete = get().apiList[index];
      if (!apiToDelete) {
        console.warn("Belirtilen index geçersiz:", index);
        return;
      }
      // 2. API isteğini gönder
      await deleteApiKey(apiToDelete.id);

      // 3. Başarılıysa state'ten çıkar
      set((state) => ({
        apiList: state.apiList.filter((_, i) => i !== index),
      }));

    } catch (error) {
      console.error("API silme işlemi başarısız:", error);
    }
  },

    

  updateApi: async (id, name) => {
    try {
      id = name.id || id; // Eğer name içinde id varsa onu kullan, yoksa mevcut id'yi kullan
      name = name.name || name; // Eğer name içinde name varsa onu kullan, yoksa mevcut name'i kullan
      const result = await updateApiKey(id, name);
      if (result) {
        set((state) => ({
          apiList: state.apiList.map((api) =>
            api.id === id ? { ...api, name } : api
          ),
        }));
      }
    } catch (error) {
      console.error("API güncelleme sırasında hata:", error);
    }
  },


}));

export default useApiStore;
