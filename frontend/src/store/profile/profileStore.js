import { create } from "zustand";
import axios from "axios";

export const useProfileStore = create((set, get) => ({
  apis: [],
  activeApi: null,     // camelCase
  active_api: null,    // alias (isteğinle uyumlu)

  apisStatus: "idle",  // idle | loading | success | error
  apisError: null,

  fetchApis: async () => {
    set({ apisStatus: "loading", apisError: null });
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/get-user-apis/`,
        { withCredentials: true }
      );
      const data = res.data || [];

      const defaultApi = data.find((a) => a.default) || data[0] || null;

      set({
        apis: data,
        activeApi: defaultApi,
        active_api: defaultApi, // alias senkron
        apisStatus: "success",
      });
      console.log("Fetched APIs:", data, defaultApi);
    } catch (err) {
      console.error("Failed to fetch APIs:", err);
      set({ apisStatus: "error", apisError: err?.message || "Unknown error" });
    }
  },

  setActiveApiById: (id) => {
    const { apis } = get();
    const selected = apis.find((a) => a.id === Number(id)) || null;
    set({ activeApi: selected, active_api: selected });
  },
}));
