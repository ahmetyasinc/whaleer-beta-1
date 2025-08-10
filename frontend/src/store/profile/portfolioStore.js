// stores/usePortfolioStore.js
import { create } from 'zustand';
import { fetchPortfolioAndTransactions } from '@/services/profile/portfolioService';

export const usePortfolioStore = create((set, get) => ({
  // initial empty state
  portfolio: [],
  transactions: [],

  /**
   * Load initial data from backend and populate the store
   * No parameters needed; uses session cookies
   */
  loadInitialData: async () => {
    // raw API data
    const { portfolio: rawPortfolio, transactions: rawTransactions } = await fetchPortfolioAndTransactions();

    // map to frontend shape, ensure numeric fields defined
    const portfolio = rawPortfolio.map(item => {
      const amount = Number(item.amount) || 0;
      const avgCost = Number(item.average_cost) || 0;
      return {
        symbol: item.symbol,
        name: item.symbol,
        amount,
        cost: avgCost,
        profitLoss: Number(item.profit_loss) || 0,
      };
    });

    const transactions = rawTransactions.map(tx => ({
      symbol: tx.symbol,
      type: tx.trade_type || tx.type,
      direction: tx.side || tx.direction,
      date: tx.created_at || tx.date,
      price: Number(tx.price) || 0,
      amount: Number(tx.amount) || 0,
    }));

    set({ portfolio, transactions });
  },

  // Portfolio actions (add/update/remove)
  addToPortfolio: (newPosition) => {
    set(state => {
      const idx = state.portfolio.findIndex(p => p.symbol === newPosition.symbol);
      if (idx >= 0) {
        const updated = [...state.portfolio];
        updated[idx] = {
          ...updated[idx],
          amount: updated[idx].amount + newPosition.amount,
          cost: updated[idx].cost + newPosition.cost,
        };
        return { portfolio: updated };
      }
      return { portfolio: [...state.portfolio, newPosition] };
    });
  },
  removeFromPortfolio: (symbol) =>
    set(state => ({ portfolio: state.portfolio.filter(p => p.symbol !== symbol) })),
  updatePortfolioItem: (symbol, updates) =>
    set(state => ({ portfolio: state.portfolio.map(p => p.symbol === symbol ? { ...p, ...updates } : p) })),
  clearPortfolio: () => set({ portfolio: [] }),

  // Transaction actions
  addTransaction: (newTransaction) =>
    set(state => ({ transactions: [newTransaction, ...state.transactions] })),
  clearTransactions: () => set({ transactions: [] }),

  // Getters
  getPortfolioTotal: () =>
    get().portfolio.reduce((sum, p) => sum + p.cost + p.profitLoss, 0),
  getTotalProfitLoss: () =>
    get().portfolio.reduce((sum, p) => sum + p.profitLoss, 0),
}));