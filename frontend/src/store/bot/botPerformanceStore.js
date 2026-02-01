import { create } from 'zustand';

export const useBotPerformanceStore = create((set, get) => ({
    performanceData: {},

    generatePerformanceData: (botId, type, initialValues = {}) => {
        if (get().performanceData[botId]) return;

        const isFutures = type?.toLowerCase()?.includes('future');

        const inputs = {
            initialBalance: Number(initialValues.initialBalance) || 0,
            startDate: initialValues.startDate || new Date().toISOString()
        };

        // 2. BACKEND VERİLERİ (Simüle edilen / API'den gelecek veriler)
        const backend = {
            workTime: Math.floor(Math.random() * 1400), // Saat cinsinden integer (Örn: 125 sa)
            powerPoint: Math.floor(Math.random() * 100),
            currentBalance: inputs.initialBalance * (1 + (Math.random() * 0.4 - 0.1)),
            exposure: isFutures ? { long: Math.floor(Math.random() * 100), short: Math.floor(Math.random() * 100) } : Math.floor(Math.random() * 100)
        };

        // 3. FRONTEND HESAPLAMALARI (Derived Data)
        const now = new Date();
        const start = new Date(inputs.startDate);

        // Geçen süre
        const diffMs = now.getTime() - start.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const elapsedTime = `${diffDays}d ${diffHours}h`;

        // Çalışma Süresi Formatlama (Saat -> Gün Saat)
        const wtDays = Math.floor(backend.workTime / 24);
        const wtHours = backend.workTime % 24;
        const formattedWorkTime = `${wtDays}d ${wtHours}h`;

        const SELL_THRESHOLD_HOURS = 700;
        const sellEligibilityPercent = Math.min((backend.workTime / SELL_THRESHOLD_HOURS) * 100, 100);
        const isEligibleForSale = backend.workTime >= SELL_THRESHOLD_HOURS;

        let remainingForSellString = "";
        if (!isEligibleForSale) {
            const remainingHours = SELL_THRESHOLD_HOURS - backend.workTime;
            const remDays = Math.floor(remainingHours / 24);
            const remHours = remainingHours % 24;
            remainingForSellString = `${remDays}d ${remHours}h`;
        }

        // PnL
        const changeAmount = backend.currentBalance - inputs.initialBalance;
        const changePercentage = inputs.initialBalance > 0
            ? (changeAmount / inputs.initialBalance) * 100
            : 0;

        const derived = {
            currentDate: now.toISOString(),
            elapsedTime,
            formattedWorkTime,
            sellEligibilityPercent,
            isEligibleForSale,
            remainingForSellString,
            changeAmount,
            changePercentage
        };

        // Veriyi ayrıştırılmış yapıda sakla
        set((state) => ({
            performanceData: {
                ...state.performanceData,
                [botId]: {
                    inputs,
                    backend,
                    derived
                }
            }
        }));
    },

    clearPerformanceData: (botId) => {
        set((state) => {
            const newData = { ...state.performanceData };
            delete newData[botId];
            return { performanceData: newData };
        });
    }
}));