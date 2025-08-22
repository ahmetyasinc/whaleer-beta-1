// src/components/profile/PerformanceChart.js
import React, { useMemo, useState, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { LineChart } from "react-native-gifted-charts";

function KPI({ label, value, colors }) {
  const positive = (value || 0) >= 0;
  return (
    <View style={[styles.kpi, { backgroundColor: colors.surface }]}>
      <Text style={{ color: colors.muted }}>{label}</Text>
      <Text style={{ color: positive ? colors.success : colors.danger, fontWeight: "700" }}>
        {positive ? "▲" : "▼"} {Math.abs(value || 0).toFixed(2)}%
      </Text>
    </View>
  );
}

// helpers
const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
const startOfWeek = (d) => { const x = new Date(d); const day = x.getDay(); const diff = (day === 0 ? -6 : 1 - day); x.setDate(x.getDate()+diff); x.setHours(0,0,0,0); return x; };
const startOfMonth = (d) => { const x = new Date(d); x.setDate(1); x.setHours(0,0,0,0); return x; };
const percentChange = (base, cur) => (base ? ((cur - base) / base) * 100 : 0);
const nearestPointValue = (pts, target) => {
  if (!pts.length) return null;
  const t = target.getTime();
  let best = pts[0], dist = Math.abs(pts[0].x.getTime() - t);
  for (let i=1;i<pts.length;i++){ const d = Math.abs(pts[i].x.getTime() - t); if (d < dist){ best = pts[i]; dist = d; } }
  return best?.y ?? null;
};
const fmtDate = (d) => {
  const pad = (n) => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export default function PerformanceChart({ snapshots = [], colors }) {
  const points = useMemo(() => {
    return (snapshots || [])
      .map((s) => ({ x: new Date(s.timestamp), y: Number(s.usd_value) || 0 }))
      .filter((p) => p.x instanceof Date && !isNaN(p.x))
      .sort((a, b) => a.x - b.x);
  }, [snapshots]);

  if (!points.length) return <Text style={{ color: colors.muted }}>No performance data.</Text>;

  const formatTick = useCallback((d0, d1, d) => {
    const rangeMs = d1 - d0, oneDay = 24*60*60*1000;
    if (rangeMs <= oneDay) return fmtDate(d).slice(11,16);       // HH:mm
    return `${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`;  // MM/DD
  }, []);

  const { lineData, xAxisLabelTexts } = useMemo(() => {
    const data = points.map((p) => ({ value: p.y, extra: { date: p.x, money: Number(p.y).toFixed(2) } }));
    const first = points[0].x, last = points[points.length - 1].x, N = data.length;
    const step = Math.max(1, Math.floor(N / 6));
    const labels = data.map((_, idx) => (idx % step === 0 || idx === N - 1) ? formatTick(first, last, points[idx].x) : "");
    return { lineData: data, xAxisLabelTexts: labels };
  }, [points, formatTick]);

  const pointerBubble = (item) => {
    const d = item?.extra?.date ? new Date(item.extra.date) : null;
    const val = Number(item?.value ?? item?.extra?.money ?? 0);
    return (
      <View style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: colors.cardTime, borderWidth: 1, borderColor: colors.surface }}>
        <Text style={{ color: colors.text, fontWeight: "700" }}>${val.toFixed(2)}</Text>
        {!!d && <Text style={{ color: colors.muted, marginTop: 2 }}>{fmtDate(d)}</Text>}
      </View>
    );
  };

  // --- TÜM VERİ EKRANA SIĞSIN ---
const [containerW, setContainerW] = useState(null);

  // Solda y-ekseni etiketleri için ayrılan sabit alan ve sağ ped
  const Y_AXIS_LABEL_WIDTH = 36;  // gerekirse 40-48 deneyebilirsin
  const RIGHT_PAD = 8;

  // Grafik alanı (çizimin yapılacağı gerçek genişlik)
  const chartWidth = useMemo(() => {
    if (!containerW) return null;
    return Math.max(80, containerW - Y_AXIS_LABEL_WIDTH - RIGHT_PAD);
  }, [containerW]);

  // İç boşluklar (baş/son)
  const initialSpacing = 0;
  const endSpacing = 0;

  // (Opsiyonel) Çok fazla nokta varsa basit downsample:
  const MIN_POINT_SPACING = 2; // px – daha da sıkıştırmak istersen 1 yap
  const displayData = useMemo(() => {
    if (!chartWidth) return lineData;
    const N = lineData.length;
    if (N <= 1) return lineData;
    const maxPoints = Math.floor(chartWidth / MIN_POINT_SPACING) + 1;
    if (N <= maxPoints) return lineData;
    const step = Math.ceil(N / maxPoints);
    const sampled = [];
    for (let i = 0; i < N; i += step) sampled.push(lineData[i]);
    // son noktayı garanti ekle
    if (sampled[sampled.length - 1] !== lineData[N - 1]) sampled.push(lineData[N - 1]);
    return sampled;
  }, [lineData, chartWidth]);

  // spacing’i “tam sığdır” formülüyle hesapla
  const spacing = useMemo(() => {
    const N = displayData.length;
    if (!chartWidth || N <= 1) return 12;
    const usable = chartWidth - initialSpacing - endSpacing;
    // negatif olmasın
    const s = usable / (N - 1);
    // çok küçük değerleri de kabul ediyoruz; kaydırma istemediğin için
    return Math.max(1, s);
  }, [chartWidth, displayData.length]);

  // Yüzdelikler (gün/hafta/ay) – aynı
  const computedPerf = useMemo(() => {
    const now = new Date(points[points.length - 1].x);
    const lastVal = points[points.length - 1].y;
    const dayStartVal = nearestPointValue(points, startOfDay(now));
    const weekStartVal = nearestPointValue(points, startOfWeek(now));
    const monthStartVal = nearestPointValue(points, startOfMonth(now));
    return {
      daily: percentChange(dayStartVal, lastVal),
      weekly: percentChange(weekStartVal, lastVal),
      monthly: percentChange(monthStartVal, lastVal),
    };
  }, [points]);

  return (
    <View
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
      style={{ marginTop: 8 }}
    >
      {/* chartWidth henüz hesaplanmadıysa render etmeyelim */}
      {chartWidth && (
        <LineChart
          data={displayData}
          width={chartWidth}
          height={220}
          scrollable={false}
          spacing={spacing}
          initialSpacing={8}   // 👈 makul boşluk
          endSpacing={8}       // 👈 makul boşluk
          yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}

          // görünüm
          thickness={2}
          color={colors.primary}
          curved = {false}
          hideDataPoints
          areaChart
          startFillColor={colors.primary}
          endFillColor={colors.primary}
          startOpacity={0.12}
          endOpacity={0.02}

          // eksen & grid
          yAxisColor={colors.border}
          xAxisColor={colors.border}
          xAxisLabelTexts={xAxisLabelTexts}
          xAxisLabelTextStyle={{ color: colors.muted, fontSize: 10 }}
          yAxisTextStyle={{ color: colors.muted, fontSize: 10 }}
          yAxisLabelPrefix="$"
          showYAxisIndices={false}   // 👈 Y ekseni çizgileri kapalı
          hideRules                  // 👈 tüm yatay grid çizgilerini kaldır
          // rulesType="none"        // alternatif (bazı sürümlerde bu)

          // animasyon
          isAnimated
          animationDuration={600}

          // pointer / tooltip
          pointerConfig={{
            activatePointersOnLongPress: true,
            persistPointer: true,
            pointerVanishDelay: 2000,
            autoAdjustPointerLabelPosition: true,
            pointerStripHeight: 200,
            pointerStripColor: colors.nothing,
            pointerStripWidth: 1,
            pointerColor: colors.nothing,
            radius: 3,
            pointerLabelWidth: 140,
            pointerLabelHeight: 54,
            pointerLabelComponent: (items) => {
              const item = Array.isArray(items) ? items[0] : items;
              return pointerBubble(item);
            },
          }}
        />

      )}

      <View style={styles.kpiRow}>
        <KPI label="Daily" value={computedPerf.daily} colors={colors} />
        <KPI label="Weekly" value={computedPerf.weekly} colors={colors} />
        <KPI label="Monthly" value={computedPerf.monthly} colors={colors} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kpiRow: { flexDirection: "row", gap: 12, marginTop: 8 },
  kpi: { flex: 1, padding: 12, borderRadius: 12 },
});
