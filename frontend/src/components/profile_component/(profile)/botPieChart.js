"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import useProfileBotStore from "@/store/profile/profileBotStore";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function BotPieChart() {
  const { bots } = useProfileBotStore();

  const data = {
    labels: bots.map((bot) =>
      bot.name.length > 15 ? bot.name.slice(0, 15) + "..." : bot.name
    ),
    datasets: [
      {
        data: bots.map((bot) => bot.managedAmount),
        backgroundColor: [
          "#3B82F6", // mavi
          "rgb(200,10,200)", // pembe
          "#90fbff", // açık mavi
          "rgb(122,255,122)", // yeşil
          "hsl(246,28%,28%)", // mor
        ],
        borderColor: "rgba(0,0,0,0.5)",
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#fff", // yazı rengini beyaz yap
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
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
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
          Bot Management Distribution
        </h3>
      </div>

      {/* Chart */}
      <div className="flex-1 flex items-center justify-center">
        <Doughnut data={data} options={options} />
      </div>
    </div>
  );
}
