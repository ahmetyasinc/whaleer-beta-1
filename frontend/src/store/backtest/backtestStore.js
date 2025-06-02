import { create } from 'zustand';
import { runBacktestApi } from '@/services/backtest/backtestApi';

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
      const result = await runBacktestApi({
        strategy: selectedStrategy,
        period: selectedPeriod,
        crypto: selectedCrypto,
      });

      // Gelen veriyi doğrudan state'e kaydet
      set({ backtestResults: result, isBacktestLoading: false });
    } catch (error) {
      set({ backtestError: error.message || "Backtest işlemi başarısız", isBacktestLoading: false });
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
