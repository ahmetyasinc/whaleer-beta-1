"use client";

import { create } from "zustand";

const useWatchListStore = create((set) => ({
  // coin id'lerini tutuyoruz
  watchlist: [],

  toggleWatch: (coinId) =>
    set((state) =>
      state.watchlist.includes(coinId)
        ? {
            // varsa çıkar
            watchlist: state.watchlist.filter((id) => id !== coinId),
          }
        : {
            // yoksa ekle
            watchlist: [...state.watchlist, coinId],
          }
    ),

  clearWatchlist: () => set({ watchlist: [] }),
}));

export default useWatchListStore;
