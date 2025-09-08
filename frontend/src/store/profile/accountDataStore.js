import { create } from "zustand";

export const useAccountDataStore = create((set) => ({
  // API-id -> data haritaları
  snapshotsByApiId: {},  // { [apiId]: [{x:Date,y:number}] }
  portfolioByApiId: {},  // { [apiId]: [{...}] }
  tradesByApiId: {},     // { [apiId]: [{...}] }
  botsByApiId: {},       // { [apiId]: [{...}] }

  // hydration durumu
  isHydrated: false,
  hydratedAt: null, // Date.now()

  hydrateAll: (maps) => set((state) => ({
    snapshotsByApiId: maps.snapshots || {},
    portfolioByApiId: maps.portfolio || {},
    tradesByApiId: maps.trades || {},
    botsByApiId: maps.bots || {},
    isHydrated: true,
    hydratedAt: Date.now(),
  })),

  // opsiyonel: cache'i temizlemek istersen
  clearHydration: () => set({
    snapshotsByApiId: {},
    portfolioByApiId: {},
    tradesByApiId: {},
    botsByApiId: {},
    isHydrated: false,
    hydratedAt: null,
  }),
}));
