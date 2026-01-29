// src/store/auth/siwsStore.js
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchWalletSession, logoutWallet } from "@/api/auth";

export const useSiwsStore = create(
  persist(
    (set, get) => ({
      wallet: null,
      walletLinked: false,
      authLoading: false,

      setAuthLoading: (v) => set({ authLoading: v }),
      setWallet: (w) => set({ wallet: w, walletLinked: !!w }),

      clearAll: () => set({
        wallet: null,
        walletLinked: false,
      }),

      hydrateSession: async () => {
        try {
          const sess = await fetchWalletSession();
          if (sess?.wallet) {
            set({ wallet: sess.wallet, walletLinked: true });
          } else {
            set({ wallet: null, walletLinked: false });
          }
        } catch {
          set({ wallet: null, walletLinked: false });
        }
      },

      signOutWallet: async () => {
        try { await logoutWallet(); } catch { }
        set({ wallet: null, walletLinked: false });
      },
    }),
    {
      name: "siws-local",
      partialize: (state) => ({
        wallet: state.wallet,
        walletLinked: state.walletLinked,
      }),
    }
  )
);