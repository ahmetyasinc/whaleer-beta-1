"use client";

import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import IndicatorSettingsModal from "./(modal_tabs)/indicatorSettingsModal";
import PropTypes from "prop-types";
import useCryptoStore from "@/store/indicator/cryptoPinStore"; // Zustand store'u import et


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
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  useEffect(() => {
    const indicatorInfo = indicatorData?.[indicatorId]?.subItems?.[subId];
    if (!chartContainerRef.current || !indicatorInfo?.result) return;

    const { result } = indicatorInfo;

    const firstNonGraphItem = result.find((r) => r.on_graph === false);
    if (firstNonGraphItem?.name) {
      setDisplayName(firstNonGraphItem.name);
    }

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { color: "rgb(0, 0, 7)" },
        textColor: "#FFF",
      },
      grid: {
        vertLines: { color: "#111" },
        horzLines: { color: "#111" },
      },
      lastValueVisible: false,
    });

    chartRef.current = chart;

    const handleTimeRangeChange = (event) => {
      const { start, end, sourceId } = event.detail;
      const currentChartId = `${indicatorId}-${subId}`;
      if (sourceId === currentChartId) return;

      let adjustedStart = start;
      let adjustedEnd = end;

      console.log(`[PanelChart - ${currentChartId}] Fark değeri: ${selectedPeriod}`);

      const coefficient = 1000;
      let minBars = coefficient; // Varsayılan değer

      switch (selectedPeriod) {
        case "1m":      // 1 Dakika
          minBars = coefficient;
          break;
        case "3m":      // 3 Dakika
          minBars = coefficient * 3;
          break;
        case "5m":      // 5 Dakika
          minBars = coefficient * 5;
          break;
        case "15m":     // 15 Dakika
          minBars = coefficient * 15;
          break;
        case "30m":     // 30 Dakika
          minBars = coefficient * 30;
          break;
        case "1h":      // 1 Saat
          minBars = coefficient * 60;
          break;
        case "2h":      // 2 Saat
          minBars = coefficient * 120;
          break;
        case "4h":      // 4 Saat
          minBars = coefficient * 240;
          break;
        case "1d":      // 1 Gün
          minBars = coefficient * 1440; // 24 saat * 60 dakika
          break;
        case "1w":      // 1 Hafta
          minBars = coefficient * 10080; // 7 gün * 24 saat * 60 dakika
          break;
        default:
          minBars = coefficient; // fallback
          break;
      }
      
      if (end - start < minBars) {
        const center = (start + end) / 2;
        adjustedStart = center - minBars / 2;
        adjustedEnd = center + minBars / 2;
        // Yeni aralığı ayarlamak için event yayılıyor
        const event = new CustomEvent("chartTimeRangeChange", {
          detail: {
            start: adjustedStart,
            end: adjustedEnd,
            sourceId: `${currentChartId}`,
          },
        });
        window.dispatchEvent(event)


      }
    
      //console.log(`[PanelChart - ${currentChartId}] Event alındı <${sourceId}> → zaman güncelleniyor`, {
      //  start: adjustedStart,
      //  end: adjustedEnd,
      //});
    
      if (chartRef.current) {
        chartRef.current.timeScale().setVisibleRange({
          from: adjustedStart,
          to: adjustedEnd,
        });
      } 
    };
    let ghostLineSeries = null;

    const handleCrosshairMove = (event) => {
      const { time, sourceId } = event.detail;
      const currentChartId = `${indicatorId}-${subId}`;
      if (sourceId === currentChartId) return;
      if (!chartRef.current || time === undefined || time === null) return;
    
      const chart = chartRef.current;
      const timeScale = chart.timeScale();
      const logicalRange = timeScale.getVisibleLogicalRange();
    
      const series = chartSeriesRef.current; // candleSeries gibi bir şey
      const priceScale = series?.getPriceScale();
      const priceRange = priceScale?.getPriceRange(logicalRange);
    
      const minValue = priceRange?.minValue ?? 0;
      const maxValue = priceRange?.maxValue ?? 1;
    
      if (!ghostLineSeries) {
        ghostLineSeries = chart.addLineSeries({
          color: 'rgba(255,255,255,0.4)',
          lineWidth: 1,
          priceLineVisible: false,
          crossHairMarkerVisible: false,
        });
      }
    
      const offset = 0.00001;
      ghostLineSeries.setData([
        { time: time - offset, value: maxValue },
        { time: time + offset, value: minValue },
      ]);
    };



    window.addEventListener("chartCrosshairMove", handleCrosshairMove);
    window.addEventListener("chartTimeRangeChange", handleTimeRangeChange); //eventi dinler yukarıda

    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleTimeRangeChange((newRange) => {
      const currentChartId = `${indicatorId}-${subId}`;
      //console.log(`[PanelChart] Fark değeri: ${newRange.to- newRange.from}`);
      //console.log(`[PanelChart - ${currentChartId}] Zaman değişti → Event yayılıyor`, newRange);
      const event = new CustomEvent("chartTimeRangeChange", {
        detail: {
          start: newRange.from,
          end: newRange.to,
          sourceId: `${indicatorId}-${subId}`,
        },
      });
      window.dispatchEvent(event);//eventi yayınlar
    });

    result
      .filter((item) => item?.on_graph === false)
      .forEach(({ type, settings, data }) => {
        let series;

        switch (type) {
          case "line":
            series = chart.addLineSeries({
              color: settings?.color || "white",
              lineWidth: settings?.width || 1,
              priceLineVisible: false,
            });
            break;
          case "histogram": {
            const defaultColor = settings?.color ?? "0, 128, 0";
            const opacity = settings?.opacity ?? 1;
            const colorString = defaultColor.includes(",")
              ? `rgba(${defaultColor}, ${opacity})`
              : hexToRgba(defaultColor, opacity);

            series = chart.addHistogramSeries({
              color: colorString,
              priceLineVisible: false,
            });
            break;
          }
          case "area":
            series = chart.addAreaSeries({
              topColor: settings?.color || "rgba(33, 150, 243, 0.5)",
              bottomColor: "rgba(33, 150, 243, 0.1)",
              lineColor: settings?.color || "blue",
              priceLineVisible: false,
            });
            break;
          default:
            series = chart.addLineSeries({
              color: "white",
              lineWidth: 2,
              priceLineVisible: false,
            });
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
    const visibleRange = timeScale.getVisibleRange();
    if (visibleRange) {
      const event = new CustomEvent("chartTimeRangeChange", {
        detail: {
          start: visibleRange.from,
          end: visibleRange.to,
          isLocal: true,
        },
      });
      window.dispatchEvent(event);
    }

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      window.removeEventListener("chartCrosshairMove", handleCrosshairMove);
      window.removeEventListener("chartTimeRangeChange", handleTimeRangeChange);
      resizeObserver.disconnect();
      if (chartRef.current) {
        try {
          chartRef.current.remove();
        } catch (error) {
          console.warn("Grafik temizlenirken hata oluştu:", error);
        }
      }
    };
  }, [indicatorData, indicatorId, subId]);

  return (
    <div className="relative w-full h-full">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2 bg-gray-800 text-white text-xs px-2 py-1 rounded shadow-md">
        <span>{indicatorName}</span>

        <button
          className="hover:text-yellow-400"
          onClick={() => setSettingsModalOpen(true)}
        >
          ⚙️
        </button>

        <button
          className="hover:text-red-400"
          onClick={() => removeSubIndicator(indicatorId, subId)}
        >
          ❌
        </button>
      </div>

      <div ref={chartContainerRef} className="absolute top-0 left-0 w-full h-full"></div>

      <IndicatorSettingsModal
        isOpen={settingsModalOpen}
        onClose={() => setSettingsModalOpen(false)}
        indicatorId={indicatorId}
        subId={subId}
      />
    </div>
  );
}

PanelChart.propTypes = {
  indicatorName: PropTypes.string.isRequired,
  indicatorId: PropTypes.string.isRequired,
  subId: PropTypes.string.isRequired,
};
