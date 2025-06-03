import { create } from 'zustand';
import { runBacktestApi, saveArchivedBacktest, fetchArchivedBacktests, deleteArchivedBacktestApi } from '@/services/backtest/backtestApi';

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

  isArchiveLoading: false,
  archiveError: null,

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
      console.log("Backtest sonuçları:", result);
      // Gelen veriyi doğrudan state'e kaydet
      set({ backtestResults: result, isBacktestLoading: false });
    } catch (error) {
      set({ backtestError: error.message || "Backtest işlemi başarısız", isBacktestLoading: false });
    }
  },

  archiveBacktest: async () => {
    console.log("Arşivleme işlemi başlatılıyor...");
    const {
      archivedBacktests,
      selectedStrategy,
      selectedCrypto,
      selectedPeriod,
      backtestResults,
    } = get();

    set({ isArchiveLoading: true, archiveError: null });

    try {
      const savedBacktest = await saveArchivedBacktest(backtestResults);
      console.log("Arşivleme verileri:", {
        backtestResults
      });
      
      const archivedItem = {
        id: savedBacktest.id,
        date: new Date().toLocaleDateString('tr-TR'),
        strategy: selectedStrategy,
        crypto: selectedCrypto,
        period: selectedPeriod,
        performance: backtestResults.performance,
        chartData: backtestResults.chartData,
        trades: backtestResults.trades || [],
        commission: backtestResults.commission || 0.001,
        candles: backtestResults.candles || [],
        returns: backtestResults.returns || [],
      };
      set({ isArchiveLoading: false});
      console.log("Arşivlenen backdfsdfsdfsdtest:", archivedItem);
      set({
        archivedBacktests: [archivedItem, ...archivedBacktests],
      });

    }catch (error) {
      set({ archiveError: error.message || "Arşivleme işlemi başarısız", isArchiveLoading: false });
    }
  },

  deleteArchivedBacktest: async (id) => {
    set({ isArchiveLoading: true, archiveError: null });
    
    try {
      await deleteArchivedBacktestApi(id);
      
      // Local state'den kaldır
      const { archivedBacktests } = get();
      set({
        archivedBacktests: archivedBacktests.filter(item => item.id !== id),
        isArchiveLoading: false
      });
    } catch (error) {
      set({ 
        archiveError: error.message || "Arşivlenmiş backtest silinemedi",
        isArchiveLoading: false 
      });
      throw error;
    }
  },

  getArchivedBacktests: async () => {
    set({ isArchiveLoading: true, archiveError: null });
    try {
      const response = await fetchArchivedBacktests();
      const formattedBacktests = response.map(item => ({
        id: item.id,
        date: new Date(item.created_at).toLocaleDateString('tr-TR'),
        strategy: {
          id: item.data?.strategy_id || null,
          name: item.data?.strategy_name || 'Bilinmeyen Strateji'
        },
        crypto: item.data?.crypto || null,
        period: item.data?.period || '',
        performance: item.data?.performance || {},
        chartData: item.data?.chartData || item.data?.candles || [],
        trades: item.data?.trades || [],
        commission: item.commission || 0.001,
        candles: item.data?.candles || [],
        returns: item.data?.returns || [],
      }));

      set({ 
        archivedBacktests: formattedBacktests,
        isArchiveLoading: false 
      });
    } catch (error) {
      set({ 
        archiveError: error.message || "Arşivlenmiş backtestler yüklenemedi",
        isArchiveLoading: false 
      });
    }
  },

  loadArchivedBacktest: (archivedItem) => {
    console.log("Yüklenen arşivlenmiş backtest:", archivedItem);
    set({ backtestResults: archivedItem});
  },

  clearBacktestResults: () => set({
    backtestResults: null,
    backtestError: null
  })
}));

export default useBacktestStore;
