// src/api/settings.js
import api from "../axios";

/** Mevcut kullanıcı ayarlarını/ profilini getirir */
export async function getMyProfileSettings() {
  const res = await api.get("/profile/settings");
  return res.data; // { name, last_name, username, email, phone, bio, location, instagram, linkedin, github, ... }
}

/** Değişen alanları gönderir (kısmi update) */
export async function updateMyProfileSettings(payload) {
  // payload: yukarıdaki alanlardan herhangi biri + opsiyonel şifre alanları
  // { name?, last_name?, username?, email?, phone?, bio?, location?, instagram?, linkedin?, github?, current_password?, new_password? }
  const res = await api.put("/profile/settings", payload);
  return res.data;
}
