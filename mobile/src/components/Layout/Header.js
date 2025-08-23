// src/components/Layout/Header.js  (kısa ekleme)
import React, { useContext, useMemo } from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import useProfileStore from "../../store/profile/profileStore";

export default function Header() {
  const { theme, changeTheme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);
  const isDark = theme === "dark";
  const user = useProfileStore((s) => s.data?.user);

  return (
    <>
      <SafeAreaView edges={["top"]} style={[styles.safeArea, { backgroundColor: colors.background }]}>
        <View style={styles.container}>
          <View style={styles.left}>
            {user && (
              <>
                <Text style={[styles.username, { color: colors.text }]}>@{user.username}</Text>
                <Text style={{ color: colors.muted }}>{user.total_followers} followers</Text>
              </>
            )}
          </View>
          <TouchableOpacity style={styles.button} onPress={() => changeTheme(isDark ? "light" : "dark")}>
            <Text style={{ fontSize: 20 }}>{isDark ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
      <StatusBar style={isDark ? "light" : "dark"} />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: { width: "100%" },
  container: {
    height: 56,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  left: { flexDirection: "column" },
  username: { fontWeight: "700" },
  button: { padding: 8 },
});
