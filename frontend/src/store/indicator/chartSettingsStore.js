"use client";
import { create } from "zustand";
import { readJsonCookie, writeJsonCookie, deleteCookie, readJsonCookie as readJSON, writeJsonCookie as writeJSON } from "@/lib/cookies";

const COOKIE_KEY = "wh_chart_settings_v1";
const WH_SETTINGS = "wh_settings"; // { language, theme, timezone, emailReports }

export const DEFAULTS = {
  theme: "dark",
  bgColor: "#000007",              // yeni
  textColor: "white",              // yeni ("white" | "black")
  labelColor: "white",             // yeni ("white" | "black")
  timezoneMode: "local",
  timezoneFixed: "GMT+03:00",

  // precision
  autoPrecision: true,             // yeni: true => coin tick_size, false => pricePrecision
  pricePrecision: 2,

  // volume kaldırıldı ama geriye dönük kalsın
  volumeVisible: true,

  // crosshair settings
  crosshair: {
    mode: "magnet",
    style: 1, // 0=Solid, 1=Dotted, 2=Dashed
    width: 1,
    color: "#758696",
  },

  // grid görünürlük yerine renk (geri uyum için eski alanlar korunuyor)
  grid: { show: true, xLines: 4, yLines: 4, color: "#111111" }, // color: yeni

  series: {
    type: "candlestick",
    hollow: false,
    heikinAshi: false,
    valueSource: "close",          // yeni (line/area/baseline/histogram için)
  },

  candle: {
    upBody: "#26A69A",
    downBody: "#EF5350",
    upWick: "#26A69A",
    downWick: "#EF5350",
    border: false,
    borderUp: "#26A69A",
    borderDown: "#EF5350",
  },
  candleAlpha: { upBody: 1, downBody: 1, upWick: 1, downWick: 1 },
  bar: { upColor: "#26A69A", downColor: "#EF5350" },
  line: { color: "#f9d71c", width: 2, stepped: false },
  area: { lineColor: "#ff9800", topColor: "#ff9800", bottomColor: "#ff9800", topAlpha: 0.4, bottomAlpha: 0.08 },
  baseline: { baseValue: 0, topColor: "#26A69A", bottomColor: "#EF5350" },
  histogram: { color: "#00FF88", alpha: 0.4 },
};

const mergeWithDefaults = (partial) => ({
  ...DEFAULTS,
  ...partial,
  crosshair: { ...DEFAULTS.crosshair, ...(partial?.crosshair || {}) },
  grid: { ...DEFAULTS.grid, ...(partial?.grid || {}) },
  series: { ...DEFAULTS.series, ...(partial?.series || {}) },
  candle: { ...DEFAULTS.candle, ...(partial?.candle || {}) },
  candleAlpha: { ...DEFAULTS.candleAlpha, ...(partial?.candleAlpha || {}) },
  bar: { ...DEFAULTS.bar, ...(partial?.bar || {}) },
  line: { ...DEFAULTS.line, ...(partial?.line || {}) },
  area: { ...DEFAULTS.area, ...(partial?.area || {}) },
  baseline: { ...DEFAULTS.baseline, ...(partial?.baseline || {}) },
  histogram: { ...DEFAULTS.histogram, ...(partial?.histogram || {}) },
});

const loadFromCookie = () => {
  const c = readJsonCookie(COOKIE_KEY, null);
  if (!c) return DEFAULTS;
  return mergeWithDefaults(c);
};

export const useChartSettingsStore = create((set, get) => ({
  settings: loadFromCookie(),
  save: (partial) => {
    const cur = get().settings;
    const next = mergeWithDefaults({ ...cur, ...partial });
    set({ settings: next });
    writeJsonCookie(COOKIE_KEY, next, { days: 365 });
  },
  reset: () => {
    set({ settings: DEFAULTS });
    writeJsonCookie(COOKIE_KEY, DEFAULTS, { days: 365 });
  },
  clearCookie: () => {
    deleteCookie(COOKIE_KEY);
  },
  writeTimezoneCookie: (tzStr) => {
    const base = readJSON(WH_SETTINGS, { language: "tr", theme: "dark", timezone: "GMT+03:00", emailReports: false });
    const updated = { ...base, timezone: tzStr };
    writeJSON(WH_SETTINGS, updated, { days: 365 });
  }
}));
