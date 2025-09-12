// src/lib/cookies.js
export function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find(r => r.startsWith(name + "="));
  return m ? decodeURIComponent(m.split("=")[1]) : null;
}

export function setCookie(name, value, { days = 365, path = "/", sameSite = "Lax" } = {}) {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=${path}; SameSite=${sameSite}`;
}

export function deleteCookie(name) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
}

export function readJsonCookie(name, fallback = null) {
  try {
    const raw = getCookie(name);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJsonCookie(name, obj, opts) {
  setCookie(name, JSON.stringify(obj), opts);
}
