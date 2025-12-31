// src/api/support/index.js
import api from "../axios";

// Kategorileri getir
export async function getSupportCategories() {
  const url = "/support/categories";
  const res = await api.get(url);
  return res.data;
}

// Yeni ticket oluştur
export async function createTicket(payload) {
  const url = "/support/tickets";

  // Her zaman multipart gönderelim (dosya olmasa da sorun değil)
  const form = new FormData();
  form.append("subject", payload.subject);
  form.append("message", payload.message);
  form.append("priority", payload.priority || "normal");
  if (payload.category_id !== undefined && payload.category_id !== null && payload.category_id !== "") {
    form.append("category_id", payload.category_id);
  }
  (payload.files || []).forEach((f) => form.append("files", f));

  const res = await api.post(url, form, {
    headers: { "Content-Type": "multipart/form-data" },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });
  return res.data;
}

// Ticket detaylarını getir
export async function getTicket(ticketId) {
  const url = `/support/tickets/${ticketId}`;
  const res = await api.get(url);
  return res.data;
}

// Ticket'a mesaj ekle
export async function addMessage(ticketId, message) {
  const url = `/support/tickets/${ticketId}/messages`;
  const res = await api.post(url, message);
  return res.data;
}

// Ticket'ı memnuniyet ile kapat
export async function closeTicket(ticketId, rating, feedback) {
  const url = `/support/tickets/${ticketId}/close`;
  const res = await api.post(url, { rating, feedback });
  return res.data;
}

// Dosya yükle
export async function uploadAttachment(file, ticketId = null, messageId = null) {
  const url = "/support/attachments";

  const form = new FormData();
  form.append("file", file);
  if (ticketId) form.append("ticket_id", ticketId);
  if (messageId) form.append("message_id", messageId);

  const res = await api.post(url, form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return res.data;
}

// Ticket listesini getir
export async function getTickets(params = {}) {
  const url = "/support/tickets";
  const res = await api.get(url, { params });
  return res.data;
}

// Bir ticket'a ait attachment'ları getir
export async function getTicketAttachments(ticketId) {
  const url = `/support/tickets/${ticketId}/attachments`;
  const res = await api.get(url);
  return res.data;
}

// axios baseURL varsa onu kullan, yoksa ENV'den oku
const API_BASE =
  (api?.defaults?.baseURL && api.defaults.baseURL.replace(/\/$/, "")) ||
  (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");

const abs = (p) => (API_BASE ? `${API_BASE}${p}` : p);

export function getAttachmentFileUrl(attachmentId) {
  return abs(`/support/attachments/${attachmentId}/file`);
}

export function getAttachmentThumbnailUrl(attachmentId, size = 150) {
  return abs(`/support/attachments/${attachmentId}/thumbnail?size=${size}`);
}