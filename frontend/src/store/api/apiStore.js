import { create } from 'zustand';
import { createApiKey, getApiKeys, deleteApiKey, updateApiKey } from '../../api/apiKeys';
import { toast } from 'react-toastify';

const useApiStore = create((set,get) => ({
  apiList: [],

  loadApiKeys: async () => {
    try {
      const keys = await getApiKeys();
      console.log("Yüklenen API Key'ler:", keys);
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
          apiList: [...state.apiList, { ...apiData, id: result.id }],
        }));
          toast.success("Bakiye doğrulandı! API Ekleniyor.", {
          position: "top-center",
          autoClose: 2500,
        });
      } else {
        console.warn("API'den boş sonuç döndü, state güncellenmedi.");
      }
    } catch (error) {
      // 400 için kullanıcıya özel mesaj döndür
      if (error.message === "Bu API zaten ekli.") {
        toast.error("Bu API zaten eklenmiş!", {
          position: "top-center",
          autoClose: 3000,
        });
      } else {
        toast.error("API eklenirken bir hata oluştu.", {
          position: "top-center",
          autoClose: 3000,
        });
      }
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
