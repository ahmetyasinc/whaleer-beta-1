// src/api/support/admin.js
import api from "../axios";

// Admin ticket listesi
export async function getAdminTickets(params = {}) {
  const url = "/support/admin/tickets";
  const res = await api.get(url, { params });
  return res.data;
}

// Moderator listesini getir
export async function getModerators() {
  const url = "/users/moderators";
  const res = await api.get(url);
  return res.data;
}

// Ticket'ı assign etme
export async function assignTicket(ticketId, moderatorId) {
  const url = `/support/admin/tickets/${ticketId}/assign`;
  const res = await api.post(url, { moderator_id: moderatorId });
  return res.data;
}

// Atamayı kaldırma
export async function unassignTicket(ticketId) {
  const url = `/support/tickets/${ticketId}/assign`;
  const res = await api.delete(url);
  return res.data;
}

export async function getAdminTicketDetail(ticketId) {
  const res = await api.get(`/support/admin/tickets/${ticketId}`);
  return res.data;
}

export async function addAdminMessage(ticketId, body) {
  // moderatorlar da bu endpointi kullanabilir (backend kontrol ediyor)
  const res = await api.post(`/support/admin/tickets/${ticketId}/messages`, body);
  return res.data;
}

export async function updateTicketStatus(ticketId, status) {
  const res = await api.patch(`/support/tickets/${ticketId}`, { status });
  return res.data;
}

export function getAdminAttachmentFileUrl(attachmentId) {
  return `/support/admin/attachments/${attachmentId}/file`;
}

export function getAdminAttachmentThumbnailUrl(attachmentId, size = 320) {
  return `/support/admin/attachments/${attachmentId}/thumbnail?size=${size}`;
}