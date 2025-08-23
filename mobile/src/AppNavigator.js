// src/AppNavigator.js
import React, { useContext, useMemo } from "react";
import { NavigationContainer, DefaultTheme, DarkTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import WelcomeScreen from "./screens/Welcome/WelcomeScreen";
import SignInScreen from "./screens/Auth/SıgnInScreen";
import SignUpScreen from "./screens/Auth/SıgnUpScreen";
import ProfileScreen from "./screens/Profile/ProfileScreen";

import { SettingsContext } from "./context/SettingsContext";
import { getTheme } from "./theme";
import { View } from "react-native";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  // React Navigation teması ile senin tema renklerini uyumlayalım
  const navTheme = useMemo(() => ({
    ...(theme === "dark" ? DarkTheme : DefaultTheme),
    colors: {
      ...(theme === "dark" ? DarkTheme.colors : DefaultTheme.colors),
      background: colors.background,
      card: colors.surface,
      text: colors.textPrimary,
      border: colors.border || "#00000020",
      primary: colors.primary,
    },
  }), [theme, colors]);

  return (
    <NavigationContainer theme={navTheme}>
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background }} />
        <Stack.Navigator
          screenOptions={{
            headerShown: false,

            // ❺ Sahne arka planını ZORLA doldur
            contentStyle: { backgroundColor: colors.background },

            // Test amaçlı geçici:
            animation: "fade",
          }}
        >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="SignIn" component={SignInScreen} />
        <Stack.Screen name="SignUp" component={SignUpScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
