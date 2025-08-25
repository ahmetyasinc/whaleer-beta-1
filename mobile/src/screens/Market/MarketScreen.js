// src/screens/Market/MarketScreen.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Header from "../../components/Layout/Header";
import { useContext, useMemo } from "react";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";

export default function MarketScreen() {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <Header />
      <View style={styles.center}>
        <Text style={[styles.text, { color: colors.text }]}>
          This page will be ready for you
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontSize: 18, fontWeight: "500" },
});
