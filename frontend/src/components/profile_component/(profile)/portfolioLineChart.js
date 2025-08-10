"use client";

import { useEffect } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  TimeScale,           // <-- add
  Tooltip,
  CategoryScale,
} from "chart.js";
import "chartjs-adapter-date-fns"; // <-- add adapter
import useLineChartStore from "@/store/profile/lineChartStore";

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, CategoryScale, Tooltip);

export default function PortfolioLineChart() {
  const { lineData, loading, error, fetchLineData } = useLineChartStore();

  useEffect(() => { fetchLineData(); }, [fetchLineData]);

  if (loading) return <div className="flex items-center justify-center h-full text-white">Loading portfolio chart...</div>;
  if (error)   return <div className="flex items-center justify-center h-full text-red-500">Error: {error}</div>;
  if (!lineData.length) return <div className="flex items-center justify-center h-full text-zinc-400">No data</div>;

  // Animation
  const totalDuration = 4000;
  const delayBetweenPoints = Math.max(1, Math.floor(totalDuration / lineData.length));
  const previousY = (ctx) =>
    ctx.index === 0
      ? ctx.chart.scales.y.getPixelForValue(lineData[0]?.y ?? 0)
      : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].getProps(["y"], true).y;

  const animation = {
    x: {
      type: "number",
      easing: "linear",
      duration: delayBetweenPoints,
      from: NaN,
      delay(ctx) {
        if (ctx.type !== "data" || ctx.xStarted) return 0;
        ctx.xStarted = true;
        return ctx.index * delayBetweenPoints;
      },
    },
    y: {
      type: "number",
      easing: "linear",
      duration: delayBetweenPoints,
      from: previousY,
      delay(ctx) {
        if (ctx.type !== "data" || ctx.yStarted) return 0;
        ctx.yStarted = true;
        return ctx.index * delayBetweenPoints;
      },
    },
  };

  const data = {
    datasets: [
      {
        data: lineData,        // [{ x: Date, y: number }]
        borderColor: "purple",
        borderWidth: 2,
        radius: 0,
        fill: false,
      },
    ],
  };

  const options = {
    animation,
    interaction: { intersect: false, mode: "index" },
    plugins: { legend: false },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: "time",                         // <-- time scale
        time: { unit: "minute" },             // change to 'hour'/'day' as you like
        ticks: { color: "#ccc", maxRotation: 0, autoSkip: true },
        grid: { color: "#222" },
      },
      y: {
        ticks: { color: "#ccc" },
        grid: { color: "#222" },
      },
    },
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border-1 border-zinc-700 p-6 text-white w-full h-full flex flex-col">
      <div className="pb-3 mb-4 border-b border-zinc-700">
        <h3 className="text-lg font-semibold text-center">Portfolio Performance</h3>
      </div>
      <div className="flex-1 h-[300px]">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}
