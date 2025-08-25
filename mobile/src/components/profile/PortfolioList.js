// src/components/profile/PortfolioList.js
import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";

export default function PortfolioList({
  portfolio,
  colors,
  ListHeaderComponent,
  refreshing = false,
  onRefresh = () => {},
  contentContainerStyle,
  backgroundColor,
}) {
  const rows = [
    ...(portfolio?.holdings_merged || []).map(h => ({ type: "holding", ...h, id: `h:${h.symbol}` })),
    ...(portfolio?.positions_merged || []).map(p => ({ type: "position", ...p, id: `p:${p.symbol}:${p.position_side}` })),
  ];

  const renderItem = ({ item }) => {
    const profit = Number(item.profit_loss || 0);
    return (
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.symbol, { color: colors.text }]}>{item.symbol}</Text>
          <Text style={{ color: colors.muted }}>
            {item.type === "holding"
              ? `Amount ${item.amount}`
              : `${item.position_side?.toUpperCase()} x${item.leverage} · Amount ${item.amount}`}
          </Text>
        </View>
        <View>
          <Text style={{ color: profit >= 0 ? colors.success : colors.danger, fontWeight: "700" }}>
            {profit >= 0 ? "+" : ""}{profit.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: backgroundColor || "transparent" }}
      data={rows}
      keyExtractor={(i) => i.id}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      ListHeaderComponent={ListHeaderComponent}
      refreshing={refreshing}
      onRefresh={onRefresh}
      contentContainerStyle={contentContainerStyle}
    />
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", padding: 12, borderRadius: 12, alignItems: "center" },
  symbol: { fontSize: 16, fontWeight: "700" },
});
