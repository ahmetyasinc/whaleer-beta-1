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
    <div className="relative bg-zinc-950/90 backdrop-blur-sm border border-zinc-700 rounded-xl p-4 shadow-lg flex flex-col w-full h-full overflow-hidden group hover:border-blue-900/80 transition-all duration-200">

      {/* Glow effects */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>

      <div className="pb-3 mb-6 border-b border-zinc-800/50 relative z-10">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-zinc-100 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
            {activeChart === "amount"
              ? t("titles.valueDistribution")
              : t("titles.pnlDistribution")}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveChart("amount")}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all duration-100 ${activeChart === "amount"
                ? "bg-blue-950/30 border-blue-500/50 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                }`}
            >
              {t("buttons.value")}
            </button>
            <button
              onClick={() => setActiveChart("pnl")}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all duration-100 ${activeChart === "pnl"
                ? "bg-emerald-950/30 border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                }`}
            >
              {t("buttons.pnl")}
            </button>
          </div>
        </div>
        <p className="text-xs text-zinc-500 font-medium">
          {activeChart === "amount" ? t("descriptions.value") : t("descriptions.pnl")}
        </p>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0 overflow-y-auto relative z-10">
        {list.length > 0 ? (
          <div className="w-full h-[250px]">
            <Doughnut
              data={activeChart === "amount" ? amountData : pnlData}
              options={activeChart === "amount" ? amountOptions : pnlOptions}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-500">
            <div className="w-16 h-16 border-4 border-zinc-700 border-dashed rounded-full mb-4 animate-[spin_10s_linear_infinite]"></div>
            <p className="text-xs font-medium uppercase tracking-wide">{t("empty.noData")}</p>
          </div>
        )}
      </div>


      {list.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-800/50 relative z-10">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-bold">{t("footer.totalValue")}</p>
              <p className="text-sm font-bold text-blue-400 shadow-blue-500/10 drop-shadow-sm">
                {formatUsd(totals.totalValue)}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-zinc-900/30 border border-zinc-800/50">
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1 font-bold">{t("footer.totalPnl")}</p>
              <p
                className={`text-sm font-bold drop-shadow-sm ${totals.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
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
