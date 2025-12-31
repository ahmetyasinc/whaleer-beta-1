"use client";

import { useMemo } from "react";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useProfileStore } from "@/store/profile/profileStore";
import { useAccountDataStore } from "@/store/profile/accountDataStore";
import { useTranslation } from "react-i18next";
import { RiPieChartLine } from "react-icons/ri"; // 🥧 ikon eklendi

ChartJS.register(ArcElement, Tooltip, Legend);

export default function PortfolioPieChart() {
  const { t, i18n } = useTranslation("portfolioChart");
  const locale = i18n.language || "en";

  const activeApiId = useProfileStore((s) => s.activeApiId);
  const portfolioMap = useAccountDataStore((s) => s.portfolioByApiId);

  const portfolio = useMemo(
    () => portfolioMap?.[activeApiId] || [],
    [portfolioMap, activeApiId]
  );

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

  const formatCurrency = (amount) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(Number(amount || 0));

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
    maintainAspectRatio: false,
    cutout: "40%",
    plugins: {
      legend: {
        position: "right",
        labels: { color: "#fff", font: { size: 13, weight: "bold" } },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const percentage = total ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          },
        },
      },
    },
  };

  const isEmpty = portfolio.length === 0 || total === 0;

  return (
    <div className="relative bg-zinc-950/90 backdrop-blur-sm border border-zinc-700 rounded-xl shadow-lg p-5 text-white w-full h-full flex flex-col group hover:border-blue-900/80 transition-all duration-200">

      {/* Glow effects */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>

      {/* Başlık */}
      <div className="pb-4 mb-4 border-b border-zinc-800/50 relative z-10">
        <h3 className="text-zinc-100 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
          {t("title")}
        </h3>
      </div>

      {/* Grafik Alanı */}
      <div className="relative flex-1 w-full min-h-10 flex items-center justify-center z-10">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center text-zinc-600 animate-fadeIn gap-3">
            <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-700/50 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(0,0,0,0.5)]">
              <RiPieChartLine className="text-3xl text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">{t("noData", { defaultValue: "No portfolio data available" })}</p>
              <p className="text-xs text-zinc-600 mt-1">{t("connectExchange", { defaultValue: "Connect an API key or fund your account to see data." })}</p>
            </div>
          </div>
        ) : (
          <div className="w-full h-full max-h-[300px] my-0">
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
        )}
      </div>
    </div>
  );
}
