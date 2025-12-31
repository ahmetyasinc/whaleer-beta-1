"use client";

import { useEffect, useMemo, useRef } from "react";
import { createChart } from "lightweight-charts";
import { useProfileStore } from "@/store/profile/profileStore";
import { useAccountDataStore } from "@/store/profile/accountDataStore";
import { BsQuestionOctagonFill } from "react-icons/bs";

export default function PortfolioLineChart() {
  const activeApiId = useProfileStore((s) => s.activeApiId);
  const snapshotsMap = useAccountDataStore((s) => s.snapshotsByApiId);

  // ----- Data prep -----
  const raw = useMemo(
    () => snapshotsMap?.[activeApiId] || [],
    [snapshotsMap, activeApiId]
  );

  const lineData = useMemo(() => {
    if (!raw?.length) return [];
    const pts = [...raw].sort((a, b) => a.x - b.x);
    const out = [];
    const seen = new Set();
    for (const d of pts) {
      const t = d.x.getTime();
      if (!seen.has(t)) {
        seen.add(t);
        out.push(d);
      } else {
        out[out.length - 1] = d;
      }
    }
    return out;
  }, [raw]);

  const hasData = lineData.length > 0;

  // ----- Lightweight Charts refs & setup (her zaman çalışır) -----
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (chartRef.current) return; // zaten oluşturulduysa tekrar oluşturma

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight || 300,
      layout: {
        background: { type: "solid", color: "#00000000" }, // gray-950
        textColor: "rgb(150,150,150)", // zinc-200
      },
      grid: {
        vertLines: { color: "#00000000" }, // zinc-900
        horzLines: { color: "#00000000" },
      },
      rightPriceScale: {
        borderColor: "#00000000", // zinc-800
      },
      timeScale: {
        borderColor: "#00000000",
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: "rgba(0,0,0,0)",
        },
        horzLine: {
          color: "rgba(0,0,0,0)",
        },
      },


    });

    const series = chart.addLineSeries({
      color: "#3b82f6", // blue-500
      lineWidth: 2,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const handleResize = () => {
      if (!containerRef.current || !chartRef.current) return;
      chartRef.current.applyOptions({
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight || 300,
      });
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Data değişince seriyi güncelle
  useEffect(() => {
    if (!seriesRef.current || !chartRef.current) return;

    if (!hasData) {
      // data yoksa seriyi temizle
      seriesRef.current.setData([]);
      return;
    }

    const formatted = lineData.map((d) => ({
      time: Math.floor(d.x.getTime() / 1000), // seconds
      value: d.y,
    }));

    seriesRef.current.setData(formatted);
    chartRef.current.timeScale().fitContent();
  }, [lineData, hasData]);

  return (
    <div className="relative bg-zinc-950/90 backdrop-blur-sm border border-zinc-700 rounded-xl shadow-lg pl-2 pt-5 text-white w-full h-full flex flex-col group hover:border-blue-900/80 transition-all duration-300">

      {/* Glow effects */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>

      <div className="pb-3 border-b border-zinc-800/50 mr-4 mb-2 relative z-10">
        <h3 className="text-zinc-100 text-sm ml-3 font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
          Portfolio Performance
        </h3>
      </div>

      <div className="relative flex-1 h-full z-10">
        <div ref={containerRef} className="w-full h-full rounded-xl" />
        {!hasData && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-zinc-600 pointer-events-none bg-transparent">

            {/* Büyük ikon */}
            <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-700/50 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(0,0,0,0.5)]">
              <BsQuestionOctagonFill className="text-3xl text-zinc-600" />
            </div>

            <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide">No data available</p>
            <p className="text-xs text-zinc-600">Connect an API or wait for updates.</p>
          </div>
        )}
      </div>
    </div>
  );
}
