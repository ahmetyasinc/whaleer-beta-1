// src/store/auth/authStore.js
import { create } from "zustand";
import { getRefreshToken, saveRefreshToken, clearRefreshToken } from "../../services/authStorage";
import { setAccessToken } from "../../api/interceptors";
import { refreshToken as doRefresh } from "../../api/auth"; // POST /mobile/refresh

const useAuthStore = create((set, get) => ({

  hydrated: false,
  isAuthed: false,
  user: null,

  // Ortak: access/refresh + user'ı uygula
  applySession: async ({ access_token, refresh_token, user }) => {
    console.log("Applying session", { access_token, refresh_token, user });
    setAccessToken(access_token);
    if (refresh_token) await saveRefreshToken(refresh_token);
    set({ isAuthed: true, user: user || null });
  },

  // App açılışında
  boot: async () => {
    try {
      const rt = await getRefreshToken();
      if (!rt) {
        set({ hydrated: true, isAuthed: false, user: null });
        return;
      }
      const { access_token, refresh_token, user } = await doRefresh(rt);
      await get().applySession({ access_token, refresh_token, user });
      set({ hydrated: true });
    } catch (e) {
      setAccessToken(null);
      await clearRefreshToken();
      set({ hydrated: true, isAuthed: false, user: null });
    }
  },

  // Login başarı
  signInSuccess: async ({ access_token, refresh_token, user }) => {
    await get().applySession({ access_token, refresh_token, user });
  },

  // Çıkış
  signOut: async () => {
    setAccessToken(null);
    await clearRefreshToken();
    set({ isAuthed: false, user: null });

    try {
      const { default: useProfileStore } = await import("../profile/profileStore");
      useProfileStore.getState().reset();
    } catch {}

  },
}));

export default useAuthStore;
