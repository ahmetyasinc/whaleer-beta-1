// src/components/profile/TransactionsList.js
import React from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";

export default function TransactionsList({ trades, colors }) {
  const renderItem = ({ item }) => {
    const isBuy = item.side?.toLowerCase() === "buy";
    return (
      <View style={[styles.row, { backgroundColor: colors.surface }]}>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.text, fontWeight: "600" }}>{item.symbol}</Text>
          <Text style={{ color: colors.muted }}>
            {item.trade_type} · {item.position_side || "-"} · bot #{item.bot_id}
          </Text>
          <Text style={{ color: colors.muted }}>{new Date(item.created_at).toLocaleString()}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ color: isBuy ? colors.success : colors.danger, fontWeight: "700" }}>
            {isBuy ? "BUY" : "SELL"}
          </Text>
          <Text style={{ color: colors.text }}>${Number(item.price).toFixed(2)}</Text>
          <Text style={{ color: colors.muted }}>amt {item.amount}</Text>
        </View>
      </View>
    );
  };

  return (
    <FlatList
      data={trades || []}
      keyExtractor={(i) => String(i.id)}
      renderItem={renderItem}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
    />
  );
}

const styles = StyleSheet.create({
  row: { padding: 12, borderRadius: 12, flexDirection: "row", alignItems: "center" },
});
