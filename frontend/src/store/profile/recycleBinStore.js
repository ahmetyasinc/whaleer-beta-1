import { create } from "zustand";

const useRecycleBinStore = create((set) => ({
    deletedItems: [],
    isLoading: false,

    fetchDeletedItems: async () => {
        set({ isLoading: true });

        // Fixed Static Data
        const mockData = [
            // Indicators
            { id: 1, title: "RSI Divergence Pro", type: "Indicator", daysLeft: 29, deletedDate: new Date().toISOString() },
            { id: 2, title: "MACD Cross Alert", type: "Indicator", daysLeft: 15, deletedDate: new Date().toISOString() },
            { id: 3, title: "Bollinger Bands Custom", type: "Indicator", daysLeft: 2, deletedDate: new Date().toISOString() },

            // Strategies
            { id: 4, title: "Golden Cross Strategy", type: "Strategy", daysLeft: 25, deletedDate: new Date().toISOString() },
            { id: 5, title: "Scalping v2", type: "Strategy", daysLeft: 10, deletedDate: new Date().toISOString() },
            { id: 6, title: "Trend Follower 3000", type: "Strategy", daysLeft: 5, deletedDate: new Date().toISOString() },

            // Backtests
            { id: 7, title: "BTC/USDT 2023 Backtest", type: "Backtest", daysLeft: 30, deletedDate: new Date().toISOString() },
            { id: 8, title: "ETH Scalp Test", type: "Backtest", daysLeft: 12, deletedDate: new Date().toISOString() },

            // Bots
            { id: 9, title: "DCA Bot #4", type: "Bot", daysLeft: 28, deletedDate: new Date().toISOString() },
            { id: 10, title: "Arbitrage Bot Alpha", type: "Bot", daysLeft: 1, deletedDate: new Date().toISOString() },
            { id: 11, title: "Grid Trading Bot", type: "Bot", daysLeft: 18, deletedDate: new Date().toISOString() },
        ];

        set({ deletedItems: mockData, isLoading: false });
    },

    restoreItem: (id) => {
        set((state) => ({
            deletedItems: state.deletedItems.filter((item) => item.id !== id),
        }));
    },
}));

export default useRecycleBinStore;
