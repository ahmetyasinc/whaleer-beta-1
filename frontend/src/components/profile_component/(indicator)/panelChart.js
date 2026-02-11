// src/components/chart/PanelChart.jsx
"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, CrosshairMode } from "lightweight-charts";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import IndicatorSettingsModal from "./(modal_tabs)/indicatorSettingsModal";
import { RiSettingsLine } from "react-icons/ri";
import { AiOutlineClose, AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
import PropTypes from "prop-types";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import { installCursorWheelZoom } from "@/utils/cursorCoom";
import {
  RANGE_EVENT,
  RANGE_REQUEST_EVENT,
  CROSSHAIR_EVENT,
  nextSeq,
  markLeader,
  unmarkLeader,
  isLeader,
  minBarsFor,
  FUTURE_PADDING_BARS,
  getLastRangeCache,
} from "@/utils/chartSync";
// 🔽 YENİ: settings’i içeri al
import { useChartSettingsStore } from "@/store/indicator/chartSettingsStore";

function hexToRgba(hex, opacity) {
  hex = hex.replace("#", "");
  if (hex.length !== 6) return "rgba(0,0,0,1)";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function PanelChart({ indicatorName, indicatorId, subId }) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const pad = (n) => String(n).padStart(2, "0");

  function timeToUTCDate(t) {
    if (t && typeof t === "object" && "year" in t && "month" in t && "day" in t) {
      return new Date(Date.UTC(t.year, t.month - 1, t.day, 0, 0, 0));
    }
    return new Date((typeof t === "number" ? t : 0) * 1000);
  }

  function makeUTCFormatter(period) {
    const isMins = ["1m", "3m", "5m", "15m", "30m"].includes(period);
    const isHours = ["1h", "2h", "4h"].includes(period);
    const isDays = ["1d"].includes(period);
    const isWeeks = ["1w"].includes(period);
    return (t) => {
      const d = timeToUTCDate(t);
      const Y = d.getUTCFullYear();
      const M = pad(d.getUTCMonth() + 1);
      const D = pad(d.getUTCDate());
      const h = pad(d.getUTCHours());
      const m = pad(d.getUTCMinutes());
      if (isMins) return `${D}.${M} ${h}:${m}`;
      if (isHours) return `${D}.${M} ${h}:00`;
      if (isDays) return `${D}.${M}.${Y}`;
      if (isWeeks) return `${D}.${M}.${Y}`;
      return `${D}.${M} ${h}:${m}`;
    };
  }

  // ---- Cookie & timezone helpers ----
  function getCookie(name) {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.split('; ').find(row => row.startsWith(name + '='));
    return m ? decodeURIComponent(m.split('=')[1]) : null;
  }
  function parseGmtToMinutes(tzStr) {
    const m = /^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec((tzStr || '').trim());
    if (!m) return 0;
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
    const isMins = ["1m", "3m", "5m", "15m", "30m"].includes(period);
    const isHours = ["1h", "2h", "4h"].includes(period);
    const isDays = period === "1d";
    const isWeeks = period === "1w";
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

  const { selectedPeriod } = useCryptoStore();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const { indicatorData, removeSubIndicator, toggleSubIndicatorVisibility } = useIndicatorDataStore();

  const [displayName, setDisplayName] = useState(`${indicatorId} (${subId})`);
  const [tzOffsetMin, setTzOffsetMin] = useState(0);

  // 🔽 YENİ: settings’i al
  const { settings } = useChartSettingsStore();

  // ==== Senkronizasyon guard & ID ====
  const chartId = `${indicatorId}-${subId}`;
  const isApplyingRef = useRef(false);
  const lastSeqAppliedRef = useRef(0);
  const isHoveringButtonsRef = useRef(false); // Track hover state
  const clearTimerRef = useRef(null); // Debounce clear
  let rafHandle = null;

  // 🔽 YENİ: timezone cookie'sini settings değişince de yeniden oku (main ile aynı davranış)
  useEffect(() => {
    setTzOffsetMin(readTimezoneOffsetMinutesFromCookie());
  }, [settings.timezoneMode, settings.timezoneFixed]);

  // formatter’ı settings’e bağlı hale getir
  const fmt = makeZonedFormatter(selectedPeriod, tzOffsetMin);

  const priceFmt = (p) => {
    if (Math.abs(p) >= 100000) return (p / 1000).toFixed(0) + "k";
    return p.toFixed(2);
  };

  // Series -> { span: HTMLElement, data: Map<time, value> } mapping
  const seriesLabelMapRef = useRef(new Map());

  useEffect(() => {
    const indicatorInfo = indicatorData?.[indicatorId]?.subItems?.[subId];
    if (!chartContainerRef.current || !indicatorInfo?.result) return;

    const isVisible = indicatorInfo.visible ?? true;

    const { result } = indicatorInfo;
    const firstNonGraphItem = result.find((r) => r.on_graph === false);
    if (firstNonGraphItem?.name) setDisplayName(firstNonGraphItem.name);

    // 🔽 YENİ: main chart’taki görsel ayarları kullan
    const textColor = settings.textColor === "black" ? "#8C8C8C" : "#8C8C8C";
    const gridColor = settings?.grid?.color || "#111111";
    const bgColor = settings.bgColor || (settings.theme === 'light' ? '#ffffff' : 'rgb(0,0,7)');

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { color: bgColor }, textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      lastValueVisible: false,
      localization: { timeFormatter: fmt, priceFormatter: priceFmt },
      timeScale: {
        rightBarStaysOnScroll: true,
        shiftVisibleRangeOnNewBar: false,
        timeVisible: !["1d", "1w"].includes(selectedPeriod),
        secondsVisible: false,
        tickMarkFormatter: fmt,
      },
      rightPriceScale: { minimumWidth: 70, autoScale: true },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: settings?.crosshair?.color || "#758696",
          width: settings?.crosshair?.width ?? 1,
          style: settings?.crosshair?.style ?? 1,
          labelBackgroundColor: settings?.crosshair?.color || "#758696",
        },
        horzLine: {
          color: settings?.crosshair?.color || "#758696",
          width: settings?.crosshair?.width ?? 1,
          style: settings?.crosshair?.style ?? 1,
          labelBackgroundColor: settings?.crosshair?.color || "#758696",
        },
      },
    });

    chartRef.current = chart;

    // Lider işaretleme
    const el = chartContainerRef.current;
    const cleanupFns = [];
    if (el) {
      const onStart = () => markLeader(chartId);
      const onEnd = () => unmarkLeader(chartId);
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

    const timeScale = chart.timeScale();
    timeScale.applyOptions({ rightOffset: FUTURE_PADDING_BARS });

    // Seriler (mevcut mantığa dokunmuyoruz)
    let firstSeries = null;
    seriesLabelMapRef.current.clear(); // Ensure map is empty before repopulating
    result
      .filter((item) => item?.on_graph === false)
      .forEach(({ type, settings: s, data }) => {
        let series;
        switch (type) {
          case "line":
            series = chart.addLineSeries({ color: s?.color || "white", lineWidth: s?.width || 1, priceLineVisible: false, lastValueVisible: false, visible: isVisible, crosshairMarkerVisible: false });
            break;
          case "histogram": {
            const defaultColor = s?.color ?? "0, 128, 0";
            const opacity = s?.opacity ?? 1;
            const colorString = defaultColor.includes(",") ? `rgba(${defaultColor}, ${opacity})` : hexToRgba(defaultColor, opacity);
            series = chart.addHistogramSeries({ color: colorString, priceLineVisible: false, lastValueVisible: false, visible: isVisible, crosshairMarkerVisible: false });
            break;
          }
          case "area":
            series = chart.addAreaSeries({
              topColor: s?.color || "rgba(33, 150, 243, 0.5)",
              bottomColor: "rgba(33, 150, 243, 0.1)",
              lineColor: s?.color || "blue",
              priceLineVisible: false,
              lastValueVisible: false,
              visible: isVisible,
              crosshairMarkerVisible: false,
            });
            break;
          default:
            series = chart.addLineSeries({ color: "white", lineWidth: 2, priceLineVisible: false, lastValueVisible: false, visible: isVisible, crosshairMarkerVisible: false });
        }
        const timeValueMap = new Map();
        data.forEach(([time, value]) => {
          if (value === undefined) return;
          let ms;
          if (typeof time === "number") {
            ms = time > 1e12 ? time : time * 1000;
          } else if (typeof time === "string") {
            const iso = /Z$/.test(time) ? time : time + "Z";
            ms = Date.parse(iso);
          } else {
            return;
          }
          const unixTime = Math.floor(ms / 1000);
          timeValueMap.set(unixTime, value);
        });
        if (!firstSeries) firstSeries = series;
        const formattedData = Array.from(timeValueMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([time, value]) => ({ time, value }));
        series.setData(formattedData);

        // --- Label & Span Creation (same logic, adapted for PanelChart single label container) ---
        // PanelChart header is outside loop (top-2 left-2). 
        // We need to APPEND to that container. 
        // Note: PanelChart currently has a single hardcoded title in return JSX.
        // We should move that title logic here to be dynamic OR append next to it.
        // Let's modify the JSX part later to be empty ref, and build it here.
        // OR better: Append spans to a ref container.

        // Actually, PanelChart handles multiple series in one chart (e.g. MACD has histogram and 2 lines).
        // They all share the same "indicatorName".
        // It's better to add the values next to the name.

        seriesLabelMapRef.current.set(series, { color: s?.color || (series.options ? series.options().color : 'white'), dataMap: timeValueMap });
      });

    chart.timeScale().fitContent();

    const applyRangeSilently = (range) => {
      if (!range) return;
      const { from, to, rightOffset } = range;
      isApplyingRef.current = true;
      if (rightOffset != null) timeScale.applyOptions({ rightOffset });
      timeScale.setVisibleLogicalRange({ from, to });
      requestAnimationFrame(() => { isApplyingRef.current = false; });
    };

    const cached = getLastRangeCache();
    if (cached) {
      applyRangeSilently(cached);
    } else {
      const oneShot = (e) => {
        const { sourceId } = (e && e.detail) || {};
        if (sourceId === 'main-chart') {
          window.removeEventListener(RANGE_EVENT, oneShot);
          applyRangeSilently(e.detail);
        }
      };
      window.addEventListener(RANGE_EVENT, oneShot);
      window.dispatchEvent(new CustomEvent(RANGE_REQUEST_EVENT));
      setTimeout(() => {
        try { window.removeEventListener(RANGE_EVENT, oneShot); } catch (_) { }
        let dataLen = 0;
        try {
          const firstNonGraph = (indicatorInfo?.result || []).find(r => r.on_graph === false);
          if (firstNonGraph && Array.isArray(firstNonGraph.data)) {
            dataLen = firstNonGraph.data.length;
          }
        } catch (_) { }
        const barsToShow = 5;
        const rightPad = Math.floor((barsToShow - 1) / 2);
        const lastIndex = Math.max(0, dataLen - 1);
        const to = lastIndex + rightPad;
        const from = to - (barsToShow - 1);
        applyRangeSilently({ from, to, rightOffset: rightPad });
      }, 150);
    }

    const removeWheelZoom = installCursorWheelZoom({
      chart,
      chartId,
      selectedPeriod,
      containerEl: chartContainerRef.current,
      isApplyingRef,
      lastSeqAppliedRef,
    });
    cleanupFns.push(removeWheelZoom);

    // Zaman sink – yayın
    timeScale.subscribeVisibleTimeRangeChange(() => {
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
      if (rafHandle) cancelAnimationFrame(rafHandle);
      const seq = nextSeq();
      rafHandle = requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent(RANGE_EVENT, { detail: { from, to, rightOffset, sourceId: chartId, seq } }));
      });
    });

    // Zaman sink – dinle
    const onRangeEvent = (e) => {
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

    // Crosshair Sync
    chart.subscribeCrosshairMove((param) => {
      // Update values
      const container = document.getElementById(`panel-values-${indicatorId}-${subId}`);
      if (container) {
        if (param.time) {
          if (clearTimerRef.current) { clearTimeout(clearTimerRef.current); clearTimerRef.current = null; }
          const fragment = document.createDocumentFragment();
          param.seriesData.forEach((value, series) => {
            const info = seriesLabelMapRef.current.get(series);
            if (info) {
              let v = value;
              if (v && typeof v === 'object' && 'value' in v) v = v.value;
              if (typeof v === 'number') {
                const sp = document.createElement('span');
                sp.style.color = info.color;
                sp.style.marginLeft = '8px';
                sp.textContent = v.toFixed(2);
                fragment.appendChild(sp);
              }
            }
          });
          container.innerHTML = '';
          container.appendChild(fragment);
        } else {
          if (!clearTimerRef.current) {
            clearTimerRef.current = setTimeout(() => {
              if (!isHoveringButtonsRef.current && container) {
                container.innerHTML = '';
              }
              clearTimerRef.current = null;
            }, 100);
          }
        }
      }

      if (!param.time) {
        window.dispatchEvent(new CustomEvent(CROSSHAIR_EVENT, { detail: { time: null, sourceId: chartId } }));
        return;
      }
      window.dispatchEvent(new CustomEvent(CROSSHAIR_EVENT, { detail: { time: param.time, sourceId: chartId } }));
    });

    const onCrosshairCode = (e) => {
      const { time, sourceId } = (e && e.detail) || {};
      if (sourceId === chartId) return;

      // Sync Values
      const container = document.getElementById(`panel-values-${indicatorId}-${subId}`);
      if (container) {
        if (time !== null && time !== undefined) {
          // Create a fragment
          const fragment = document.createDocumentFragment();
          seriesLabelMapRef.current.forEach(({ color, dataMap }) => {
            const val = dataMap.get(time);
            if (val !== undefined && val !== null) {
              const sp = document.createElement('span');
              sp.style.color = color;
              sp.style.marginLeft = '8px';
              sp.textContent = Number(val).toFixed(2);
              fragment.appendChild(sp);
            }
          });
          // Replace content
          container.innerHTML = '';
          container.appendChild(fragment);
        } else {
          container.innerHTML = '';
        }
      }

      if (time === null) {
        chart.clearCrosshairPosition();
        return;
      }
      if (firstSeries) {
        chart.setCrosshairPosition(NaN, time, firstSeries);
      }
    };
    window.addEventListener(CROSSHAIR_EVENT, onCrosshairCode);

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight
        });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener(CROSSHAIR_EVENT, onCrosshairCode);
      window.removeEventListener(RANGE_EVENT, onRangeEvent);
      resizeObserver.disconnect();
      if (chartRef.current) { try { chartRef.current.remove(); } catch { } }
      cleanupFns.forEach((fn) => { try { fn(); } catch { } });
    };
    // 🔽 settings bağımlılığı eklendi (bg/text/grid de değişince yeniden kur)
  }, [indicatorData, indicatorId, subId, selectedPeriod, tzOffsetMin, settings]);

  // 🔽 YENİ: settings görseli değişirse chart’ı yeniden yaratmadan da güncelle (opsiyonel ama akıcı)
  useEffect(() => {
    if (!chartRef.current) return;
    const textColor = settings.textColor === "black" ? "#8C8C8C" : "#8C8C8C";
    const gridColor = settings?.grid?.color || "#111111";
    const bgColor = settings.bgColor || (settings.theme === 'light' ? '#ffffff' : 'rgb(0,0,7)');
    chartRef.current.applyOptions({
      layout: { background: { color: bgColor }, textColor },
      grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
      localization: {
        timeFormatter: makeZonedFormatter(selectedPeriod, tzOffsetMin),
        priceFormatter: (p) => {
          if (Math.abs(p) >= 100000) return (p / 1000).toFixed(0) + "k";
          return p.toFixed(2);
        },
      },
      timeScale: { tickMarkFormatter: makeZonedFormatter(selectedPeriod, tzOffsetMin) },
      crosshair: {
        vertLine: {
          color: settings?.crosshair?.color || "#758696",
          width: settings?.crosshair?.width ?? 1,
          style: settings?.crosshair?.style ?? 1,
          labelBackgroundColor: settings?.crosshair?.color || "#758696",
        },
        horzLine: {
          color: settings?.crosshair?.color || "#758696",
          width: settings?.crosshair?.width ?? 1,
          style: settings?.crosshair?.style ?? 1,
          labelBackgroundColor: settings?.crosshair?.color || "#758696",
        },
      },
    });
  }, [settings, selectedPeriod, tzOffsetMin]);

  const indicatorInfo = indicatorData?.[indicatorId]?.subItems?.[subId];
  const isVisible = indicatorInfo?.visible ?? true;

  const toggleVisibility = () => {
    toggleSubIndicatorVisibility(indicatorId, subId);
  };

  return (
    <div className="relative w-full h-full">
      <div className={`absolute top-2 left-2 z-10 flex items-center gap-2 bg-transparent border border-gray-400/10 text-xs px-2 py-1 rounded shadow-md pointer-events-none transition-opacity duration-200 ${isVisible ? 'opacity-100' : 'opacity-50'}`} style={{ color: settings.labelColor || "white" }}>
        <span>{indicatorName}</span>
        <div id={`panel-values-${indicatorId}-${subId}`} className="flex items-center" style={{ display: isVisible ? 'flex' : 'none' }}></div>
        <button className="hover:opacity-60 pointer-events-auto"
          onMouseEnter={() => isHoveringButtonsRef.current = true}
          onMouseLeave={() => isHoveringButtonsRef.current = false}
          onClick={toggleVisibility}>
          {isVisible ? <AiOutlineEye size={15} /> : <AiOutlineEyeInvisible size={15} />}
        </button>
        <button className="hover:opacity-60 pointer-events-auto"
          onMouseEnter={() => isHoveringButtonsRef.current = true}
          onMouseLeave={() => isHoveringButtonsRef.current = false}
          onClick={() => setSettingsOpen(true)}><RiSettingsLine />
        </button>
        <button className="hover:opacity-60 pointer-events-auto"
          onMouseEnter={() => isHoveringButtonsRef.current = true}
          onMouseLeave={() => isHoveringButtonsRef.current = false}
          onClick={() => removeSubIndicator(indicatorId, subId)}><AiOutlineClose />
        </button>
      </div>
      <div ref={chartContainerRef} className={`absolute top-0 left-0 w-full h-full ${settings.cursorType === 'crosshair' ? 'cursor-crosshair' : settings.cursorType === 'dot' ? 'cursor-dot' : ''}`}></div>
      <IndicatorSettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} indicatorId={indicatorId} subId={subId} />
    </div>
  );
}

PanelChart.propTypes = {
  indicatorName: PropTypes.string.isRequired,
  indicatorId: PropTypes.string.isRequired,
  subId: PropTypes.string.isRequired,
};
