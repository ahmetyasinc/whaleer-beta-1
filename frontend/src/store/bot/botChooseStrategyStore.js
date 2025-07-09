import { create } from 'zustand';

const useBotChooseStrategyStore = create((set) => ({
  selectedStrategy: null,
  isModalOpen: false,
  activeTab: "Teknikler",
  
  setSelectedStrategy: (strategy) => set({ selectedStrategy: strategy }),
  setIsModalOpen: (isOpen) => set({ isModalOpen: isOpen }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  
  // Strateji seçimi ve modal kapama işlemini birleştiren helper
  selectStrategyAndCloseModal: (strategy) => set({ 
    selectedStrategy: strategy, 
    isModalOpen: false 
  }),
  
  // Store'u sıfırlama
  reset: () => set({ 
    selectedStrategy: null, 
    isModalOpen: false, 
    activeTab: "Teknikler" 
  }),
}));

export default useBotChooseStrategyStore;