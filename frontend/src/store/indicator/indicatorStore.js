import { create } from "zustand";
import axios from "axios";

const useIndicatorStore = create((set, get) => ({
    tecnic: [],
    community: [],
    indicators: [],
    favorites: [],
    isVisible: {},

    setCommunityIndicators: (newIndicators) => set((state) => {
        const newFavorites = newIndicators.filter((indicator) => indicator.favorite);
        const mergedFavorites = [...state.favorites, ...newFavorites];
        const uniqueFavorites = Array.from(
            new Map(mergedFavorites.map((item) => [item.name, item])).values()
        );
        return { community: newIndicators, favorites: uniqueFavorites };
    }),

    setTecnicIndicators: (newIndicators) => set((state) => {
        const newFavorites = newIndicators.filter((indicator) => indicator.favorite);
        const mergedFavorites = [...state.favorites, ...newFavorites];
        const uniqueFavorites = Array.from(
            new Map(mergedFavorites.map((item) => [item.name, item])).values()
        );
        return { tecnic: newIndicators, favorites: uniqueFavorites };
    }),

    setPersonalIndicators: (newIndicators) => set((state) => {
        const newFavorites = newIndicators.filter((indicator) => indicator.favorite);
        const mergedFavorites = [...state.favorites, ...newFavorites];
        const uniqueFavorites = Array.from(
            new Map(mergedFavorites.map((item) => [item.name, item])).values()
        );
        return { indicators: newIndicators, favorites: uniqueFavorites };
    }),

    addIndicator: (indicator) => set((state) => {
        const updatedIndicators = [...state.indicators, indicator];
        const isFavorite = indicator.favorite;
        const updatedFavorites = isFavorite
            ? Array.from(
                new Map(
                  [...state.favorites, indicator].map((item) => [item.id, item])
                ).values()
              )
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
        isVisible: {
            ...state.isVisible,
            [indicatorId]: !state.isVisible[indicatorId]
        }
    })),

    // ✅ Backend'den veri çeken fonksiyon
    fetchIndicators: async () => {
        if (get().tecnic.length > 0) return; // daha önce çekildiyse tekrar çekme

        try {
            const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/all-indicators/`, {
                withCredentials: true,
            });
            console.log("Backend verisi:", response.data);

            const tecnic_indicators = response.data.tecnic_indicators || [];
            const personal_indicators = response.data.personal_indicators || [];
            const public_indicators = response.data.public_indicators || [];

            set((state) => ({
                tecnic: tecnic_indicators,
                indicators: personal_indicators,
                community: public_indicators,
                favorites: [
                    ...state.favorites,
                    ...tecnic_indicators.filter((i) => i.favorite),
                    ...personal_indicators.filter((i) => i.favorite),
                    ...public_indicators.filter((i) => i.favorite),
                ],
            }));
        } catch (error) {
            console.error("Veri çekme hatası:", error);
        }
    },
}));

export default useIndicatorStore;
