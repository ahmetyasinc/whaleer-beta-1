import { create } from "zustand";

/**
 * Panel artık bir GRUP (parent) ve gruptaki TÜM versiyonları taşır.
 * - groupId: parent_indicator_id veya (yoksa) tabanın id’si
 * - versions: [{id, name, code, version, parent_indicator_id, ...}]
 * - selected: aktif versiyon objesi (null ise yeni versiyon modu)
 * - parent_indicator_id: yeni versiyon yaratırken backend’e gönderilecek değer
 */
const useCodePanelStore = create((set, get) => ({
  isOpen: false,

  // panel context
  groupId: null,
  versions: [],
  selected: null,            // aktif versiyon objesi
  isNewVersion: false,       // true → yeni versiyon oluşturuluyor
  parent_indicator_id: null, // backend’e gönderilecek

  // edit alanları (UI binding)
  indicatorName: "",
  indicatorCode: "",

  /**
   * group = { groupId, versions, initialSelectedId }
   * - Eğer initialSelectedId yoksa veya bulunamazsa gruptaki EN BÜYÜK versiyon seçilir.
   * - groupId null ise tamamen yeni indikatör (parent yok) senaryosu.
   */
  openPanel: (group) => {
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
      parent_indicator_id:
        group?.groupId ?? (selected?.parent_indicator_id || selected?.id || null),
      indicatorName: selected?.name || "",
      indicatorCode: selected?.code || "",
    });
  },

  // Seçili versiyonu değiştir
  selectVersion: (id) => {
    const { versions, groupId } = get();
    const next = versions.find((v) => v.id === id) || null;
    set({
      selected: next,
      isNewVersion: false,
      indicatorName: next?.name || "",
      indicatorCode: next?.code || "",
      parent_indicator_id: next?.parent_indicator_id || groupId || next?.id || null,
    });
  },

  // Yeni versiyon oluşturma moduna geç
  startNewVersion: () => {
    const { groupId, selected } = get();
    set({
      isNewVersion: true,
      selected: null,
      indicatorName: "",
      indicatorCode: "",
      // parent: mevcut gruptan; yoksa seçili kayıt id’si fallback
      parent_indicator_id: groupId || selected?.parent_indicator_id || selected?.id || null,
    });
  },

  /**
   * Backend kaydından sonra paneli “edit” moduna geçirir.
   * newInd: { id, name, code, version, parent_indicator_id, ... }
   */
  setIndicatorEditing: (newInd) => {
    set((state) => {
      const newGroupId = newInd.parent_indicator_id ?? newInd.id;

      // Bu gösterimdeki grup mu? Eğer değilse sıfırdan kur.
      let nextVersions = Array.isArray(state.versions) ? [...state.versions] : [];
      if (state.groupId !== newGroupId) {
        nextVersions = [newInd];
      } else {
        const ix = nextVersions.findIndex((v) => v.id === newInd.id);
        if (ix >= 0) {
          nextVersions[ix] = { ...nextVersions[ix], ...newInd };
        } else {
          nextVersions.push(newInd);
        }
      }
      nextVersions.sort((a, b) => (a.version || 1) - (b.version || 1));

      return {
        isOpen: true,
        groupId: newGroupId,
        versions: nextVersions,
        selected: newInd,
        isNewVersion: false,
        parent_indicator_id: newGroupId, // yeni versiyonlar için hazır tut
        indicatorName: newInd.name || "",
        indicatorCode: newInd.code || "",
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
  setIndicatorName: (name) => set({ indicatorName: name }),
  setIndicatorCode: (code) => set({ indicatorCode: code }),
}));

export default useCodePanelStore;
