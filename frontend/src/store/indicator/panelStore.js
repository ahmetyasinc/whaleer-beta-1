import { create } from 'zustand';

const getDefaultEndDate = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 19);
};

const usePanelStore = create((set, get) => ({
  
  synced_panels: ["chart"],

  end: getDefaultEndDate(),
  setEnd: (newEnd) => set({ end: newEnd }),

  panelWidth: 16,
  customPanels: [],

  addSyncedPanel: (panelId, subId) => {
    const panelKey = `panel-${panelId}-${subId}`;
    console.log("addSyncedPanel: ", panelKey);
    set((state) => {
      if (!state.synced_panels.includes(panelKey)) {
        return { synced_panels: [...state.synced_panels, panelKey] };
      }
      return {};
    });
  },

  removeSyncedPanel: (panelId, subId) => {
    const panelKey = `panel-${panelId}-${subId}`;
    set((state) => ({
      synced_panels: state.synced_panels.filter((id) => id !== panelKey),
    }));
  },

  addCustomPanel: (panel) => {
    const existing = get().customPanels.find(p => p.i === panel.i);
    if (existing) return;
    set((state) => ({
      customPanels: [...state.customPanels, panel],
      layouts: {
        ...state.layouts,
        lg: [...(state.layouts.lg || []), panel]
      }
    }));
  },

  removeCustomPanel: (panelKey) => {
    set((state) => ({
      customPanels: state.customPanels.filter(p => p.i !== panelKey),
      layouts: {
        ...state.layouts,
        lg: (state.layouts.lg || []).filter(p => p.i !== panelKey)
      }
    }));
  },

  setPanelWidth: (width) => {
    set({ panelWidth: width });
    const currentLayout = get().layouts;
    if (Array.isArray(currentLayout)) {
      const updatedLayout = currentLayout.map(item => {
        if (get().synced_panels.includes(item.i)) {
          return { ...item, w: width };
        }
        return item;
      });
      set({
        layouts: updatedLayout
      });
    }
  },

  isChatBoxVisible: false,

  toggleChatBoxVisibility: () => set((state) => ({
    isChatBoxVisible: !state.isChatBoxVisible,
    layouts: state.layouts ? {
      ...state.layouts,
      lg: !state.isChatBoxVisible
        ? [...(state.layouts.lg || []).filter(item => item.i !== "f"), {
            i: "f",
            x: 8,
            y: 21,
            w: 8,
            h: 17,
            minH: 8,
            minW: 4,
            maxH: 30
          }]
        : (state.layouts.lg || []).filter(item => item.i !== "f")
    } : state.layouts
  })),


  syncWidths: (layouts) => {
    if (!layouts || !layouts.lg) return layouts;
    const currentPanelWidth = get().panelWidth;
    const updatedLayout = layouts.lg.map(item => {
      if (item.i === "panel-indicator-editor" || item.i === "panel-strategy-editor") {
        // Bu paneller genişliğini korusun
        return { ...item, w: item.w || 8 };
      }
      if (get().synced_panels.includes(item.i)) {
        return { ...item, w: currentPanelWidth, h: item.h || 6 }; // ← default yükseklik sabitlenebilir
      }
      return item;
    });
    return {
      ...layouts,
      lg: updatedLayout
    };
  },
  

  updateLayouts: (newLayouts) => {
    set({ layouts: newLayouts });

  },

  updateItemLayout: (key, newItemLayout) => {

    const currentLayouts = get().layouts;
    const currentLg = currentLayouts.lg || [];

    if (currentLayouts && currentLg) {

      let updatedLayout;
      if (get().synced_panels.includes(key) && 'w' in newItemLayout) {

        const newWidth = newItemLayout.w;
        set({ panelWidth: newWidth });
        updatedLayout = currentLg.map(item => {
          if (get().synced_panels.includes(item.i)) {
            if (item.i === key) {
              const { w, ...otherChanges } = newItemLayout;
              return { ...item, ...otherChanges, w: newWidth };
            } else {
              return { ...item, w: newWidth };
            }
          }
          return item;
        });
      } else {

        updatedLayout = currentLg.map(item => {
          if (item.i === key) {
            return { ...item, ...newItemLayout };
          }
          return item;
        });
      }
      set({
        layouts: {
          ...currentLayouts,
          lg: updatedLayout
        }
      });
    }
  },
}));

export default usePanelStore;