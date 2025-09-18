// store/adminStore.js
import { create } from "zustand";
import * as adminSupportApi from "@/api/support/admin";

export const useAdminSupportStore = create((set, get) => ({
  tickets: [],
  moderators: [],
  loading: false,
  error: null,

  fetchTickets: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const tickets = await adminSupportApi.getAdminTickets(params);
      set({ tickets, loading: false });
    } catch (err) {
      console.error("fetchTickets error:", err);
      set({ error: err?.response?.data || String(err), loading: false });
    }
  },

  fetchModerators: async () => {
    set({ error: null });
    try {
      const mods = await adminSupportApi.getModerators();
      set({ moderators: mods });
    } catch (err) {
      console.error("fetchModerators error:", err);
      set({ error: err?.response?.data || String(err) });
    }
  },

  assignTicket: async (ticketId, moderatorIdLike) => {
    set({ loading: true, error: null });
    try {
      const moderatorId = Number(moderatorIdLike);
      await adminSupportApi.assignTicket(ticketId, moderatorId);

      // Moderatör bilgisini listeden bul (UI’de isim/e-posta göstermek için)
      const { moderators } = get();
      const mod = moderators.find((m) => Number(m.id) === moderatorId);

      // optimistic update: hem assignments hem assigned_moderator güncelleniyor
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                assignments: [{ assigned_to: moderatorId }], // backward-compat
                assigned_moderator: mod
                  ? { id: mod.id, name: mod.name, email: mod.email }
                  : { id: moderatorId, name: null, email: null },
              }
            : t
        ),
        loading: false,
      }));

      // İstersen taze veri çek (response şeman değişirse gerçek kaynak olur)
      get().fetchTickets();
    } catch (err) {
      console.error("assignTicket error:", err);
      set({ error: err?.response?.data || String(err), loading: false });
      throw err;
    }
  },

  unassignTicket: async (ticketId) => {
    set({ loading: true, error: null });
    try {
      await adminSupportApi.unassignTicket(ticketId);
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === ticketId
            ? { ...t, assignments: [], assigned_moderator: null }
            : t
        ),
        loading: false,
      }));
    } catch (err) {
      console.error("unassignTicket error:", err);
      set({ error: err?.response?.data || String(err), loading: false });
      throw err;
    }
  },

  // ↓↓↓ YENİ: detay
  fetchTicketDetail: async (ticketId) => {
    set({ loading: true, error: null });
    try {
      const t = await adminSupportApi.getAdminTicketDetail(ticketId);
      set({ currentTicket: t, loading: false });
      return t;
    } catch (err) {
      set({ error: err?.response?.data || String(err), loading: false });
      throw err;
    }
  },

  // ↓↓↓ YENİ: moderatör/adminden mesaj
  replyToTicket: async (ticketId, { message, is_internal = false }) => {
    try {
      const msg = await adminSupportApi.addAdminMessage(ticketId, {
        message,
        is_internal,
      });
      // optimistic: currentTicket içindeki mesaja ekle
      set((state) => {
        if (state.currentTicket?.id !== ticketId) return state;
        return {
          currentTicket: {
            ...state.currentTicket,
            messages: [...(state.currentTicket.messages || []), msg],
          },
        };
      });
      return msg;
    } catch (err) {
      set({ error: err?.response?.data || String(err) });
      throw err;
    }
  },

  updateTicketStatus: async (ticketId, status) => {
    set({ error: null });
    try {
      await adminSupportApi.updateTicketStatus(ticketId, status);
      set((state) => ({
        tickets: state.tickets.map((t) =>
          t.id === ticketId ? { ...t, status } : t
        ),
      }));
    } catch (err) {
      console.error("updateTicketStatus error:", err);
      set({ error: err?.response?.data || String(err) });
      throw err;
    }
  },

}));
