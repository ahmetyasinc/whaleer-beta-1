import { create } from "zustand";
import axios from "axios";

const useStrategyStore = create((set, get) => ({
    tecnic: [],
    community: [],
    strategies: [], // Kaydedilen stratejiler listesi
    all_strategies: [], // Tüm stratejiler listesi
    favorites: [], 
    isVisible: {}, 

    setCommunityStrategies: (newStrategies) => set((state) => {
        const newFavorites = newStrategies.filter((strategy) => strategy.favorite);
        const mergedFavorites = [...state.favorites, ...newFavorites];
        const uniqueFavorites = Array.from(new Map(mergedFavorites.map((item) => [item.name, item])).values());
        return { community: newStrategies, favorites: uniqueFavorites };
    }),

    setTecnicStrategies: (newStrategies) => set((state) => {
        const newFavorites = newStrategies.filter((strategy) => strategy.favorite);
        const mergedFavorites = [...state.favorites, ...newFavorites];
        const uniqueFavorites = Array.from(new Map(mergedFavorites.map((item) => [item.name, item])).values());
        return { tecnic: newStrategies, favorites: uniqueFavorites };
    }),

    setPersonalStrategies: (newStrategies) => set((state) => {
        const newFavorites = newStrategies.filter((strategy) => strategy.favorite);
        const mergedFavorites = [...state.favorites, ...newFavorites];
        const uniqueFavorites = Array.from(new Map(mergedFavorites.map((item) => [item.name, item])).values());
        return { strategies: newStrategies, favorites: uniqueFavorites };
    }),

    addStrategy: (strategy) => set((state) => {
        const updatedStrategies = [...state.strategies, strategy];
        const isFavorite = strategy.favorite;
        const updatedFavorites = isFavorite
            ? Array.from(new Map([...state.favorites, strategy].map((item) => [item.id, item])).values())
            : state.favorites;
        return { strategies: updatedStrategies, favorites: updatedFavorites };
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

    // ✅ Backend'den veri çeken fonksiyon
    fetchStrategies: async () => {
        if (get().strategies.length > 0) return; // zaten yüklenmişse tekrar çağırma

        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/all-strategies/`, {
                withCredentials: true,
            });

            console.log("Backend'den stratejiler:", response.data);

            const tecnic_strategies = response.data.tecnic_strategies || [];
            const personal_strategies = response.data.personal_strategies || [];
            const community_strategies = response.data.community_strategies || [];

            set((state) => ({
                tecnic: tecnic_strategies,
                strategies: personal_strategies,
                community: community_strategies,
                all_strategies: [
                    ...tecnic_strategies,
                    ...personal_strategies,
                    ...community_strategies,
                ],
                favorites: [
                    ...state.favorites,
                    ...tecnic_strategies.filter((s) => s.favorite),
                    ...personal_strategies.filter((s) => s.favorite),
                    ...community_strategies.filter((s) => s.favorite),
                ],
            }));
        } catch (error) {
            console.error("Strateji verisi çekme hatası:", error);
        }
    },
}));

export default useStrategyStore;
