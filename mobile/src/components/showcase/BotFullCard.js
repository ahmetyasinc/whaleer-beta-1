// src/components/showcase/BotFullCard.js
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import ChartPlaceholder from "./ChartPlaceholder";

// Not: Positions/Trades özetleri kaldırıldı (detay sayfada gösterilecek).
export default function BotFullCard({
  item,
  colors,
  onPress,
  onFollow,
  height,
  compact = false, // ShowcaseScreen PAGE_H’ye göre belirleyecek
}) {
  const bot = item?.bot || {};
  const user = item?.user || {};

  const priceBadges = useMemo(() => {
    const arr = [];
    if (bot.for_sale) arr.push({ k: "sale", label: `Sale $${Number(bot.sell_price || 0)}` });
    if (bot.for_rent) arr.push({ k: "rent", label: `Rent $${Number(bot.rent_price || 0)}` });
    return arr;
  }, [bot]);

  const CHART_H = compact ? 70 : 100;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={onPress}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          height: Math.max(320, height - 12), // bir tık marj bırak
          borderColor: colors.border,
        },
      ]}
    >
      {/* Üst bilgi + fiyat rozetleri */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {bot.name || "-"}
          </Text>
          <Text style={{ color: colors.muted }} numberOfLines={1}>
            @{user.username} • {bot.bot_type?.toUpperCase() || "-"} • {bot.strategy || "—"}
          </Text>
        </View>
        <View style={styles.badges}>
          {priceBadges.map((b) => (
            <View key={b.k} style={[styles.badge, { backgroundColor: colors.primary }]}>
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>{b.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* KPI Izgarası: ekrana sığması için 2 satır grid */}
      <View style={styles.kpiGrid}>
        <KPI label="Profit" value={`${(bot.profitRate ?? 0).toFixed(3)}%`}
             color={(bot.profitRate || 0) >= 0 ? colors.success : colors.danger} />
        <KPI label="Win" value={`${Math.round((bot.winRate || 0) * 100)}%`} color={colors.text} />
        <KPI label="Trades" value={`${bot.totalTrades || 0}`} color={colors.text} />
        <KPI label="PF" value={`${bot.profitFactor ?? 0}`} color={colors.text} />
        <KPI label="Risk" value={`${bot.riskFactor ?? 0}`} color={colors.text} />
        <KPI label="Uptime" value={`${bot.runningTime ?? 0}h`} color={colors.text} />
      </View>

      {/* Grafik alanı: şimdilik placeholder */}
      <ChartPlaceholder colors={colors} height={CHART_H} />

      {/* Alt bilgi satırı: coinler + takip */}
      <View style={styles.bottomRow}>
        <Text style={{ color: colors.muted, flex: 1 }} numberOfLines={1}>
          Coins: {bot.coins || "-"}
        </Text>
        <TouchableOpacity
          style={[
            styles.followBtn,
            {
              backgroundColor: item.followed ? colors.surface : colors.primary,
              borderColor: colors.primary,
            },
          ]}
          onPress={onFollow}
          activeOpacity={0.9}
        >
          <Text style={{ color: item.followed ? colors.primary : "#fff", fontWeight: "700" }}>
            {item.followed ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function KPI({ label, value, color }) {
  return (
    <View style={styles.kpi}>
      <Text style={[styles.kpiLabel, { color: "#999" }]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.kpiVal, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "space-between",
    gap: 10,
  },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { fontSize: 20, fontWeight: "800" },
  badges: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" },
  badge: { paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },

  kpiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: 8,
    columnGap: 6,
    justifyContent: "space-between",
  },
  kpi: { width: "32%", alignItems: "flex-start" },
  kpiLabel: { fontSize: 12 },
  kpiVal: { fontSize: 16, fontWeight: "800", marginTop: 2 },

  bottomRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  followBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
});
