// stores/supportStore.js
import { create } from "zustand";
import * as supportApi from "@/api/support";

export const useSupportStore = create((set, get) => ({
  tickets: [],
  currentTicket: null,
  categories: [],
  loading: false,
  error: null,

  fetchCategories: async () => {
    try {
      const categories = await supportApi.getSupportCategories();
      set({ categories });
    } catch (err) {
      console.error("fetchCategories error:", err);
      set({ error: err.response?.data || err.message });
    }
  },

  fetchTickets: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const tickets = await supportApi.getTickets(params);
      set({ tickets, loading: false });
    } catch (err) {
      console.error("fetchTickets error:", err);
      set({ error: err.response?.data || err.message, loading: false });
    }
  },

  createTicket: async (ticketData) => {
    set({ loading: true, error: null });
    try {
      const newTicket = await supportApi.createTicket(ticketData);
      set((state) => ({
        tickets: [newTicket, ...state.tickets],
        currentTicket: newTicket,
        loading: false,
      }));
      return newTicket;
    } catch (err) {
      console.error("createTicket error:", err);
      set({ error: err.response?.data || err.message, loading: false });
      throw err;
    }
  },

  fetchTicket: async (ticketId) => {
    set({ loading: true, error: null });
    try {
      const ticket = await supportApi.getTicket(ticketId);
      set({ currentTicket: ticket, loading: false });
      return ticket;
    } catch (err) {
      console.error("fetchTicket error:", err);
      set({ error: err.response?.data || err.message, loading: false });
      throw err;
    }
  },

  addMessage: async (ticketId, message) => {
    try {
      const newMessage = await supportApi.addMessage(ticketId, message);
      set((state) => {
        if (state.currentTicket && state.currentTicket.id === ticketId) {
          return {
            currentTicket: {
              ...state.currentTicket,
              messages: [
                ...(state.currentTicket.messages || []),
                { ...newMessage, attachments: [] }, // ekler sonradan ilişecek
              ],
              updated_at: new Date().toISOString(),
            },
          };
        }
        return state;
      });
      return newMessage;
    } catch (err) {
      console.error("addMessage error:", err);
      set({ error: err.response?.data || err.message });
      throw err;
    }
  },

  // Yeni: yüklenen attachment'ı mevcut mesajın attachments dizisine ekle
  appendAttachmentToMessage: (ticketId, messageId, attachment) => {
    set((state) => {
      if (!state.currentTicket || state.currentTicket.id !== ticketId) return state;
      const msgs = (state.currentTicket.messages || []).map((m) =>
        m.id === messageId ? { ...m, attachments: [...(m.attachments || []), attachment] } : m
      );
      return { currentTicket: { ...state.currentTicket, messages: msgs } };
    });
  },

  closeTicket: async (ticketId, rating, feedback) => {
    try {
      await supportApi.closeTicket(ticketId, rating, feedback);
      set((state) => {
        const updatedTickets = state.tickets.map((t) =>
          t.id === ticketId ? { ...t, status: "closed", satisfaction_rating: rating, satisfaction_feedback: feedback } : t
        );
        const updatedCurrent =
          state.currentTicket && state.currentTicket.id === ticketId
            ? { ...state.currentTicket, status: "closed", satisfaction_rating: rating, satisfaction_feedback: feedback }
            : state.currentTicket;
        return { tickets: updatedTickets, currentTicket: updatedCurrent };
      });
    } catch (err) {
      console.error("closeTicket error:", err);
      set({ error: err.response?.data || err.message });
      throw err;
    }
  },
}));
