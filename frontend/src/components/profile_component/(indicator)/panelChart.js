"use client";

import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import IndicatorSettingsModal from "./(modal_tabs)/indicatorSettingsModal";
import PropTypes from "prop-types";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import { installCursorWheelZoom } from "@/utils/cursorCoom";
import {
  RANGE_EVENT,
  RANGE_REQUEST_EVENT,
  nextSeq,
  markLeader,
  unmarkLeader,
  isLeader,
  minBarsFor,
  FUTURE_PADDING_BARS,
  getLastRangeCache,
} from "@/utils/chartSync";


function hexToRgba(hex, opacity) {
  hex = hex.replace("#", "");
  if (hex.length !== 6) return "rgba(0,0,0,1)";
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

export default function PanelChart({ indicatorName, indicatorId, subId }) {
  const { selectedPeriod } = useCryptoStore();
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const { indicatorData, removeSubIndicator } = useIndicatorDataStore();

  const [displayName, setDisplayName] = useState(`${indicatorId} (${subId})`);

  // ==== Senkronizasyon guard & ID ====
  const chartId = `${indicatorId}-${subId}`;
  const isApplyingRef = useRef(false);
  const lastSeqAppliedRef = useRef(0);
  let rafHandle = null;

  useEffect(() => {
    const indicatorInfo = indicatorData?.[indicatorId]?.subItems?.[subId];
    if (!chartContainerRef.current || !indicatorInfo?.result) return;

    const { result } = indicatorInfo;
    const firstNonGraphItem = result.find((r) => r.on_graph === false);
    if (firstNonGraphItem?.name) setDisplayName(firstNonGraphItem.name);

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: { background: { color: "rgb(0, 0, 7)" }, textColor: "#FFF" },
      grid: { vertLines: { color: "#111" }, horzLines: { color: "#111" } },
      lastValueVisible: false,
      timeScale: { rightBarStaysOnScroll: true, shiftVisibleRangeOnNewBar: false },
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

    // Seriler
    result
      .filter((item) => item?.on_graph === false)
      .forEach(({ type, settings, data }) => {
        let series;
        switch (type) {
          case "line":
            series = chart.addLineSeries({ color: settings?.color || "white", lineWidth: settings?.width || 1, priceLineVisible: false });
            break;
          case "histogram": {
            const defaultColor = settings?.color ?? "0, 128, 0";
            const opacity = settings?.opacity ?? 1;
            const colorString = defaultColor.includes(",") ? `rgba(${defaultColor}, ${opacity})` : hexToRgba(defaultColor, opacity);
            series = chart.addHistogramSeries({ color: colorString, priceLineVisible: false });
            break;
          }
          case "area":
            series = chart.addAreaSeries({ topColor: settings?.color || "rgba(33, 150, 243, 0.5)", bottomColor: "rgba(33, 150, 243, 0.1)", lineColor: settings?.color || "blue", priceLineVisible: false });
            break;
          default:
            series = chart.addLineSeries({ color: "white", lineWidth: 2, priceLineVisible: false });
        }
        const timeValueMap = new Map();
        data.forEach(([time, value]) => {
          if (typeof time === "string" && value !== undefined) {
            const unixTime = Math.floor(new Date(time).getTime() / 1000);
            timeValueMap.set(unixTime, value);
          }
        });
        const formattedData = Array.from(timeValueMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([time, value]) => ({ time, value }));
        series.setData(formattedData);
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

    // 1) Cache varsa direkt uygula
    const cached = getLastRangeCache();
    if (cached) {
      applyRangeSilently(cached);
    } else {
      // 2) Cache yoksa main'den iste → ilk gelen RANGE_EVENT (main-chart) ile uygula
      const oneShot = (e) => {
        const { sourceId } = (e && e.detail) || {};
        if (sourceId === 'main-chart') {
          window.removeEventListener(RANGE_EVENT, oneShot);
          applyRangeSilently(e.detail);
        }
      };
      window.addEventListener(RANGE_EVENT, oneShot);
    
      // İstek yayınla
      window.dispatchEvent(new CustomEvent(RANGE_REQUEST_EVENT));
    
      // 3) Emniyet: kısa süre yanıt yoksa fallback (son 5 bar, son bar ortada)
      setTimeout(() => {
        try { window.removeEventListener(RANGE_EVENT, oneShot); } catch (_) {}
        let dataLen = 0;
        try {
          const firstNonGraph = (indicatorInfo?.result || []).find(r => r.on_graph === false);
          if (firstNonGraph && Array.isArray(firstNonGraph.data)) {
            dataLen = firstNonGraph.data.length;
          }
        } catch (_) {}
        const barsToShow = 5;
        const rightPad = Math.floor((barsToShow - 1) / 2);
        const lastIndex = Math.max(0, dataLen - 1);
        const to = lastIndex + rightPad;
        const from = to - (barsToShow - 1);
        applyRangeSilently({ from, to, rightOffset: rightPad });
      }, 150);
    }

    //timeScale.scrollToRealTime();
    const removeWheelZoom = installCursorWheelZoom({
      chart,
      chartId,
      selectedPeriod,
      containerEl: chartContainerRef.current,
      isApplyingRef,
      lastSeqAppliedRef,
    });
    cleanupFns.push(removeWheelZoom);


    // ===== ZAMAN SİNK. – YAYIN (Sadece lider) =====
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

    // ===== ZAMAN SİNK. – DİNLE (Uygula ama yayınlama) =====
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
    
    // Resize
    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth, height: chartContainerRef.current.clientHeight });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    // cleanup
    return () => {
      window.removeEventListener(RANGE_EVENT, onRangeEvent);
      resizeObserver.disconnect();
      if (chartRef.current) { try { chartRef.current.remove(); } catch (error) {} }
      cleanupFns.forEach((fn) => { try { fn(); } catch {} });
    };
  }, [indicatorData, indicatorId, subId, selectedPeriod]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md">
        <span>{indicatorName}</span>
        <button className="hover:text-yellow-400" onClick={() => console.log('Open settings via parent')}>⚙️</button>
        <button className="hover:text-red-400" onClick={() => removeSubIndicator(indicatorId, subId)}>❌</button>
      </div>
      <div ref={chartContainerRef} className="absolute top-0 left-0 w-full h-full"></div>
      <IndicatorSettingsModal isOpen={false} onClose={() => {}} indicatorId={indicatorId} subId={subId} />
    </div>
  );
}

PanelChart.propTypes = {
  indicatorName: PropTypes.string.isRequired,
  indicatorId: PropTypes.string.isRequired,
  subId: PropTypes.string.isRequired,
};