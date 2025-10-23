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
    <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border border-zinc-700 p-6 text-white w-full h-full flex flex-col">
      {/* Başlık */}
      <div className="pb-3 mb-4 border-b border-zinc-700">
        <h3 className="text-lg font-semibold text-center">{t("title")}</h3>
      </div>

      {/* Grafik Alanı */}
      <div className="relative w-full h-[300px] mb-4 flex items-center justify-center">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center text-center text-gray-400 animate-fadeIn">
            <RiPieChartLine className="text-6xl text-gray-500 mb-2 animate-pulse" />
            <p className="text-sm font-medium">{t("noData", { defaultValue: "No portfolio data available" })}</p>
            <p className="text-xs text-gray-500 mt-1">{t("connectExchange", { defaultValue: "Connect an API key or fund your account to see data." })}</p>
          </div>
        ) : (
          <Doughnut data={doughnutData} options={doughnutOptions} />
        )}
      </div>
    </div>
  );
}
