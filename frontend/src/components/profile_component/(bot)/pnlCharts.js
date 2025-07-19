"use client";

import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function PnLChart({ data }) {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 250,
      layout: {
        background: { color: "#18181b" },
        textColor: "#cbd5e1",
      },
      grid: {
        vertLines: { color: "#27272a" },
        horzLines: { color: "#27272a" },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    // Area chart
    const areaSeries = chart.addAreaSeries({
      topColor: "rgba(34, 197, 94, 0.4)",     // #22c55e (yeşil)
      bottomColor: "rgba(220, 38, 38, 0.4)",  // #dc2626 (kırmızı)
      lineColor: "#22c55e",
      lineWidth: 2,
      crossHairMarkerVisible: true,
    });

    // Grafiği 0 etrafında renklendirmek için pozitif ve negatif bölgeler ayrılmalı
    // lightweight-charts bunu doğrudan desteklemez, ama top/bottom color efekti ile gösterebiliriz

    areaSeries.setData(data);

    return () => {
      chart.remove();
    };
  }, [data]);

  return <div ref={chartContainerRef} className="w-full" />;
}
