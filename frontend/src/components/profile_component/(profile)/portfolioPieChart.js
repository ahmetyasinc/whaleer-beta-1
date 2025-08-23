"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { usePortfolioStore } from "@/store/profile/portfolioStore";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PortfolioPieChart() {
  const { portfolio } = usePortfolioStore();

  const labels = portfolio.map((item) => item.symbol.toUpperCase());
  const values = portfolio.map((item) => item.amount);

  const COLORS = [
    "#3B82F6",
    "hsl(290,100%,79%)",
    "#90fbff",
    "rgb(122,255,122)",
    "hsl(246,28%,28%)",
  ];

  const total = values.reduce((sum, v) => sum + v, 0);

  const doughnutData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: COLORS,
        borderColor: "rgba(0,0,0,0.5)",
        borderWidth: 1,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false, // <-- ÖNEMLİ
    cutout: "40%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#fff",
          font: {
            size: 13,
            weight: "bold",
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value.toLocaleString("tr-TR", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
            })} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border border-zinc-700 p-6 text-white w-full h-full flex flex-col">
      {/* Header */}
      <div className="pb-3 mb-4 border-b border-zinc-700">
        <h3 className="text-lg font-semibold text-center">
          Portfolio Distribution
        </h3>
      </div>

      {/* Pie Chart */}
      <div className="relative w-full h-[300px] mb-4"> 
        <Doughnut data={doughnutData} options={doughnutOptions} />
      </div>
    </div>
  );
<<<<<<< HEAD
}







/*"use client";

import { Doughnut, Line } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, LineElement, PointElement, LinearScale, CategoryScale } from "chart.js";
import { usePortfolioStore } from "@/store/profile/portfolioStore";
import useLineChartStore from "@/store/profile/lineChartStore";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale
);

export default function PortfolioChart() {
  const { portfolio } = usePortfolioStore();
  const { lineData1, lineData2 } = useLineChartStore();

  const labels = portfolio.map((item) => item.symbol.toUpperCase());
  const values = portfolio.map((item) => item.amount);

  const COLORS = [
    "#3B82F6",
    "hsl(290,100%,79%)",
    "#90fbff",
    "rgb(122,255,122)",
    "hsl(246,28%,28%)",
  ];

  const total = values.reduce((sum, v) => sum + v, 0);

  const doughnutData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: COLORS,
        borderColor: "rgba(0,0,0,0.5)",
        borderWidth: 1,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    cutout: "40%",
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#fff",
          font: {
            size: 13,
            weight: "bold",
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value.toLocaleString("tr-TR", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 0,
            })} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Line Chart Config
  const totalDuration = 10000;
  const delayBetweenPoints = totalDuration / lineData1.length;
  const previousY = (ctx) =>
    ctx.index === 0
      ? ctx.chart.scales.y.getPixelForValue(100)
      : ctx.chart.getDatasetMeta(ctx.datasetIndex).data[ctx.index - 1].getProps(["y"], true).y;

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

  const lineData = {
    datasets: [
      {
        borderColor: "red",
        borderWidth: 1,
        radius: 0,
        data: lineData1,
      },
      {
        borderColor: "blue",
        borderWidth: 1,
        radius: 0,
        data: lineData2,
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
      x: { type: "linear", ticks: { color: "#ccc" } },
      y: { ticks: { color: "#ccc" } },
    },
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border border-zinc-700 p-6 text-white w-full h-full flex flex-col gap-6">
     
      <div className="pb-3 mb-4 border-b border-zinc-700">
        <h3 className="text-lg font-semibold text-center">
          Bot Portfolio Overview
        </h3>
      </div>

      
      <div className="flex-1 flex items-center justify-center">
        <Doughnut data={doughnutData} options={doughnutOptions} />
      </div>

     
      <div className="h-[300px] mt-6">
        <Line data={lineData} options={lineOptions} />
      </div>
    </div>
  );
}*/
=======
}
>>>>>>> cdacc9b0ee71204b521cd2099fc278dfafb888b8
