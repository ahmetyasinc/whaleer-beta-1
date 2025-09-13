// store/strategyCodePanelStore.js
import { create } from "zustand";

/**
 * Strategy Code Panel Store (versiyonlu)
 * Panel bir GRUP (parent) ve gruptaki TÜM versiyonları taşır.
 * - groupId: parent_strategy_id veya (yoksa) kökün id’si
 * - versions: [{ id, name, code, version, parent_strategy_id, locked, ... }]
 * - selected: aktif versiyon objesi (null ise yeni versiyon modu)
 * - parent_strategy_id: yeni versiyon yaratırken backend’e gönderilecek değer
 *
 * openPanel API’si (yeni):
 *   openPanel({ groupId, versions, initialSelectedId })
 *
 * Geriye dönük uyumluluk (eski):
 *   openPanel(name="", code="", editing=null)
 *   → Bu durumda tek kayıtla geçici bir grup oluşturur.
 */

const useStrategyCodePanelStore = create((set, get) => ({
  isOpen: false,

  // panel context
  groupId: null,
  versions: [],
  selected: null,             // aktif versiyon objesi
  isNewVersion: false,        // true → yeni versiyon oluşturuluyor
  parent_strategy_id: null,   // backend’e gönderilecek

  // edit alanları (UI binding)
  strategyName: "",
  strategyCode: "",

  /**
   * Yeni API:
   *   openPanel({ groupId, versions, initialSelectedId })
   *
   * Eski API (desteklenir ama terk edilmesi önerilir):
   *   openPanel(name="", code="", editing=null)
   */
  openPanel: (arg1, arg2, arg3) => {
    // --- Yeni imza mı? (object param)
    if (arg1 && typeof arg1 === "object" && !Array.isArray(arg1)) {
      const group = arg1;
      const versions = Array.isArray(group?.versions) ? [...group.versions] : [];
      versions.sort((a, b) => (a.version || 1) - (b.version || 1));

      const last = versions[versions.length - 1] || null;
      const selected =
        versions.find((v) => v.id === group?.initialSelectedId) || last;

      set({
        isOpen: true,
        groupId: group?.groupId ?? null,
        versions,
        selected,
        isNewVersion: !selected && versions.length === 0 ? true : false,
        parent_strategy_id:
          group?.groupId ??
          (selected?.parent_strategy_id || selected?.id || null),
        strategyName: selected?.name || "",
        strategyCode: selected?.code || "",
      });
      return;
    }

    // --- Eski imza (name, code, editing)
    const name = arg1 || "";
    const code = arg2 || "";
    const editing = arg3 || null;

    // editing varsa ondan bir “tek elemanlı” versions üret,
    // yoksa tamamen yeni strateji (parent yok) senaryosu
    const versions = editing ? [editing] : [];
    versions.sort((a, b) => (a?.version || 1) - (b?.version || 1));

    const selected = editing || null;
    const groupId =
      editing?.parent_strategy_id || editing?.id || null;

    set({
      isOpen: true,
      groupId,
      versions,
      selected,
      isNewVersion: !selected && versions.length === 0 ? true : false,
      parent_strategy_id: groupId || null,
      strategyName: selected?.name || name || "",
      strategyCode: selected?.code || code || "",
    });
  },

  // Seçili versiyonu değiştir
  selectVersion: (id) => {
    const { versions, groupId } = get();
    const next = versions.find((v) => v.id === id) || null;
    set({
      selected: next,
      isNewVersion: false,
      strategyName: next?.name || "",
      strategyCode: next?.code || "",
      parent_strategy_id:
        next?.parent_strategy_id || groupId || next?.id || null,
    });
  },

  // Yeni versiyon oluşturma moduna geç
  startNewVersion: () => {
    const { groupId, selected } = get();
    set({
      isNewVersion: true,
      selected: null,
      strategyName: "",
      strategyCode: "",
      // parent: mevcut gruptan; yoksa seçili kayıt id’si fallback
      parent_strategy_id:
        groupId || selected?.parent_strategy_id || selected?.id || null,
    });
  },

  /**
   * Backend kaydından sonra paneli “edit” moduna geçirir.
   * newStrat: { id, name, code, version, parent_strategy_id, ... }
   */
  setStrategyEditing: (newStrat) => {
    set((state) => {
      const newGroupId = newStrat.parent_strategy_id ?? newStrat.id;

      // Bu gösterimdeki grup mu? Eğer değilse sıfırdan kur.
      let nextVersions = Array.isArray(state.versions) ? [...state.versions] : [];
      if (state.groupId !== newGroupId) {
        nextVersions = [newStrat];
      } else {
        const ix = nextVersions.findIndex((v) => v.id === newStrat.id);
        if (ix >= 0) {
          nextVersions[ix] = { ...nextVersions[ix], ...newStrat };
        } else {
          nextVersions.push(newStrat);
        }
      }
      nextVersions.sort((a, b) => (a.version || 1) - (b.version || 1));

      return {
        isOpen: true,
        groupId: newGroupId,
        versions: nextVersions,
        selected: newStrat,
        isNewVersion: false,
        parent_strategy_id: newGroupId, // yeni versiyonlar için hazır tut
        strategyName: newStrat.name || "",
        strategyCode: newStrat.code || "",
      };
    });
  },

  // Paneli kapat
  closePanel: () => set({ isOpen: false }),

  // Eğer kapatılmak istenen id şu an seçiliyse paneli kapat
  closePanelIfMatches: (id) => {
    const { selected, isOpen } = get();
    if (!isOpen) return;
    if (selected?.id === id) set({ isOpen: false });
  },

  // UI binding setters
  setStrategyName: (name) => set({ strategyName: name }),
  setStrategyCode: (code) => set({ strategyCode: code }),
}));

export default useStrategyCodePanelStore;
