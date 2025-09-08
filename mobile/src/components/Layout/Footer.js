// src/components/Layout/Footer.js
import React, { useContext, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import useAuthStore from "../../store/auth/authStore";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

const HIDDEN_ROUTES = ["Welcome"]; // WelcomeScreen’de görünmesin

export default function Footer({ navRef, activeRouteName }) {
  const isAuthed = useAuthStore((s) => s.isAuthed);
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  if (!isAuthed) return null;
  if (!activeRouteName || HIDDEN_ROUTES.includes(activeRouteName)) return null;

  const items = [
    { key: "Profile",  Icon: Ionicons, name: "person-circle-outline" },
    { key: "Bots",     Icon: MaterialCommunityIcons, name: "robot-outline" },
    { key: "Showcase", Icon: Ionicons, name: "star-outline" },
    { key: "Market",   Icon: Ionicons, name: "cart-outline" },
    { key: "Settings", Icon: Ionicons, name: "settings-outline" },
  ];

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={[
        styles.safeArea,
        { backgroundColor: colors.background, borderTopColor: colors.border },
      ]}
    >
      <View style={styles.container}>
        {items.map(({ key, Icon, name }) => {
          const active = activeRouteName === key;
          const tint = active ? colors.primary : colors.muted;
          return (
            <TouchableOpacity
              key={key}
              style={styles.tab}
              activeOpacity={0.7}
              onPress={() => {
                if (!active && navRef?.current) navRef.current.navigate(key);
              }}
            >
              <Icon name={name} size={24} color={tint} />
              <View
                style={[
                  styles.dot,
                  { backgroundColor: active ? colors.primary : "transparent" },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    borderTopWidth: StyleSheet.hairlineWidth,
    width: "100%",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  container: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: 4,
  },
  tab: { height: 44, width: 56, alignItems: "center", justifyContent: "center", gap: 4 },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
