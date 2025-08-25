// src/components/charts/TinyLine.js
import React, { useMemo } from "react";
import { View } from "react-native";
import { LineChart } from "react-native-gifted-charts";

// Sabit (responsivedan bilerek vazgeçiyoruz → en güvenli)
const CHART_W = 280;
const CHART_H = 5;
const MAX_POINTS = 12;

// Son N noktayı al, sadece ilk/son label yaz
function makeSeries(raw) {
  const last = Array.isArray(raw) ? raw.slice(-MAX_POINTS) : [];
  return last.map((p, i, a) => {
    const d = new Date(String(p?.date || "").replace(" ", "T"));
    const label =
      i === 0 || i === a.length - 1
        ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        : "";
    return { value: Number(p?.pnl || 0), label };
  });
}

export default function TinyLine({ pnlData = [], color = "#4f46e5" }) {
  const { series, minY, maxY } = useMemo(() => {
    const s = makeSeries(pnlData);
    const values = s.map(d => d.value).filter(v => Number.isFinite(v));
    if (values.length === 0) return { series: [], minY: 0, maxY: 1 };
    const minV = Math.min(...values, 0);
    const maxV = Math.max(...values, 0);
    const pad = Math.max(1, Math.round((maxV - minV) * 0.1));
    return { series: s, minY: minV - pad, maxY: maxV + pad };
  }, [pnlData]);

  // Boş durumda bile sabit alan tut
  if (!series.length) {
    return <View style={{ width: CHART_W, height: CHART_H }} />;
  }

  return (
    <View
      style={{ width: CHART_W, height: CHART_H, alignSelf: "center" }}
      renderToHardwareTextureAndroid={false}
    >
      <LineChart
        data={series}
        width={CHART_W}
        height={CHART_H}
        initialSpacing={12}
        color={color}
        thickness={2}
        hideDataPoints
        isAnimated={0}                 // animasyon tamamen kapalı
        yAxisColor={"transparent"}
        xAxisColor={"transparent"}
        noOfSections={3}
        hideRules={false}
        rulesType="solid"
        rulesColor="rgba(150,150,150,0.12)"
        maxValue={maxY}
        minValue={minY}
        showYAxisIndices={false}
      />
    </View>
  );
}
