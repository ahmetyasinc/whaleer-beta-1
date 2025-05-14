// store/codePanelStore.js
import { create } from "zustand";

const useCodePanelStore = create((set,get) => ({
  isOpen: false,
  indicatorName: "",
  indicatorCode: "",
  editingIndicator: null,

  openPanel: (name = "", code = "", editing = null) => set({
    isOpen: true,
    indicatorName: name,
    indicatorCode: code,
    editingIndicator: editing,
  }),
  
  closePanel: () => set({ isOpen: false }),

  closePanelIfMatches: (id) => {
    const { editingIndicator } = get();
    if (editingIndicator && editingIndicator.id === id) {
      set({ isOpen: false });
    }
  },

  setIndicatorEditing: (id) => set({ editingIndicator: id }),
  setIndicatorName: (name) => set({ indicatorName: name }),
  setIndicatorCode: (code) => set({ indicatorCode: code }),
}));

export default useCodePanelStore;
