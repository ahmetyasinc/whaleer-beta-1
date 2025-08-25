// src/screens/Showcase/ShowcaseFiltersScreen.js
import React, { useContext, useMemo, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TextInput, TouchableOpacity, Switch
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { SettingsContext } from "../../context/SettingsContext";
import { getTheme } from "../../theme";
import Header from "../../components/Layout/Header";

const SEG = ({ options, value, onChange, colors }) => (
  <View style={[styles.seg, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    {options.map((opt) => {
      const active = value === opt.value;
      return (
        <TouchableOpacity
          key={String(opt.value)}
          style={[
            styles.segItem,
            active && { backgroundColor: colors.primary },
            { borderColor: colors.border },
          ]}
          onPress={() => onChange(opt.value)}
          activeOpacity={0.85}
        >
          <Text style={{ color: active ? "#fff" : colors.text, fontWeight: "600", fontSize: 12 }}>
            {opt.label}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

export default function ShowcaseFiltersScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { theme } = useContext(SettingsContext);
  const colors = useMemo(() => getTheme(theme), [theme]);

  // mevcut filtrelerden gelindiyse doldur
  const current = route?.params?.current || {};

  // --- Local UI state ---
  const [botType, setBotType] = useState(
    current.bot_type ?? "all" // "all" -> null'a çevrilecek
  );
  const [onlyActive, setOnlyActive] = useState(
    typeof current.active === "boolean" ? current.active : false
  );

  const [minSell, setMinSell] = useState(current.min_sell_price ?? "");
  const [maxSell, setMaxSell] = useState(current.max_sell_price ?? "");
  const [minRent, setMinRent] = useState(current.min_rent_price ?? "");
  const [maxRent, setMaxRent] = useState(current.max_rent_price ?? "");

  const [minProfitFactor, setMinProfitFactor] = useState(current.min_profit_factor ?? "");
  const [maxRiskFactor, setMaxRiskFactor] = useState(current.max_risk_factor ?? "");

  // Creation Time → minutes (value + unit -> min_created_minutes_ago)
  const [createdVal, setCreatedVal] = useState(
    current.min_created_minutes_ago ? String(current.min_created_minutes_ago) : ""
  );
  const [createdUnit, setCreatedUnit] = useState("day"); // minute|hour|day|week (UI)
  // Profit Margin
  const [minProfitMargin, setMinProfitMargin] = useState(current.min_profit_margin ?? "");
  const [profitMarginUnit, setProfitMarginUnit] = useState(current.profit_margin_unit ?? "daily");

  // Frequency (minutes)
  const [minTradeFreq, setMinTradeFreq] = useState(current.min_trade_frequency ?? "");

  // Uptime (hours -> minutes)
  const [uptimeHours, setUptimeHours] = useState(
    current.min_uptime_minutes ? String(Math.floor(current.min_uptime_minutes / 60)) : ""
  );

  // Demand (0..5)
  const [demand, setDemand] = useState(
    typeof current.demand === "number" ? String(current.demand) : ""
  );

  const [limit, setLimit] = useState(current.limit ?? "5");

  // helpers
  const toNum = (v) => {
    if (v === "" || v === null || typeof v === "undefined") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const unitToMinutes = (val, unit) => {
    const v = Number(val);
    if (!Number.isFinite(v) || v <= 0) return null;
    switch (unit) {
      case "minute": return v;
      case "hour": return v * 60;
      case "day": return v * 60 * 24;
      case "week": return v * 60 * 24 * 7;
      default: return null;
    }
  };

  const buildFilters = useCallback(() => {
    const payload = {
      bot_type: botType === "all" ? null : botType, // "spot" | "futures"
      active: onlyActive ? true : null,

      min_sell_price: toNum(minSell),
      max_sell_price: toNum(maxSell),

      min_rent_price: toNum(minRent),
      max_rent_price: toNum(maxRent),

      min_profit_factor: toNum(minProfitFactor),
      max_risk_factor: toNum(maxRiskFactor),

      min_created_minutes_ago: unitToMinutes(createdVal, createdUnit),

      min_trade_frequency: toNum(minTradeFreq),

      min_profit_margin: toNum(minProfitMargin),
      profit_margin_unit: minProfitMargin === "" ? null : (profitMarginUnit || null), // daily|weekly|monthly

      min_uptime_minutes: uptimeHours === "" ? null : Number(uptimeHours) * 60,

      demand: toNum(demand),

      limit: toNum(limit) ?? 5,
    };

    // undefined yerine null normalize
    Object.keys(payload).forEach((k) => {
      if (typeof payload[k] === "undefined") payload[k] = null;
    });

    return payload;
  }, [
    botType, onlyActive, minSell, maxSell, minRent, maxRent,
    minProfitFactor, maxRiskFactor, createdVal, createdUnit,
    minTradeFreq, minProfitMargin, profitMarginUnit, uptimeHours, demand, limit
  ]);

  const onApply = () => {
    const filters = buildFilters();
    navigation.navigate("Showcase", { filters });
  };

  const onReset = () => {
    setBotType("all");
    setOnlyActive(false);
    setMinSell(""); setMaxSell("");
    setMinRent(""); setMaxRent("");
    setMinProfitFactor(""); setMaxRiskFactor("");
    setCreatedVal(""); setCreatedUnit("day");
    setMinProfitMargin(""); setProfitMarginUnit("daily");
    setMinTradeFreq("");
    setUptimeHours("");
    setDemand("");
    setLimit("5");
  };

  const Field = ({ label, children }) => (
    <View style={styles.field}>
      <Text style={[styles.label, { color: colors.muted }]}>{label}</Text>
      {children}
    </View>
  );

  const Input = (props) => (
    <TextInput
      {...props}
      keyboardType="numeric"
      placeholderTextColor={colors.muted}
      style={[
        styles.input,
        { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border },
        props.style,
      ]}
    />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <Header />
      <ScrollView
        style={{ flex: 1, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: colors.text }]}>Filters</Text>

          <View style={{ flexDirection: "row", gap: 8 }}>
            <TouchableOpacity
              onPress={onReset}
              style={[styles.btn, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <Text style={{ color: colors.text, fontWeight: "600" }}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onApply}
              style={[styles.btn, { backgroundColor: colors.primary, borderColor: colors.primary }]}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bot Type */}
        <Field label="Bot Type">
          <SEG
            colors={colors}
            value={botType}
            onChange={setBotType}
            options={[
              { label: "All", value: "all" },
              { label: "Spot", value: "spot" },
              { label: "Futures", value: "futures" },
            ]}
          />
        </Field>

        {/* Prices */}
        <Field label="Price Range ($) (Sale)">
          <View style={styles.row}>
            <Input value={String(minSell)} onChangeText={setMinSell} placeholder="Min" />
            <Input value={String(maxSell)} onChangeText={setMaxSell} placeholder="Max" />
          </View>
        </Field>

        <Field label="Price Range ($) (Rent)">
          <View style={styles.row}>
            <Input value={String(minRent)} onChangeText={setMinRent} placeholder="Min" />
            <Input value={String(maxRent)} onChangeText={setMaxRent} placeholder="Max" />
          </View>
        </Field>

        {/* Active */}
        <Field label="Only Active Bots">
          <View style={styles.switchRow}>
            <Switch value={onlyActive} onValueChange={setOnlyActive} />
            <Text style={{ color: colors.muted, marginLeft: 8 }}>
              {onlyActive ? "Yes" : "No"}
            </Text>
          </View>
        </Field>

        {/* Factors */}
        <Field label="Profit Factor (min)">
          <Input value={String(minProfitFactor)} onChangeText={setMinProfitFactor} placeholder="0..10" />
        </Field>

        <Field label="Risk Factor (max)">
          <Input value={String(maxRiskFactor)} onChangeText={setMaxRiskFactor} placeholder="0..10" />
        </Field>

        {/* Creation Time */}
        <Field label="Creation Time (min)">
          <View style={styles.row}>
            <Input value={String(createdVal)} onChangeText={setCreatedVal} placeholder="Value" />
            <SEG
              colors={colors}
              value={createdUnit}
              onChange={setCreatedUnit}
              options={[
                { label: "Min", value: "minute" },
                { label: "Hour", value: "hour" },
                { label: "Day", value: "day" },
                { label: "Week", value: "week" },
              ]}
            />
          </View>
        </Field>

        {/* Profit Margin */}
        <Field label="Profit Margin (min)">
          <View style={styles.row}>
            <Input value={String(minProfitMargin)} onChangeText={setMinProfitMargin} placeholder="%" />
            <SEG
              colors={colors}
              value={profitMarginUnit}
              onChange={setProfitMarginUnit}
              options={[
                { label: "Daily", value: "daily" },
                { label: "Weekly", value: "weekly" },
                { label: "Monthly", value: "monthly" },
              ]}
            />
          </View>
        </Field>

        {/* Trade Freq */}
        <Field label="Average Transaction Frequency (min)">
          <Input value={String(minTradeFreq)} onChangeText={setMinTradeFreq} placeholder="minutes" />
        </Field>

        {/* Uptime */}
        <Field label="Usage Time (hours) (min)">
          <Input value={String(uptimeHours)} onChangeText={setUptimeHours} placeholder="e.g. 525" />
        </Field>

        {/* Demand */}
        <Field label="Demand Level (0-5)">
          <Input value={String(demand)} onChangeText={setDemand} placeholder="0..5" />
        </Field>

        {/* Limit */}
        <Field label="Limit (items per request)">
          <Input value={String(limit)} onChangeText={setLimit} placeholder="5" />
        </Field>

        {/* Bottom Apply */}
        <TouchableOpacity
          onPress={onApply}
          style={[styles.applyBottom, { backgroundColor: colors.primary }]}
          activeOpacity={0.9}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Apply Filters</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 20, fontWeight: "800" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, marginBottom: 12 },
  btn: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 12, borderWidth: 1,
  },
  field: { marginTop: 12 },
  label: { fontSize: 12, marginBottom: 6, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: {
    flex: 1, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1,
  },
  switchRow: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  seg: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  segItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  applyBottom: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
});
