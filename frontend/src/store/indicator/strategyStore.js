import { create } from "zustand";

const useStrategyStore = create((set) => ({
    tecnic: [],
    community: [],
    strategies: [], // Kaydedilen indikatörler listesi
    all_strategies: [], // Tüm indikatörler listesi
    favorites: [], // Favori indikatörler listesi
    isVisible: {}, // İndikatörlerin açık/kapalı durumlarını saklayan obje

    setCommunityStrategies: (newStrategies) => set((state) => {
        const newFavorites = newStrategies.filter((strategy) => strategy.favorite);
        const mergedFavorites = [...state.favorites, ...newFavorites];
    
        const uniqueFavorites = Array.from(
            new Map(mergedFavorites.map((item) => [item.name, item])).values()
        );
    
        return {
            community: newStrategies,
            favorites: uniqueFavorites,
        };
    }),
    
    setTecnicStrategies: (newStrategies) => set((state) => {
        const newFavorites = newStrategies.filter((strategy) => strategy.favorite);
        const mergedFavorites = [...state.favorites, ...newFavorites];
    
        const uniqueFavorites = Array.from(
            new Map(mergedFavorites.map((item) => [item.name, item])).values()
        );
    
        return {
            tecnic: newStrategies,
            favorites: uniqueFavorites,
        };
    }),
    
    setPersonalStrategies: (newStrategies) => set((state) => {
        const newFavorites = newStrategies.filter((strategy) => strategy.favorite);
        const mergedFavorites = [...state.favorites, ...newFavorites];
    
        const uniqueFavorites = Array.from(
            new Map(mergedFavorites.map((item) => [item.name, item])).values()
        );
    
        return {
            strategies: newStrategies,
            favorites: uniqueFavorites,
        };
    }),

    addStrategy: (strategy) => set((state) => {
        const updatedStrategies = [...state.strategies, strategy];
    
        // Eğer favorite olarak işaretlenmişse favorites'a da ekle
        const isFavorite = strategy.favorite;
        const updatedFavorites = isFavorite
            ? Array.from(
                new Map(
                  [...state.favorites, strategy].map((item) => [item.id, item])
                ).values()
              )
            : state.favorites;
    
        return {
            strategies: updatedStrategies,
            favorites: updatedFavorites,
        };
    }),
    


    deleteStrategy: (id) => set((state) => ({
        strategies: state.strategies.filter((strategy) => strategy.id !== id)
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
        isVisible: {
            ...state.isVisible,
            [strategyId]: !state.isVisible[strategyId]
        }
    })),
}));

export default useStrategyStore;