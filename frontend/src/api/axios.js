// src/api/axios.js
import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL || "";

const api = axios.create({
  baseURL,
  // timeout: 10000, // isteğe bağlı
  withCredentials: true, // çerezleri dahil et
});

import { supabase } from "@/lib/supabaseClient";

// İsteğe bağlı interceptors: auth header eklemek vs.
api.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (err) => Promise.reject(err)
);

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // global hata handling
    // console.error("API error", err?.response?.status, err?.response?.data);
    return Promise.reject(err);
  }
);

export default api;
