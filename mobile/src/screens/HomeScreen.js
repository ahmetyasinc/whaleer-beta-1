import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient"; // istersen kaldırabilirsin
import { colors } from "../theme/colors";
import { fetchHeroInfos } from "../api/fetchHeroInfos";

// fallback değerler
const ZERO = { user_count: 0, trader_count: 0, strategy_count: 0, bot_count: 0 };

export default function HomeScreen({ navigation }) {
  const [data, setData] = useState(ZERO);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetchHeroInfos();
    setData(res ?? ZERO);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const goRegister = () => {
    if (navigation?.navigate) navigation.navigate("Register");
    else console.log("Register pressed");
  };

  const goLogin = () => {
    if (navigation?.navigate) navigation.navigate("Login");
    else console.log("Login pressed");
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={styles.container}
      refreshControl={<RefreshControl tintColor="#fff" refreshing={loading} onRefresh={load} />}
    >
      {/* HERO */}
      <View style={styles.hero}>
        <LinearGradient
          colors={[colors.bg, colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Image
          source={require("../../styles/images/logo-whaleer.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.brand}>Whaleer</Text>
        <Text style={styles.tagline}>Trade smarter, anywhere.</Text>

        <View style={styles.ctaRow}>
          <TouchableOpacity onPress={goRegister} style={styles.ctaPrimary} activeOpacity={0.9}>
            <Text style={styles.ctaPrimaryText}>Register</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={goLogin} style={styles.ctaGhost} activeOpacity={0.9}>
            <Text style={styles.ctaGhostText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* STATS (API'den) */}
      <View style={styles.statsCard}>
        <Text style={styles.statsTitle}>Live Stats</Text>
        <View style={styles.statsGrid}>
          <StatMini label="Users" value={data.user_count} />
          <StatMini label="Traders" value={data.trader_count} />
          <StatMini label="Strategies" value={data.strategy_count} />
          <StatMini label="Bots" value={data.bot_count} />
        </View>
        <Text style={styles.statsHint}>Veri çekilemezse 0 gösterilir • Aşağı çekerek yenile</Text>
      </View>
    </ScrollView>
  );
}

function StatMini({ label, value }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 28,
    gap: 22,
  },

  // HERO
  hero: {
    position: "relative",
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 18,
    paddingVertical: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  logo: { width: 48, height: 48, marginBottom: 10 },
  brand: { color: colors.text, fontSize: 26, fontWeight: "800" },
  tagline: { color: colors.textDim, fontSize: 13, marginTop: 6 },

  ctaRow: { flexDirection: "row", gap: 10, marginTop: 16 },
  ctaPrimary: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
  },
  ctaPrimaryText: { color: "#0b1220", fontWeight: "700" },
  ctaGhost: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  ctaGhostText: { color: colors.text, fontWeight: "600" },

  // STATS
  statsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 12,
  },
  statsTitle: { color: colors.text, fontWeight: "800", fontSize: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    columnGap: 10,
    rowGap: 10,
  },
  statItem: {
    width: "47%",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: { color: colors.text, fontWeight: "800", fontSize: 20 },
  statLabel: { color: colors.textDim, marginTop: 4, fontSize: 12 },
  statsHint: { color: colors.textDim, fontSize: 11, marginTop: 2 },
});
