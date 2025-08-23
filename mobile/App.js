// App.js
import 'react-native-reanimated';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import React, { useState, useEffect, useContext } from "react";
import { View, ActivityIndicator } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppNavigator from "./src/AppNavigator";
import { SettingsProvider, SettingsContext } from "./src/context/SettingsContext";
import AuthProvider from './src/context/AuthContext';

// ⬇️ authStore'dan boot ve hydrated okuyacağız
import useAuthStore from "./src/store/auth/authStore";

function Root() {
  const { theme, changeTheme } = useContext(SettingsContext);
  const [themeReady, setThemeReady] = useState(false);

  const hydrated = useAuthStore((s) => s.hydrated);
  const boot = useAuthStore((s) => s.boot);

  // Tema rehydrate
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem("theme");
      if (saved) changeTheme(saved);
      setThemeReady(true);
    })();
  }, [changeTheme]);

  // ⬅️ Auth boot: refresh_token varsa sessiz login
  useEffect(() => {
    boot();
  }, [boot]);

  // Splash (tema ya da auth henüz hazır değilse)
  if (!themeReady || !hydrated) {
    const isDark = theme === "dark";
    return (
      <View style={{ flex: 1, backgroundColor: isDark ? "#000" : "#fff", alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return <AppNavigator />;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <SettingsProvider>
            <Root />
          </SettingsProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
