import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

const useSettingsStore = create(
  persist(
    (set, get) => ({
      // Bildirimler
      notificationsEnabled: false,
      tradeAlerts: true,
      marketingEmails: false,

      // Analitik / gizlilik
      analyticsEnabled: true,

      // Eylemler
      setNotificationsEnabled: (v) => set({ notificationsEnabled: !!v }),
      setTradeAlerts: (v) => set({ tradeAlerts: !!v }),
      setMarketingEmails: (v) => set({ marketingEmails: !!v }),
      setAnalyticsEnabled: (v) => set({ analyticsEnabled: !!v }),

      // Opsiyonel: izin isteme (şimdilik stub, sonra Expo Notifications ile doldurulur)
      requestNotificationPermission: async () => {
        // TODO: Expo Notifications veya native izin akışı ile doldur.
        // Şimdilik sadece true/false dönen bir stub düşün.
        return true;
      },
    }),
    {
      name: "whaleer-settings",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        notificationsEnabled: s.notificationsEnabled,
        tradeAlerts: s.tradeAlerts,
        marketingEmails: s.marketingEmails,
        analyticsEnabled: s.analyticsEnabled,
      }),
    }
  )
);

export default useSettingsStore;
