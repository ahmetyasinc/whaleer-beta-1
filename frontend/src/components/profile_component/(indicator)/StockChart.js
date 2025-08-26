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

import {
  RANGE_EVENT,
  RANGE_REQUEST_EVENT,
  nextSeq,
  markLeader,
  unmarkLeader,
  isLeader,
  minBarsFor,
  FUTURE_PADDING_BARS,
  setLastRangeCache,
  getLastRangeCache
} from "@/utils/chartSync";


export default function ChartComponent() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const [chartData, setChartData] = useState([]);
  const handleLogout = useLogout();
  const { isMagnetMode } = useMagnetStore();
  const { isRulerMode } = useRulerStore();
  const rulerModeRef = useRef(isRulerMode);
  useEffect(() => {
    rulerModeRef.current = isRulerMode;
    console.log("[RULER] rulerModeRef updated:", isRulerMode);
  }, [isRulerMode]);
  const { indicatorData, removeSubIndicator } = useIndicatorDataStore();
  const { strategyData, removeSubStrategy } = useStrategyDataStore();
  const { selectedCrypto, selectedPeriod } = useCryptoStore();
  const [settingsIndicatorModalOpen, setSettingsIndicatorModalOpen] = useState(false);
  const [settingsStrategyModalOpen, setSettingsStrategyModalOpen] = useState(false);
  const [activeIndicatorId, setActiveIndicatorId] = useState(null);
  const [activeStrategyId, setActiveStrategyId] = useState(null);
  const [activeSubIndicatorId, setActiveSubIndicatorId] = useState(null);
  const [activeSubStrategyId, setActiveSubStrategyId] = useState(null);

  // ==== Senkronizasyon guard & ID ====
  const chartId = "main-chart";
  const isApplyingRef = useRef(false);
  const lastSeqAppliedRef = useRef(0);
  let rafHandle = null;

  const openIndicatorSettings = (indicatorId, subId) => {
    setActiveIndicatorId(indicatorId);
    setActiveSubIndicatorId(subId);
    setSettingsIndicatorModalOpen(true);
  };
  const openStrategySettings = (strategyId, subId) => {
    setActiveStrategyId(strategyId);
    setActiveSubStrategyId(subId);
    setSettingsStrategyModalOpen(true);
  };

  // ===== Seçim değişince inputları yeniden hesapla =====
  useEffect(() => {
    const recalculateIndicators = async () => {
      const indicatorState = useIndicatorDataStore.getState();
      const strategyState = useStrategyDataStore.getState();
      const allIndicators = indicatorState.indicatorData || {};
      const allStrategies = strategyState.strategyData || {};

      for (const [indicatorId, indicator] of Object.entries(allIndicators)) {
        const subItems = indicator.subItems || {};
        for (const [subId, sub] of Object.entries(subItems)) {
          const inputs = sub.inputs?.inputs || [];
          const formattedInputs = Object.fromEntries(
            inputs.map((input) => [input.name, input.default])
          );
          await indicatorState.updateInputs(indicatorId, subId, formattedInputs);
        }
      }
      for (const [strategyId, strategy] of Object.entries(allStrategies)) {
        const subItems = strategy.subItems || {};
        for (const [subId, sub] of Object.entries(subItems)) {
          const inputs = sub.inputs?.inputs || [];
          const formattedInputs = Object.fromEntries(
            inputs.map((input) => [input.name, input.default])
          );
          await strategyState.updateInputs(strategyId, subId, formattedInputs);
        }
      }
    };
    recalculateIndicators();
  }, [selectedCrypto, selectedPeriod]);

  // ===== Ana datayı çek =====
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/api/get-binance-data/?symbol=${selectedCrypto.binance_symbol}&interval=${selectedPeriod}`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
          }
        );
        if (response.status === 401) {
          const errorData = await response.json();
          if (["Token expired", "Invalid token"].includes(errorData.detail)) {
            alert("Oturum süresi doldu veya geçersiz token! Lütfen tekrar giriş yapın.");
            handleLogout();
            return;
          }
        }
        const data = await response.json();
        if (data.status === "success" && data.data) {
          const formattedData = data.data.map((candle) => ({
            time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
          }));
          setChartData(formattedData);
        }
      } catch (error) {
        console.error("Veri çekme hatası:", error);
      }
    }
    fetchData();
  }, [selectedCrypto, selectedPeriod]);

  // ===== Chart oluştur =====
  useEffect(() => {
    if (chartData.length === 0 || !chartContainerRef.current) return;

    // eski chart'ı temizle
    try { chartRef.current?.remove?.(); chartRef.current = null; } catch (err) {}

    const chartOptions = {
      layout: {
        textColor: "white",
        background: { type: "solid", color: "rgb(0, 0, 7)" },
      },
      grid: {
        vertLines: { color: "#111", style: 1 },
        horzLines: { color: "#111", style: 1 },
      },
      crosshair: {
        mode: isMagnetMode ? CrosshairMode.Magnet : CrosshairMode.Normal,
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time) => {
          const date = new Date(time * 1000);
          const hours = String(date.getHours()).padStart(2, "0");
          const minutes = String(date.getMinutes()).padStart(2, "0");
          return `${hours}:${minutes}`;
        },
        rightBarStaysOnScroll: true,
        shiftVisibleRangeOnNewBar: false,
      },
    };

    const chart = createChart(chartContainerRef.current, chartOptions);
    chartRef.current = chart;

    // WATERMARK
    chart.applyOptions({
      watermark: {
        color: '#222',
        visible: true,
        text: 'BTCUSDT',
        fontSize: 18,
        horzAlign: 'center',
        vertAlign: 'center',
      },
    });

    // ===== Lider işaretleme (kullanıcı etkileşim başlangıcı) =====
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

    // ===== Candle series =====
    const candleSeries = chart.addCandlestickSeries({
      upColor: "rgb(8, 153, 129)",
      downColor: "rgb(242, 54, 69)",
      borderVisible: false,
      wickUpColor: "rgb(8, 153, 129)",
      wickDownColor: "rgb(242, 54, 69)",
    });
    candleSeries.setData(chartData);

    console.log("[RULER] installing ruler tool…", {
      hasChart: !!chart,
      hasSeries: !!candleSeries,
      hasContainer: !!chartContainerRef.current,
    });
    const removeRuler = installRulerTool({
      chart,
      series: candleSeries,
      container: chartContainerRef.current,
      isRulerModeRef: rulerModeRef,
    });
    cleanupFns.push(() => {
      console.log("[RULER] cleanup ruler tool");
      try { removeRuler?.(); } catch {}
    });


    // ===== İMLEÇ MERKEZLİ ZOOM =====
    const removeWheelZoom = installCursorWheelZoom({
      chart,
      chartId,
      selectedPeriod,
      containerEl: chartContainerRef.current,
      isApplyingRef,
      lastSeqAppliedRef,
    });
    cleanupFns.push(removeWheelZoom);

    // ---- YALNIZCA SON 5 MUM, SON MUM ORTADA ----
    const timeScale = chart.timeScale();

    // kaç bar göstereceğiz
    const barsToShow = 50;
    const rightPad = Math.floor((barsToShow - 1) / 2); // 2
    const lastIndex = Math.max(0, chartData.length - 1);
    const to = lastIndex + rightPad;
    const from = to - (barsToShow - 1);

    // sağda geleceğe boşluk = rightPad (son bar ortada dursun)
    timeScale.applyOptions({ rightOffset: rightPad });

    // aralığı uygula (guard'a gerek yok; ilk kurulum)
    timeScale.setVisibleLogicalRange({ from, to });

    setLastRangeCache({ from, to, rightOffset: rightPad, sourceId: chartId });

    // ===== STRATEGY MARKERS =====
    const allMarkers = [];
    Object.values(strategyData).forEach((strategyInfo) => {
      const subItems = strategyInfo?.subItems || {};
      Object.values(subItems).forEach((sub) => {
        const result = sub?.strategy_result?.[0];
        if (!result?.data) return;
        result.data.forEach(([time, signal, _value, note = ""]) => {
          const unixTime = Math.floor(new Date(time).getTime() / 1000);
          const m = { time: unixTime, position: "aboveBar", color: "", shape: "", text: note || "" };
          switch (signal) {
            case "Long Open": m.shape = "arrowUp"; m.color = "green"; m.position = "belowBar"; break;
            case "Long Close": m.shape = "arrowDown"; m.color = "red"; m.position = "aboveBar"; break;
            case "Short Open": m.shape = "arrowDown"; m.color = "red"; m.position = "aboveBar"; break;
            case "Short Close": m.shape = "arrowUp"; m.color = "green"; m.position = "belowBar"; break;
            default: return;
          }
          allMarkers.push(m);
        });
      });
    });
    allMarkers.sort((a, b) => a.time - b.time);
    candleSeries.setMarkers(allMarkers);

    // ===== STRATEGY GRAPH =====
    Object.values(strategyData).forEach((strategyInfo) => {
      const subItems = strategyInfo?.subItems || {};
      Object.values(subItems).forEach((sub) => {
        const graph = sub?.strategy_graph?.[0];
        if (!graph?.data || !graph?.style) return;
        let series;
        switch (graph.style.linestyle) {
          case "line":
            series = chart.addLineSeries({ color: graph.style?.color || "orange", lineWidth: graph.style?.width || 2 });
            break;
          case "area":
            series = chart.addAreaSeries({ topColor: graph.settings?.color || "rgba(255, 165, 0, 0.4)", bottomColor: "rgba(255, 165, 0, 0.05)", lineColor: graph.settings?.color || "orange" });
            break;
          case "histogram":
            const defaultColor = graph.settings?.color ?? "255, 165, 0";
            const opacity = graph.settings?.opacity ?? 0.4;
            series = chart.addHistogramSeries({ color: `rgba(${defaultColor}, ${opacity})` });
            break;
          default:
            return;
        }
        const formattedData = graph.data
          .map(([time, value]) => (typeof time === "string" && value !== undefined ? { time: Math.floor(new Date(time).getTime() / 1000), value } : null))
          .filter(Boolean)
          .sort((a, b) => a.time - b.time);
        series.setData(formattedData);
      });
    });

    // ===== STRATEGY LABELS =====
    const strategyLabelsContainer = document.getElementById("strategy-labels");
    if (strategyLabelsContainer) strategyLabelsContainer.innerHTML = "";
    Object.entries(strategyData).forEach(([strategyId, strategy]) => {
      const strategyName = strategy.name;
      const subItems = strategy.subItems || {};
      Object.entries(subItems).forEach(([subId, sub]) => {
        const labelId = `strategy-label-${strategyId}-${subId}`;
        if (document.getElementById(labelId)) return;
        const labelDiv = document.createElement("div");
        labelDiv.id = labelId;
        labelDiv.style.cssText = `background: rgba(30,30,30,0.4); color: white; font-size: 12px; padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; gap: 6px;`;
        const title = document.createElement("span");
        title.textContent = strategyName || `${strategyId} (${subId})`;
        const settingsBtn = document.createElement("button");
        settingsBtn.textContent = "⚙️"; settingsBtn.style.cssText = "background:none;border:none;color:white;cursor:pointer;";
        settingsBtn.onclick = () => openStrategySettings(strategyId, subId);
        const removeBtn = document.createElement("button");
        removeBtn.textContent = "❌"; removeBtn.style.cssText = "background:none;border:none;color:white;cursor:pointer;";
        removeBtn.onclick = () => { labelDiv.remove(); removeSubStrategy(strategyId, subId); };
        labelDiv.appendChild(title); labelDiv.appendChild(settingsBtn); labelDiv.appendChild(removeBtn);
        strategyLabelsContainer && strategyLabelsContainer.appendChild(labelDiv);
      });
    });

    // ===== INDICATOR SERIES & LABELS =====
    const indicatorLabelsContainer = document.getElementById("indicator-labels");
    if (indicatorLabelsContainer) indicatorLabelsContainer.innerHTML = "";
    Object.entries(indicatorData).forEach(([indicatorId, indicator]) => {
      const indicatorName = indicator.name;
      const subItems = indicator.subItems || {};
      Object.entries(subItems).forEach(([subId, indicatorInfo]) => {
        if (!indicatorInfo?.result) return;
        if (!Array.isArray(indicatorInfo?.result)) return;
        indicatorInfo.result
          .filter((item) => item.on_graph === true)
          .forEach((indicatorResult) => {
            const { type, settings, data } = indicatorResult;
            let series;
            switch (type) {
              case "line":
                series = chart.addLineSeries({ color: settings?.color || "yellow", lineWidth: settings?.width || 2, lastValueVisible: false, priceLineVisible: false });
                break;
              case "area":
                series = chart.addAreaSeries({ topColor: settings?.color || "rgba(33, 150, 243, 0.5)", bottomColor: "rgba(33, 150, 243, 0.1)", lineColor: settings?.color || "blue", lastValueVisible: false, priceLineVisible: false });
                break;
              case "histogram":
                const defaultColor = settings?.color ?? "0, 128, 0";
                const opacity = settings?.opacity ?? 0.3;
                series = chart.addHistogramSeries({ color: `rgba(${defaultColor}, ${opacity})`, lastValueVisible: false, priceLineVisible: false });
                break;
              default:
                series = chart.addLineSeries({ color: "white", lineWidth: 2, lastValueVisible: false, priceLineVisible: false });
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
            settingsBtn.onclick = () => openIndicatorSettings(indicatorId, subId);
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "❌"; removeBtn.style.cssText = "background:none;border:none;color:white;cursor:pointer;";
            removeBtn.onclick = () => { series.setData([]); labelDiv.remove(); removeSubIndicator(indicatorId, subId); };
            labelDiv.appendChild(title); labelDiv.appendChild(settingsBtn); labelDiv.appendChild(removeBtn);
            indicatorLabelsContainer && indicatorLabelsContainer.appendChild(labelDiv);
          });
      });
    });

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
          
      // ⬇️ cachele
      setLastRangeCache({ from, to, rightOffset, sourceId: chartId });
          
      rafHandle = requestAnimationFrame(() => {
        window.dispatchEvent(new CustomEvent(RANGE_EVENT, {
          detail: { from, to, rightOffset, sourceId: chartId, seq }
        }));
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
    cleanupFns.push(() => window.removeEventListener(RANGE_EVENT, onRangeEvent));

    const onRangeRequest = () => {
      const payload = getLastRangeCache();
      if (!payload) return;           // henüz hazır değilse sus
      const seq = nextSeq();
      window.dispatchEvent(new CustomEvent(RANGE_EVENT, {
        detail: { ...payload, seq }   // RANGE_EVENT ile yanıtla
      }));
    };
    window.addEventListener(RANGE_REQUEST_EVENT, onRangeRequest);
    cleanupFns.push(() => window.removeEventListener(RANGE_REQUEST_EVENT, onRangeRequest));

    // ===== Resize =====
    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    // cleanup
    return () => {
      resizeObserver.disconnect();
      cleanupFns.forEach((fn) => { try { fn(); } catch {} });
      if (chartRef.current) { try { chartRef.current.remove(); } catch (error) {} }
    };
  }, [chartData, indicatorData, strategyData, isMagnetMode, selectedPeriod]);

  // ===== Magnet mod değişikliği =====
  useEffect(() => {
    if (chartRef.current) {
      chartRef.current.applyOptions({
        crosshair: { mode: isMagnetMode ? CrosshairMode.Magnet : CrosshairMode.Normal },
      });
    }
  }, [isMagnetMode]);

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