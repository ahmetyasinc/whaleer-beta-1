import React from "react";
import { View, Text, StyleSheet } from "react-native";

function StatPill({ label, value, colors }) {
  return (
    <View style={[styles.pill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export default function ProfileStats({ strategies = 0, indicators = 0, bots = 0, colors, style }) {
  return (
    <View style={[styles.container, style]}>
      <StatPill label="Strategies" value={strategies} colors={colors} />
      <StatPill label="Indicators" value={indicators} colors={colors} />
      <StatPill label="Bots" value={bots} colors={colors} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  pill: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});
