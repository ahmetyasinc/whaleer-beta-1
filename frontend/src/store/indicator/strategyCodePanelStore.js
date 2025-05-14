// store/strategyCodePanelStore.js
import { create } from "zustand";

const useStrategyCodePanelStore = create((set,get) => ({
  isOpen: false,
  strategyName: "",
  strategyCode: "",
  editingStrategy: null,

  openPanel: (name = "", code = "", editing = null) => set({
    isOpen: true,
    strategyName: name,
    strategyCode: code,
    editingStrategy: editing,
  }),

  closePanel: () => set({ isOpen: false }),
  
  closePanelIfMatches: (id) => {
    const { editingStrategy } = get();
    if (editingStrategy && editingStrategy.id === id) {
      set({ isOpen: false });
    }
  },

  setStrategyEditing: (id) => set({ editingStrategy: id }),
  setStrategyName: (name) => set({ strategyName: name }),
  setStrategyCode: (code) => set({ strategyCode: code }),
}));

export default useStrategyCodePanelStore;
