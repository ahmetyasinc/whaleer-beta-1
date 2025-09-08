// src/store/showcase/botDropdownSearchStore.js
import { create } from 'zustand';
import axios from 'axios';

/**
 * Backend payload:
 * {
 *   bots: [{
 *     id: number,
 *     name: string,
 *     user_name: string,
 *     type: 'spot' | 'futures',
 *     totalProfitPercentage: number,
 *     rent_price?: number,
 *     sell_price?: number
 *   }]
 * }
 *
 * Normalized for UI:
 * {
 *   id: number,
 *   name: string,
 *   creator: string,
 *   type: 'spot' | 'futures',
 *   totalProfit: number,          // %
 *   rentPriceUSD?: number,
 *   salePriceUSD?: number
 * }
 */

const normalize = (payload) => {
  const list = Array.isArray(payload?.bots) ? payload.bots : [];
  return list.map((b) => ({
    id: Number(b?.id),
    name: String(b?.name ?? ''),
    creator: String(b?.user_name ?? ''),
    type: b?.type === 'futures' ? 'futures' : 'spot',
    totalProfit: Number(b?.totalProfitPercentage ?? 0),
    rentPriceUSD: typeof b?.rent_price === 'number' ? b.rent_price : undefined,
    salePriceUSD: typeof b?.sell_price === 'number' ? b.sell_price : undefined,
  }));
};

const useBotDropdownSearchStore = create((set, get) => ({
  allBots: [],
  filteredBots: [],
  searchQuery: '',
  loading: false,
  error: null,
  hasLoadedOnce: false,

  // Fetch from backend
  fetchBots: async () => {
    const state = get();
    if (state.loading) return;

    set({ loading: true, error: null });
    try {
      const url = `${process.env.NEXT_PUBLIC_API_URL}/showcase/searchdata`;
      const response = await axios.get(url);
      const parsed = normalize(response?.data);
      set({
        allBots: parsed,
        filteredBots: parsed,
        loading: false,
        error: null,
        hasLoadedOnce: true,
      });
    } catch (err) {
      const message =
        err?.response?.data?.error ||
        err?.message ||
        'Unknown error';
      set({
        loading: false,
        error: message,
        hasLoadedOnce: true,
      });
    }
  },

  // Simple case-insensitive search on name/creator
  setSearchQuery: (query) =>
    set((state) => {
      const lower = String(query || '').toLowerCase();
      const filtered = state.allBots.filter((bot) => {
        const nameOk = bot.name.toLowerCase().includes(lower);
        const creatorOk = bot.creator.toLowerCase().includes(lower);
        return nameOk || creatorOk;
      });
      return {
        searchQuery: query,
        filteredBots: filtered,
      };
    }),
}));

export default useBotDropdownSearchStore;
