// src/context/AuthContext.js
import React, { createContext, useEffect, useMemo, useState } from "react";
import { getRefreshToken, saveRefreshToken, clearRefreshToken } from "../services/authStorage";
import { loginWithUsername, refreshToken } from "../api/auth";
import { setAccessToken } from "../api/interceptors";
import { fetchMobileProfile } from "../api/profile";        // <-- /mobile/profile
import useProfileStore from "../store/profile/profileStore"; // veriyi global kullanmak için
import { computePerfSummary } from "../utils/performance";
import useAuthStore from "../store/auth/authStore";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  // Profil cevabını store'a yazan yardımcı
  const writeProfileToStore = (data) => {
    if (!data) return;
    // default api seçimi + performans özetini hesapla
    const def = data.apis?.find((a) => a.api?.default) || data.apis?.[0] || null;
    const perfSummary = def ? computePerfSummary(def.snapshots) : null;

    useProfileStore.setState({
      data,
      selectedApiId: def?.api?.id || null,
      perfSummary,
      activeTab: "performance",
      loading: false,
      error: null,
    });

    setUser(data.user || null);
  };

  // Profil yeniden yükleyici (token zaten ayarlı iken)
  const reloadProfile = async () => {
    try {
      const data = await fetchMobileProfile(); // interceptor Authorization header'ı ekliyor
      writeProfileToStore(data);
      return data;
    } catch (e) {
      // store'a minimal hata güncellemesi
      useProfileStore.setState({ error: e?.message || "Profile load failed" });
      throw e;
    }
  };

  // App açılışında sessiz login
  useEffect(() => {
    (async () => {
      try {
        const stored = await getRefreshToken();
        if (!stored) {
          setBooting(false);
          return;
        }

        const { access_token, refresh_token: newRefresh } = await refreshToken(stored);
        setAccessToken(access_token);
        if (newRefresh) await saveRefreshToken(newRefresh);

        await reloadProfile(); // user + store doldur
      } catch {
        await clearRefreshToken();
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, []);

  const value = useMemo(
    () => ({
      user,
      booting,

      // Kullanıcı adı/şifre ile giriş
      async signIn(username, password) {
        const { access_token, refresh_token, user } = await loginWithUsername(username, password);
        console.log("AuthContext: signIn successful for user:", user);
        await useAuthStore.getState().signInSuccess({ access_token, refresh_token, user });

        await reloadProfile();
      },

      // Oturumu kapat
      async signOut() {
        setUser(null);
        setAccessToken(null);
        useProfileStore.setState({ data: null, selectedApiId: null, perfSummary: null });
        await clearRefreshToken();
      },

      // Dışarıya profil tazeleme fonksiyonu
      reloadProfile,
    }),
    [user, booting]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
