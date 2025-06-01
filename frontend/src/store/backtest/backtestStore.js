import { create } from 'zustand';

const useBacktestStore = create((set, get) => ({
  selectedStrategy: null,
  selectedPeriod: '',
  selectedCrypto: null,

  setSelectedStrategy: (strategy) => set({ selectedStrategy: strategy }),
  setSelectedPeriod: (period) => set({ selectedPeriod: period }),
  setSelectedCrypto: (crypto) => set({ selectedCrypto: crypto }),

  backtestResults: null,
  isBacktestLoading: false,
  backtestError: null,

  archivedBacktests: [],

  runBacktest: async () => {
    const { selectedStrategy, selectedPeriod, selectedCrypto } = get();

    set({ isBacktestLoading: true, backtestError: null });

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const mockResults = {
        chartData: [
          { time: '2024-01-01', value: 10000 },
          { time: '2024-01-02', value: 10250 },
          { time: '2024-01-03', value: 10100 },
        ],
        performance: {
          totalPnL: 2450.75,
          totalTrades: 45,
          winningTrades: 28,
          losingTrades: 17,
          winRate: 62.22,
          initialBalance: 10000,
          finalBalance: 12450.75,
          returnPercentage: 24.51,
          maxDrawdown: -450.30,
          sharpeRatio: 1.85,
          profitFactor: 2.22,
          sortinoRatio: 1.75,
          buyHoldReturn: 3.74,
          mostProfitableTrade: +7.21,
          mostLosingTrade: -5.45,
          commisionCost: 5.45,
          durationOftradeRatio: 1245/5000,
          volume: 674567,
        },
        trades: [
        {
          id: 1,
          date: '2024-01-15 14:30',
          type: 'LONG_OPEN',
          amount: 0.5,
          price: 42150.5,
          commission: 21.08, // %0.1 komisyon oranı ile
          pnl: 0
        },
        {
          id: 2,
          date: '2024-01-15 16:45',
          type: 'LONG_CLOSE',
          amount: 0.5,
          price: 43200.0,
          commission: 21.60,
          pnl: 524.75 // Kar
        },
        {
          id: 3,
          date: '2024-01-16 09:15',
          type: 'SHORT_OPEN',
          amount: 0.8,
          price: 43500.0,
          commission: 34.80,
          pnl: 0
        },
        {
          id: 4,
          date: '2024-01-16 11:30',
          type: 'SHORT_CLOSE',
          amount: 0.8,
          price: 42800.0,
          commission: 34.24,
          pnl: 560.0 // Kar
        },
        {
          id: 5,
          date: '2024-01-17 13:20',
          type: 'LONG_OPEN',
          amount: 1.2,
          price: 41000.0,
          commission: 49.20,
          pnl: 0
        },
        {
          id: 6,
          date: '2024-01-17 15:45',
          type: 'LONG_CLOSE',
          amount: 1.2,
          price: 40500.0,
          commission: 48.60,
          pnl: -600.0 // Zarar
        },
        {
          id: 7,
          date: '2024-01-18 10:00',
          type: 'SHORT_OPEN',
          amount: 0.3,
          price: 44200.0,
          commission: 13.26,
          pnl: 0
        }
        ]

      };

      set({ backtestResults: mockResults, isBacktestLoading: false });
    } catch (error) {
      set({ backtestError: error.message, isBacktestLoading: false });
    }
  },

  archiveBacktest: () => {
    const {
      archivedBacktests,
      selectedStrategy,
      selectedCrypto,
      selectedPeriod,
      backtestResults,
    } = get();

    const archivedItem = {
      id: Date.now(),
      date: new Date().toLocaleDateString('tr-TR'),
      strategy: selectedStrategy,
      crypto: selectedCrypto,
      period: selectedPeriod,
      performance: backtestResults.performance,
      chartData: backtestResults.chartData,
      trades: backtestResults.trades
    };

    set({
      archivedBacktests: [archivedItem, ...archivedBacktests],
    });
  },

  deleteArchivedBacktest: (id) => {
    const { archivedBacktests } = get();
    set({
      archivedBacktests: archivedBacktests.filter(item => item.id !== id)
    });
  },

  loadArchivedBacktest: (archivedItem) => {
    set({
      selectedStrategy: archivedItem.strategy,
      selectedCrypto: archivedItem.crypto,
      selectedPeriod: archivedItem.period,
      backtestResults: {
        chartData: archivedItem.chartData,
        performance: archivedItem.performance,
        trades: archivedItem.trades
      }
    });
  },

  clearBacktestResults: () => set({
    backtestResults: null,
    backtestError: null
  })
}));

export default useBacktestStore;
