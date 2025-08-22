// src/store/profile/profileStore.js
import { create } from "zustand";
import { fetchMobileProfile } from "../../api/profile";
import { computePerfSummary } from "../../utils/performance";

const initialState = {
  loading: false,
  error: null,
  data: null,
  selectedApiId: null,
  activeTab: "performance",
  perfSummary: null,
};

const useProfileStore = create((set, get) => ({
  ...initialState,

  reset: () => set({ ...initialState }),  
  
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedApiId: (id) => {
    const api = get().data?.apis?.find(a => a.api.id === id);
    const perfSummary = api ? computePerfSummary(api.snapshots) : null;
    set({ selectedApiId: id, perfSummary });
  },

  fetchProfile: async (opts = {}) => {
    const { keepSelection = false, currentSelectedId = null } = opts;

    set({ loading: true, error: null });
    try {
      const data = await fetchMobileProfile();

      // default api
      const def = data.apis?.find((a) => a.api.default) || data.apis?.[0] || null;

      // Eğer mevcut seçimi korumak istiyorsak ve yeni listede hâlâ varsa onu baz al
      let nextSelectedId = def?.api?.id || null;
      if (keepSelection && currentSelectedId) {
        const stillExists = data.apis?.some((a) => a.api.id === currentSelectedId);
        if (stillExists) nextSelectedId = currentSelectedId;
      }

      const selectedApi = data.apis?.find((a) => a.api.id === nextSelectedId) || null;
      const perfSummary = selectedApi ? computePerfSummary(selectedApi.snapshots) : null;

      set({
        data,
        selectedApiId: nextSelectedId,
        perfSummary,
      });
    } catch (e) {
      set({ error: e?.message || "Failed to load profile" });
    } finally {
      set({ loading: false });
    }
  },
}));

export default useProfileStore;
