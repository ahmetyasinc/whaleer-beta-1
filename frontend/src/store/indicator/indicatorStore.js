import { create } from "zustand";

const useIndicatorStore = create((set) => ({
  tecnic: [],
  community: [],
  indicators: [],
  favorites: [],
  isVisible: {},

  setCommunityIndicators: (newIndicators) => set((state) => {
    const newFavorites = newIndicators.filter((indicator) => indicator.favorite);
    const mergedFavorites = [...state.favorites, ...newFavorites];
    const uniqueFavorites = Array.from(new Map(mergedFavorites.map((item) => [item.name, item])).values());
    return { community: newIndicators, favorites: uniqueFavorites };
  }),

  setTecnicIndicators: (newIndicators) => set((state) => {
    const newFavorites = newIndicators.filter((indicator) => indicator.favorite);
    const mergedFavorites = [...state.favorites, ...newFavorites];
    const uniqueFavorites = Array.from(new Map(mergedFavorites.map((item) => [item.name, item])).values());
    return { tecnic: newIndicators, favorites: uniqueFavorites };
  }),

  setPersonalIndicators: (newIndicators) => set((state) => {
    const newFavorites = newIndicators.filter((indicator) => indicator.favorite);
    const mergedFavorites = [...state.favorites, ...newFavorites];
    const uniqueFavorites = Array.from(new Map(mergedFavorites.map((item) => [item.name, item])).values());
    return { indicators: newIndicators, favorites: uniqueFavorites };
  }),

  addIndicator: (indicator) => set((state) => {
    const updatedIndicators = [...state.indicators, indicator];
    const isFavorite = indicator.favorite;
    const updatedFavorites = isFavorite
      ? Array.from(new Map([...state.favorites, indicator].map((item) => [item.id, item])).values())
      : state.favorites;
    return { indicators: updatedIndicators, favorites: updatedFavorites };
  }),

  deleteIndicator: (id) => set((state) => ({
    indicators: state.indicators.filter((indicator) => indicator.id !== id)
  })),

  toggleFavorite: (indicator) => set((state) => {
    const isAlreadyFavorite = state.favorites.some((fav) => fav.id === indicator.id);
    return {
      favorites: isAlreadyFavorite
        ? state.favorites.filter((fav) => fav.id !== indicator.id)
        : [...state.favorites, indicator]
    };
  }),

  toggleIndicator: (indicatorId) => set((state) => ({
    isVisible: { ...state.isVisible, [indicatorId]: !state.isVisible[indicatorId] }
  })),

  setIndicatorPendingRelease: (indicatorId, pendingRelease) => set((state) => {
    const indicators = state.indicators.map((it) =>
      it.id === indicatorId ? { ...it, pending_release: pendingRelease } : it
    );
    // favorites vs. dokunma; sadece kişisel listede güncelleme yeterli
    return { indicators };
  }),

}));

export default useIndicatorStore;
