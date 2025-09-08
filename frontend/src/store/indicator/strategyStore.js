import { create } from "zustand";

const useStrategyStore = create((set) => ({
  tecnic: [],
  community: [],
  strategies: [],
  all_strategies: [],
  favorites: [],
  isVisible: {},

  setCommunityStrategies: (newStrategies) => set((state) => {
    const newFavorites = newStrategies.filter((strategy) => strategy.favorite);
    const mergedFavorites = [...state.favorites, ...newFavorites];
    const uniqueFavorites = Array.from(new Map(mergedFavorites.map((item) => [item.name, item])).values());
    const all_strategies = [...state.tecnic, ...state.strategies, ...newStrategies];
    return { community: newStrategies, favorites: uniqueFavorites, all_strategies };
  }),

  setTecnicStrategies: (newStrategies) => set((state) => {
    const newFavorites = newStrategies.filter((strategy) => strategy.favorite);
    const mergedFavorites = [...state.favorites, ...newFavorites];
    const uniqueFavorites = Array.from(new Map(mergedFavorites.map((item) => [item.name, item])).values());
    const all_strategies = [...newStrategies, ...state.strategies, ...state.community];
    return { tecnic: newStrategies, favorites: uniqueFavorites, all_strategies };
  }),

  setPersonalStrategies: (newStrategies) => set((state) => {
    const newFavorites = newStrategies.filter((strategy) => strategy.favorite);
    const mergedFavorites = [...state.favorites, ...newFavorites];
    const uniqueFavorites = Array.from(new Map(mergedFavorites.map((item) => [item.name, item])).values());
    const all_strategies = [...state.tecnic, ...newStrategies, ...state.community];
    return { strategies: newStrategies, favorites: uniqueFavorites, all_strategies };
  }),

  addStrategy: (strategy) => set((state) => {
    const updatedStrategies = [...state.strategies, strategy];
    const isFavorite = strategy.favorite;
    const updatedFavorites = isFavorite
      ? Array.from(new Map([...state.favorites, strategy].map((item) => [item.id, item])).values())
      : state.favorites;
    const all_strategies = [...state.tecnic, ...updatedStrategies, ...state.community];
    return { strategies: updatedStrategies, favorites: updatedFavorites, all_strategies };
  }),

  deleteStrategy: (id) => set((state) => ({
    strategies: state.strategies.filter((strategy) => strategy.id !== id),
    all_strategies: [...state.tecnic, ...state.strategies.filter((s)=>s.id!==id), ...state.community]
  })),

  toggleFavorite: (strategy) => set((state) => {
    const isAlreadyFavorite = state.favorites.some((fav) => fav.id === strategy.id);
    return {
      favorites: isAlreadyFavorite
        ? state.favorites.filter((fav) => fav.id !== strategy.id)
        : [...state.favorites, strategy]
    };
  }),

  toggleStrategy: (strategyId) => set((state) => ({
    isVisible: { ...state.isVisible, [strategyId]: !state.isVisible[strategyId] }
  })),

  setStrategyPendingRelease: (strategyId, pendingRelease) => set((state) => {
    const strategies = state.strategies.map((st) =>
      st.id === strategyId ? { ...st, pending_release: pendingRelease } : st
    );
    const all_strategies = [...state.tecnic, ...strategies, ...state.community];
    return { strategies, all_strategies };
  }),

}));

export default useStrategyStore;
