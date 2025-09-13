import { create } from "zustand";

const dedupeById = (arr) => Array.from(new Map(arr.map((i) => [String(i.id), i])).values());

const mergeFavorites = (existingFavs = [], newIndicators = []) => {
  const newFavs = (newIndicators || []).filter((indicator) => indicator && indicator.favorite);
  const merged = [...(existingFavs || []), ...newFavs];
  return dedupeById(merged);
};

const useIndicatorStore = create((set, get) => ({
  tecnic: [],
  community: [],
  indicators: [],
  favorites: [],
  isVisible: {},

  setCommunityIndicators: (newIndicators) =>
    set((state) => ({
      community: newIndicators,
      favorites: mergeFavorites(state.favorites, newIndicators),
    })),

  setTecnicIndicators: (newIndicators) =>
    set((state) => ({
      tecnic: newIndicators,
      favorites: mergeFavorites(state.favorites, newIndicators),
    })),

  setPersonalIndicators: (newIndicators) =>
    set((state) => ({
      indicators: newIndicators,
      favorites: mergeFavorites(state.favorites, newIndicators),
    })),

  /**
   * addIndicator:
   * - Eğer aynı id varsa replace eder (bu şekilde addIndicator, bazı yerlerde hem add hem update olarak çalışır)
   * - favorites'ı id bazlı günceller
   */
  addIndicator: (indicator) =>
    set((state) => {
      if (!indicator) return {};
      const idStr = String(indicator.id);
      const exists = state.indicators.some((i) => String(i.id) === idStr);
      const updatedIndicators = exists
        ? state.indicators.map((i) => (String(i.id) === idStr ? { ...i, ...indicator } : i))
        : [...state.indicators, indicator];

      const updatedFavorites = indicator.favorite
        ? dedupeById([...(state.favorites || []), indicator])
        : state.favorites;

      return { indicators: updatedIndicators, favorites: updatedFavorites };
    }),

  /**
   * updateIndicator:
   * - id ile eşleşen kaydı patch (partial) ile günceller
   * - favorites içinde varsa o kaydı da günceller
   */
  updateIndicator: (id, patch) =>
    set((state) => {
      const idStr = String(id);
      const indicators = (state.indicators || []).map((it) =>
        String(it.id) === idStr ? { ...it, ...patch } : it
      );
      const favorites = (state.favorites || []).map((f) =>
        String(f.id) === idStr ? { ...f, ...patch } : f
      );
      return { indicators, favorites };
    }),

  deleteIndicator: (id) =>
    set((state) => {
      const idStr = String(id);
      return {
        indicators: (state.indicators || []).filter((indicator) => String(indicator.id) !== idStr),
        favorites: (state.favorites || []).filter((fav) => String(fav.id) !== idStr),
      };
    }),

  toggleFavorite: (indicator) =>
    set((state) => {
      const isAlreadyFavorite = (state.favorites || []).some((fav) => String(fav.id) === String(indicator.id));
      return {
        favorites: isAlreadyFavorite
          ? (state.favorites || []).filter((fav) => String(fav.id) !== String(indicator.id))
          : [...(state.favorites || []), indicator],
      };
    }),

  toggleIndicator: (indicatorId) =>
    set((state) => ({ isVisible: { ...state.isVisible, [indicatorId]: !state.isVisible[indicatorId] } })),

  setIndicatorPendingRelease: (indicatorId, pendingRelease) =>
    set((state) => {
      const indicators = (state.indicators || []).map((it) =>
        String(it.id) === String(indicatorId) ? { ...it, pending_release: pendingRelease } : it
      );
      const favorites = (state.favorites || []).map((f) =>
        String(f.id) === String(indicatorId) ? { ...f, pending_release: pendingRelease } : f
      );
      return { indicators, favorites };
    }),
}));

export default useIndicatorStore;
