// src/components/profile/SegmentTabs.js
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

const TABS = [
  { key: "performance", label: "Performance" },
  { key: "portfolio",   label: "Portfolio" },
  { key: "transactions",label: "Transactions" },
];

export default function SegmentTabs({ active, onChange, colors }) {
  return (
    <View style={[styles.wrap, { backgroundColor: colors.surface }]}>
      {TABS.map(t => {
        const sel = active === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, sel && { backgroundColor: colors.primary }]}
            onPress={() => onChange(t.key)}
          >
            <Text style={{ color: sel ? colors.onPrimary : colors.text, fontWeight: "600" }}>
              {t.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
const styles = StyleSheet.create({
  wrap: { flexDirection: "row", borderRadius: 12, padding: 4, marginVertical: 12 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 8 }
});
