// stores/profile/lineChartStore.js
import { create } from "zustand";
import api from "@/api/axios";
import { useProfileStore } from "@/store/profile/profileStore";

const useLineChartStore = create((set) => ({
  lineData: [],
  loading: false,
  error: null,

  fetchLineData: async () => {
    set({ loading: true, error: null });
    try {
      // axios.defaults.withCredentials = true;

      // aktif api'yi profileStore'dan al
      const { activeApi } = useProfileStore.getState();
      if (!activeApi) {
        throw new Error("Aktif API seçili değil.");
      }

      const res = await api.post(
        "/api_snapshots",
        {
          api_id: activeApi.id, // payload içine koyduk
        }
      );

      // Map to time-series points and sanitize
      const pts = res.data.map((p) => ({
        x: new Date(p.timestamp),                 // Date object for chart
        y: Number(p.user_usd_value || 0),         // backendde user_usd_value döndürüyorduk
      }));

      // sort asc & dedupe by time
      pts.sort((a, b) => a.x - b.x);
      const dedup = [];
      const seen = new Set();
      for (const d of pts) {
        const t = d.x.getTime();
        if (!seen.has(t)) {
          seen.add(t);
          dedup.push(d);
        } else {
          dedup[dedup.length - 1] = d; // keep last for duplicate timestamps
        }
      }

      set({ lineData: dedup, loading: false });
    } catch (err) {
      console.error("Failed to fetch line data:", err);
      set({ error: err.message, loading: false });
    }
  },
}));

export default useLineChartStore;
