// src/screens/Bots/BotDetailScreen.js
import React, { useContext, useMemo } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ActivityIndicator,
  ScrollView, FlatList, RefreshControl, Dimensions,
} from "react-native";
import { LineChart } from "react-native-gifted-charts";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import Header from "../../components/Layout/Header";
import AuthGate from "../../components/auth/AuthGate";
import useBotAnalysis from "../../hooks/useBotAnalysis";
import TinyLine from "../../components/charts/TinyLine";

const PADDING_H = 16;
const CHART_H = 200;
const CHART_W = Math.max(120, Dimensions.get("window").width - PADDING_H * 2);
const MAX_POINTS = 10; // <- SAFE: sadece 10 nokta

function formatCurrency(v) {
  const n = Number(v || 0);
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}
function toHM(s) {
  const d = new Date(String(s).replace(" ", "T"));
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function BotDetailScreen({ route }) {
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  const { botId, bot } = route?.params || {};
  const { data: analysis, loading, error, refreshing, refresh } = useBotAnalysis(botId);

  // ProfileScreen’deki gibi: tek seri, tek renk, son 10 nokta
  const { series, minY, maxY } = useMemo(() => {
    const raw = Array.isArray(analysis?.pnl_data) ? analysis.pnl_data : [];
    const last = raw.slice(-MAX_POINTS);
    const points = last.map((p, i, a) => ({
      value: Number(p?.pnl || 0),
      label: i === 0 || i === a.length - 1 ? toHM(p?.date) : "", // sadece baş/son label
    }));
    const vals = points.map(d => d.value).filter(v => Number.isFinite(v));
    const minV = Math.min(...vals, 0);
    const maxV = Math.max(...vals, 0);
    const pad = Math.max(1, Math.round((maxV - minV) * 0.08));
    return { series: points, minY: minV - pad, maxY: maxV + pad };
  }, [analysis]);

  const header = useMemo(() => {
    const name = analysis?.bot_name || bot?.name || "Bot";
    const current = analysis?.bot_current_value ?? bot?.current_usd_value ?? 0;
    const pnl = analysis?.bot_profit ?? bot?.profit_usd ?? 0;
    return { name, current, pnl };
  }, [analysis, bot]);

  // listeleri de güvenli sınırla
  const trades = (analysis?.trades || []).slice(0, 10);
  const positions = (analysis?.open_positions || []).slice(0, 10);
  const holdings = (analysis?.holdings || []).slice(0, 10);

  return (
    <AuthGate>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <Header />
        <ScrollView
          style={{ flex: 1, backgroundColor: colors.background }}
          contentContainerStyle={{ padding: PADDING_H, paddingBottom: 24 }}
          removeClippedSubviews
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={colors.muted}
              colors={[colors.primary]}
              progressBackgroundColor="transparent"
            />
          }
        >
          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>{header.name}</Text>

          {/* KPIs */}
          <View style={styles.kpiRow}>
            <View style={[styles.kpi, { backgroundColor: colors.surface }]}>
              <Text style={[styles.kpiLabel, { color: colors.muted }]}>Current Value</Text>
              <Text style={[styles.kpiValue, { color: colors.text }]}>
                {formatCurrency(header.current)}
              </Text>
            </View>
            <View style={[styles.kpi, { backgroundColor: colors.surface }]}>
              <Text style={[styles.kpiLabel, { color: colors.muted }]}>Total PnL</Text>
              <Text
                style={[
                  styles.kpiValue,
                  { color: (header.pnl || 0) >= 0 ? colors.success : colors.danger },
                ]}
              >
                {formatCurrency(header.pnl)}
              </Text>
            </View>
          </View>

          {/* Chart — tek seri, animasyon yok, sabit ölçü */}
          <View
            style={[
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border || "rgba(255,255,255,0.06)" },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>PnL Over Time</Text>
            {loading ? (
              <ActivityIndicator style={{ marginTop: 16 }} color={colors.primary} />
            ) : error ? (
              <Text style={{ color: colors.danger, marginTop: 8 }}>{error}</Text>
            ) : (
               <View style={{ marginTop: 8 }}>
                 <TinyLine pnlData={analysis?.pnl_data || []} color={colors.primary} />
               </View>
            )}
          </View>

          {/* Open Positions (max 10) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border || "rgba(255,255,255,0.06)" }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Open Positions</Text>
            {positions.length === 0 ? (
              <Text style={{ color: colors.muted, marginTop: 8 }}>No open positions.</Text>
            ) : (
              positions.map((p, i) => {
                const pos = Number(p?.profit || 0) >= 0;
                return (
                  <View key={i} style={styles.rowItem}>
                    <Text style={[styles.cellSymbol, { color: colors.text }]}>{p.symbol}</Text>
                    <Text style={[styles.cellText, { color: colors.muted }]}>
                      {p.position_side?.toUpperCase() || "-"} {p.leverage ? `· ${p.leverage}x` : ""}
                    </Text>
                    <Text style={[styles.cellValue, { color: pos ? colors.success : colors.danger }]}>
                      {formatCurrency(p.profit)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Holdings (max 10) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border || "rgba(255,255,255,0.06)" }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Holdings</Text>
            {holdings.length === 0 ? (
              <Text style={{ color: colors.muted, marginTop: 8 }}>No holdings.</Text>
            ) : (
              holdings.map((h, i) => {
                const pos = Number(h?.profit || 0) >= 0;
                return (
                  <View key={i} style={styles.rowItem}>
                    <Text style={[styles.cellSymbol, { color: colors.text }]}>{h.symbol}</Text>
                    <Text style={[styles.cellText, { color: colors.muted }]}>
                      {Number(h.amount).toLocaleString()}
                    </Text>
                    <Text style={[styles.cellValue, { color: pos ? colors.success : colors.danger }]}>
                      {formatCurrency(h.profit)}
                    </Text>
                  </View>
                );
              })
            )}
          </View>

          {/* Recent Trades (max 10) */}
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border || "rgba(255,255,255,0.06)" }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Trades</Text>
            {trades.length === 0 ? (
              <Text style={{ color: colors.muted, marginTop: 8 }}>No trades.</Text>
            ) : (
              <FlatList
                data={trades}
                keyExtractor={(_, i) => String(i)}
                scrollEnabled={false}
                ItemSeparatorComponent={() => (
                  <View
                    style={{
                      height: StyleSheet.hairlineWidth,
                      backgroundColor: colors.border || "rgba(255,255,255,0.1)",
                      marginVertical: 8,
                    }}
                  />
                )}
                renderItem={({ item }) => {
                  const isBuy = (item.side || "").toLowerCase() === "buy";
                  return (
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: colors.text, fontWeight: "600" }}>{item.symbol}</Text>
                        <Text style={{ color: colors.muted, marginTop: 2 }}>
                          {item.trade_type} · {item.status} · {toHM(item.date)}
                        </Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ color: colors.text }}>
                          {Number(item.amount).toLocaleString()} @ {Number(item.price).toLocaleString()}
                        </Text>
                        <Text style={{ color: isBuy ? colors.success : colors.danger, marginTop: 2 }}>
                          {isBuy ? "BUY" : "SELL"} · Fee {item.fee}
                        </Text>
                      </View>
                    </View>
                  );
                }}
              />
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "700" },
  kpiRow: { flexDirection: "row", gap: 12, marginTop: 12, marginBottom: 8 },
  kpi: { flex: 1, borderRadius: 14, padding: 12 },
  kpiLabel: { fontSize: 12 },
  kpiValue: { fontSize: 18, fontWeight: "700", marginTop: 4 },
  card: {
    borderRadius: 16,
    marginTop: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 0,
    shadowOpacity: 0,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  rowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 10,
  },
  cellSymbol: { fontSize: 15, fontWeight: "700" },
  cellText: { fontSize: 13 },
  cellValue: { fontSize: 15, fontWeight: "700" },
});
