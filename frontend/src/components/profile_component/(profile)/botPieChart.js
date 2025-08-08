"use client";

import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useBotStore } from "@/store/bot/botStore";
import useBotExamineStore from "@/store/bot/botExamineStore";
import { useEffect, useState } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function BotPieChart() {
  const { bots } = useBotStore();
  const { getBot, fetchAndStoreBotAnalysis } = useBotExamineStore();
  const [activeChart, setActiveChart] = useState("amount"); // "amount" veya "pnl"

  // Bot analiz verilerini yükle
  useEffect(() => {
    if (!bots || bots.length === 0) return;
    bots.forEach((bot) => {
      fetchAndStoreBotAnalysis(bot.id);
    });
  }, [bots, fetchAndStoreBotAnalysis]);

  // Bot verilerini birleştir
  const enrichedBots = (bots || []).map((bot) => {
    const examineData = getBot(bot.id);
    return {
      ...bot,
      managedAmount: bot.balance || 0,
      totalPnl: examineData?.bot_profit || 0,
      currentValue: examineData?.bot_current_value || 0,
      analysisLoaded: !!examineData,
    };
  });

  // Toplam Miktar Chart Data
  const amountData = {
    labels: enrichedBots.map((bot) =>
      bot.name.length > 15 ? bot.name.slice(0, 15) + "..." : bot.name
    ),
    datasets: [
      {
        data: enrichedBots.map((bot) =>
          bot.analysisLoaded ? bot.currentValue : bot.managedAmount
        ),
        backgroundColor: [
          "#3B82F6",
          "rgb(200,10,200)",
          "#90fbff",
          "rgb(122,255,122)",
          "hsl(246,28%,28%)",
          "#F59E0B",
          "#EF4444",
          "#8B5CF6",
          "#10B981",
          "#F97316",
        ],
        borderColor: "rgba(0,0,0,0.5)",
        borderWidth: 1,
      },
    ],
  };

  // Kar/Zarar Chart Data
  const profitableBots = enrichedBots.filter((bot) => bot.totalPnl > 0);
  const losingBots = enrichedBots.filter((bot) => bot.totalPnl < 0);

  const pnlData = {
    labels: [
      ...profitableBots.map((bot) =>
        bot.name.length > 15 ? bot.name.slice(0, 15) + "..." : bot.name
      ),
      ...losingBots.map((bot) =>
        bot.name.length > 15 ? bot.name.slice(0, 15) + "..." : bot.name
      ),
    ],
    datasets: [
      {
        label: "Profit",
        data: [
          ...profitableBots.map((bot) => Math.abs(bot.totalPnl)),
          ...losingBots.map(() => 0),
        ],
        backgroundColor: ["#10B981", "#22C55E", "#16A34A", "#15803D", "#166534", "#14532D", "#84CC16", "#65A30D"],
        borderColor: "rgba(0,0,0,0.5)",
        borderWidth: 1,
      },
      {
        label: "Loss",
        data: [
          ...profitableBots.map(() => 0),
          ...losingBots.map((bot) => Math.abs(bot.totalPnl)),
        ],
        backgroundColor: ["#EF4444", "#DC2626", "#B91C1C", "#991B1B", "#7F1D1D", "#F87171", "#FCA5A5", "#FECACA"],
        borderColor: "rgba(0,0,0,0.5)",
        borderWidth: 1,
      },
    ],
  };

  const amountOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#fff",
          font: { size: 12, weight: "bold" },
          boxWidth: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw || 0;
            const total =
              context.dataset?.data?.reduce((a, b) => a + b, 0) || 0;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: $${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  const pnlOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "right",
        labels: {
          color: "#fff",
          font: { size: 12, weight: "bold" },
          boxWidth: 12,
          filter: function (legendItem, chartData) {
            try {
              const datasetIndex = legendItem.datasetIndex;
              const index = legendItem.index;
              const dataset = chartData?.datasets?.[datasetIndex];
              const value = dataset?.data?.[index];
              return value > 0;
            } catch (e) {
              return false;
            }
          },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw || 0;
            const isProfit = context.datasetIndex === 0;
            const prefix = isProfit ? "+" : "-";
            return `${context.label}: ${prefix}$${Math.abs(value).toLocaleString()}`;
          },
        },
      },
    },
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border-1 border-zinc-700 p-6 text-white w-full h-full flex flex-col">
      <div className="pb-3 mb-4 border-b border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            {activeChart === "amount" ? "Bot Value Distribution" : "Bot P&L Distribution"}
          </h3>
          <div className="flex bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setActiveChart("amount")}
              className={`px-3 py-1 rounded text-sm font-medium transition-all duration-300 ${
                activeChart === "amount"
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg scale-105"
                  : "text-gray-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              Value
            </button>
            <button
              onClick={() => setActiveChart("pnl")}
              className={`px-3 py-1 rounded text-sm font-medium transition-all duration-300 ${
                activeChart === "pnl"
                  ? "bg-gradient-to-r from-emerald-400 to-teal-700 text-white shadow-lg scale-105"
                  : "text-gray-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              P&L
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          {activeChart === "amount"
            ? "Distribution of current bot values"
            : "Profit (outer ring) and Loss (inner ring) distribution"}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0">
        {enrichedBots.length > 0 ? (
          <div className="w-full h-full max-h-[400px]">
            <Doughnut
              data={activeChart === "amount" ? amountData : pnlData}
              options={activeChart === "amount" ? amountOptions : pnlOptions}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <div className="w-16 h-16 border-4 border-gray-600 border-dashed rounded-full mb-4"></div>
            <p className="text-sm">No bot data available</p>
          </div>
        )}
      </div>

      {enrichedBots.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400 mb-1">Total Value</p>
              <p className="text-sm font-bold text-blue-400">
                $
                {enrichedBots
                  .reduce(
                    (sum, bot) =>
                      sum + (bot.analysisLoaded ? bot.currentValue : bot.managedAmount),
                    0
                  )
                  .toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">Total P&L</p>
              <p
                className={`text-sm font-bold ${
                  enrichedBots.reduce((sum, bot) => sum + bot.totalPnl, 0) >= 0
                    ? "text-emerald-400"
                    : "text-red-400"
                }`}
              >
                {enrichedBots.reduce((sum, bot) => sum + bot.totalPnl, 0) >= 0 ? "+" : ""}
                $
                {enrichedBots
                  .reduce((sum, bot) => sum + bot.totalPnl, 0)
                  .toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
