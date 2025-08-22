// src/api/client.js
import Axios from "axios";
import { initInterceptors } from "./interceptors";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.94:8000';

export const api = Axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
});

initInterceptors(api);

// ---- helpers
function maskAuth(headers = {}) {
  const h = { ...headers };
  const auth = h.Authorization || h.authorization;
  if (auth && typeof auth === 'string') {
    const [scheme, token] = auth.split(' ');
    if (token && token.length > 10) {
      const masked = token.slice(0, 6) + '...' + token.slice(-4);
      h.Authorization = `${scheme} ${masked}`;
      delete h.authorization;
    }
  }
  return h;
}

function short(obj) {
  try {
    const s = JSON.stringify(obj);
    return s.length > 300 ? s.slice(0, 300) + '…(truncated)' : s;
  } catch {
    return obj;
  }
}

// ---- interceptors
api.interceptors.request.use((config) => {
  // süre ölçümü için
  config.metadata = { start: Date.now() };

  const method = (config.method || 'get').toUpperCase();
  const url = (config.baseURL || '') + (config.url || '');
  const params = config.params ? ` params=${short(config.params)}` : '';
  const data =
    config.data !== undefined ? ` data=${short(config.data)}` : '';

  return config;
});

api.interceptors.response.use(
  (res) => {
    const ms = res.config?.metadata?.start
      ? Date.now() - res.config.metadata.start
      : 'n/a';
    const url = (res.config.baseURL || '') + (res.config.url || '');
    // İstersen body de göster:
    // console.log('[API <-] data=', short(res.data));
    return res;
  },
  (err) => {
    const cfg = err.config || {};
    const ms = cfg.metadata?.start ? Date.now() - cfg.metadata.start : 'n/a';
    const url = (cfg.baseURL || '') + (cfg.url || '');
    if (err.response) {
      console.log(
        `[API x ] ${err.response.status} ${url} (${ms}ms)`,
        short(err.response.data)
      );
    } else {
      console.log(`[API x ] ${url} (${ms}ms)`, err.message);
    }
    return Promise.reject(err);
  }
);

// Opsiyonel: token set/temiz yardımcıları
export function setAuthToken(token) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
}
export function clearAuthToken() {
  delete api.defaults.headers.common.Authorization;
}

// default export istersen:
export default api;
import "./interceptors";