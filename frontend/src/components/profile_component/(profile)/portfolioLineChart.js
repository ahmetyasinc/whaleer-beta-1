"use client";

import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
} from "chart.js";
import useLineChartStore from "@/store/profile/lineChartStore";

ChartJS.register(LineElement, PointElement, LinearScale, CategoryScale);

export default function PortfolioLineChart() {
  const { lineData } = useLineChartStore();

  // Line Chart Animation Config
  const totalDuration = 4000;
  const delayBetweenPoints = totalDuration / lineData.length;
  const previousY = (ctx) =>
    ctx.index === 0
      ? ctx.chart.scales.y.getPixelForValue(100)
      : ctx.chart
          .getDatasetMeta(ctx.datasetIndex)
          .data[ctx.index - 1].getProps(["y"], true).y;

  const animation = {
    x: {
      type: "number",
      easing: "linear",
      duration: delayBetweenPoints,
      from: NaN,
      delay(ctx) {
        if (ctx.type !== "data" || ctx.xStarted) {
          return 0;
        }
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
        if (ctx.type !== "data" || ctx.yStarted) {
          return 0;
        }
        ctx.yStarted = true;
        return ctx.index * delayBetweenPoints;
      },
    },
  };

  const lineDataConfig = {
    datasets: [
      {
        borderColor: "purple", // Tailwind blue-500
        borderWidth: 2,
        radius: 0,
        data: lineData,
        fill: false,
      },
    ],
  };

  const lineOptions = {
    animation,
    interaction: { intersect: false },
    plugins: { legend: false },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: { type: "linear", ticks: { color: "#ccc" }, grid: { color: "#222" } },
      y: { ticks: { color: "#ccc" }, grid: { color: "#222" } },
    },
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border-1 border-zinc-700 p-6 text-white w-full h-full flex flex-col">
      {/* Header */}
      <div className="pb-3 mb-4 border-b border-zinc-700">
        <h3 className="text-lg font-semibold text-center">
          Portfolio Performance
        </h3>
      </div>

      {/* Line Chart */}
      <div className="flex-1 h-[300px]">
        <Line data={lineDataConfig} options={lineOptions} />
      </div>
    </div>
  );
}
