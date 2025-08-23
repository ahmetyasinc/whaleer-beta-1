// src/screens/Bots/BotScreen.js
import React, { useContext, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  TouchableOpacity,
} from "react-native";

import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import Header from "../../components/Layout/Header";
import ApiSwitcher from "../../components/profile/ApiSwitcher";
import AuthGate from "../../components/auth/AuthGate";
import useProfile from "../../hooks/useProfile";

// --- utils ---
function formatCurrency(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return "$0";
  const n = Number(v);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatPercent(v) {
  if (v === null || v === undefined || isNaN(Number(v))) return "0%";
  const n = Number(v);
  const sign = n > 0 ? "▲" : n < 0 ? "▼" : "";
  return `${sign} ${Math.abs(n).toFixed(2)}%`;
}

// --- card ---
function BotCard({ item, colors, onPress }) {
  const b = item?.bot || item;
  const pct = Number(b?.profit_percent || 0);
  const usd = Number(b?.profit_usd || 0);
  const positive = pct >= 0;
  const isActive = !!b?.active;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border || "rgba(255,255,255,0.06)" },
      ]}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <Text style={[styles.botName, { color: colors.text }]} numberOfLines={1}>
          {b?.name || "Bot"}
        </Text>

        <View
          style={[
            styles.badge,
            { backgroundColor: isActive ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: isActive ? colors.success : colors.danger },
            ]}
          >
            {isActive ? "Active" : "Inactive"}
          </Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.row}>
        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.muted }]}>Profit (%)</Text>
          <Text
            style={[
              styles.valueBig,
              { color: positive ? colors.success : colors.danger, fontWeight: "700" },
            ]}
          >
            {formatPercent(pct)}
          </Text>
        </View>

        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.muted }]}>Profit ($)</Text>
          <Text style={[styles.value, { color: positive ? colors.success : colors.danger }]}>
            {usd >= 0 ? "+" : "-"}
            {formatCurrency(Math.abs(usd))}
          </Text>
        </View>

        <View style={styles.col}>
          <Text style={[styles.label, { color: colors.muted }]}>Balance</Text>
          <Text style={[styles.value, { color: colors.text }]}>
            {formatCurrency(b?.current_usd_value || 0)}
          </Text>
        </View>
      </View>

      {/* Meta */}
      <View style={styles.footer}>
        <Text style={[styles.meta, { color: colors.muted }]}>
          Initial: {formatCurrency(b?.initial_usd_value || 0)}
        </Text>
        <Text style={[styles.link, { color: colors.primary }]}>Details ›</Text>
      </View>
    </TouchableOpacity>
  );
}

// --- screen ---
export default function BotScreen({ navigation }) {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  const {
    data,
    loading,
    error,
    selectedApiId,
    setSelectedApiId,
    refreshing,
    refresh,
  } = useProfile();

  const selectedApi = data?.apis?.find((a) => a.api.id === selectedApiId);
  const bots = useMemo(() => {
    if (!selectedApi?.bots) return [];
    // sort by bot name (alphabetical, case-insensitive)
    return [...selectedApi.bots.filter(Boolean)].sort((a, b) => {
      const nameA = (a?.bot?.name || "").toLowerCase();
      const nameB = (b?.bot?.name || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [selectedApi]);

  const onPressBot = useCallback(
    (b) => {
      const bot = b?.bot || b;
      navigation.navigate("BotDetail", { botId: bot?.id, bot });
    },
    [navigation]
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ paddingHorizontal: 16 }}>
        <BotCard item={item} colors={colors} onPress={() => onPressBot(item)} />
      </View>
    ),
    [colors, onPressBot]
  );

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header />

        <FlatList
          data={bots}
          keyExtractor={(item, idx) => String(item?.bot?.id ?? idx)}
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListHeaderComponent={
            <View style={{ paddingTop: 8, paddingBottom: 8, paddingHorizontal: 16 }}>
              <ApiSwitcher
                apis={data?.apis}
                selectedId={selectedApiId}
                onSelect={setSelectedApiId}
                colors={colors}
              />
              {!!error && <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>}
              {loading && <ActivityIndicator style={{ marginTop: 12 }} color={colors.primary} />}
              {!loading && bots?.length === 0 && (
                <Text style={{ color: colors.muted, marginTop: 12 }}>
                  No bots found for this API.
                </Text>
              )}
            </View>
          }

          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.muted}
              colors={[colors.primary]}
              progressBackgroundColor="transparent"
            />
          }
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      </SafeAreaView>
    </AuthGate>
  );
}

// --- styles ---
const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    elevation: 0,
    shadowOpacity: 0,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  botName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  valueBig: {
    fontSize: 18,
  },
  value: {
    fontSize: 16,
    fontWeight: "600",
  },
  footer: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  meta: {
    fontSize: 12,
  },
  link: {
    fontSize: 13,
    fontWeight: "600",
  },
});
