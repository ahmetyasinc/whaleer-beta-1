import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useCryptoStore = create(
    persist(
        (set) => ({
            coins: [],
            pinned: [],
            selectedCrypto: { id: 1, name: "Bitcoin", symbol: "BTC", binance_symbol: "BTCUSDT", tick_size: 0.01, market_type: "spot" },
            selectedPeriod: "1m",

            togglePinned: (crypto) => set((state) => {
                const isAlreadyPinned = state.pinned.includes(crypto);
                return {
                    pinned: isAlreadyPinned
                        ? state.pinned.filter((item) => item !== crypto)
                        : [crypto, ...state.pinned],
                };
            }),

            setCoins: (coinList) => set({ coins: coinList }),
            setPinned: (pinnedList) => set({ pinned: pinnedList }), // API'den gelen pinnedleri güncelle
            setSelectedCrypto: (crypto) => set({ selectedCrypto: crypto }),
            setSelectedPeriod: (period) => set({ selectedPeriod: period }),
        }),
        {
            name: "wh-crypto-storage", // local storage key
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ selectedCrypto: state.selectedCrypto, selectedPeriod: state.selectedPeriod }), // Sadece bunları kaydet
        }
    )
);

export default useCryptoStore;
