// stores/attachmentsStore.js
import {create} from "zustand";
import * as supportApi from "@/api/support";

export const useAttachmentsStore = create((set, get) => ({
  attachments: [],
  ticketAttachments: {}, // ticketId -> attachments mapping
  uploading: false,
  error: null,

  uploadAttachment: async (file, ticketId) => {
    set({ uploading: true, error: null });
    try {
      const saved = await supportApi.uploadAttachment(file, ticketId);
      set((state) => ({ 
        attachments: [...state.attachments, saved], 
        uploading: false 
      }));
      
      // Eğer ticketId varsa, o ticket'ın attachmentlarını da güncelle
      if (ticketId) {
        set((state) => ({
          ticketAttachments: {
            ...state.ticketAttachments,
            [ticketId]: [...(state.ticketAttachments[ticketId] || []), saved]
          }
        }));
      }
      
      return saved;
    } catch (err) {
      console.error("uploadAttachment hata:", err);
      set({ error: err?.response?.data || err.message, uploading: false });
      throw err;
    }
  },

  fetchTicketAttachments: async (ticketId) => {
    try {
      const attachments = await supportApi.getTicketAttachments(ticketId);
      set((state) => ({
        ticketAttachments: {
          ...state.ticketAttachments,
          [ticketId]: attachments
        }
      }));
      return attachments;
    } catch (err) {
      console.error("fetchTicketAttachments hata:", err);
      set({ error: err?.response?.data || err.message });
      throw err;
    }
  },

  getTicketAttachments: (ticketId) => {
    const state = get();
    return state.ticketAttachments[ticketId] || [];
  }
}));