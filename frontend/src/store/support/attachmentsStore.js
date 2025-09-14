// stores/attachmentsStore.js
import { create } from "zustand";
import * as supportApi from "@/api/support";

export const useAttachmentsStore = create((set, get) => ({
  attachments: [],
  ticketAttachments: {}, // ticketId -> attachments mapping
  uploading: false,
  error: null,

  uploadAttachment: async (file, ticketId, messageId = null) => {
    set({ uploading: true, error: null });
    try {
      const saved = await supportApi.uploadAttachment(file, ticketId, messageId);
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
      console.error("uploadAttachment error:", err);
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
      console.error("fetchTicketAttachments error:", err);
      set({ error: err?.response?.data || err.message });
      throw err;
    }
  },

  getTicketAttachments: (ticketId) => {
    const state = get();
    return state.ticketAttachments[ticketId] || [];
  },

  // Yeni: Mesaj attachment'larını getir
  fetchMessageAttachments: async (messageId) => {
    try {
      // Bu endpoint'i backend'de oluşturmanız gerekebilir
      // Şimdilik ticket attachment'ları üzerinden filtreleme yapabiliriz
      const allAttachments = Object.values(get().ticketAttachments).flat();
      return allAttachments.filter(att => att.message_id === messageId);
    } catch (err) {
      console.error("fetchMessageAttachments error:", err);
      set({ error: err?.response?.data || err.message });
      throw err;
    }
  }
}));