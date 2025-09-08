// src/components/showcase/ChartPlaceholder.js
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ChartPlaceholder({ colors, height = 120 }) {
  return (
    <View
      style={[
        styles.box,
        { height, backgroundColor: colors.background, borderColor: colors.border },
      ]}
    >
      <Text style={{ color: colors.muted, fontSize: 12 }}>Chart will be here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
