"use client";

import { CrosshairMode } from "lightweight-charts";
import { useEffect, useState, useRef } from "react";
import { createChart } from "lightweight-charts";
import useRulerStore from "@/store/indicator/rulerStore";
import { installRulerTool } from "@/utils/rulerTool";
import { useLogout } from "@/utils/HookLogout";
import useMagnetStore from "@/store/indicator/magnetStore";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import useStrategyDataStore from "@/store/indicator/strategyDataStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import IndicatorSettingsModal from './(modal_tabs)/indicatorSettingsModal';
import StrategySettingsModal from './(modal_tabs)/strategySettingsModal';
import { installCursorWheelZoom } from "@/utils/cursorCoom";
import usePanelStore from "@/store/indicator/panelStore";
import { useChartSettingsStore } from "@/store/indicator/chartSettingsStore";

import { RANGE_EVENT, RANGE_REQUEST_EVENT, nextSeq, markLeader, unmarkLeader, isLeader, minBarsFor, FUTURE_PADDING_BARS, setLastRangeCache, getLastRangeCache } from "@/utils/chartSync";

export default function ChartComponent() {
  const pad = (n) => String(n).padStart(2, '0');

  function toUnixSecUTC(t) {
    if (t == null) return undefined;
    if (typeof t === 'number') return t > 1e12 ? Math.floor(t / 1000) : Math.floor(t);
    if (typeof t === 'string') {
      const iso = /Z$|[+-]\d\d:\d\d$/.test(t) ? t : t + 'Z';
      const ms = Date.parse(iso);
      return Number.isFinite(ms) ? Math.floor(ms / 1000) : undefined;
    }
    return undefined;
  }

  // Cookie & timezone helpers
  function getCookie(name) {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.split('; ').find(row => row.startsWith(name + '='));
    return m ? decodeURIComponent(m.split('=')[1]) : null;
  }
  function parseGmtToMinutes(tzStr) {
    const m = /^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec((tzStr || '').trim());
    if (!m) return 0; // GMT+0
    const sign = m[1] === '-' ? -1 : 1;
    const h = parseInt(m[2] || '0', 10);
    const mins = parseInt(m[3] || '0', 10);
    return sign * (h * 60 + mins);
  }
  function readTimezoneOffsetMinutesFromCookie() {
    try {
      const raw = getCookie('wh_settings');
      if (!raw) return 0;
      const obj = JSON.parse(raw);
      return parseGmtToMinutes(obj?.timezone || 'GMT+0');
    } catch { return 0; }
  }
  function timeToZonedDate(t, offsetMinutes) {
    let msUTC;
    if (t && typeof t === 'object' && 'year' in t && 'month' in t && 'day' in t) {
      msUTC = Date.UTC(t.year, t.month - 1, t.day, 0, 0, 0);
    } else {
      const sec = (typeof t === 'number' ? t : 0);
      msUTC = sec * 1000;
    }
    return new Date(msUTC + (offsetMinutes || 0) * 60 * 1000);
  }
  function makeZonedFormatter(period, offsetMinutes) {
    const isMins  = ['1m','3m','5m','15m','30m'].includes(period);
    const isHours = ['1h','2h','4h'].includes(period);
    const isDays  = period === '1d';
    const isWeeks = period === '1w';
    const twoDigitYear = (Y) => String(Y).slice(2);
    return (t) => {
      const d = timeToZonedDate(t, offsetMinutes);
      const Y = d.getUTCFullYear();
      const yy = twoDigitYear(Y);
      const M = pad(d.getUTCMonth() + 1);
      const D = pad(d.getUTCDate());
      const h = pad(d.getUTCHours());
      const m = pad(d.getUTCMinutes());
      if (isMins)  return `${D}.${M} ${h}:${m}`;
      if (isHours) return `${D}.${M}.${yy} ${h}:00`;
      if (isDays)  return `${D}.${M}.${yy}`;
      if (isWeeks) return `${D}.${M}.${yy}`;
      return `${D}.${M}.${yy} ${h}:${m}`;
    };
  }

  function decimalsFromTick(t) {
    if (t == null) return null; const s = String(t);
    if (s.includes(".")) return s.split(".")[1].length;
    const m = s.match(/e-(\d+)/i); if (m) return parseInt(m[1], 10);
    return 0;
  }
  function guessPrecisionFromData(data) {
    if (!data?.length) return 2;
    let minPrice = Infinity;
    for (const c of data) if (Number.isFinite(c?.low)) minPrice = Math.min(minPrice, c.low);
    if (!Number.isFinite(minPrice)) return 2;
    if (minPrice >= 1) return 2;
    if (minPrice >= 0.1) return 3;
    if (minPrice >= 0.01) return 4;
    if (minPrice >= 0.001) return 5;
    if (minPrice >= 0.0001) return 6;
    if (minPrice >= 0.00001) return 7;
    return 8;
  }

  // === Heikin Ashi (sadece mumda) ===
  function toHeikinAshi(data) {
    if (!Array.isArray(data) || data.length === 0) return data;
    const out = [];
    for (let i = 0; i < data.length; i++) {
      const prev = out[i - 1];
      const { time, open, high, low, close } = data[i];
      const haClose = (open + high + low + close) / 4;
      const haOpen = i === 0 ? (open + close) / 2 : (prev.open + prev.close) / 2;
      const haHigh = Math.max(high, haOpen, haClose);
      const haLow  = Math.min(low, haOpen, haClose);
      out.push({ time, open: haOpen, high: haHigh, low: haLow, close: haClose });
    }
    return out;
  }

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);

  const [chartData, setChartData] = useState([]);
  const handleLogout = useLogout();
  const { isMagnetMode } = useMagnetStore();
  const { isRulerMode } = useRulerStore();
  const rulerModeRef = useRef(isRulerMode);
  const { end } = usePanelStore();
  useEffect(() => { rulerModeRef.current = isRulerMode; }, [isRulerMode]);

  const { indicatorData, removeSubIndicator } = useIndicatorDataStore();
  const { strategyData, removeSubStrategy } = useStrategyDataStore();
  const { selectedCrypto, selectedPeriod } = useCryptoStore();

  const [settingsIndicatorModalOpen, setSettingsIndicatorModalOpen] = useState(false);
  const [settingsStrategyModalOpen, setSettingsStrategyModalOpen] = useState(false);
  const [activeIndicatorId, setActiveIndicatorId] = useState(null);
  const [activeStrategyId, setActiveStrategyId] = useState(null);
  const [activeSubIndicatorId, setActiveSubIndicatorId] = useState(null);
  const [activeSubStrategyId, setActiveSubStrategyId] = useState(null);
  const [tzOffsetMin, setTzOffsetMin] = useState(0);

  const { settings } = useChartSettingsStore();

  const chartId = "main-chart";
  const isApplyingRef = useRef(false);
  const lastSeqAppliedRef = useRef(0);
  let rafHandle = null;

  const openIndicatorSettings = (indicatorId, subId) => { setActiveIndicatorId(indicatorId); setActiveSubIndicatorId(subId); setSettingsIndicatorModalOpen(true); };
  const openStrategySettings = (strategyId, subId) => { setActiveStrategyId(strategyId); setActiveSubStrategyId(subId); setSettingsStrategyModalOpen(true); };

  useEffect(() => { setTzOffsetMin(readTimezoneOffsetMinutesFromCookie()); }, [settings.timezoneMode, settings.timezoneFixed]);

  // ===== (KRİTİK) Seçim veya end değişince indikatör/strateji inputlarını yeniden hesapla =====
  useEffect(() => {
    const recalc = async () => {
      const indicatorState = useIndicatorDataStore.getState();
      const strategyState = useStrategyDataStore.getState();
      const allIndicators = indicatorState.indicatorData || {};
      const allStrategies = strategyState.strategyData || {};

      for (const [indicatorId, indicator] of Object.entries(allIndicators)) {
        const subItems = indicator.subItems || {};
        for (const [subId, sub] of Object.entries(subItems)) {
          const inputs = sub.inputs?.inputs || [];
          const formattedInputs = Object.fromEntries(inputs.map((input) => [input.name, input.default]));
          await indicatorState.updateInputs(indicatorId, subId, formattedInputs);
        }
      }
      for (const [strategyId, strategy] of Object.entries(allStrategies)) {
        const subItems = strategy.subItems || {};
        for (const [subId, sub] of Object.entries(subItems)) {
          const inputs = sub.inputs?.inputs || [];
          const formattedInputs = Object.fromEntries(inputs.map((input) => [input.name, input.default]));
          await strategyState.updateInputs(strategyId, subId, formattedInputs);
        }
      }
    };
    recalc();
  }, [selectedCrypto, selectedPeriod, end]);

  // ===== Fetch data =====
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/get-binance-data/?symbol=${selectedCrypto.binance_symbol}&interval=${selectedPeriod}`, { method: "GET", headers: { "Content-Type": "application/json" }, credentials: "include" });
        if (response.status === 401) {
          const errorData = await response.json();
          if (["Token expired", "Invalid token"].includes(errorData.detail)) { alert("Oturum süresi doldu veya geçersiz token! Lütfen tekrar giriş yapın."); handleLogout(); return; }
        }
        const data = await response.json();
        if (data.status === "success" && data.data) {
          const formattedData = data.data.map((c) => {
            const ts = c.timestamp; let ms;
            if (typeof ts === 'number') ms = ts > 1e12 ? ts : ts * 1000; else { const iso = /Z$|[+-]\d\d:\d\d$/.test(ts) ? ts : ts + 'Z'; ms = Date.parse(iso); }
            return { time: Math.floor(ms / 1000), open: c.open, high: c.high, low: c.low, close: c.close };
          });
          setChartData(formattedData);
        }
      } catch (error) { console.error("Veri çekme hatası:", error); }
    }
    fetchData();
  }, [selectedCrypto, selectedPeriod, end]);

  // ===== Apply time format on change =====
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    const timeVisible = !['1d','1w'].includes(selectedPeriod);
    const fmt = makeZonedFormatter(selectedPeriod, tzOffsetMin);
    chart.applyOptions({
      localization: { timeFormatter: fmt },
      timeScale: { timeVisible, secondsVisible: false, tickMarkFormatter: fmt },
    });
  }, [selectedPeriod, tzOffsetMin]);

  const hexToRgba = (hex, alpha=1) => {
    const h = hex.replace('#','');
    const bigint = parseInt(h.length===3 ? h.split('').map(x=>x+x).join('') : h, 16);
    const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  function mapToSingleValue(data, key) {
    const k = (key || "close");
    return (data || []).map(c => ({ time: c.time, value: c[k] }));
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function buildMainSeries(chart, seriesType, s, data) {
    try { priceSeriesRef.current?.setData([]); } catch {}
    try { priceSeriesRef.current && chart.removeSeries?.(priceSeriesRef.current); } catch {}

    let series;
    switch (seriesType) {
      case 'bar':
        series = chart.addBarSeries({ upColor: s.bar.upColor, downColor: s.bar.downColor });
        series.setData(data);
        break;
      case 'line':
        series = chart.addLineSeries({ color: s.line.color, lineWidth: s.line.width, lineType: s.line.stepped ? 1 : 0 });
        series.setData(mapToSingleValue(data, s.series.valueSource));
        break;
      case 'area':
        series = chart.addAreaSeries({ lineColor: s.area.lineColor, topColor: hexToRgba(s.area.topColor, s.area.topAlpha), bottomColor: hexToRgba(s.area.bottomColor, s.area.bottomAlpha) });
        series.setData(mapToSingleValue(data, s.series.valueSource));
        break;
      case 'baseline':
        series = chart.addBaselineSeries({ baseValue: { type: 'price', price: s.baseline.baseValue }, topFillColor1: s.baseline.topColor, topFillColor2: s.baseline.topColor, bottomFillColor1: s.baseline.bottomColor, bottomFillColor2: s.baseline.bottomColor });
        series.setData(mapToSingleValue(data, s.series.valueSource ));
        break;
      case 'histogram':
        series = chart.addHistogramSeries({ color: hexToRgba(s.histogram.color, s.histogram.alpha) });
        series.setData(mapToSingleValue(data, s.series.valueSource));
        break;
      case 'candlestick':
      default:
        series = chart.addCandlestickSeries({
          upColor: hexToRgba(s.candle.upBody, s.candleAlpha.upBody),
          downColor: hexToRgba(s.candle.downBody, s.candleAlpha.downBody),
          wickUpColor: hexToRgba(s.candle.upWick, s.candleAlpha.upWick),
          wickDownColor: hexToRgba(s.candle.downWick, s.candleAlpha.downWick),
          wickVisible: true,
          borderVisible: !!s.candle.border,
          borderUpColor: s.candle.borderUp || s.candle.upBody,
          borderDownColor: s.candle.borderDown || s.candle.downBody,
        });
        if (s.series.hollow) {
          series.applyOptions({ borderVisible: true, upColor: hexToRgba(s.candle.upBody, 0), downColor: hexToRgba(s.candle.downBody, 0) });
        }
        const finalCandleData = (s.series.heikinAshi ? toHeikinAshi(data) : data);
        series.setData(finalCandleData);
        break;
    }

    // price format (enforced precision vs tick_size vs guessed)
    const enforcedPrecision = Number.isFinite(+s.pricePrecision) ? clamp(+s.pricePrecision, 0, 8) : null;
    const tick = selectedCrypto?.tick_size ?? null;
    const tickPrecision = decimalsFromTick(tick);
    const precision = enforcedPrecision ?? Math.min(10, Math.max(0, tickPrecision ?? guessPrecisionFromData(data)));
    const minMove = enforcedPrecision != null ? Math.pow(10, -precision) : (tick ? Number(tick) : Math.pow(10, -precision));
    series.applyOptions({ priceFormat: { type: 'price', precision, minMove } });

    priceSeriesRef.current = series;
    return series;
  }

  // ===== Create / Recreate chart when data OR settings change =====
  useEffect(() => {
    if (chartData.length === 0 || !chartContainerRef.current) return;

    try { chartRef.current?.remove?.(); chartRef.current = null; } catch {}

    const fmt = makeZonedFormatter(selectedPeriod, tzOffsetMin);

    const textColor = settings.textColor === "black" ? "#111111" : "#ffffff";
    const gridColor = settings?.grid?.color || "#111111";

    const chartOptions = {
      layout: { textColor, background: { type: 'solid', color: settings.bgColor || (settings.theme === 'light' ? '#ffffff' : 'rgb(0,0,7)') } },
      grid: { vertLines: { color: gridColor, style: 1, visible: true }, horzLines: { color: gridColor, style: 1, visible: true } },
      crosshair: { mode: isMagnetMode ? CrosshairMode.Magnet : CrosshairMode.Normal },
      localization: { timeFormatter: fmt },
      timeScale: { timeVisible: !['1d','1w'].includes(selectedPeriod), secondsVisible: false, tickMarkFormatter: fmt, rightBarStaysOnScroll: true, shiftVisibleRangeOnNewBar: false },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // watermark
    const symbolText = selectedCrypto?.binance_symbol || selectedCrypto?.symbol || '—';
    const wmColor = settings.textColor === "black" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)";
    chart.applyOptions({ watermark: { color: wmColor, visible: true, text: symbolText, fontSize: 40, horzAlign: 'center', vertAlign: 'center' } });

    const el = chartContainerRef.current; const cleanupFns = [];
    if (el) {
      const onStart = () => markLeader(chartId); const onEnd = () => unmarkLeader(chartId);
      el.addEventListener('mousedown', onStart);
      el.addEventListener('wheel', onStart, { passive: false });
      el.addEventListener('touchstart', onStart, { passive: true });
      window.addEventListener('mouseup', onEnd);
      el.addEventListener('mouseleave', onEnd);
      window.addEventListener('touchend', onEnd);
      cleanupFns.push(() => {
        el.removeEventListener('mousedown', onStart);
        el.removeEventListener('wheel', onStart);
        el.removeEventListener('touchstart', onStart);
        window.removeEventListener('mouseup', onEnd);
        el.removeEventListener('mouseleave', onEnd);
        window.removeEventListener('touchend', onEnd);
      });
    }

    // === MAIN SERIES ===
    const mainSeries = buildMainSeries(chart, settings.series.type, settings, chartData);

    // Ruler tool
    const removeRuler = installRulerTool({ chart, series: mainSeries, container: chartContainerRef.current, isRulerModeRef: rulerModeRef });
    cleanupFns.push(() => { try { removeRuler?.(); } catch {} });

    // Cursor-centered zoom
    const removeWheelZoom = installCursorWheelZoom({ chart, chartId, selectedPeriod, containerEl: chartContainerRef.current, isApplyingRef, lastSeqAppliedRef });
    cleanupFns.push(removeWheelZoom);

    // timeScale
    const timeScale = chart.timeScale();

    // Center last bar (initial range)
    const barsToShow = 50; const rightPad = Math.floor((barsToShow - 1) / 2);
    const lastIndex = Math.max(0, chartData.length - 1); const to = lastIndex + rightPad; const from = to - (barsToShow - 1);
    timeScale.applyOptions({ rightOffset: rightPad });
    timeScale.setVisibleLogicalRange({ from, to });
    setLastRangeCache({ from, to, rightOffset: rightPad, sourceId: chartId });

    // === STRATEGY MARKERS ===
    const allMarkers = [];
    Object.values(strategyData).forEach((strategyInfo) => {
      const subItems = strategyInfo?.subItems || {};
      Object.values(subItems).forEach((sub) => {
        const result = sub?.strategy_result?.[0]; if (!result?.data) return;
        result.data.forEach(([time, signal, _value, note = ""]) => {
          const unixTime = toUnixSecUTC(time);
          const m = { time: unixTime, position: 'aboveBar', color: '', shape: '', text: note || '' };
          switch (signal) {
            case 'Long Open': m.shape = 'arrowUp'; m.color = 'green'; m.position = 'belowBar'; break;
            case 'Long Close': m.shape = 'arrowDown'; m.color = 'red'; m.position = 'aboveBar'; break;
            case 'Short Open': m.shape = 'arrowDown'; m.color = 'red'; m.position = 'aboveBar'; break;
            case 'Short Close': m.shape = 'arrowUp'; m.color = 'green'; m.position = 'belowBar'; break;
            default: return;
          }
          allMarkers.push(m);
        });
      });
    });
    allMarkers.sort((a, b) => a.time - b.time);
    try { mainSeries.setMarkers(allMarkers); } catch {}

    // === STRATEGIES & INDICATORS ===
    const strategyLabelsContainer = document.getElementById("strategy-labels");
    if (strategyLabelsContainer) strategyLabelsContainer.innerHTML = "";
    Object.entries(strategyData).forEach(([strategyId, strategy]) => {
      const strategyName = strategy.name; const subItems = strategy.subItems || {};
      Object.entries(subItems).forEach(([subId, sub]) => {
        const labelId = `strategy-label-${strategyId}-${subId}`; if (document.getElementById(labelId)) return;
        const labelDiv = document.createElement('div');
        labelDiv.id = labelId; labelDiv.style.cssText = `background: rgba(30,30,30,0.4); color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; gap: 6px;`;
        const title = document.createElement('span'); title.textContent = strategyName || `${strategyId} (${subId})`;
        const settingsBtn = document.createElement('button'); settingsBtn.textContent = '⚙️'; settingsBtn.style.cssText = 'background:none;border:none;color:white;cursor:pointer;'; settingsBtn.onclick = () => { setActiveStrategyId(strategyId); setActiveSubStrategyId(subId); setSettingsStrategyModalOpen(true); };
        const removeBtn = document.createElement('button'); removeBtn.textContent = '❌'; removeBtn.style.cssText = 'background:none;border:none;color:white;cursor:pointer;'; removeBtn.onclick = () => { labelDiv.remove(); removeSubStrategy(strategyId, subId); };
        labelDiv.appendChild(title); labelDiv.appendChild(settingsBtn); labelDiv.appendChild(removeBtn);
        strategyLabelsContainer && strategyLabelsContainer.appendChild(labelDiv);
      });
    });

    const indicatorLabelsContainer = document.getElementById("indicator-labels");
    if (indicatorLabelsContainer) indicatorLabelsContainer.innerHTML = "";
    Object.entries(indicatorData).forEach(([indicatorId, indicator]) => {
      const indicatorName = indicator.name; const subItems = indicator.subItems || {};
      Object.entries(subItems).forEach(([subId, indicatorInfo]) => {
        if (!indicatorInfo?.result) return; if (!Array.isArray(indicatorInfo?.result)) return;
        indicatorInfo.result.filter((item) => item.on_graph === true).forEach((indicatorResult) => {
          const { type, settings: s, data } = indicatorResult; let series;
          switch (type) {
            case 'line': series = chart.addLineSeries({ color: s?.color || 'yellow', lineWidth: s?.width || 2, lastValueVisible: false, priceLineVisible: false }); break;
            case 'area': series = chart.addAreaSeries({ topColor: s?.color || 'rgba(33,150,243,0.5)', bottomColor: 'rgba(33,150,243,0.1)', lineColor: s?.color || 'blue', lastValueVisible: false, priceLineVisible: false }); break;
            case 'histogram': { const c = s?.color ?? '0, 128, 0'; const opacity = s?.opacity ?? 0.3; series = chart.addHistogramSeries({ color: `rgba(${c}, ${opacity})`, lastValueVisible: false, priceLineVisible: false }); break; }
            default: series = chart.addLineSeries({ color: 'white', lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
          }
          const timeValueMap = new Map();
          data.forEach(([time, value]) => { if (value === undefined) return; const unixTime = toUnixSecUTC(time); if (unixTime !== undefined) timeValueMap.set(unixTime, value); });
          const formattedData = Array.from(timeValueMap.entries()).sort(([a],[b]) => a-b).map(([time, value]) => ({ time, value }));
          series.setData(formattedData);

          // Label UI
          const labelId = `indicator-label-${indicatorId}-${subId}`;
          if (document.getElementById(labelId)) return;
          const labelDiv = document.createElement("div");
          labelDiv.id = labelId;
          labelDiv.style.cssText = `background: rgba(30,30,30,0.4); color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; gap: 6px;`;
          const title = document.createElement("span");
          title.textContent = indicatorName || `${indicatorId} (${subId})`;
          const settingsBtn = document.createElement("button");
          settingsBtn.textContent = "⚙️"; settingsBtn.style.cssText = "background:none;border:none;color:white;cursor:pointer;";
          settingsBtn.onclick = () => { setActiveIndicatorId(indicatorId); setActiveSubIndicatorId(subId); setSettingsIndicatorModalOpen(true); };
          const removeBtn = document.createElement("button");
          removeBtn.textContent = "❌"; removeBtn.style.cssText = "background:none;border:none;color:white;cursor:pointer;";
          removeBtn.onclick = () => { series.setData([]); labelDiv.remove(); removeSubIndicator(indicatorId, subId); };
          labelDiv.appendChild(title); labelDiv.appendChild(settingsBtn); labelDiv.appendChild(removeBtn);
          indicatorLabelsContainer && indicatorLabelsContainer.appendChild(labelDiv);
        });
      });
    });

    // Range sync
    timeScale.subscribeVisibleTimeRangeChange(() => {
      if (isApplyingRef.current) return; if (!isLeader(chartId)) return; const logical = timeScale.getVisibleLogicalRange(); if (!logical) return;
      let { from, to } = logical; const minBars = minBarsFor(selectedPeriod);
      if (to - from < minBars) { const c = (from + to) / 2; from = c - minBars / 2; to = c + minBars / 2; isApplyingRef.current = true; timeScale.setVisibleLogicalRange({ from, to }); requestAnimationFrame(() => { isApplyingRef.current = false; }); }
      const rightOffset = timeScale.getRightOffset ? timeScale.getRightOffset() : FUTURE_PADDING_BARS;
      if (rafHandle) cancelAnimationFrame(rafHandle); const seq = nextSeq();
      setLastRangeCache({ from, to, rightOffset, sourceId: chartId });
      rafHandle = requestAnimationFrame(() => { window.dispatchEvent(new CustomEvent(RANGE_EVENT, { detail: { from, to, rightOffset, sourceId: chartId, seq } })); });
    });

    const onRangeEvent = (e) => {
      const { from, to, rightOffset, sourceId, seq } = (e && e.detail) || {}; if (sourceId === chartId) return; if (seq && seq <= lastSeqAppliedRef.current) return; lastSeqAppliedRef.current = seq;
      isApplyingRef.current = true; if (rightOffset != null) timeScale.applyOptions({ rightOffset }); timeScale.setVisibleLogicalRange({ from, to }); requestAnimationFrame(() => { isApplyingRef.current = false; });
    };
    window.addEventListener(RANGE_EVENT, onRangeEvent);

    const onRangeRequest = () => { const payload = getLastRangeCache(); if (!payload) return; const seq = nextSeq(); window.dispatchEvent(new CustomEvent(RANGE_EVENT, { detail: { ...payload, seq } })); };
    window.addEventListener(RANGE_REQUEST_EVENT, onRangeRequest);

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    // cleanup
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener(RANGE_EVENT, onRangeEvent);
      window.removeEventListener(RANGE_REQUEST_EVENT, onRangeRequest);
      try { chartRef.current?.remove?.(); } catch {}
      cleanupFns.forEach(fn => { try { fn(); } catch {} });
    };
  }, [chartData, indicatorData, strategyData, isMagnetMode, selectedPeriod, tzOffsetMin, settings]);

  // Crosshair mode live change
  useEffect(() => { if (chartRef.current) { chartRef.current.applyOptions({ crosshair: { mode: isMagnetMode ? CrosshairMode.Magnet : CrosshairMode.Normal } }); } }, [isMagnetMode]);

  return (
    <div className="relative w-full h-full">
      <div id="indicator-labels" className="absolute top-2 left-2 z-10 flex flex-col gap-1"></div>
      <div id="strategy-labels" style={{ position: 'absolute', top: 10, right: 80, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px' }}></div>
      <div ref={chartContainerRef} className="absolute top-0 left-0 w-full h-full"></div>

      <IndicatorSettingsModal isOpen={settingsIndicatorModalOpen} onClose={() => setSettingsIndicatorModalOpen(false)} indicatorId={activeIndicatorId} subId={activeSubIndicatorId} />
      <StrategySettingsModal isOpen={settingsStrategyModalOpen} onClose={() => setSettingsStrategyModalOpen(false)} strategyId={activeStrategyId} subId={activeSubStrategyId} />
    </div>
  );
}
