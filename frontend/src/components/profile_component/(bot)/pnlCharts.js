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
        vertLines: { color: "#18181b" },
        horzLines: { color: "#18181b" },
      },
      crosshair: {
        mode: 0, // Normal crosshair mode
        vertLine: {
          color: "#6b7280", // Grey color
          width: 1,
          style: 0, // Solid line
        },
        horzLine: {
          color: "#6b7280", // Grey color
          width: 1,
          style: 0, // Solid line
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#6b7280", // Grey border
      },
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
        borderColor: "#6b7280", // Grey border
      },
    });

      const baselineSeries = chart.addBaselineSeries({
        baseValue: { type: 'price', price: 0 },
        topLineColor: "#22c55e",
        topFillColor1: "rgba(34, 197, 94, 0.4)",
        topFillColor2: "rgba(34, 197, 94, 0.1)",
        bottomLineColor: "#dc2626",
        bottomFillColor1: "rgba(220, 38, 38, 0.4)",
        bottomFillColor2: "rgba(220, 38, 38, 0.1)",
        lineWidth: 2,
        crossHairMarkerVisible: true,
      
        // 🔽 Son fiyat çizgisi (gri) ve etiketi
        priceLineColor: "#343434", // Tailwind'deki gray-400
        lastValueLabel: {
          backgroundColor: "#9ca3af", // Etiketin arka planı
          borderColor: "#9ca3af",
          textColor: "#18181b"       // Koyu arka planda okunabilir metin
        }
      });


    baselineSeries.setData(data);

    return () => {
      chart.remove();
    };
  }, [data]);

  return <div ref={chartContainerRef} className="w-full" />;
}