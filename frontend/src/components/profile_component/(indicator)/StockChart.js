"use client";

import { CrosshairMode } from "lightweight-charts";
import { useEffect, useState, useRef } from "react";
import { createChart } from "lightweight-charts";
import useRulerStore from "@/store/indicator/rulerStore";
import { createRoot } from "react-dom/client";
import { RiSettingsLine } from "react-icons/ri";
import { AiOutlineClose, AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import { FaChevronUp } from "react-icons/fa";
import { FaChevronDown } from "react-icons/fa";
import { installRulerTool } from "@/utils/rulerTool";
import { useLogout } from "@/utils/HookLogout";
import useMagnetStore from "@/store/indicator/magnetStore";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import useStrategyDataStore from "@/store/indicator/strategyDataStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import IndicatorSettingsModal from './(modal_tabs)/indicatorSettingsModal';
import StrategySettingsModal from './(modal_tabs)/strategySettingsModal';
import CandleLoader from './candleLoader';
import { installCursorWheelZoom } from "@/utils/cursorCoom";
import usePanelStore from "@/store/indicator/panelStore";
import { useChartSettingsStore } from "@/store/indicator/chartSettingsStore";
import useWatchListStore from "@/store/indicator/watchListStore";
import api from "@/api/axios";

import { RANGE_EVENT, RANGE_REQUEST_EVENT, CROSSHAIR_EVENT, nextSeq, markLeader, unmarkLeader, isLeader, minBarsFor, FUTURE_PADDING_BARS, setLastRangeCache, getLastRangeCache } from "@/utils/chartSync";

export default function ChartComponent({ onLoadingChange }) {
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
    const isMins = ['1m', '3m', '5m', '15m', '30m'].includes(period);
    const isHours = ['1h', '2h', '4h'].includes(period);
    const isDays = period === '1d';
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
      if (isMins) return `${D}.${M} ${h}:${m}`;
      if (isHours) return `${D}.${M}.${yy} ${h}:00`;
      if (isDays) return `${D}.${M}.${yy}`;
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
      const haLow = Math.min(low, haOpen, haClose);
      out.push({ time, open: haOpen, high: haHigh, low: haLow, close: haClose });
    }
    return out;
  }

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const priceSeriesRef = useRef(null);

  // dispose korumaları
  const isMountedRef = useRef(false);
  const chartInstanceIdRef = useRef(0); // her chart yaratımında artar
  const rafRef = useRef(null);          // tekil RAF id

  // Strategy visibility ref
  const hiddenStrategyIdsRef = useRef(new Set());

  // Indicator series ref - chart'ı yeniden oluşturmadan indikatörleri güncellemek için
  const indicatorSeriesMapRef = useRef(new Map()); // key: `${indicatorId}-${subId}-${resultIdx}`, value: {series, labelDiv, valueSpan, dataMap}
  const seriesLabelMapRef = useRef(new Map()); // crosshair label güncellemesi için

  // Indicator visibility handled by store
  const isIndicatorsCollapsedRef = useRef(false);

  // Range persistence ref for effect re-runs
  const lastVisibleRangeRef = useRef(null);

  // Hover state ref for button flickering fix
  const isHoveringButtonsRef = useRef(false);
  const clearTimerRef = useRef(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Parent'a loading bilgisini ilet
  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading);
    }
  }, [isLoading, onLoadingChange]);

  const handleLogout = useLogout();
  const { isMagnetMode } = useMagnetStore();
  const isMagnetModeRef = useRef(isMagnetMode);
  // Sync ref with store
  useEffect(() => { isMagnetModeRef.current = isMagnetMode; }, [isMagnetMode]);

  const { isRulerMode, toggleRulerMode } = useRulerStore();
  const rulerModeRef = useRef(isRulerMode);
  const { end } = usePanelStore();
  useEffect(() => { rulerModeRef.current = isRulerMode; }, [isRulerMode]);

  const { indicatorData, removeSubIndicator, toggleSubIndicatorVisibility } = useIndicatorDataStore();
  const { strategyData, removeSubStrategy } = useStrategyDataStore();
  const { selectedCrypto, setSelectedCrypto, coins, selectedPeriod } = useCryptoStore();
  const { watchlist } = useWatchListStore();

  const [settingsIndicatorModalOpen, setSettingsIndicatorModalOpen] = useState(false);
  const [settingsStrategyModalOpen, setSettingsStrategyModalOpen] = useState(false);
  const [activeIndicatorId, setActiveIndicatorId] = useState(null);
  const [activeStrategyId, setActiveStrategyId] = useState(null);
  const [activeSubIndicatorId, setActiveSubIndicatorId] = useState(null);
  const [activeSubStrategyId, setActiveSubStrategyId] = useState(null);
  const [infoPanelData, setInfoPanelData] = useState(null); // { candle, indicators: [], change: { val, percent } }
  const infoPanelActiveRef = useRef(false);
  useEffect(() => { infoPanelActiveRef.current = !!infoPanelData; }, [infoPanelData]);

  const [tzOffsetMin, setTzOffsetMin] = useState(0);

  const { settings } = useChartSettingsStore();

  const chartId = "main-chart";
  const isApplyingRef = useRef(false);
  const lastSeqAppliedRef = useRef(0);

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

  // ===== Watchlist ile klavye ok tuşlarıyla geçiş =====

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Input/text alanındayken çalışmasın
      const target = e.target;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA") &&
        !target.classList.contains("whaleer-hotkey-enabled")
      ) {
        return;
      }

      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      if (!selectedCrypto || !watchlist.length) return;

      // Sayfa scroll’unu engelle
      e.preventDefault();

      const ids = watchlist;
      const currentIndex = ids.indexOf(selectedCrypto.id);

      if (currentIndex === -1) return;

      let nextIndex = currentIndex;

      if (e.key === "ArrowUp") {
        nextIndex = (currentIndex - 1 + ids.length) % ids.length;
      } else if (e.key === "ArrowDown") {
        nextIndex = (currentIndex + 1) % ids.length;
      }

      const nextId = ids[nextIndex];
      const nextCoin = coins.find((c) => c.id === nextId);
      if (!nextCoin) return;

      setSelectedCrypto(nextCoin);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedCrypto, watchlist, coins, setSelectedCrypto]);

  // ===== Fetch data =====
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const response = await api.get(`/get-binance-data/?symbol=${selectedCrypto.binance_symbol}&interval=${selectedPeriod}`);

        // api interceptor handles 401, no need for manual check here

        const data = response.data;
        if (data.status === "success" && data.data) {
          // Eğer gelen veri boşsa chartData'yı boş set et
          if (!data.data.length) {
            setChartData([]);
          } else {
            const formattedData = data.data.map((c) => {
              const ts = c.timestamp; let ms;
              if (typeof ts === 'number') ms = ts > 1e12 ? ts : ts * 1000; else { const iso = /Z$|[+-]\d\d:\d\d$/.test(ts) ? ts : ts + 'Z'; ms = Date.parse(iso); }
              return { time: Math.floor(ms / 1000), open: c.open, high: c.high, low: c.low, close: c.close };
            });
            setChartData(formattedData);
          }
        }
      } catch (error) { console.error("Veri çekme hatası:", error); }
      finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [selectedCrypto, selectedPeriod, end]);

  // ===== Apply time format on change =====
  useEffect(() => {
    if (!chartRef.current) return;
    const chart = chartRef.current;
    const timeVisible = !['1d', '1w'].includes(selectedPeriod);
    const fmt = makeZonedFormatter(selectedPeriod, tzOffsetMin);
    chart.applyOptions({
      localization: { timeFormatter: fmt },
      timeScale: { timeVisible, secondsVisible: false, tickMarkFormatter: fmt },
    });
  }, [selectedPeriod, tzOffsetMin]);

  const hexToRgba = (hex, alpha = 1) => {
    const h = hex.replace('#', '');
    const bigint = parseInt(h.length === 3 ? h.split('').map(x => x + x).join('') : h, 16);
    const r = (bigint >> 16) & 255; const g = (bigint >> 8) & 255; const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  function mapToSingleValue(data, key) {
    const k = (key || "close");
    return (data || []).map(c => ({ time: c.time, value: c[k] }));
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function buildMainSeries(chart, seriesType, s, data) {
    try { priceSeriesRef.current?.setData([]); } catch { }
    try { priceSeriesRef.current && chart.removeSeries?.(priceSeriesRef.current); } catch { }

    let series;
    switch (seriesType) {
      case 'bar':
        series = chart.addBarSeries({ upColor: s.bar.upColor, downColor: s.bar.downColor });
        series.setData(data);
        break;
      case 'line':
        series = chart.addLineSeries({ color: s.line.color, lineWidth: s.line.width, lineType: s.line.stepped ? 1 : 0, crosshairMarkerVisible: false });
        series.setData(mapToSingleValue(data, s.series.valueSource));
        break;
      // YENİ EKLENENLer: Kesikli Çizgi (Dashed) - Noktalı Çizgi (Dotted)
      case 'dashed':
        series = chart.addLineSeries({ color: s.line.color, lineWidth: s.line.width, lineStyle: 2, lineType: s.line.stepped ? 1 : 0, crosshairMarkerVisible: false });
        series.setData(mapToSingleValue(data, s.series.valueSource));
        break;

      case 'dotted':
        series = chart.addLineSeries({ color: s.line.color, lineWidth: s.line.width, lineStyle: 1, lineType: s.line.stepped ? 1 : 0, crosshairMarkerVisible: false });
        series.setData(mapToSingleValue(data, s.series.valueSource));
        break;
      //--------------------------------------------------------------------
      case 'area':
        series = chart.addAreaSeries({ lineColor: s.area.lineColor, topColor: hexToRgba(s.area.topColor, s.area.topAlpha), bottomColor: hexToRgba(s.area.bottomColor, s.area.bottomAlpha), crosshairMarkerVisible: false });
        series.setData(mapToSingleValue(data, s.series.valueSource));
        break;
      case 'baseline':
        series = chart.addBaselineSeries({ baseValue: { type: 'price', price: s.baseline.baseValue }, topFillColor1: s.baseline.topColor, topFillColor2: s.baseline.topColor, bottomFillColor1: s.baseline.bottomColor, bottomFillColor2: s.baseline.bottomColor, crosshairMarkerVisible: false });
        series.setData(mapToSingleValue(data, s.series.valueSource));
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
    if (!chartContainerRef.current) return;

    // önceki chart'ı ve series'i bırak
    // Artık cleanup fonksiyonunda handle ediyoruz, burada tekrar remove çağrısı güvenli olsun diye kalsın ama ref zaten null olacak.
    try { chartRef.current?.remove?.(); } catch { }
    chartRef.current = null;
    priceSeriesRef.current = null;

    // bu yaratım için benzersiz kimlik
    const myInstanceId = ++chartInstanceIdRef.current;

    // cleanup'ta chartRef.current null'landığı için prevRange'i burdan alamayız,
    // o yüzden lastVisibleRangeRef kullanacağız. Ref'teki değer bir önceki cleanup'tan geliyor.


    const fmt = makeZonedFormatter(selectedPeriod, tzOffsetMin);

    // seriesLabelMap artık seriesLabelMapRef olarak ayrı useEffect'te yönetiliyor
    // isHoveringButtons ve clearTimer artık ref olarak tanımlandı (yanıp sönme düzeltmesi için)

    const COLOR_MAP = {
      white: "#FFFFFF",
      black: "#111111",
      gray: "#8C8C8C",
      yellow: "#F2D024",
      red: "#F23645",
      green: "#0ECB81"
    };

    const textColor = COLOR_MAP[settings.textColor] ?? "#8C8C8C";
    const labelColor = settings.labelColor || "white";
    const gridColor = settings?.grid?.color || "#111111";

    const crosshairStyle = {
      color: settings?.crosshair?.color || "#758696",
      width: settings?.crosshair?.width ?? 1,
      style: settings?.crosshair?.style ?? 1, // 0=Solid, 1=Dotted, 2=Dashed
      labelBackgroundColor: settings?.crosshair?.color || "#758696",
    };

    const chartOptions = {
      layout: { textColor, background: { type: 'solid', color: settings.bgColor || (settings.theme === 'light' ? '#ffffff' : 'rgb(0,0,7)') } },
      grid: { vertLines: { color: gridColor, style: 1, visible: true }, horzLines: { color: gridColor, style: 1, visible: true } },
      crosshair: {
        mode: CrosshairMode.Normal, // Always normal, we handle magnet manually
        vertLine: crosshairStyle,
        horzLine: crosshairStyle,
      },
      localization: { timeFormatter: fmt },
      timeScale: { timeVisible: !['1d', '1w'].includes(selectedPeriod), secondsVisible: false, tickMarkFormatter: fmt, rightBarStaysOnScroll: true, shiftVisibleRangeOnNewBar: false },
      rightPriceScale: { minimumWidth: 70, autoScale: true },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // YENİ WATERMARK KODU
    const wmVisible = settings?.watermark?.visible ?? true;
    const wmColorKey = settings?.watermark?.color ?? settings.textColor; // Metin rengini yedek olarak kullan
    const wmColorBase = COLOR_MAP[wmColorKey.toLowerCase()] ?? "#8C8C8C"; // Seçilen renge çevir
    const wmFontSize = settings?.watermark?.fontSize ?? 20;

    // Metin renginin %5 opacity'sini al, bu sayede arka plandan bağımsız olur
    const wmColor = hexToRgba(wmColorBase, 0.05);

    // Watermark ayarlarını uygula
    const symbolText = selectedCrypto?.binance_symbol || selectedCrypto?.symbol || '—';
    chart.applyOptions({
      watermark: {
        color: wmColor,
        visible: wmVisible,
        text: symbolText,
        fontSize: wmFontSize,
        horzAlign: 'center',
        vertAlign: 'center'
      }
    });


    const el = chartContainerRef.current; const cleanupFns = [];

    // Shared logic to update info panel
    const updateInfoPanelData = (logicalIndex) => {
      let index = Math.round(logicalIndex);
      if (index >= chartData.length) index = chartData.length - 1;
      if (index < 0) index = 0;

      const candle = chartData[index];
      if (!candle) return;

      const changeVal = candle.close - candle.open;
      const changePercent = (changeVal / candle.open) * 100;

      const indicatorValues = [];
      const panelIndicatorValues = [];
      const indicatorState = useIndicatorDataStore.getState().indicatorData || {};

      Object.entries(indicatorState).forEach(([indId, indObj]) => {
        Object.entries(indObj.subItems || {}).forEach(([subId, subItem]) => {
          if (subItem.visible === false) return;

          const results = subItem.result || [];
          results.forEach((res, rIdx) => {
            const point = res.data?.find(d => {
              const t = toUnixSecUTC(d[0]);
              return Math.abs(t - candle.time) < 1;
            });

            if (point) {
              let val = point[1];
              if (val && typeof val === 'object' && 'value' in val) val = val.value;
              if (typeof val === 'number') val = val.toFixed(2);

              const itemData = {
                name: `${indObj.name || indId} (${rIdx + 1})`,
                value: val,
                color: res.settings?.color || 'white'
              };

              if (res.on_graph) {
                indicatorValues.push(itemData);
              } else {
                panelIndicatorValues.push(itemData);
              }
            }
          });
        });
      });

      setInfoPanelData({
        candle,
        change: { value: changeVal, percent: changePercent },
        indicators: indicatorValues,
        panelIndicators: panelIndicatorValues
      });
    };

    if (el) {
      const onStart = () => markLeader(chartId); const onEnd = () => unmarkLeader(chartId);
      el.addEventListener('mousedown', onStart);
      el.addEventListener('wheel', onStart, { passive: false });
      el.addEventListener('touchstart', onStart, { passive: true });
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchend', onEnd);
      cleanupFns.push(() => {
        el.removeEventListener('mousedown', onStart);
        el.removeEventListener('wheel', onStart);
        el.removeEventListener('touchstart', onStart);
        window.removeEventListener('mouseup', onEnd);
        el.removeEventListener('mouseleave', onEnd);
        window.removeEventListener('touchend', onEnd);
      });

      // Double Click Handler
      const onDblClick = (param) => {
        if (!chartRef.current || chartData.length === 0) return;
        const rect = chartContainerRef.current.getBoundingClientRect();
        const x = param.clientX - rect.left;
        const timeScale = chart.timeScale();
        const logical = timeScale.coordinateToLogical(x);
        if (logical === null) return;

        updateInfoPanelData(logical);
      };

      el.addEventListener('dblclick', onDblClick);
      cleanupFns.push(() => el.removeEventListener('dblclick', onDblClick));

    }

    // === MAIN SERIES ===
    const mainSeries = buildMainSeries(chart, settings.series.type, settings, chartData);

    // Ruler tool
    const removeRuler = installRulerTool({ chart, series: mainSeries, container: chartContainerRef.current, isRulerModeRef: rulerModeRef, onComplete: toggleRulerMode, isMagnetModeRef });
    cleanupFns.push(() => { try { removeRuler?.(); } catch { } });

    // Cursor-centered zoom
    const removeWheelZoom = installCursorWheelZoom({ chart, chartId, selectedPeriod, containerEl: chartContainerRef.current, isApplyingRef, lastSeqAppliedRef });
    cleanupFns.push(removeWheelZoom);

    // timeScale
    const timeScale = chart.timeScale();

    // Center last bar (initial range) or restore
    if (lastVisibleRangeRef.current) {
      timeScale.setVisibleLogicalRange(lastVisibleRangeRef.current);
    } else {
      const barsToShow = 200; const rightPad = Math.floor((barsToShow - 1) / 2);
      const lastIndex = Math.max(0, chartData.length - 1); const to = lastIndex + rightPad; const from = to - (barsToShow - 1);
      timeScale.applyOptions({ rightOffset: rightPad });
      timeScale.setVisibleLogicalRange({ from, to });
      setLastRangeCache({ from, to, rightOffset: rightPad, sourceId: chartId });
    }

    // === STRATEGY MARKERS & VISIBILITY ===
    const strategyMarkersMap = new Map(); // Key: `${strategyId}-${subId}`

    Object.entries(strategyData).forEach(([strategyId, strategyInfo]) => {
      const subItems = strategyInfo?.subItems || {};
      Object.entries(subItems).forEach(([subId, sub]) => {
        const key = `${strategyId}-${subId}`;
        const markers = [];
        const result = sub?.strategy_result?.[0];
        if (!result?.data) return;

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
          markers.push(m);
        });
        strategyMarkersMap.set(key, markers);
      });
    });

    const updateStrategyMarkers = () => {
      const visibleMarkers = [];
      strategyMarkersMap.forEach((markers, key) => {
        if (!hiddenStrategyIdsRef.current.has(key)) {
          visibleMarkers.push(...markers);
        }
      });
      visibleMarkers.sort((a, b) => a.time - b.time);
      try { mainSeries.setMarkers(visibleMarkers); } catch { }
    };

    updateStrategyMarkers();

    // === STRATEGIES & INDICATORS ===
    const strategyLabelsContainer = document.getElementById("strategy-labels");
    if (strategyLabelsContainer) strategyLabelsContainer.innerHTML = "";
    Object.entries(strategyData).forEach(([strategyId, strategy]) => {
      const strategyName = strategy.name; const subItems = strategy.subItems || {};
      Object.entries(subItems).forEach(([subId, sub]) => {
        const labelId = `strategy-label-${strategyId}-${subId}`; if (document.getElementById(labelId)) return;
        const labelDiv = document.createElement('div');
        labelDiv.id = labelId;
        labelDiv.style.cssText = `
          pointer-events: none;
          background: rgba(30,30,30,0);
          color: ${labelColor};
          font-size: 12px;
          padding: 4px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 6px;
          border: 1px solid rgba(156,163,175,0.1);
        `;
        const title = document.createElement('span'); title.textContent = strategyName || `${strategyId} (${subId})`;

        // Visibility Button
        const visibilityBtn = document.createElement('button');
        visibilityBtn.style.cssText = `pointer-events:auto;background:none;border:none;color:${labelColor};cursor:pointer;`;
        const visibilityRoot = createRoot(visibilityBtn);
        const key = `${strategyId}-${subId}`;

        const updateVisIcon = () => {
          const isHidden = hiddenStrategyIdsRef.current.has(key);
          visibilityRoot.render(
            !isHidden ? <AiOutlineEye size={15} className="hover:text-gray-400" /> : <AiOutlineEyeInvisible size={15} className="text-gray-500 hover:text-gray-400" />
          );
          labelDiv.style.opacity = !isHidden ? "1" : "0.5";
        };
        updateVisIcon();

        visibilityBtn.onclick = () => {
          if (hiddenStrategyIdsRef.current.has(key)) {
            hiddenStrategyIdsRef.current.delete(key);
          } else {
            hiddenStrategyIdsRef.current.add(key);
          }
          updateVisIcon();
          updateStrategyMarkers();
        };
        visibilityBtn.onmouseenter = () => { isHoveringButtonsRef.current = true; };
        visibilityBtn.onmouseleave = () => { isHoveringButtonsRef.current = false; };

        const settingsBtn = document.createElement('button'); settingsBtn.style.cssText = `pointer-events:auto;background:none;border:none;color:${labelColor};cursor:pointer;`; settingsBtn.onclick = () => { setActiveStrategyId(strategyId); setActiveSubStrategyId(subId); setSettingsStrategyModalOpen(true); };
        settingsBtn.onmouseenter = () => { isHoveringButtonsRef.current = true; }; settingsBtn.onmouseleave = () => { isHoveringButtonsRef.current = false; };
        createRoot(settingsBtn).render(<RiSettingsLine size={13} className="hover:text-gray-400" />);
        const removeBtn = document.createElement('button'); removeBtn.style.cssText = `pointer-events:auto;background:none;border:none;color:${labelColor};cursor:pointer;`; removeBtn.onclick = () => { labelDiv.remove(); removeSubStrategy(strategyId, subId); };
        removeBtn.onmouseenter = () => { isHoveringButtonsRef.current = true; }; removeBtn.onmouseleave = () => { isHoveringButtonsRef.current = false; };
        createRoot(removeBtn).render(<AiOutlineClose size={13} className="hover:text-gray-400" />);
        labelDiv.appendChild(title); labelDiv.appendChild(visibilityBtn); labelDiv.appendChild(settingsBtn); labelDiv.appendChild(removeBtn);
        strategyLabelsContainer && strategyLabelsContainer.appendChild(labelDiv);
      });
    });

    // İndikatör container'ını hazırla (indikatörler ayrı useEffect'te işlenecek)
    const indicatorLabelsContainer = document.getElementById("indicator-labels");
    if (indicatorLabelsContainer) indicatorLabelsContainer.innerHTML = "";

    // Range sync
    timeScale.subscribeVisibleTimeRangeChange(() => {
      if (!isMountedRef.current || chartInstanceIdRef.current !== myInstanceId) return;
      if (isApplyingRef.current) return;
      if (!isLeader(chartId)) return;

      const logical = timeScale.getVisibleLogicalRange();
      if (!logical) return;
      let { from, to } = logical;
      const minBars = minBarsFor(selectedPeriod);

      if (to - from < minBars) {
        const c = (from + to) / 2;
        from = c - minBars / 2;
        to = c + minBars / 2;
        isApplyingRef.current = true;
        timeScale.setVisibleLogicalRange({ from, to });
        requestAnimationFrame(() => { isApplyingRef.current = false; });
      }

      const rightOffset = timeScale.getRightOffset ? timeScale.getRightOffset() : FUTURE_PADDING_BARS;

      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const seq = nextSeq();
      setLastRangeCache({ from, to, rightOffset, sourceId: chartId });
      rafRef.current = requestAnimationFrame(() => {
        if (!isMountedRef.current || chartInstanceIdRef.current !== myInstanceId) return;
        window.dispatchEvent(new CustomEvent(RANGE_EVENT, { detail: { from, to, rightOffset, sourceId: chartId, seq } }));
      });
    });


    const onRangeEvent = (e) => {
      if (!isMountedRef.current || chartInstanceIdRef.current !== myInstanceId) return;
      const { from, to, rightOffset, sourceId, seq } = (e && e.detail) || {};
      if (sourceId === chartId) return;
      if (seq && seq <= lastSeqAppliedRef.current) return;

      lastSeqAppliedRef.current = seq;
      isApplyingRef.current = true;
      if (rightOffset != null) timeScale.applyOptions({ rightOffset });
      timeScale.setVisibleLogicalRange({ from, to });
      requestAnimationFrame(() => { isApplyingRef.current = false; });
    };

    window.addEventListener(RANGE_EVENT, onRangeEvent);

    // Crosshair sync
    chart.subscribeCrosshairMove((param) => {
      // 1) Custom Magnet Logic (if enabled)
      if (isMagnetModeRef.current && param.time && param.point && priceSeriesRef.current) {
        const data = param.seriesData.get(priceSeriesRef.current);
        if (data && (data.open !== undefined)) {
          // It's an OHLC-like data (Candlestick/Bar)
          // We need to find closer price
          const priceY = priceSeriesRef.current.coordinateToPrice(param.point.y);
          if (typeof priceY === 'number') {
            const { open, high, low, close } = data;
            const candidates = [open, high, low, close];
            // Find closest
            let closest = close;
            let minDiff = Math.abs(priceY - close);

            for (const c of candidates) {
              const diff = Math.abs(priceY - c);
              if (diff < minDiff) {
                minDiff = diff;
                closest = c;
              }
            }
            // Snap
            chart.setCrosshairPosition(closest, param.time, priceSeriesRef.current);
          }
        } else if (data && typeof data.value === 'number') {
          // Line/Area etc. -> Snap to value
          chart.setCrosshairPosition(data.value, param.time, priceSeriesRef.current);
        }
      }

      // 2) Dynamic Info Panel Update
      if (infoPanelActiveRef.current && param.point) {
        const logical = chart.timeScale().coordinateToLogical(param.point.x);
        if (logical !== null) {
          updateInfoPanelData(logical);
        }
      }

      if (!isMountedRef.current || chartInstanceIdRef.current !== myInstanceId) return;

      // Update local labels
      if (param.time) {
        if (clearTimerRef.current) { clearTimeout(clearTimerRef.current); clearTimerRef.current = null; }
        param.seriesData.forEach((value, series) => {
          const entry = seriesLabelMapRef.current.get(series);
          if (entry && entry.span) {
            // value obje olabilir {value: ...} falan ? lightweight-charts version?
            // Genelde value directly number or {value, ...} depending on series type
            // Line/Area/Histogram -> value is number
            // Candlestick -> value is {open, high, low, close}
            // Indicator series are mostly line/hist/area.
            let v = value;
            if (v && typeof v === 'object' && 'value' in v) v = v.value;
            if (typeof v === 'number') {
              entry.span.textContent = v.toFixed(2); // TODO: Dynamic precision?
            } else {
              entry.span.textContent = "";
            }
          }
        });
      } else {
        // Debounce clear to prevent flicker on button hover
        if (!clearTimerRef.current) {
          clearTimerRef.current = setTimeout(() => {
            if (!isHoveringButtonsRef.current) {
              seriesLabelMapRef.current.forEach(({ span }) => { if (span) span.textContent = ""; });
            }
            clearTimerRef.current = null;
          }, 100);
        }
      }

      if (!param.time) {
        window.dispatchEvent(new CustomEvent(CROSSHAIR_EVENT, { detail: { time: null, sourceId: chartId } }));
        return;
      }
      window.dispatchEvent(new CustomEvent(CROSSHAIR_EVENT, { detail: { time: param.time, sourceId: chartId } }));
    });

    const onCrosshairCode = (e) => {
      if (!isMountedRef.current || chartInstanceIdRef.current !== myInstanceId) return;
      const { time, sourceId } = (e && e.detail) || {};
      if (sourceId === chartId) return;

      // Sync Labels for external crosshair
      if (time !== null && time !== undefined) {
        seriesLabelMapRef.current.forEach(({ span, dataMap }) => {
          if (span && dataMap) {
            const val = dataMap.get(time);
            if (val !== undefined) {
              span.textContent = Number(val).toFixed(2);
            } else {
              span.textContent = "";
            }
          }
        });
      } else {
        if (!isHoveringButtonsRef.current) {
          seriesLabelMapRef.current.forEach(({ span }) => { if (span) span.textContent = ""; });
        }
      }

      if (time === null) {
        chart.clearCrosshairPosition();
        return;
      }
      // Sadece dikey (zaman) crosshair'i güncellemek istiyoruz
      // Fiyat (NaN) verirsek yatay çizgi görünmeyebilir ya da etkisiz olur
      if (chartData.length > 0) {
        chart.setCrosshairPosition(NaN, time, mainSeries);
      }
    };
    window.addEventListener(CROSSHAIR_EVENT, onCrosshairCode);

    const onRangeRequest = () => {
      if (!isMountedRef.current || chartInstanceIdRef.current !== myInstanceId) return;
      const payload = getLastRangeCache();
      if (!payload) return;
      const seq = nextSeq();
      window.dispatchEvent(new CustomEvent(RANGE_EVENT, { detail: { ...payload, seq } }));
    };
    window.addEventListener(RANGE_REQUEST_EVENT, onRangeRequest);

    const resizeObserver = new ResizeObserver(() => {
      if (!isMountedRef.current || chartInstanceIdRef.current !== myInstanceId) return;
      if (!chartContainerRef.current) return;
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    });
    resizeObserver.observe(chartContainerRef.current);

    // cleanup
    return () => {
      // bekleyen RAF varsa iptal
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }

      resizeObserver.disconnect();
      window.removeEventListener(RANGE_EVENT, onRangeEvent);
      window.removeEventListener(RANGE_REQUEST_EVENT, onRangeRequest);
      window.removeEventListener(CROSSHAIR_EVENT, onCrosshairCode);

      // helper'ların cleanup'ı
      cleanupFns.forEach(fn => { try { fn?.(); } catch { } });

      // en sonda chart'ı güvenle sök
      try {
        if (chartRef.current) {
          // Range'i sakla
          lastVisibleRangeRef.current = chartRef.current.timeScale().getVisibleLogicalRange();
          chartRef.current.remove();
        }
      } catch { }
      chartRef.current = null;
      priceSeriesRef.current = null;
      // Indikator reflerini temizle
      indicatorSeriesMapRef.current.clear();
      seriesLabelMapRef.current.clear();
    };
  }, [chartData, strategyData, selectedPeriod, settings]);

  // === AYRI useEffect: İndikatörleri chart'ı yeniden oluşturmadan güncelle ===
  useEffect(() => {
    if (isLoading) return;
    if (!chartRef.current || !priceSeriesRef.current) return;
    const chart = chartRef.current;

    const indicatorLabelsContainer = document.getElementById("indicator-labels");
    if (!indicatorLabelsContainer) return;

    // Mevcut indikatör setini bul
    const currentIndicatorKeys = new Set();
    Object.entries(indicatorData).forEach(([indicatorId, indicator]) => {
      const subItems = indicator.subItems || {};
      Object.entries(subItems).forEach(([subId, indicatorInfo]) => {
        if (!indicatorInfo?.result || !Array.isArray(indicatorInfo?.result)) return;
        indicatorInfo.result.filter((item) => item.on_graph === true).forEach((_, rIdx) => {
          currentIndicatorKeys.add(`${indicatorId}-${subId}-${rIdx}`);
        });
      });
    });

    // Silinmesi gereken serileri bul ve kaldır
    indicatorSeriesMapRef.current.forEach((entry, key) => {
      if (!currentIndicatorKeys.has(key)) {
        try {
          entry.series.setData([]);
          chart.removeSeries(entry.series);
        } catch { }
        if (entry.labelDiv && entry.labelDiv.parentNode) {
          entry.labelDiv.remove();
        }
        indicatorSeriesMapRef.current.delete(key);
        seriesLabelMapRef.current.delete(entry.series);
      }
    });

    // --- Containers for grouping ---
    let visibleList = indicatorLabelsContainer.querySelector('.indicator-visible-list');
    let hiddenList = indicatorLabelsContainer.querySelector('.indicator-hidden-list');
    let toggleBtn = indicatorLabelsContainer.querySelector('.indicator-toggle-btn');

    if (!visibleList) {
      visibleList = document.createElement("div");
      visibleList.className = "indicator-visible-list";
      visibleList.style.cssText = "display: flex; flex-direction: column; gap: 4px; width: 100%; align-items: flex-start;";
      indicatorLabelsContainer.appendChild(visibleList);
    }

    if (!toggleBtn) {
      toggleBtn = document.createElement("button");
      toggleBtn.className = "indicator-toggle-btn";
      toggleBtn.style.cssText = `
         pointer-events: auto;
         background: rgba(30,30,30,0);
         color: ${settings.labelColor || "white"};
         font-size: 12px;
         padding: 4px;
         border-radius: 4px;
         border: 1px solid rgba(156,163,175,0.1);
         cursor: pointer;
         display: none; 
         align-items: center;
         justify-content: center;
         width: 40px; 
         align-self: flex-start;
         margin-left: 2px;
      `;
      const toggleRoot = createRoot(toggleBtn);
      toggleBtn._toggleRoot = toggleRoot;
      toggleBtn.onclick = () => {
        isIndicatorsCollapsedRef.current = !isIndicatorsCollapsedRef.current;
        updateIndicatorToggleUI();
      };
      indicatorLabelsContainer.appendChild(toggleBtn);
    }

    if (!hiddenList) {
      hiddenList = document.createElement("div");
      hiddenList.className = "indicator-hidden-list";
      hiddenList.style.cssText = "display: flex; flex-direction: column; gap: 4px; width: 100%; align-items: flex-start;";
      hiddenList.style.display = isIndicatorsCollapsedRef.current ? "none" : "flex";
      indicatorLabelsContainer.appendChild(hiddenList);
    }

    const updateIndicatorToggleUI = () => {
      const hasHidden = hiddenList.children.length > 0;
      toggleBtn.style.display = hasHidden ? "flex" : "none";
      const isCollapsed = isIndicatorsCollapsedRef.current;
      hiddenList.style.display = (hasHidden && !isCollapsed) ? "flex" : "none";

      if (toggleBtn._toggleRoot) {
        toggleBtn._toggleRoot.render(
          isCollapsed
            ? <FaChevronDown size={10} className="hover:text-gray-400" />
            : <FaChevronUp size={10} className="hover:text-gray-400" />
        );
      }
    };

    // İndikatörleri işle
    Object.entries(indicatorData).forEach(([indicatorId, indicator]) => {
      const indicatorName = indicator.name;
      const subItems = indicator.subItems || {};
      Object.entries(subItems).forEach(([subId, indicatorInfo]) => {
        if (!indicatorInfo?.result || !Array.isArray(indicatorInfo?.result)) return;
        const isVisible = indicatorInfo.visible !== false;

        indicatorInfo.result.filter((item) => item.on_graph === true).forEach((indicatorResult, rIdx) => {
          const key = `${indicatorId}-${subId}-${rIdx}`;
          const { type, settings: s, data } = indicatorResult;

          // Data hazırla
          const timeValueMap = new Map();
          data.forEach(([time, value]) => {
            if (value === undefined) return;
            const unixTime = toUnixSecUTC(time);
            if (unixTime !== undefined) timeValueMap.set(unixTime, value);
          });
          const formattedData = Array.from(timeValueMap.entries())
            .sort(([a], [b]) => a - b)
            .map(([time, value]) => ({ time, value }));

          // Mevcut seri var mı kontrol et
          let entry = indicatorSeriesMapRef.current.get(key);

          if (!entry) {
            // Yeni seri oluştur
            let series;
            switch (type) {
              case 'line': series = chart.addLineSeries({ color: s?.color || 'yellow', lineWidth: s?.width || 2, lastValueVisible: false, priceLineVisible: false, visible: isVisible, crosshairMarkerVisible: false }); break;
              case 'area': series = chart.addAreaSeries({ topColor: s?.color || 'rgba(33,150,243,0.5)', bottomColor: 'rgba(33,150,243,0.1)', lineColor: s?.color || 'blue', lastValueVisible: false, priceLineVisible: false, visible: isVisible, crosshairMarkerVisible: false }); break;
              case 'histogram': { const c = s?.color ?? '0, 128, 0'; const opacity = s?.opacity ?? 0.3; series = chart.addHistogramSeries({ color: `rgba(${c}, ${opacity})`, lastValueVisible: false, priceLineVisible: false, visible: isVisible }); break; }
              default: series = chart.addLineSeries({ color: 'white', lineWidth: 2, lastValueVisible: false, priceLineVisible: false, visible: isVisible, crosshairMarkerVisible: false });
            }
            series.setData(formattedData);

            // Label UI oluştur
            const labelId = `indicator-label-${indicatorId}-${subId}`;
            let labelDiv = document.getElementById(labelId);
            let valuesContainer;

            if (!labelDiv) {
              labelDiv = document.createElement("div");
              labelDiv.id = labelId;
              labelDiv.style.cssText = `
                pointer-events: none;
                background: rgba(30,30,30,0);
                color: ${settings.labelColor || "white"};
                font-size: 12px;
                padding: 4px 8px;
                border-radius: 4px;
                display: flex;
                align-items: center;
                gap: 6px;
                border: 1px solid rgba(156,163,175,0.1);
              `;
              const title = document.createElement("span");
              title.textContent = indicatorName || `${indicatorId} (${subId})`;

              valuesContainer = document.createElement("div");
              valuesContainer.id = `indicator-values-${indicatorId}-${subId}`;
              valuesContainer.style.display = "flex";
              valuesContainer.style.gap = "8px";

              const settingsBtn = document.createElement("button");
              createRoot(settingsBtn).render(<RiSettingsLine size={13} className="hover:text-gray-400" />);
              settingsBtn.style.cssText = `pointer-events:auto;background:none;border:none;color:${settings.labelColor || "white"};cursor:pointer;`;
              settingsBtn.onclick = () => { setActiveIndicatorId(indicatorId); setActiveSubIndicatorId(subId); setSettingsIndicatorModalOpen(true); };
              settingsBtn.onmouseenter = () => { isHoveringButtonsRef.current = true; };
              settingsBtn.onmouseleave = () => { isHoveringButtonsRef.current = false; };

              const removeBtn = document.createElement("button");
              createRoot(removeBtn).render(<AiOutlineClose size={13} className="hover:text-gray-400" />);
              removeBtn.style.cssText = `pointer-events:auto;background:none;border:none;color:${settings.labelColor || "white"};cursor:pointer;`;
              removeBtn.onclick = () => {
                // Bu indikatörün tüm serilerini bul ve kaldır
                indicatorSeriesMapRef.current.forEach((e, k) => {
                  if (k.startsWith(`${indicatorId}-${subId}-`)) {
                    try {
                      e.series.setData([]);
                      chart.removeSeries(e.series);
                    } catch { }
                    indicatorSeriesMapRef.current.delete(k);
                    seriesLabelMapRef.current.delete(e.series);
                  }
                });
                labelDiv.remove();
                removeSubIndicator(indicatorId, subId);
              };
              removeBtn.onmouseenter = () => { isHoveringButtonsRef.current = true; };
              removeBtn.onmouseleave = () => { isHoveringButtonsRef.current = false; };

              labelDiv._seriesList = [];

              const visibilityBtn = document.createElement("button");
              visibilityBtn.style.cssText = `pointer-events:auto;background:none;border:none;color:${settings.labelColor || "white"};cursor:pointer;`;
              const visibilityRoot = createRoot(visibilityBtn);
              labelDiv._visibilityRoot = visibilityRoot;

              const updateVisibilityIcon = (vis) => {
                visibilityRoot.render(
                  vis ? <AiOutlineEye size={15} className="hover:text-gray-400" /> : <AiOutlineEyeInvisible size={15} className="text-gray-500 hover:text-gray-400" />
                );
                labelDiv.style.opacity = vis ? "1" : "0.5";
                if (valuesContainer) valuesContainer.style.display = vis ? "flex" : "none";
              };
              labelDiv._updateVisibilityIcon = updateVisibilityIcon;
              updateVisibilityIcon(isVisible);

              visibilityBtn.onclick = () => {
                toggleSubIndicatorVisibility(indicatorId, subId);
              };
              visibilityBtn.onmouseenter = () => { isHoveringButtonsRef.current = true; };
              visibilityBtn.onmouseleave = () => { isHoveringButtonsRef.current = false; };

              labelDiv.appendChild(title);
              labelDiv.appendChild(valuesContainer);
              labelDiv.appendChild(visibilityBtn);
              labelDiv.appendChild(settingsBtn);
              labelDiv.appendChild(removeBtn);

              if (isVisible) {
                visibleList.appendChild(labelDiv);
              } else {
                hiddenList.appendChild(labelDiv);
              }
            } else {
              valuesContainer = document.getElementById(`indicator-values-${indicatorId}-${subId}`);
            }

            if (labelDiv._seriesList) {
              labelDiv._seriesList.push(series);
            }

            // Value Span
            const valueSpan = document.createElement("span");
            valueSpan.style.cssText = `color: ${s?.color || 'white'}; font-variant-numeric: tabular-nums;`;
            valueSpan.textContent = "";

            if (valuesContainer) {
              valuesContainer.appendChild(valueSpan);
            }

            entry = { series, labelDiv, valueSpan, dataMap: timeValueMap };
            indicatorSeriesMapRef.current.set(key, entry);
            seriesLabelMapRef.current.set(series, { span: valueSpan, dataMap: timeValueMap });

          } else {
            // Mevcut seri var, görünürlüğü, datayı VE stil ayarlarını güncelle
            let options = { visible: isVisible };

            switch (type) {
              case 'line':
                options.color = s?.color || 'yellow';
                options.lineWidth = s?.width || 2;
                break;
              case 'area':
                options.topColor = s?.color || 'rgba(33,150,243,0.5)';
                options.lineColor = s?.color || 'blue';
                // bottomColor sabit kalıyor veya s'de varsa eklenebilir
                break;
              case 'histogram': {
                const c = s?.color ?? '0, 128, 0';
                const opacity = s?.opacity ?? 0.3;
                options.color = `rgba(${c}, ${opacity})`;
                break;
              }
              default:
                // varsayılan line
                break;
            }

            entry.series.applyOptions(options);
            entry.series.setData(formattedData);
            entry.dataMap = timeValueMap;

            // Update label color dynamically
            if (entry.valueSpan) {
              entry.valueSpan.style.color = s?.color || 'white';
            }

            // Label görünürlüğünü güncelle
            if (entry.labelDiv) {
              if (entry.labelDiv._updateVisibilityIcon) {
                entry.labelDiv._updateVisibilityIcon(isVisible);
              }

              // Doğru listeye taşı
              const currentParent = entry.labelDiv.parentNode;
              if (isVisible && currentParent !== visibleList) {
                visibleList.appendChild(entry.labelDiv);
              } else if (!isVisible && currentParent !== hiddenList) {
                hiddenList.appendChild(entry.labelDiv);
              }
            }

            // Label için tüm serilerin görünürlüğünü güncelle
            if (entry.labelDiv?._seriesList) {
              entry.labelDiv._seriesList.forEach(s => s.applyOptions({ visible: isVisible }));
            }

            // seriesLabelMapRef'i güncelle
            seriesLabelMapRef.current.set(entry.series, { span: entry.valueSpan, dataMap: timeValueMap });
          }
        });
      });
    });

    updateIndicatorToggleUI();

  }, [indicatorData, isLoading, chartData, strategyData, selectedPeriod, settings]);

  // 🔽 YENİ: Ruler mode veya settings değişince crosshair güncelle
  useEffect(() => {
    if (!chartRef.current) return;

    let chStyle;
    if (isRulerMode) {
      chStyle = {
        color: "rgb(5,50,90)",
        width: 1,
        style: 1, // Dotted
        labelBackgroundColor: "rgb(5,50,90)",
      };
    } else {
      chStyle = {
        color: settings?.crosshair?.color || "#758696",
        width: settings?.crosshair?.width ?? 1,
        style: settings?.crosshair?.style ?? 1,
        labelBackgroundColor: settings?.crosshair?.color || "#758696",
      };
    }

    chartRef.current.applyOptions({
      crosshair: {
        vertLine: chStyle,
        horzLine: chStyle,
      },
    });
  }, [isRulerMode, settings]);

  return (
    <div className="relative w-full h-full">
      <div id="indicator-labels" className="absolute top-2 left-2 z-10 flex flex-col gap-1 pointer-events-none items-start"></div>
      <div id="strategy-labels" style={{ position: 'absolute', top: 10, right: 80, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '6px', pointerEvents: 'none', alignItems: 'flex-end' }}></div>
      <div ref={chartContainerRef} className={`absolute top-0 left-0 w-full h-full ${settings.cursorType === 'crosshair' ? 'cursor-crosshair' : settings.cursorType === 'dot' ? 'cursor-dot' : ''}`}></div>

      <IndicatorSettingsModal isOpen={settingsIndicatorModalOpen} onClose={() => setSettingsIndicatorModalOpen(false)} indicatorId={activeIndicatorId} subId={activeSubIndicatorId} />
      <StrategySettingsModal isOpen={settingsStrategyModalOpen} onClose={() => setSettingsStrategyModalOpen(false)} strategyId={activeStrategyId} subId={activeSubStrategyId} />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: settings.bgColor || (settings.theme === 'light' ? '#ffffff' : 'rgb(0,0,7)'),
              opacity: 0.85
            }}
          />
          <div className="relative z-10">
            <CandleLoader />
          </div>
        </div>
      )}

      {/* Info Panel Overlay */}
      {infoPanelData && (
        <div className="absolute bottom-10 right-20 z-20 bg-[#1e1e1e] border border-gray-700 rounded p-4 shadow-lg text-xs text-gray-200 min-w-[200px]"
          onClick={(e) => e.stopPropagation()} // Prevent clicks from bubbling if needed
        >
          <div className="flex justify-between items-center mb-2 border-b border-gray-700 pb-1">
            <span className="font-bold text-sm">Bar Info</span>
            <button onClick={() => setInfoPanelData(null)} className="hover:text-white">
              <AiOutlineClose size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-3">
            <div className="text-gray-400">Time:</div>
            <div className="text-right">{new Date(infoPanelData.candle.time * 1000).toLocaleDateString()} {new Date(infoPanelData.candle.time * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>

            <div className="text-gray-400">Open:</div>
            <div className="text-right text-[#2196F3]">{infoPanelData.candle.open.toFixed(2)}</div>

            <div className="text-gray-400">High:</div>
            <div className="text-right text-[#4CAF50]">{infoPanelData.candle.high.toFixed(2)}</div>

            <div className="text-gray-400">Low:</div>
            <div className="text-right text-[#F44336]">{infoPanelData.candle.low.toFixed(2)}</div>

            <div className="text-gray-400">Close:</div>
            <div className="text-right text-[#FF9800]">{infoPanelData.candle.close.toFixed(2)}</div>

            <div className="text-gray-400">Change:</div>
            <div className={`text-right ${infoPanelData.change.value >= 0 ? 'text-[#0ECB81]' : 'text-[#F23645]'}`}>
              {infoPanelData.change.value.toFixed(2)} ({infoPanelData.change.percent.toFixed(2)}%)
            </div>
          </div>

          {infoPanelData.indicators.length > 0 && (
            <>
              <div className="border-t border-gray-700 pt-1 mb-1 font-semibold text-gray-300">Indicators</div>
              <div className="flex flex-col gap-1">
                {infoPanelData.indicators.map((ind, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-gray-400">{ind.name}:</span>
                    <span style={{ color: ind.color }}>{ind.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {infoPanelData.panelIndicators && infoPanelData.panelIndicators.length > 0 && (
            <>
              <div className="border-t border-gray-700 pt-1 mt-2 mb-1 font-semibold text-gray-300">Panel Indicators</div>
              <div className="flex flex-col gap-1">
                {infoPanelData.panelIndicators.map((ind, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span className="text-gray-400">{ind.name}:</span>
                    <span style={{ color: ind.color }}>{ind.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
