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
    <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border-1 border-zinc-700 p-6 text-white w-full h-full flex flex-col">
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
}