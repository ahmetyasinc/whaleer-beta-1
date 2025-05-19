"use client";

import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import IndicatorSettingsModal from "./(modal_tabs)/indicatorSettingsModal";
import PropTypes from "prop-types";

export default function PanelChart({ indicatorName, indicatorId, subId }) {
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
        background: { color: "rgb(0, 4, 10)" },
        textColor: "#FFF",
      },
      grid: {
        vertLines: { color: "#111" },
        horzLines: { color: "#111" },
      },
      lastValueVisible: false,
    });

    chartRef.current = chart;

    // 1. Event dinleyici
    const handleTimeRangeChange = (event) => {
        const { start, end, sourceId } = event.detail;
        const currentChartId = `${indicatorId}-${subId}`;
        if (sourceId === currentChartId) return;
        if (chartRef.current) {
          chartRef.current.timeScale().setVisibleRange({ from: start, to: end });
        }
    };

    window.addEventListener('chartTimeRangeChange', handleTimeRangeChange);

    // 2. Event gönderici
    const timeScale = chart.timeScale();
    timeScale.subscribeVisibleTimeRangeChange((newRange) => {
        const event = new CustomEvent('chartTimeRangeChange', {
            detail: {
                start: newRange.from,
                end: newRange.to,
                sourceId: `${indicatorId}-${subId}` // Hangi grafikten geldiğini belirt
            }
        });
        window.dispatchEvent(event);
    });

    // Grafik serilerini oluştur
    result
      .filter((item) => item?.on_graph === false)
      .forEach(({ type, settings, data }) => {
        let series;

        switch (type) {
          case "line":
            series = chart.addLineSeries({
              color: settings?.color || "white",
              lineWidth: settings?.width || 2,
              priceLineVisible: false,
            });
            break;
          case "histogram":
            const defaultColor = settings?.color ?? "0, 128, 0";
            const opacity = settings?.opacity ?? 0.3;
            series = chart.addHistogramSeries({
              color: `rgba(${defaultColor}, ${opacity})`,
              priceLineVisible: false,
            });
            break;
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

    // 3. Başlangıç aralığını ayarla ve event gönder
    chart.timeScale().fitContent();
    const visibleRange = timeScale.getVisibleRange();
    if (visibleRange) {
      console.log("Buradayım ama neden?")
        const event = new CustomEvent('chartTimeRangeChange', {
            detail: {
                start: visibleRange.from,
                end: visibleRange.to,
                isLocal: true
            }
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
        window.removeEventListener('chartTimeRangeChange', handleTimeRangeChange);
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
      {/* Label - Sol üst köşe */}
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

      {/* Grafik Alanı */}
      <div ref={chartContainerRef} className="absolute top-0 left-0 w-full h-full"></div>

      {/* Ayar Modalı */}
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