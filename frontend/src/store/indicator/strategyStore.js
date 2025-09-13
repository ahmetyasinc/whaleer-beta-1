import { create } from "zustand";

const dedupeById = (arr = []) => Array.from(new Map(arr.map((i) => [String(i.id), i])).values());

const mergeFavorites = (existingFavs = [], newItems = []) => {
  const newFavs = (newItems || []).filter((it) => it && it.favorite);
  const merged = [...(existingFavs || []), ...newFavs];
  return dedupeById(merged);
};

const buildAllStrategies = ({ tecnic = [], personal = [], community = [] }) => {
  // Öncelik: tecnic, personal, community (orjinal mantığa uygun)
  return [...(tecnic || []), ...(personal || []), ...(community || [])];
};

const useStrategyStore = create((set, get) => ({
  tecnic: [],
  community: [],
  strategies: [], // personal
  all_strategies: [],
  favorites: [],
  isVisible: {},

  setCommunityStrategies: (newStrategies) =>
    set((state) => {
      const favorites = mergeFavorites(state.favorites, newStrategies);
      const all_strategies = buildAllStrategies({ tecnic: state.tecnic, personal: state.strategies, community: newStrategies });
      return { community: newStrategies, favorites, all_strategies };
    }),

  setTecnicStrategies: (newStrategies) =>
    set((state) => {
      const favorites = mergeFavorites(state.favorites, newStrategies);
      const all_strategies = buildAllStrategies({ tecnic: newStrategies, personal: state.strategies, community: state.community });
      return { tecnic: newStrategies, favorites, all_strategies };
    }),

  setPersonalStrategies: (newStrategies) =>
    set((state) => {
      const favorites = mergeFavorites(state.favorites, newStrategies);
      const all_strategies = buildAllStrategies({ tecnic: state.tecnic, personal: newStrategies, community: state.community });
      return { strategies: newStrategies, favorites, all_strategies };
    }),

  /**
   * addStrategy:
   * - Eğer aynı id zaten varsa replace eder (bu sayede addStrategy hem add hem update davranışı gösterebilir)
   * - favorites id bazlı güncellenir
   * - all_strategies yeniden oluşturulur
   */
  addStrategy: (strategy) =>
    set((state) => {
      if (!strategy) return {};
      const idStr = String(strategy.id);
      const exists = (state.strategies || []).some((s) => String(s.id) === idStr);
      const updatedStrategies = exists
        ? (state.strategies || []).map((s) => (String(s.id) === idStr ? { ...s, ...strategy } : s))
        : [...(state.strategies || []), strategy];

      const updatedFavorites = strategy.favorite
        ? dedupeById([...(state.favorites || []), strategy])
        : state.favorites || [];

      const all_strategies = buildAllStrategies({ tecnic: state.tecnic, personal: updatedStrategies, community: state.community });

      return { strategies: updatedStrategies, favorites: updatedFavorites, all_strategies };
    }),

  /**
   * updateStrategy:
   * - id ile eşleşen entry'yi patch ile günceller
   * - favorites içinde varsa o kaydı da günceller
   * - all_strategies yeniden oluşturulur
   */
  updateStrategy: (id, patch) =>
    set((state) => {
      const idStr = String(id);
      const strategies = (state.strategies || []).map((st) => (String(st.id) === idStr ? { ...st, ...patch } : st));
      const favorites = (state.favorites || []).map((f) => (String(f.id) === idStr ? { ...f, ...patch } : f));
      const all_strategies = buildAllStrategies({ tecnic: state.tecnic, personal: strategies, community: state.community });
      return { strategies, favorites, all_strategies };
    }),

  deleteStrategy: (id) =>
    set((state) => {
      const idStr = String(id);
      const strategies = (state.strategies || []).filter((strategy) => String(strategy.id) !== idStr);
      const favorites = (state.favorites || []).filter((fav) => String(fav.id) !== idStr);
      const all_strategies = buildAllStrategies({ tecnic: state.tecnic, personal: strategies, community: state.community });
      return { strategies, favorites, all_strategies };
    }),

  toggleFavorite: (strategy) =>
    set((state) => {
      const isAlreadyFavorite = (state.favorites || []).some((fav) => String(fav.id) === String(strategy.id));
      const favorites = isAlreadyFavorite
        ? (state.favorites || []).filter((fav) => String(fav.id) !== String(strategy.id))
        : [...(state.favorites || []), strategy];
      return { favorites };
    }),

  toggleStrategy: (strategyId) =>
    set((state) => ({ isVisible: { ...state.isVisible, [strategyId]: !state.isVisible[strategyId] } })),

  setStrategyPendingRelease: (strategyId, pendingRelease) =>
    set((state) => {
      const strategies = (state.strategies || []).map((st) =>
        String(st.id) === String(strategyId) ? { ...st, pending_release: pendingRelease } : st
      );
      const all_strategies = buildAllStrategies({ tecnic: state.tecnic, personal: strategies, community: state.community });
      return { strategies, all_strategies };
    }),
}));

export default useStrategyStore;
