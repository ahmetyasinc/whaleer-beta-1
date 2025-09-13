import { create } from "zustand";

/**
 * Minimal, hedefe yönelik düzeltme:
 * - id karşılaştırmalarında normalizeId kullan (string'e çevir) -> tip farkı sorununu giderir
 * - version'ı Number'a çevirip sıralama yap -> yanlış sıralamayı engeller
 * - selectVersion(null) => startNewVersion() davranışı eklenir
 */

const normalizeId = (id) => (id === null || id === undefined ? null : String(id));
const normalizeVersion = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const useCodePanelStore = create((set, get) => ({
  isOpen: false,

  // panel context
  groupId: null,
  versions: [],
  selected: null, // aktif versiyon objesi
  isNewVersion: false,
  parent_indicator_id: null, // backend'e gönderilecek

  // edit alanları (UI binding)
  indicatorName: "",
  indicatorCode: "",

  openPanel: (group) => {
    const rawVersions = Array.isArray(group?.versions) ? [...group.versions] : [];

    // numeric version'a göre güvenilir sıralama
    const versions = rawVersions
      .map((v) => ({ ...v, __verNum: normalizeVersion(v.version) }))
      .sort((a, b) => a.__verNum - b.__verNum)
      .map(({ __verNum, ...rest }) => rest);

    const last = versions.length ? versions[versions.length - 1] : null;

    // initialSelectedId ile eşleştirmede tip farkını engelle
    const selected =
      (group?.initialSelectedId &&
        versions.find((v) => normalizeId(v.id) === normalizeId(group.initialSelectedId))) ||
      last ||
      null;

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
    // id null/undefined ise yeni versiyon oluşturulmak isteniyor demektir
    if (id == null) {
      get().startNewVersion();
      return;
    }

    const { versions, groupId } = get();
    const next = versions.find((v) => normalizeId(v.id) === normalizeId(id)) || null;

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
    // parent: grup varsa kullan, yoksa seçili kaydın parent'ı veya id'si
    const parent =
      groupId ?? selected?.parent_indicator_id ?? selected?.id ?? null;

    set({
      isNewVersion: true,
      selected: null,
      indicatorName: "",
      indicatorCode: "",
      parent_indicator_id: parent,
    });
  },

  /**
   * Backend kaydından sonra paneli “edit” moduna geçirir.
   * newInd: { id, name, code, version, parent_indicator_id, ... }
   */
  setIndicatorEditing: (newInd) => {
    set((state) => {
      // normalize ederek karşılaştır, tip farkı sebebiyle resetlenmeyi engelle
      const newGroupIdRaw = newInd.parent_indicator_id ?? newInd.id;
      const newGroupIdNorm = normalizeId(newGroupIdRaw);
      const stateGroupIdNorm = normalizeId(state.groupId);

      let nextVersions = Array.isArray(state.versions) ? [...state.versions] : [];

      if (stateGroupIdNorm !== newGroupIdNorm) {
        // Gerçekten farklı bir grupsa sıfırdan başla
        nextVersions = [newInd];
      } else {
        // Aynı grubun içindeysek güncelle veya ekle
        const ix = nextVersions.findIndex(
          (v) => normalizeId(v.id) === normalizeId(newInd.id)
        );
        if (ix >= 0) {
          nextVersions[ix] = { ...nextVersions[ix], ...newInd };
        } else {
          nextVersions.push(newInd);
        }
      }

      // numeric version'a göre sıralama (güvenilir)
      nextVersions = nextVersions
        .map((v) => ({ ...v, __verNum: normalizeVersion(v.version) }))
        .sort((a, b) => a.__verNum - b.__verNum)
        .map(({ __verNum, ...rest }) => rest);

      return {
        isOpen: true,
        groupId: newGroupIdRaw,
        versions: nextVersions,
        selected: newInd,
        isNewVersion: false,
        parent_indicator_id: newGroupIdRaw,
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
