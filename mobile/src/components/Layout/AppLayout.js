import React, { useContext, useMemo } from "react";
import { View, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "./Header";
import { getTheme } from "../../theme";
import { SettingsContext } from "../../context/SettingsContext";
import Footer from "./Footer";

export default function AppLayout({ children }) {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* StatusBar arkasını şeffaf bırak */}
      <StatusBar
        translucent
        backgroundColor="transparent"   // <-- backgroundColor KULLANILIRSA 'transparent' olmalı
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      {/* Status bar ALTINI boyayan filler */}
      <View style={{ height: insets.top, backgroundColor: colors.background }} />

      <Header />

      <View style={[styles.content, { backgroundColor: colors.background }]}>
        {children}
      </View>
      <Footer />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
});
