"use client";

import React, { useMemo, useState } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useTranslation } from "react-i18next";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function BotPieChart({ bots = [] }) {
  const [activeChart, setActiveChart] = useState("amount"); // "amount" | "pnl"
  const { t, i18n } = useTranslation("botPieChart");
  const locale = i18n.language || "en";

  // ------- Helpers -------
  const trimName = (name = "") => (name.length > 15 ? name.slice(0, 15) + "..." : name);
  const formatUsd = (v) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Number(v || 0));

  // ------- Stabilize input -------
  const list = useMemo(() => (Array.isArray(bots) ? bots : []), [bots]);

  // ------- Amount (Value) chart data -------
  const amountData = useMemo(() => {
    const labels = list.map((b) => trimName(b.name));
    const data = list.map((b) =>
      Number(b.current_usd_value ?? b.initial_usd_value ?? 0)
    );

    return {
      labels,
      datasets: [
        {
          data,
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
  }, [list]);

  const amountOptions = useMemo(
    () => ({
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
              const value = Number(context.raw || 0);
              const total =
                (context.dataset?.data || []).reduce(
                  (a, b) => Number(a || 0) + Number(b || 0),
                  0
                ) || 0;
              const pct = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${formatUsd(value)} (${pct}%)`;
            },
          },
        },
      },
    }),
    [locale]
  );

  // ------- PnL chart data -------
  const pnlData = useMemo(() => {
    const profitable = list.filter((b) => Number(b.profit_usd || 0) > 0);
    const losing = list.filter((b) => Number(b.profit_usd || 0) < 0);

    const labels = [
      ...profitable.map((b) => trimName(b.name)),
      ...losing.map((b) => trimName(b.name)),
    ];

    return {
      labels,
      datasets: [
        {
          label: "Profit",
          data: [
            ...profitable.map((b) => Math.abs(Number(b.profit_usd || 0))),
            ...losing.map(() => 0),
          ],
          backgroundColor: [
            "#10B981",
            "#22C55E",
            "#16A34A",
            "#15803D",
            "#166534",
            "#14532D",
            "#84CC16",
            "#65A30D",
          ],
          borderColor: "rgba(0,0,0,0.5)",
          borderWidth: 1,
        },
        {
          label: "Loss",
          data: [
            ...profitable.map(() => 0),
            ...losing.map((b) => Math.abs(Number(b.profit_usd || 0))),
          ],
          backgroundColor: [
            "#EF4444",
            "#DC2626",
            "#B91C1C",
            "#991B1B",
            "#7F1D1D",
            "#F87171",
            "#FCA5A5",
            "#FECACA",
          ],
          borderColor: "rgba(0,0,0,0.5)",
          borderWidth: 1,
        },
      ],
    };
  }, [list]);

  const pnlOptions = useMemo(
    () => ({
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
                const value = Number(dataset?.data?.[index] || 0);
                return value > 0;
              } catch {
                return false;
              }
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const value = Number(context.raw || 0);
              const isProfit = context.datasetIndex === 0;
              const prefix = isProfit ? "+" : "-";
              return `${context.label}: ${prefix}${formatUsd(value)}`;
            },
          },
        },
      },
    }),
    [locale]
  );

  // ------- Footer totals -------
  const totals = useMemo(() => {
    const totalValue = list.reduce(
      (sum, b) => sum + Number(b.current_usd_value ?? b.initial_usd_value ?? 0),
      0
    );
    const totalPnl = list.reduce((sum, b) => sum + Number(b.profit_usd || 0), 0);
    return { totalValue, totalPnl };
  }, [list]);

  return (
    <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border border-zinc-700 p-6 text-white w-full h-full flex flex-col">
      <div className="pb-3 mb-4 border-b border-zinc-700">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">
            {activeChart === "amount"
              ? t("titles.valueDistribution")
              : t("titles.pnlDistribution")}
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
              {t("buttons.value")}
            </button>
            <button
              onClick={() => setActiveChart("pnl")}
              className={`px-3 py-1 rounded text-sm font-medium transition-all duration-300 ${
                activeChart === "pnl"
                  ? "bg-gradient-to-r from-emerald-400 to-teal-700 text-white shadow-lg scale-105"
                  : "text-gray-400 hover:text-white hover:bg-slate-700"
              }`}
            >
              {t("buttons.pnl")}
            </button>
          </div>
        </div>
        <p className="text-xs text-gray-400">
          {activeChart === "amount" ? t("descriptions.value") : t("descriptions.pnl")}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0">
        {list.length > 0 ? (
          <div className="w-full h-full max-h[400px]">
            <Doughnut
              data={activeChart === "amount" ? amountData : pnlData}
              options={activeChart === "amount" ? amountOptions : pnlOptions}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400">
            <div className="w-16 h-16 border-4 border-gray-600 border-dashed rounded-full mb-4"></div>
            <p className="text-sm">{t("empty.noData")}</p>
          </div>
        )}
      </div>

      {list.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-700">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400 mb-1">{t("footer.totalValue")}</p>
              <p className="text-sm font-bold text-blue-400">
                {formatUsd(totals.totalValue)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">{t("footer.totalPnl")}</p>
              <p
                className={`text-sm font-bold ${
                  totals.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {`${totals.totalPnl >= 0 ? "+" : ""}${formatUsd(
                  Math.abs(totals.totalPnl)
                )}`}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
