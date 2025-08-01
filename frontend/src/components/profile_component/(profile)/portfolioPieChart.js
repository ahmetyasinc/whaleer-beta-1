"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { usePortfolioStore } from "@/store/profile/portfolioStore";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PortfolioChart() {
  const { portfolio } = usePortfolioStore();

  const labels = portfolio.map((item) => item.symbol.toUpperCase());
  const values = portfolio.map((item) => item.amount);

  const COLORS = [
    "#3B82F6", // Tailwind blue-500
    "hsl(290,100%,79%)", // pembe
    "#90fbff", // açık mavi
    "rgb(122,255,122)", // yeşil
    "hsl(246,28%,28%)", // mor
  ];

  const total = values.reduce((sum, v) => sum + v, 0);

  const data = {
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

  const options = {
    responsive: true,
    cutout: "40%", // iç boşluk (doughnut kalınlığı)
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
          Bot Portfolio Cost Distribution
        </h3>
      </div>

      {/* Chart */}
      <div className="flex-1 flex items-center justify-center">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
