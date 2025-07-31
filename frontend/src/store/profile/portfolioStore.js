import { create } from 'zustand';

export const usePortfolioStore = create((set, get) => ({
  
  // Portfolio verisi
  portfolio: [
    {
      symbol: 'btc',
      name: 'Bitcoin',
      amount: 19.44,
      cost: 1250.00,
      currentPrice: 45000,
      profitLoss: 5790.30,
    },
    {
      symbol: 'eth',
      name: 'Ethereum',
      amount: 2.875,
      cost: 8500.00,
      currentPrice: 3200,
      profitLoss: 700.00,
    },
    {
      symbol: 'ada',
      name: 'Cardano',
      amount: 15,
      cost: 750.00,
      currentPrice: 0.65,
      profitLoss: 225.00,
    },
    {
      symbol: 'sol',
      name: 'Solana',
      amount: 45.2,
      cost: 4520.00,
      currentPrice: 120,
      profitLoss: 904.00,
    },
  ],

  // İşlem geçmişi verisi
  transactions: [
    {
      symbol: 'btc',
      type: 'long',
      direction: 'açma',
      date: '2024-01-15T10:30:00Z',
      price: 42000,
      amount: 2100.00,
    },
    {
      symbol: 'eth',
      type: 'spot',
      direction: 'açma',
      date: '2024-01-14T14:20:00Z',
      price: 2800,
      amount: 8400.00,
    },
    {
      symbol: 'sol',
      type: 'short',
      direction: 'kapama',
      date: '2024-01-13T09:15:00Z',
      price: 95,
      amount: 950.00,
    },
    {
      symbol: 'ada',
      type: 'spot',
      direction: 'açma',
      date: '2024-01-12T16:45:00Z',
      price: 0.50,
      amount: 750.00,
    },
    {
      symbol: 'btc',
      type: 'long',
      direction: 'kapama',
      date: '2024-01-11T11:30:00Z',
      price: 41500,
      amount: 1660.00,
    },
    {
      symbol: 'eth',
      type: 'short',
      direction: 'açma',
      date: '2024-01-10T13:25:00Z',
      price: 2750,
      amount: 5500.00,
    },
  ],

  // Portfolio'ya yeni pozisyon ekleme
  addToPortfolio: (newPosition) => {
    set((state) => {
      const existingIndex = state.portfolio.findIndex(
        (item) => item.symbol === newPosition.symbol
      );

      if (existingIndex >= 0) {
        // Mevcut pozisyonu güncelle
        const updatedPortfolio = [...state.portfolio];
        updatedPortfolio[existingIndex] = {
          ...updatedPortfolio[existingIndex],
          amount: updatedPortfolio[existingIndex].amount + newPosition.amount,
          cost: updatedPortfolio[existingIndex].cost + newPosition.cost,
        };
        return { portfolio: updatedPortfolio };
      } else {
        // Yeni pozisyon ekle
        return { portfolio: [...state.portfolio, newPosition] };
      }
    });
  },

  // Portfolio'dan pozisyon kaldırma
  removeFromPortfolio: (symbol) => {
    set((state) => ({
      portfolio: state.portfolio.filter((item) => item.symbol !== symbol),
    }));
  },

  // Yeni işlem ekleme
  addTransaction: (newTransaction) => {
    set((state) => ({
      transactions: [newTransaction, ...state.transactions],
    }));
  },

  // Portfolio pozisyonunu güncelleme
  updatePortfolioItem: (symbol, updates) => {
    set((state) => ({
      portfolio: state.portfolio.map((item) =>
        item.symbol === symbol ? { ...item, ...updates } : item
      ),
    }));
  },

  // Tüm portfolio'yu temizleme
  clearPortfolio: () => {
    set({ portfolio: [] });
  },

  // Tüm işlem geçmişini temizleme
  clearTransactions: () => {
    set({ transactions: [] });
  },

  // Portfolio toplam değerini hesaplama
  getPortfolioTotal: () => {
    const { portfolio } = get();
    return portfolio.reduce((total, item) => total + item.cost + item.profitLoss, 0);
  },

  // Toplam kar/zarar hesaplama
  getTotalProfitLoss: () => {
    const { portfolio } = get();
    return portfolio.reduce((total, item) => total + item.profitLoss, 0);
  },
}));