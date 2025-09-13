// src/api/support/index.js
import api from "../axios";

/**
 * getTickets - kullanıcının ticket listesini getirir
 */
export async function getTickets(opts = {}) {
  const url = "/api/support/tickets";
  const res = await api.get(url, opts);
  return res.data;
}

/**
 * createTicket - yeni ticket oluşturur
 */
export async function createTicket(payload) {
  const url = "/api/support/tickets";
  const res = await api.post(url, payload);
  return res.data;
}

/**
 * uploadAttachment - dosya yükler (FormData)
 */
export async function uploadAttachment(file, ticketId = null) {
  const url = "/api/support/attachments";

  const form = new FormData();
  form.append("file", file);
  if (ticketId !== null && ticketId !== undefined) form.append("ticket_id", ticketId);

  const res = await api.post(url, form, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return res.data;
}

/**
 * getTicketAttachments - bir ticket'ın attachmentlarını getirir
 */
export async function getTicketAttachments(ticketId) {
  const url = `/api/support/tickets/${ticketId}/attachments`;
  const res = await api.get(url);
  return res.data;
}

/**
 * getAttachmentFileUrl - attachment dosyası URL'ini döndürür
 */
export function getAttachmentFileUrl(attachmentId) {
  return `/api/support/attachments/${attachmentId}/file`;
}