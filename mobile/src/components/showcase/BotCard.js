// src/components/showcase/BotCard.js
import React, { useMemo } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function BotCard({ item, colors, onPress, onFollow }) {
  const bot = item?.bot || {};
  const user = item?.user || {};

  const chips = useMemo(() => {
    const arr = [];
    if (bot.for_sale) arr.push("For Sale");
    if (bot.for_rent) arr.push("For Rent");
    if (bot.bot_type) arr.push(bot.bot_type.toUpperCase());
    return arr;
  }, [bot]);

  return (
    <TouchableOpacity activeOpacity={0.9} onPress={onPress} style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{bot.name || "-"}</Text>
        <Text style={{ color: colors.muted }} numberOfLines={1}>@{user.username}</Text>
      </View>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kv, { color: colors.muted }]}>Profit</Text>
          <Text style={[styles.kvVal, { color: (bot.profitRate || 0) >= 0 ? colors.success : colors.danger }]}>
            {(bot.profitRate ?? 0).toFixed(3)}%
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kv, { color: colors.muted }]}>Win Rate</Text>
          <Text style={[styles.kvVal, { color: colors.text }]}>{Math.round((bot.winRate || 0) * 100)}%</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.kv, { color: colors.muted }]}>Trades</Text>
          <Text style={[styles.kvVal, { color: colors.text }]}>{bot.totalTrades || 0}</Text>
        </View>
      </View>

      {chips?.length ? (
        <View style={styles.chips}>
          {chips.map((c) => (
            <View key={c} style={[styles.chip, { borderColor: colors.border }]}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{c}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.followBtn, { backgroundColor: item.followed ? colors.surface : colors.primary, borderColor: colors.primary }]}
          onPress={onFollow}
          activeOpacity={0.85}
        >
          <Text style={{ color: item.followed ? colors.primary : "#fff", fontWeight: "600" }}>
            {item.followed ? "Following" : "Follow"}
          </Text>
        </TouchableOpacity>

        <Text style={{ color: colors.muted }} numberOfLines={1}>
          Coins: {bot.coins || "-"}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  header: { marginBottom: 8 },
  title: { fontSize: 18, fontWeight: "700" },
  row: { flexDirection: "row", gap: 12, marginTop: 6 },
  kv: { fontSize: 12 },
  kvVal: { fontSize: 16, fontWeight: "700", marginTop: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  chip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  footer: { marginTop: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  followBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});
