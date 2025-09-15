// src/lib/auth/googleFlow.js
const API_URL = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, ""); // örn: http://localhost:8000
const APP_ORIGIN = (process.env.NEXT_PUBLIC_APP_ORIGIN || window.location.origin).replace(/\/$/, ""); // örn: http://localhost:3000

/** Yardımcı: popup'ı ortalı aç */
function openCenteredPopup(url, title = "GoogleLogin", w = 520, h = 720) {
  const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualScreenTop  = window.screenTop  ?? window.screenY ?? 0;

  const width  = window.innerWidth  || document.documentElement.clientWidth  || screen.width;
  const height = window.innerHeight || document.documentElement.clientHeight || screen.height;

  const systemZoom = width / window.screen.availWidth;
  const left = (width - w) / 2 / systemZoom + dualScreenLeft;
  const top  = (height - h) / 2 / systemZoom + dualScreenTop;

  const features = [
    "scrollbars=yes",
    "resizable=yes",
    `width=${w}`,
    `height=${h}`,
    `top=${top}`,
    `left=${left}`,
  ].join(",");

  const popup = window.open(url, title, features);
  if (!popup || popup.closed || typeof popup.closed === "undefined") {
    throw new Error("Popup engellendi. Lütfen tarayıcıda pop-up'a izin verin.");
  }
  popup.focus();
  return popup;
}

/** Yardımcı: OIDC dönüş mesajını bekle (postMessage) */
function waitForOAuthMessage({ allowedOrigins, timeoutMs = 120000 }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const whitelist = Array.isArray(allowedOrigins) ? allowedOrigins : [allowedOrigins];
    const onMessage = (event) => {
      try {
        // Güvenlik: sadece backend origin'ini kabul et
        if (!whitelist.includes(event.origin)) return;
        const data = event.data || {};
        if (data.provider === "google") {
          settled = true;
          window.removeEventListener("message", onMessage);
          resolve(data); // { provider:'google', status:'ok'|'error', reason? }
        }
      } catch (e) {
        settled = true;
        window.removeEventListener("message", onMessage);
        reject(e);
      }
    };
    window.addEventListener("message", onMessage);

    const t = setTimeout(() => {
      if (settled) return;
      window.removeEventListener("message", onMessage);
      reject(new Error("Google ile giriş zaman aşımına uğradı."));
    }, timeoutMs);
  });
}

/** Start URL üret */
function buildGoogleStartUrl(locale = "en") {
    const doneUrl = `${APP_ORIGIN}/${locale}/auth/google-done`;
    const startUrl = `${API_URL}/api/auth/google/start?redirect_uri=${encodeURIComponent(doneUrl)}`;
    return {
      startUrl,
      apiOrigin: new URL(API_URL).origin,   // örn: http://localhost:8000
      appOrigin: new URL(APP_ORIGIN).origin // örn: http://localhost:3000
    };
}

/**
 * DIŞA AÇILAN FONKSİYON
 * - RegisterForm (veya başka herhangi bir yerde) çağır.
 * - Başarılıysa sayfayı yeniler (veya istersen callback ile state güncelle).
 */
export async function startGoogleOidcFlow({ locale = "en", onSuccess, onError } = {}) {
  const { startUrl, apiOrigin, appOrigin } = buildGoogleStartUrl(locale);

  const popup = openCenteredPopup(startUrl);
  try {
    const result = await waitForOAuthMessage({ allowedOrigins: [appOrigin, apiOrigin] });

    if (result.status === "ok") {
      if (typeof onSuccess === "function") onSuccess(result);
      else window.location.reload(); // default davranış
    } else {
      const reason = result.reason || "Google ile giriş başarısız.";
      if (typeof onError === "function") onError(reason, result);
      else throw new Error(reason);
    }
  } finally {
    try { popup.close(); } catch {}
  }
}
