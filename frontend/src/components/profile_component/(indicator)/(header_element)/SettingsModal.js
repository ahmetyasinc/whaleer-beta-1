"use client";

import { useEffect, useRef, useState } from "react";
import { useChartSettingsStore } from "@/store/indicator/chartSettingsStore";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

// --- DEFAULT SETTINGS (USER REQUESTED LOCAL DEFINITION - DUZENLENEBILIR) ---
const DEFAULTS = {
  theme: "dark",
  bgColor: "#000007",
  textColor: "white",
  cursorType: "crosshair",
  timezoneMode: "local",
  timezoneFixed: "GMT+03:00",
  autoPrecision: true,
  pricePrecision: 2,
  volumeVisible: true,
  crosshair: {
    mode: "magnet",
    style: 1,
    width: 1,
    color: "#758696",
  },
  grid: { show: true, xLines: 4, yLines: 4, color: "#111111" },
  series: {
    type: "candlestick",
    hollow: false,
    heikinAshi: false,
    valueSource: "close",
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
  watermark: { visible: true, fontSize: 20 }
};
// --------------------------------------------------------------------------

const TZ_OFFSETS = (() => {
  const res = [];
  for (let h = -12; h <= 14; h++) {
    const sign = h >= 0 ? "+" : "-";
    const abs = Math.abs(h).toString().padStart(2, "0");
    res.push(`GMT${sign}${abs}:00`);
  }
  return res;
})();

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const ONE_OF = (v, arr, d) => (arr.includes(v) ? v : d);

// --- Styled Components ---
const SettingToggle = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between">
    <label className="text-gray-300 text-sm cursor-pointer select-none" onClick={() => onChange(!value)}>
      {label}
    </label>
    <button
      onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 focus:ring-blue-600 ${value ? 'bg-blue-600' : 'bg-zinc-700'
        }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 transform ${value ? 'translate-x-5' : 'translate-x-0'
          }`}
      />
    </button>
  </div>
);

const ColorPicker = ({ value, onChange }) => (
  <div className="relative w-8 h-8 rounded-full overflow-hidden border border-zinc-700 ring-2 ring-transparent hover:ring-zinc-600 transition-all duration-100 shrink-0">
    <input
      type="color"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] cursor-pointer p-0 border-0"
    />
  </div>
);

const Section = ({ title, action, children }) => (
  <div className="border border-gray-800 rounded-xl p-4 bg-black/60 mb-4">
    <div className="flex items-center justify-between mb-3">
      <div className="text-sm font-medium text-gray-200">{title}</div>
      {action}
    </div>
    <div className="grid gap-3">{children}</div>
  </div>
);

export default function SettingsModal({ open, onClose, locale }) {
  const { t } = useTranslation("strategiesSettings");
  const { settings, save, reset, writeTimezoneCookie } = useChartSettingsStore();

  // --- defaults guard ---
  const defaultState = {
    bgColor: settings?.bgColor || "rgba(0, 0, 25)",
    textColor: ONE_OF(
      settings?.textColor,
      ["white", "black", "gray", "yellow", "red", "green"],
      "white"
    ),
    cursorType: ONE_OF(settings?.cursorType, ["crosshair", "arrow", "dot"], "crosshair"),
    grid: { color: settings?.grid?.color || "#111111" },
    series: {
      type: ONE_OF(
        settings?.series?.type,
        ["candlestick", "bar", "line", "area", "baseline", "histogram"],
        "candlestick"
      ),
      hollow: !!settings?.series?.hollow,
      heikinAshi: !!settings?.series?.heikinAshi,
      valueSource: ONE_OF(
        settings?.series?.valueSource,
        ["close", "open", "high", "low"],
        "close"
      ),
    },
    candle: {
      upBody: settings?.candle?.upBody || "#26A69A",
      downBody: settings?.candle?.downBody || "#EF5350",
      upWick: settings?.candle?.upWick || "#26A69A",
      downWick: settings?.candle?.downWick || "#EF5350",
      border: !!settings?.candle?.border,
      borderUp: settings?.candle?.borderUp || "",
      borderDown: settings?.candle?.borderDown || "",
    },
    candleAlpha: {
      upBody: settings?.candleAlpha?.upBody ?? 1,
      downBody: settings?.candleAlpha?.downBody ?? 1,
      upWick: settings?.candleAlpha?.upWick ?? 1,
      downWick: settings?.candleAlpha?.downWick ?? 1,
    },
    bar: {
      upColor: settings?.bar?.upColor || "#26A69A",
      downColor: settings?.bar?.downColor || "#EF5350",
    },
    line: {
      color: settings?.line?.color || "#f9d71c",
      width: settings?.line?.width ?? 2,
      stepped: !!settings?.line?.stepped,
    },
    area: {
      lineColor: settings?.area?.lineColor || "#ff9800",
      topColor: settings?.area?.topColor || "#ff9800",
      topAlpha: settings?.area?.topAlpha ?? 0.4,
      bottomColor: settings?.area?.bottomColor || "#ff9800",
      bottomAlpha: settings?.area?.bottomAlpha ?? 0.08,
    },
    baseline: {
      baseValue: settings?.baseline?.baseValue ?? 0,
      topColor: settings?.baseline?.topColor || "#26A69A",
      bottomColor: settings?.baseline?.bottomColor || "#EF5350",
    },
    histogram: { color: settings?.histogram?.color || "#00FF88", alpha: settings?.histogram?.alpha ?? 0.4 },
    crosshair: {
      mode: settings?.crosshair?.mode || "magnet",
      style: settings?.crosshair?.style ?? 1,
      width: settings?.crosshair?.width ?? 1,
      color: settings?.crosshair?.color || "#758696",
    },
    timezoneMode: ONE_OF(settings?.timezoneMode, ["local", "utc", "fixed"], "local"),
    timezoneFixed: settings?.timezoneFixed || "GMT+03:00",
    pricePrecision: clamp(+settings?.pricePrecision || 2, 0, 8),
    watermark: {
      visible: settings?.watermark?.visible ?? true,
      fontSize: clamp(+settings?.watermark?.fontSize || 20, 10, 40),
    },
  };

  const [localState, setLocalState] = useState(defaultState);

  const scrollRef = useRef(null);
  const scrollPosRef = useRef(0);

  // --- Bas Değer alanı için KONTROLSÜZ input (odak kaybını önler)
  const bvRef = useRef(null);

  useEffect(() => {
    if (locale && i18n.language !== locale) i18n.changeLanguage(locale);
  }, [locale]);

  useEffect(() => {
    if (open) {
      setLocalState({
        ...defaultState,
        ...settings,
        grid: { color: settings?.grid?.color || defaultState.grid.color },
        series: { ...defaultState.series, ...(settings?.series || {}) },
      });

      // Modal açılırken input'un başlangıç metnini ayarla (max 6 ondalık)
      const v = settings?.baseline?.baseValue ?? defaultState.baseline.baseValue ?? 0;
      const s = String(v);
      const parts = s.split(".");
      const shown = parts.length > 1 ? `${parts[0]}.${(parts[1] || "").slice(0, 6)}` : parts[0];
      if (bvRef.current) bvRef.current.value = shown;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ---- Helpers (sadece input deneyimi için) ----
  function sanitizeDecimalInput6(s) {
    s = (s ?? "").toString().replace(",", ".");
    s = s.replace(/[^\d.]/g, "");
    const parts = s.split(".");
    if (parts.length > 2) s = parts.shift() + "." + parts.join("");
    const [intp = "", fracp = ""] = s.split(".");
    const frac6 = (fracp || "").slice(0, 6);
    return frac6 ? `${intp}.${frac6}` : intp;
  }
  function parseNumberOr(prev, s) {
    const n = Number((s ?? "").toString().replace(",", "."));
    return Number.isFinite(n) ? n : prev;
  }

  const handleChange = (path, value) => {
    // Scroll pozisyonunu state değişmeden önce kaydet
    if (scrollRef.current) {
      scrollPosRef.current = scrollRef.current.scrollTop;
    }

    setLocalState((prev) => {
      const clone = structuredClone(prev);
      const segs = path.split(".");
      let cur = clone;
      for (let i = 0; i < segs.length - 1; i++) cur = cur[segs[i]];
      cur[segs[segs.length - 1]] = value;
      return clone;
    });
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollPosRef.current;
    }
  }, [localState]);



  const handleSave = () => {
    // 1) Baz Değer'i ref'ten oku ve sayıya çevir
    const raw = bvRef.current ? bvRef.current.value : "";
    const parsed = parseNumberOr(localState?.baseline?.baseValue ?? 0, raw);
    const nextState = structuredClone(localState);
    nextState.baseline = { ...(nextState.baseline || {}), baseValue: parsed };

    // 2) Persist chart settings
    save(nextState);

    // 3) Persist timezone into wh_settings cookie
    let tzStr = "GMT+0:00";
    if (nextState.timezoneMode === "fixed") tzStr = nextState.timezoneFixed;
    else if (nextState.timezoneMode === "utc") tzStr = "GMT+0:00";
    else if (nextState.timezoneMode === "local") {
      const offMin = -new Date().getTimezoneOffset();
      const sign = offMin >= 0 ? "+" : "-";
      const abs = Math.abs(offMin);
      const hh = String(Math.floor(abs / 60)).padStart(2, "0");
      const mm = String(abs % 60).padStart(2, "0");
      tzStr = `GMT${sign}${hh}:${mm}`;
    }
    writeTimezoneCookie(tzStr);

    onClose?.();
  };

  if (!open) return null;

  const type = localState.series?.type || "candlestick";
  const isCandle = type === "candlestick";
  const isLine = type === "line";
  const isArea = type === "area";
  const isBaseline = type === "baseline";
  const isHistogram = type === "histogram";
  const isBar = type === "bar";
  const isSingleValue = isLine || isArea || isBaseline || isHistogram;

  return (
    <div className="fixed inset-0 z-[999]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
        aria-label={t("a11y.backdrop")}
      />

      {/* Modal */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
             w-[min(100%-2rem,1024px)] h-[calc(100vh-4rem)]
             bg-transparent rounded-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t("titles.settingsForChart")}
      >
        <div className="rounded-2xl shadow-2xl border border-gray-800 bg-[#0b0b0c] 
                  h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div className="text-base font-semibold text-white">
              {t("buttons.settings")} — {t("labels.chart")}
            </div>
            <button
              onClick={onClose}
              className="text-red-600 hover:text-red-400 transition-colors"
              aria-label={t("buttons.close")}
              title={t("buttons.close")}
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-5 custom-scrollbar"
          >
            {/* Appearance */}
            <Section
              title={t("labels.appearance")}
              action={
                <button
                  onClick={() =>
                    setLocalState((prev) => ({
                      ...prev,
                      bgColor: DEFAULTS.bgColor,
                      textColor: DEFAULTS.textColor,
                      cursorType: DEFAULTS.cursorType,
                      grid: { ...prev.grid, color: DEFAULTS.grid.color },
                      series: { ...prev.series, type: DEFAULTS.series.type },
                    }))
                  }
                  className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                  title={t("buttons.resetToDefault")}
                >
                  {t("buttons.default")}
                </button>
              }
            >
              {/* Background */}
              <div className="flex items-center justify-between gap-3">
                <label className="text-gray-300 text-sm w-40">{t("fields.background")}</label>
                <ColorPicker
                  value={localState.bgColor}
                  onChange={(val) => handleChange("bgColor", val)}
                />
              </div>

              {/* Text/Price Color */}
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-sm">{t("fields.textPriceColor")}</label>

                <select
                  className="bg-black border border-gray-700 rounded-md px-2 py-1 text-gray-200"
                  value={localState.textColor}
                  onChange={(e) => handleChange("textColor", e.target.value)}
                  aria-label={t("fields.textPriceColor")}
                >
                  <option value="white">{t("options.white")}</option>
                  <option value="black">{t("options.black")}</option>
                  <option value="gray">{t("options.gray")}</option>
                  <option value="yellow">{t("options.yellow")}</option>
                  <option value="red">{t("options.red")}</option>
                  <option value="green">{t("options.green")}</option>
                </select>
              </div>

              {/* Cursor Type */}
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-sm">{t("fields.cursorType") || "Cursor"}</label>
                <select
                  className="bg-black border border-gray-700 rounded-md px-2 py-1 text-gray-200"
                  value={localState.cursorType}
                  onChange={(e) => handleChange("cursorType", e.target.value)}
                >
                  <option value="crosshair">{t("options.crosshair") || "Crosshair"}</option>
                  <option value="arrow">{t("options.arrow") || "Arrow"}</option>
                  <option value="dot">{t("options.dot") || "Dot"}</option>
                </select>
              </div>


              {/* Series type */}
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-sm">{t("fields.seriesType")}</label>
                <select
                  className="bg-black border border-gray-700 rounded-md px-2 py-1 text-gray-200"
                  value={type}
                  onChange={(e) => handleChange("series.type", e.target.value)}
                  aria-label={t("fields.seriesType")}
                >
                  <option value="candlestick">{t("series.candlestick")}</option>
                  <option value="bar">{t("series.bar")}</option>
                  <option value="line">{t("series.line")}</option>
                  <option value="area">{t("series.area")}</option>
                  <option value="baseline">{t("series.baseline")}</option>
                  <option value="histogram">{t("series.histogram")}</option>
                </select>
              </div>

              {/* Grid color */}
              <div className="flex items-center justify-between gap-3">
                <label className="text-gray-300 text-sm w-40">{t("fields.gridColor")}</label>
                <ColorPicker
                  value={localState.grid.color}
                  onChange={(val) => handleChange("grid.color", val)}
                />
              </div>
            </Section>

            {/* Crosshair */}
            <Section
              title={t("labels.crosshair")}
              action={
                <button
                  onClick={() => handleChange("crosshair", { ...DEFAULTS.crosshair })}
                  className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                  title={t("buttons.resetToDefault")}
                >
                  {t("buttons.default")}
                </button>
              }
            >
              <div className="flex items-center justify-between gap-3">
                <label className="text-gray-300 text-sm">{t("fields.style")}</label>
                <select
                  className="bg-black border border-gray-700 rounded-md px-2 py-1 text-gray-200"
                  value={localState.crosshair?.style ?? 1}
                  onChange={(e) => handleChange("crosshair.style", +e.target.value)}
                >
                  <option value={0}>{t("options.solid")}</option>
                  <option value={1}>{t("options.dotted")}</option>
                  <option value={2}>{t("options.dashed")}</option>
                </select>
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-gray-300 text-sm">{t("fields.width")}</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="w-16 bg-black border border-gray-700 rounded px-2 py-1 text-gray-200"
                  value={localState.crosshair?.width ?? 1}
                  onChange={(e) => handleChange("crosshair.width", clamp(+e.target.value || 1, 1, 5))}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <label className="text-gray-300 text-sm">{t("fields.color")}</label>
                <ColorPicker
                  value={localState.crosshair?.color || "#758696"}
                  onChange={(val) => handleChange("crosshair.color", val)}
                />
              </div>
            </Section>

            {/* Timezone */}
            <Section
              title={t("labels.timezone")}
              action={
                <button
                  onClick={() =>
                    setLocalState((prev) => ({
                      ...prev,
                      timezoneMode: DEFAULTS.timezoneMode,
                      timezoneFixed: DEFAULTS.timezoneFixed,
                    }))
                  }
                  className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                  title={t("buttons.resetToDefault")}
                >
                  {t("buttons.default")}
                </button>
              }
            >
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-sm">{t("fields.mode")}</label>
                <select
                  className="bg-black border border-gray-700 rounded-md px-2 py-1 text-gray-200"
                  value={localState.timezoneMode}
                  onChange={(e) => handleChange("timezoneMode", e.target.value)}
                  aria-label={t("fields.mode")}
                >
                  <option value="local">{t("timezone.local")}</option>
                  <option value="utc">{t("timezone.utc")}</option>
                  <option value="fixed">{t("timezone.fixed")}</option>
                </select>
              </div>
              {localState.timezoneMode === "fixed" && (
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm">{t("fields.gmt")}</label>
                  <select
                    className="bg-black border border-gray-700 rounded-md px-2 py-1 text-gray-200"
                    value={localState.timezoneFixed}
                    onChange={(e) => handleChange("timezoneFixed", e.target.value)}
                    aria-label={t("fields.gmt")}
                  >
                    {TZ_OFFSETS.map((z) => (
                      <option key={z} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </Section>

            {/* WaterMark */}
            <Section
              title={t("labels.watermark")}
              action={
                <button
                  onClick={() => handleChange("watermark", { visible: true, fontSize: 20 })} // DEFAULTS doesn't have watermark fully explicit in store but used in modal logic
                  className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                  title={t("buttons.resetToDefault")}
                >
                  {t("buttons.default")}
                </button>
              }
            >
              <SettingToggle
                label={t("fields.visible")}
                value={!!localState.watermark.visible}
                onChange={(val) => handleChange("watermark.visible", val)}
              />
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-sm">{t("fields.wmSize")}</label>
                <input
                  aria-label={t("fields.wmSize")}
                  type="number"
                  min={10}
                  max={40}
                  className="w-20 bg-black border border-gray-700 rounded px-2 py-1 text-gray-200"
                  value={localState.watermark.fontSize}
                  onChange={(e) => handleChange("watermark.fontSize", clamp(+e.target.value || 20, 10, 40))}
                />
              </div>
            </Section>

            {/* Value source for single-value series */}
            {isSingleValue && (
              <Section
                title={t("labels.valueSource")}
                action={
                  <button
                    onClick={() => handleChange("series.valueSource", DEFAULTS.series.valueSource)}
                    className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                    title={t("buttons.resetToDefault")}
                  >
                    {t("buttons.default")}
                  </button>
                }
              >
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm">{t("fields.useValue")}</label>
                  <select
                    className="bg-black border border-gray-700 rounded-md px-2 py-1 text-gray-200"
                    value={localState.series.valueSource}
                    onChange={(e) => handleChange("series.valueSource", e.target.value)}
                    aria-label={t("fields.useValue")}
                  >
                    <option value="close">{t("ohlc.close")}</option>
                    <option value="open">{t("ohlc.open")}</option>
                    <option value="high">{t("ohlc.high")}</option>
                    <option value="low">{t("ohlc.low")}</option>
                  </select>
                </div>
              </Section>
            )}

            {/* Candle options */}
            {isCandle && (
              <Section
                title={t("labels.candles")}
                action={
                  <button
                    onClick={() =>
                      setLocalState((prev) => ({
                        ...prev,
                        candle: { ...DEFAULTS.candle },
                        candleAlpha: { ...DEFAULTS.candleAlpha },
                        series: {
                          ...prev.series,
                          hollow: DEFAULTS.series.hollow,
                          heikinAshi: DEFAULTS.series.heikinAshi,
                        },
                      }))
                    }
                    className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                    title={t("buttons.resetToDefault")}
                  >
                    {t("buttons.default")}
                  </button>
                }
              >
                <SettingToggle
                  label={t("fields.hollow")}
                  value={!!localState.series.hollow}
                  onChange={(val) => handleChange("series.hollow", val)}
                />
                <SettingToggle
                  label={t("fields.heikinAshi")}
                  value={!!localState.series.heikinAshi}
                  onChange={(val) => handleChange("series.heikinAshi", val)}
                />

                {[
                  { k: "upBody", L: t("fields.upBody") },
                  { k: "downBody", L: t("fields.downBody") },
                  { k: "upWick", L: t("fields.upWick") },
                  { k: "downWick", L: t("fields.downWick") },
                ].map(({ k, L }) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <label className="text-gray-300 text-sm w-28">{L}</label>
                    <ColorPicker
                      value={localState.candle[k]}
                      onChange={(val) => handleChange(`candle.${k}`, val)}
                    />
                    <input
                      aria-label={t("fields.opacityFor", { target: L })}
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round((localState.candleAlpha?.[k] ?? 1) * 100)}
                      onChange={(e) => handleChange(`candleAlpha.${k}`, clamp(+e.target.value, 0, 100) / 100)}
                    />
                    <span className="text-xs text-gray-400 w-10 text-right">
                      {Math.round((localState.candleAlpha?.[k] ?? 1) * 100)}%
                    </span>
                  </div>
                ))}

                <div>
                  <SettingToggle
                    label={t("fields.border")}
                    value={!!localState.candle.border}
                    onChange={(val) => handleChange("candle.border", val)}
                  />
                  {localState.candle.border && (
                    <div className="flex items-center justify-end gap-3 mt-2">
                      <span className="text-xs text-zinc-500">{t("fields.borderUp")}</span>
                      <ColorPicker
                        value={localState.candle.borderUp || localState.candle.upBody}
                        onChange={(val) => handleChange("candle.borderUp", val)}
                      />
                      <span className="text-xs text-zinc-500">{t("fields.borderDown")}</span>
                      <ColorPicker
                        value={localState.candle.borderDown || localState.candle.downBody}
                        onChange={(val) => handleChange("candle.borderDown", val)}
                      />
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Bar options */}
            {isBar && (
              <Section
                title={t("labels.barOptions")}
                action={
                  <button
                    onClick={() => handleChange("bar", { ...DEFAULTS.bar })}
                    className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                    title={t("buttons.resetToDefault")}
                  >
                    {t("buttons.default")}
                  </button>
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="text-gray-300 text-sm w-28">{t("fields.upColor")}</label>
                  <ColorPicker
                    value={localState.bar?.upColor || "#26A69A"}
                    onChange={(val) => handleChange("bar.upColor", val)}
                  />
                  <label className="text-gray-300 text-sm w-28">{t("fields.downColor")}</label>
                  <ColorPicker
                    value={localState.bar?.downColor || "#EF5350"}
                    onChange={(val) => handleChange("bar.downColor", val)}
                  />
                </div>
              </Section>
            )}

            {/* Line / Area / Baseline options */}
            {(isLine || isArea || isBaseline) && (
              <Section
                title={t("labels.seriesOptions", { type: t(`series.${type}`) })}
                action={
                  <button
                    onClick={() => {
                      setLocalState((prev) => {
                        const next = { ...prev };
                        if (type === "line") next.line = { ...DEFAULTS.line };
                        if (type === "area") next.area = { ...DEFAULTS.area };
                        if (type === "baseline") next.baseline = { ...DEFAULTS.baseline };
                        return next;
                      });
                    }}
                    className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                    title={t("buttons.resetToDefault")}
                  >
                    {t("buttons.default")}
                  </button>
                }
              >
                {isLine && (
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <label className="text-gray-300 text-sm">{t("fields.color")}</label>
                        <ColorPicker
                          value={localState.line?.color || "#f9d71c"}
                          onChange={(val) => handleChange("line.color", val)}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="text-gray-300 text-sm">{t("fields.width")}</label>
                        <input
                          type="number"
                          min={1}
                          max={5}
                          className="w-16 bg-black border border-gray-700 rounded px-2 py-1 text-gray-200"
                          value={localState.line?.width ?? 2}
                          onChange={(e) => handleChange("line.width", clamp(+e.target.value || 1, 1, 5))}
                          aria-label={t("fields.width")}
                        />
                      </div>
                    </div>
                    <SettingToggle
                      label={t("fields.stepped")}
                      value={!!localState.line?.stepped}
                      onChange={(val) => handleChange("line.stepped", val)}
                    />
                  </div>
                )}
                {isArea && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-gray-300 text-sm w-28">{t("fields.lineColor")}</label>
                      <ColorPicker
                        value={localState.area?.lineColor || "#ff9800"}
                        onChange={(val) => handleChange("area.lineColor", val)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-gray-300 text-sm w-28">{t("fields.topColor")}</label>
                      <ColorPicker
                        value={localState.area?.topColor || "#ff9800"}
                        onChange={(val) => handleChange("area.topColor", val)}
                      />
                      <input
                        aria-label={t("fields.topOpacity")}
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round((localState.area?.topAlpha ?? 0.4) * 100)}
                        onChange={(e) => handleChange("area.topAlpha", clamp(+e.target.value, 0, 100) / 100)}
                      />
                      <span className="text-xs text-gray-400 w-10 text-right">
                        {Math.round((localState.area?.topAlpha ?? 0.4) * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-gray-300 text-sm w-28">{t("fields.bottomColor")}</label>
                      <ColorPicker
                        value={localState.area?.bottomColor || "#ff9800"}
                        onChange={(val) => handleChange("area.bottomColor", val)}
                      />
                      <input
                        aria-label={t("fields.bottomOpacity")}
                        type="range"
                        min={0}
                        max={100}
                        value={Math.round((localState.area?.bottomAlpha ?? 0.08) * 100)}
                        onChange={(e) => handleChange("area.bottomAlpha", clamp(+e.target.value, 0, 100) / 100)}
                      />
                      <span className="text-xs text-gray-400 w-10 text-right">
                        {Math.round((localState.area?.bottomAlpha ?? 0.08) * 100)}%
                      </span>
                    </div>
                  </>
                )}
                {isBaseline && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-gray-300 text-sm w-28">{t("fields.baseValue")}</label>
                      <input
                        ref={bvRef}
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="done"
                        pattern="[0-9]*[.,]?[0-9]{0,6}"
                        placeholder="0.000000"
                        className="w-32 bg-black border border-gray-700 rounded px-2 py-1 text-gray-200"
                        defaultValue={String(localState?.baseline?.baseValue ?? 0)}
                        onChange={(e) => {
                          const el = e.currentTarget;
                          const caret = el.selectionStart ?? el.value.length;
                          const next = sanitizeDecimalInput6(el.value);
                          // caret korumaya çalış
                          const delta = next.length - el.value.length;
                          el.value = next;
                          const pos = Math.max(0, caret + delta);
                          // setSelectionRange hataya düşmesin diye try-catch
                          try { el.setSelectionRange(pos, pos); } catch { }
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        aria-label={t("fields.baseValue")}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-gray-300 text-sm w-28">{t("fields.topColor")}</label>
                      <ColorPicker
                        value={localState.baseline?.topColor || "#26A69A"}
                        onChange={(val) => handleChange("baseline.topColor", val)}
                      />
                      <label className="text-gray-300 text-sm w-28">{t("fields.bottomColor")}</label>
                      <ColorPicker
                        value={localState.baseline?.bottomColor || "#EF5350"}
                        onChange={(val) => handleChange("baseline.bottomColor", val)}
                      />
                    </div>
                  </>
                )}
              </Section>
            )}

            {/* Histogram options */}
            {isHistogram && (
              <Section
                title={t("labels.histogramOptions")}
                action={
                  <button
                    onClick={() => handleChange("histogram", { ...DEFAULTS.histogram })}
                    className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                    title={t("buttons.resetToDefault")}
                  >
                    {t("buttons.default")}
                  </button>
                }
              >
                <div className="flex items-center justify-between gap-3">
                  <label className="text-gray-300 text-sm w-28">{t("fields.color")}</label>
                  <ColorPicker
                    value={localState.histogram?.color || "#00FF88"}
                    onChange={(val) => handleChange("histogram.color", val)}
                  />
                  <label className="text-gray-300 text-sm w-20">{t("fields.opacity")}</label>
                  <input
                    aria-label={t("fields.opacity")}
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round((localState.histogram?.alpha ?? 0.4) * 100)}
                    onChange={(e) => handleChange("histogram.alpha", clamp(+e.target.value, 0, 100) / 100)}
                  />
                </div>
              </Section>
            )}

            {/* Price settings */}
            <Section
              title={t("labels.priceSettings")}
              action={
                <button
                  onClick={() => handleChange("pricePrecision", DEFAULTS.pricePrecision)}
                  className="text-xs text-cyan-500 hover:text-cyan-400 font-medium"
                  title={t("buttons.resetToDefault")}
                >
                  {t("buttons.default")}
                </button>
              }
            >
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-sm">{t("fields.pricePrecision")}</label>
                <input
                  aria-label={t("fields.pricePrecision")}
                  type="number"
                  min={0}
                  max={8}
                  className="w-20 bg-black border border-gray-700 rounded px-2 py-1 text-gray-200"
                  value={localState.pricePrecision}
                  onChange={(e) => handleChange("pricePrecision", clamp(+e.target.value || 0, 0, 8))}
                />
              </div>
            </Section>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-700 flex justify-end gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  reset();
                  setLocalState({
                    ...DEFAULTS,
                    watermark: { visible: true, fontSize: 20 },
                  });
                }}
                className="px-3 py-2 text-sm rounded-md border border-gray-700 text-gray-200 hover:bg-stone-900"
              >
                {t("buttons.reset")}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-3 py-2 text-sm rounded-md border border-gray-700 text-gray-300 hover:bg-stone-900"
              >
                {t("buttons.cancel")}
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-sm rounded-md bg-white text-black font-medium hover:bg-gray-300"
              >
                {t("buttons.save")}
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
