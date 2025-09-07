// /src/utils/cookies/settingsCookie.js
export const SETTINGS_COOKIE = 'wh_settings';
const COOKIE_MAX_AGE_DAYS = 365;

// document.cookie içinden key=value çiftlerini objeye çevirir
function getCookieMap() {
  return document.cookie
    .split(';')
    .map((c) => c.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const eq = pair.indexOf('=');
      if (eq === -1) return acc;
      const k = pair.slice(0, eq);
      const v = pair.slice(eq + 1);
      acc[k] = v;
      return acc;
    }, {});
}

// Cookie oku → JSON parse et (yoksa null döner)
export function readSettingsCookie() {
  try {
    const map = getCookieMap();
    if (!map[SETTINGS_COOKIE]) return null;
    const decoded = decodeURIComponent(map[SETTINGS_COOKIE]);
    return JSON.parse(decoded);
  } catch (e) {
    console.warn('readSettingsCookie parse error:', e);
    return null;
  }
}

// Cookie yaz (tüm ayar objesini yazar)
export function writeSettingsCookie(settings, days = COOKIE_MAX_AGE_DAYS) {
  try {
    const value = encodeURIComponent(JSON.stringify(settings));
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    const secure = (typeof location !== 'undefined' && location.protocol === 'https:') ? '; Secure' : '';
    document.cookie = `${SETTINGS_COOKIE}=${value}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
  } catch (e) {
    console.error('writeSettingsCookie error:', e);
  }
}

// Mevcut cookie ile patch birleştirip geri yazar
export function mergeSettingsCookie(patch, days = COOKIE_MAX_AGE_DAYS) {
  const current = readSettingsCookie() || {};
  const merged = { ...current, ...patch };
  writeSettingsCookie(merged, days);
  return merged;
}
