// src/api/interceptors.js
import { getRefreshToken, saveRefreshToken, clearRefreshToken } from "../services/authStorage";

// Bellekte access token:
let accessToken = null;
let refreshing = false;
let requestQueue = [];

// Dışarıya açık setter/getter
export function setAccessToken(token) { accessToken = token || null; }
export function getAccessToken() { return accessToken; }

// Tek iş: verilen instance'a interceptor TAKMAK
export function initInterceptors(api) {
  if (!api) return;

  // REQUEST
  api.interceptors.request.use((config) => {
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    // DEBUG: gerçekten header ekleniyor mu?
    console.log("➡️", config.method?.toUpperCase(), config.url, config.headers.Authorization);
    return config;
  });

  // RESPONSE (401 -> refresh flow)
  api.interceptors.response.use(
    (res) => res,
    async (error) => {
      const original = error.config;
      if (error?.response?.status === 401 && !original._retry) {
        original._retry = true;

        if (refreshing) {
          return new Promise((resolve, reject) => {
            requestQueue.push({ resolve, reject, original });
          });
        }
        refreshing = true;
        try {
          const storedRefresh = await getRefreshToken();
          if (!storedRefresh) throw new Error("No refresh token");
          const { refreshToken: doRefresh } = await import("./auth"); // lazy import
          const { access_token, refresh_token: newRefresh } = await doRefresh(storedRefresh);

          setAccessToken(access_token);
          if (newRefresh) await saveRefreshToken(newRefresh);

          // Kuyruğu çalıştır
          const results = await Promise.all(
            requestQueue.map(({ original }) => api(original))
          );
          requestQueue.forEach(({ resolve }, i) => resolve(results[i]));
          requestQueue = [];

          // Orijinal isteği tekrar et
          return await api(original);
        } catch (e) {
          requestQueue.forEach(({ reject }) => reject(e));
          requestQueue = [];
          setAccessToken(null);
          await clearRefreshToken();
          return Promise.reject(e);
        } finally {
          refreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );
}
