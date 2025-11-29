"use client";

import { useEffect, useRef, useState } from "react";
import { useChartSettingsStore } from "@/store/indicator/chartSettingsStore";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

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

  const Section = ({ title, children }) => (
    <div className="border border-gray-800 rounded-xl p-4 bg-black/60 mb-4">
      <div className="text-sm font-medium text-gray-200 mb-3">{title}</div>
      <div className="grid gap-3">{children}</div>
    </div>
  );

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
            <Section title={t("labels.appearance")}>
              {/* Background */}
              <div className="flex items-center justify-between gap-3">
                <label className="text-gray-300 text-sm w-40">{t("fields.background")}</label>
                <input
                  aria-label={t("fields.background")}
                  type="color"
                  value={localState.bgColor}
                  onChange={(e) => handleChange("bgColor", e.target.value)}
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
                <input
                  aria-label={t("fields.gridColor")}
                  type="color"
                  value={localState.grid.color}
                  onChange={(e) => handleChange("grid.color", e.target.value)}
                />
              </div>
            </Section>

            {/* Timezone */}
            <Section title={t("labels.timezone")}>
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
            <Section title={t("labels.watermark")}>
              <div className="flex items-center justify-between">
                <label className="text-gray-300 text-sm">{t("fields.visible")}</label>
                <input
                  type="checkbox"
                  checked={!!localState.watermark.visible}
                  onChange={(e) => handleChange("watermark.visible", e.target.checked)}
                  aria-label={t("fields.visible")}
                />
              </div>
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
              <Section title={t("labels.valueSource")}>
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
              <Section title={t("labels.candles")}>
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm">{t("fields.hollow")}</label>
                  <input
                    type="checkbox"
                    checked={!!localState.series.hollow}
                    onChange={(e) => handleChange("series.hollow", e.target.checked)}
                    aria-label={t("fields.hollow")}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm">{t("fields.heikinAshi")}</label>
                  <input
                    type="checkbox"
                    checked={!!localState.series.heikinAshi}
                    onChange={(e) => handleChange("series.heikinAshi", e.target.checked)}
                    aria-label={t("fields.heikinAshi")}
                  />
                </div>

                {[
                  { k: "upBody", L: t("fields.upBody") },
                  { k: "downBody", L: t("fields.downBody") },
                  { k: "upWick", L: t("fields.upWick") },
                  { k: "downWick", L: t("fields.downWick") },
                ].map(({ k, L }) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <label className="text-gray-300 text-sm w-28">{L}</label>
                    <input
                      aria-label={L}
                      type="color"
                      value={localState.candle[k]}
                      onChange={(e) => handleChange(`candle.${k}`, e.target.value)}
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

                <div className="flex items-center justify-between gap-3">
                  <label className="text-gray-300 text-sm w-28">{t("fields.border")}</label>
                  <input
                    type="checkbox"
                    checked={!!localState.candle.border}
                    onChange={(e) => handleChange("candle.border", e.target.checked)}
                    aria-label={t("fields.border")}
                  />
                  <input
                    aria-label={t("fields.borderUp")}
                    type="color"
                    value={localState.candle.borderUp || localState.candle.upBody}
                    onChange={(e) => handleChange("candle.borderUp", e.target.value)}
                    title={t("fields.borderUp")}
                  />
                  <input
                    aria-label={t("fields.borderDown")}
                    type="color"
                    value={localState.candle.borderDown || localState.candle.downBody}
                    onChange={(e) => handleChange("candle.borderDown", e.target.value)}
                    title={t("fields.borderDown")}
                  />
                </div>
              </Section>
            )}

            {/* Bar options */}
            {isBar && (
              <Section title={t("labels.barOptions")}>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-gray-300 text-sm w-28">{t("fields.upColor")}</label>
                  <input
                    aria-label={t("fields.upColor")}
                    type="color"
                    value={localState.bar?.upColor || "#26A69A"}
                    onChange={(e) => handleChange("bar.upColor", e.target.value)}
                  />
                  <label className="text-gray-300 text-sm w-28">{t("fields.downColor")}</label>
                  <input
                    aria-label={t("fields.downColor")}
                    type="color"
                    value={localState.bar?.downColor || "#EF5350"}
                    onChange={(e) => handleChange("bar.downColor", e.target.value)}
                  />
                </div>
              </Section>
            )}

            {/* Line / Area / Baseline options */}
            {(isLine || isArea || isBaseline) && (
              <Section title={t("labels.seriesOptions", { type: t(`series.${type}`) })}>
                {isLine && (
                  <div className="flex items-center justify-between gap-3">
                    <label className="text-gray-300 text-sm w-28">{t("fields.color")}</label>
                    <input
                      aria-label={t("fields.color")}
                      type="color"
                      value={localState.line?.color || "#f9d71c"}
                      onChange={(e) => handleChange("line.color", e.target.value)}
                    />
                    <label className="text-gray-300 text-sm w-16">{t("fields.width")}</label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      className="w-16 bg-black border border-gray-700 rounded px-2 py-1 text-gray-200"
                      value={localState.line?.width ?? 2}
                      onChange={(e) => handleChange("line.width", clamp(+e.target.value || 1, 1, 5))}
                      aria-label={t("fields.width")}
                    />
                    <label className="text-gray-300 text-sm w-20">{t("fields.stepped")}</label>
                    <input
                      type="checkbox"
                      checked={!!localState.line?.stepped}
                      onChange={(e) => handleChange("line.stepped", e.target.checked)}
                      aria-label={t("fields.stepped")}
                    />
                  </div>
                )}
                {isArea && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-gray-300 text-sm w-28">{t("fields.lineColor")}</label>
                      <input
                        aria-label={t("fields.lineColor")}
                        type="color"
                        value={localState.area?.lineColor || "#ff9800"}
                        onChange={(e) => handleChange("area.lineColor", e.target.value)}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-gray-300 text-sm w-28">{t("fields.topColor")}</label>
                      <input
                        aria-label={t("fields.topColor")}
                        type="color"
                        value={localState.area?.topColor || "#ff9800"}
                        onChange={(e) => handleChange("area.topColor", e.target.value)}
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
                      <input
                        aria-label={t("fields.bottomColor")}
                        type="color"
                        value={localState.area?.bottomColor || "#ff9800"}
                        onChange={(e) => handleChange("area.bottomColor", e.target.value)}
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
                          try { el.setSelectionRange(pos, pos); } catch {}
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        aria-label={t("fields.baseValue")}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <label className="text-gray-300 text-sm w-28">{t("fields.topColor")}</label>
                      <input
                        aria-label={t("fields.topColor")}
                        type="color"
                        value={localState.baseline?.topColor || "#26A69A"}
                        onChange={(e) => handleChange("baseline.topColor", e.target.value)}
                      />
                      <label className="text-gray-300 text-sm w-28">{t("fields.bottomColor")}</label>
                      <input
                        aria-label={t("fields.bottomColor")}
                        type="color"
                        value={localState.baseline?.bottomColor || "#EF5350"}
                        onChange={(e) => handleChange("baseline.bottomColor", e.target.value)}
                      />
                    </div>
                  </>
                )}
              </Section>
            )}

            {/* Histogram options */}
            {isHistogram && (
              <Section title={t("labels.histogramOptions")}>
                <div className="flex items-center justify-between gap-3">
                  <label className="text-gray-300 text-sm w-28">{t("fields.color")}</label>
                  <input
                    aria-label={t("fields.color")}
                    type="color"
                    value={localState.histogram?.color || "#00FF88"}
                    onChange={(e) => handleChange("histogram.color", e.target.value)}
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
            <Section title={t("labels.priceSettings")}>
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
                onClick={reset}
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
