import { create } from 'zustand';

export const useSiftCoinStore = create((set) => ({
  selectedCoins: [],
  
  addCoin: (coin) => set((state) => {
    if (state.selectedCoins.find((c) => c.symbol === coin.symbol)) return state;
    return { selectedCoins: [...state.selectedCoins, coin] };
  }),

  removeCoin: (symbol) => set((state) => ({
    selectedCoins: state.selectedCoins.filter((c) => c.symbol !== symbol)
  })),

  clearCoins: () => set({ selectedCoins: [] }),
}));