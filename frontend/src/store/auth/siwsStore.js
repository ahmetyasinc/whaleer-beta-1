// src/store/auth/siwsStore.js
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchWalletSession, logoutWallet } from "@/api/auth";

export const useSiwsStore = create(
  persist(
    (set, get) => ({
      // --- SOLANA (Mevcut) ---
      wallet: null,               
      walletLinked: false,        
      authLoading: false,         

      // --- STELLAR (YENİ EKLENEN KISIM) ---
      stellarAddress: null,       // Stellar Cüzdan Adresi (G... ile başlar)
      
      setAuthLoading: (v) => set({ authLoading: v }),
      setWallet: (w) => set({ wallet: w, walletLinked: !!w }),
      
      // Stellar State Güncelleyici
      setStellarAddress: (addr) => set({ stellarAddress: addr }),

      clearAll: () => set({ 
        wallet: null, 
        walletLinked: false,
        stellarAddress: null // Temizlerken bunu da sıfırla
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
        try { await logoutWallet(); } catch {}
        set({ wallet: null, walletLinked: false });
      },
      
      // Sadece Stellar çıkışı yapmak istersen
      disconnectStellar: () => set({ stellarAddress: null })
    }),
    {
      name: "siws-local",
      partialize: (state) => ({
        wallet: state.wallet,
        walletLinked: state.walletLinked,
        stellarAddress: state.stellarAddress, // Stellar adresini de tarayıcıda hatırla
      }),
    }
  )
);