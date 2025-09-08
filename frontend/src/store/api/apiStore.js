// src/store/api/apiStore.js
import { create } from 'zustand';
import {
  createApiKey,
  getApiKeys,
  deleteApiKeyCascade, // YENİ
  updateApiKey,
  changeDefaultApi,
  getApiBots,          // YENİ
} from '../../api/apiKeys';
import { toast } from 'react-toastify';

const useApiStore = create((set, get) => ({
  apiList: [],

  loadApiKeys: async () => {
    try {
      const keys = await getApiKeys();
      if (Array.isArray(keys)) set({ apiList: keys });
    } catch (e) { console.error(e); }
  },

  addApi: async (apiData) => {
    try {
      const result = await createApiKey(apiData);
      if (result) {
        set((state) => ({
          apiList: [
            ...state.apiList,
            {
              ...apiData,
              id: result.id,
              spot_balance: Number(apiData.spot_balance || 0),
              futures_balance: Number(apiData.futures_balance || 0),
            },
          ],
        }));
        toast.success("API eklendi.", { position: "top-center", autoClose: 2000 });
      }
    } catch (error) {
      if (error.message === "Bu API zaten ekli.") {
        toast.error("Bu API zaten eklenmiş!", { position: "top-center" });
      } else {
        toast.error("API eklenirken bir hata oluştu.", { position: "top-center" });
      }
    }
  },

  // YENİ: modal açıldığında botları çekmek için
  fetchApiBots: async (apiId) => {
    try { return await getApiBots(apiId); }
    catch (e) { console.error(e); return []; }
  },

  // YENİ: cascade delete
  deleteApiCascade: async (index) => {
    const apiToDelete = get().apiList[index];
    if (!apiToDelete) return;
    const res = await deleteApiKeyCascade(apiToDelete.id);

    set((state) => {
      let list = state.apiList.filter((_, i) => i !== index);
      if (res?.default_reassigned_to) {
        list = list.map(a => ({ ...a, default: a.id === res.default_reassigned_to }));
      }
      return { apiList: list };
    });

    toast.success("API ve bağlı botlar silindi.", { position: "top-center", autoClose: 2200 });
  },

  updateApi: async (id, name) => {
    try {
      const result = await updateApiKey(id, name);
      if (result) {
        set((state) => ({
          apiList: state.apiList.map((api) => (api.id === id ? { ...api, name } : api)),
        }));
      }
    } catch (e) { console.error(e); }
  },

  setDefaultApi: async (id) => {
    try {
      await changeDefaultApi(id);
      set((state) => ({
        apiList: state.apiList.map(api => ({ ...api, default: api.id === id })),
      }));
      toast.success("Default API güncellendi.", { position: "top-center", autoClose: 2200 });
    } catch (e) {
      const msg = e?.response?.data?.detail || "Default API değiştirilemedi.";
      toast.error(msg, { position: "top-center" });
    }
  },
}));

export default useApiStore;
