// src/AppNavigator.js
import React, { useContext, useMemo, useState } from "react";
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useNavigationContainerRef,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { View, StyleSheet } from "react-native";

import WelcomeScreen from "./screens/Welcome/WelcomeScreen";
import SignInScreen from "./screens/Auth/SıgnInScreen";
import SignUpScreen from "./screens/Auth/SıgnUpScreen";
import ProfileScreen from "./screens/Profile/ProfileScreen";
import BotScreen from "./screens/Bots/BotScreen";
import ShowcaseScreen from "./screens/Showcase/ShowcaseScreen";
import ShowcaseFiltersScreen from "./screens/Showcase/ShowcaseFiltersScreen";
import MarketScreen from "./screens/Market/MarketScreen";
import SettingsScreen from "./screens/Settings/SettingsScreen";
import BotDetailScreen from "./screens/Bots/BotDetailScreen";

import { SettingsContext } from "./context/SettingsContext";
import { getTheme } from "./theme";
import useAuthStore from "./store/auth/authStore";
import Footer from "./components/Layout/Footer";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);
  const isAuthed = useAuthStore((s) => s.isAuthed);

  const navRef = useNavigationContainerRef();
  const [navReady, setNavReady] = useState(false);
  const [activeRouteName, setActiveRouteName] = useState(null);

  const navTheme = useMemo(
    () => ({
      ...(theme === "dark" ? DarkTheme : DefaultTheme),
      colors: {
        ...(theme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border || "#00000020",
        primary: colors.primary,
      },
    }),
    [theme, colors]
  );

  const handleReady = () => {
    setNavReady(true);
    const r = navRef.getCurrentRoute();
    setActiveRouteName(r?.name || null);
  };

  const handleStateChange = () => {
    const r = navRef.getCurrentRoute();
    setActiveRouteName(r?.name || null);
  };

  return (
    <NavigationContainer
      theme={navTheme}
      ref={navRef}
      onReady={handleReady}
      onStateChange={handleStateChange}
    >
      <View style={styles.root}>
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: "fade",
          }}
        >
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="SignIn" component={SignInScreen} />
          <Stack.Screen name="SignUp" component={SignUpScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
          <Stack.Screen name="Bots" component={BotScreen} />
          <Stack.Screen name="BotDetail" component={BotDetailScreen} options={{ headerShown: false }} />
          <Stack.Screen name="Showcase" component={ShowcaseScreen} />
          <Stack.Screen name="ShowcaseFilters" component={ShowcaseFiltersScreen} />
          <Stack.Screen name="Market" component={MarketScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />

          {/* Bots, Showcase, Market, Settings ekranlarını da ekle */}
        </Stack.Navigator>

        {isAuthed && navReady && (
          <Footer
            navRef={navRef}
            activeRouteName={activeRouteName}
          />
        )}
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
