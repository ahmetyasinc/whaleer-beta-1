// stores/supportStore.js
import {create} from "zustand";
import * as supportApi from "@/api/support"; // yol projenizde farklıysa düzeltin

export const useSupportStore = create((set, get) => ({
  tickets: [],
  loading: false,
  error: null,

  fetchTickets: async (opts = {}) => {
    set({ loading: true, error: null });
    try {
      const data = await supportApi.getTickets(opts);
      // backend liste döndürüyorsa doğrudan ata
      set({ tickets: Array.isArray(data) ? data : [], loading: false });
    } catch (err) {
      console.error("fetchTickets hata:", err);
      set({ error: err?.response?.data || err.message, loading: false });
    }
  },

  createTicket: async ({ subject, message, priority = "normal", type = "user" }) => {
    set({ loading: true, error: null });
    try {
      const created = await supportApi.createTicket({ subject, message, priority, type });
      // optimistic update
      set((state) => ({ tickets: [created, ...state.tickets], loading: false }));
      return created;
    } catch (err) {
      console.error("createTicket hata:", err);
      set({ error: err?.response?.data || err.message, loading: false });
      throw err;
    }
  },
}));
