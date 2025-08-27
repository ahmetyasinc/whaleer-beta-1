// src/store/auth/siwsStore.js
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchWalletSession, logoutWallet } from "@/api/auth";

export const useSiwsStore = create(
  persist(
    (set, get) => ({
      // Sadece cüzdan oturumu
      wallet: null,               // { id, address, chain, ... }
      walletLinked: false,        // UI için kısa bayrak
      authLoading: false,         // Connect/verify akışı boyunca loading kontrolü

      setAuthLoading: (v) => set({ authLoading: v }),
      setWallet: (w) => set({ wallet: w, walletLinked: !!w }),

      clearAll: () => set({ wallet: null, walletLinked: false }),

      // Vitrine (Showcase) her girişte çağır: Cookie varsa wallet hydrate edilir.
      hydrateSession: async () => {
        try {
          const sess = await fetchWalletSession(); // GET /auth/siws/session (withCredentials)
          if (sess?.wallet) {
            set({ wallet: sess.wallet, walletLinked: true });
          } else {
            set({ wallet: null, walletLinked: false });
          }
        } catch {
          set({ wallet: null, walletLinked: false });
        }
      },

      // Sadece SIWS cookie’yi temizler (kullanıcı app login’i ile ilgili değildir)
      signOutWallet: async () => {
        try { await logoutWallet(); } catch {}
        set({ wallet: null, walletLinked: false });
      },
    }),
    {
      name: "siws-local",
      // Persist’e gereksiz şeyleri yazma; tüm state yazılabilir ama istersen daraltabilirsin.
      partialize: (state) => ({
        wallet: state.wallet,
        walletLinked: state.walletLinked,
      }),
    }
  )
);
