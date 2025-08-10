// stores/profile/lineChartStore.js
import { create } from "zustand";
import axios from "axios";

const useLineChartStore = create((set) => ({
  lineData: [],
  loading: false,
  error: null,

  fetchLineData: async () => {
    set({ loading: true, error: null });
    try {
      axios.defaults.withCredentials = true;
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/profile_snapshots`
      );

      // Map to time-series points and sanitize
      const pts = res.data.map((p) => ({
        x: new Date(p.timestamp),                // <-- Date object for time scale
        y: Number(p.user_usd_value || 0),
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
