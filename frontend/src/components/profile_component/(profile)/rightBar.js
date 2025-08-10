"use client";
import { useState } from "react";
import { FaChartBar, FaHistory, FaRecycle, FaBolt } from "react-icons/fa";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import useStrategyStore from "@/store/indicator/strategyStore";
import useBotExamineStore from "@/store/bot/botExamineStore";

export default function RightBar() {
    
  const { strategies  } = useStrategyStore();
  const { indicators } = useIndicatorStore();
  const { getBot } = useBotExamineStore();

  const indicatorsCount = Array.isArray(indicators) ? indicators.length : 0;
  const strategiesCount = Array.isArray(strategies) ? strategies.length : 0;

  const performance = {
    daily: { value: 2.5, trades: 14 },  
    weekly: { value: -1.2, trades: 68 },
    monthly: { value: 8.4, trades: 240 },
  };

  const stats = [
    { title: "Number of Indicators", value: indicatorsCount },
    { title: "Number of Strategies", value: strategiesCount },
    { title: "Number of Bots", value: 4 },
    { title: "Active Bots", value: 3 },
  ];

  return (
    <div className="w-[260px] h-[calc(100vh-60px)] pt-4 px-3 bg-black text-white overflow-y-auto shrink-0">
      {/* Top Action Buttons */}
      <div className="grid grid-cols-1 gap-[10px] mb-4">
          <button className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-600 hover:bg-gradient-to-r hover:from-amber-500 hover:to-rose-600 duration-200 text-white px-3 py-2 rounded-lg text-xs font-medium hover:shadow-lg transition">
          <FaBolt className="text-[16px]" /> Hızlı İşlemler
        </button>
        <button className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:bg-gradient-to-r hover:from-sky-600 hover:to-violet-600 duration-200 text-white px-3 py-2 rounded-lg text-xs font-medium hover:shadow-lg transition">
          <FaChartBar className="text-[16px]"  /> Yayınladığım Göstergeler
        </button>
        <button className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:bg-gradient-to-r hover:from-emerald-500 hover:to-teal-700 duration-200 text-white px-3 py-2 rounded-lg text-xs font-medium hover:shadow-lg transition">
          <FaRecycle className="text-[16px]"  /> Geri Dönüşüm Kutusu
        </button>
          <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-700 hover:bg-gradient-to-r hover:from-violet-500 hover:to-sky-700 duration-200 text-white px-3 py-2 rounded-lg text-xs font-medium hover:shadow-lg transition">
          <FaHistory className="text-[16px]"  /> Alışveriş Geçmişim
        </button>
      </div>

      {/* Stats */}
      <div className="space-y-3 mb-5">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-r pt-4 from-gray-950 to-zinc-900 rounded-lg h-16 shadow-md hover:shadow-lg border-1 border-neutral-700 transition-all duration-300 flex flex-col justify-center px-4"
            style={{
              animationDelay: `${index * 200}ms`,
              animation: "fadeInUpRightBar 1s ease-out forwards",
            }}
          >
            <h4 className="text-xs font-medium text-zinc-400 mb-1">{stat.title}</h4>
            <p className="text-lg font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Bot Performance (Daily/Weekly/Monthly) */}
      <div className="space-y-3">
        {["daily", "weekly", "monthly"].map((period, index) => {
          const { value, trades } = performance[period];
          return (
            <div
              key={index}
              className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-lg h-20 shadow-md hover:shadow-lg border-1 border-neutral-700 transition-all duration-300 flex flex-col justify-center px-4"
            >
              <h4 className="text-xs font-medium text-zinc-400 capitalize mb-1">
                {period} Performance
              </h4>
              <div className="flex justify-between items-center">
                <p
                  className={`text-lg font-bold ${
                    value >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {value >= 0 ? "+" : "-"}
                  {Math.abs(value).toFixed(2)}%
                </p>
                <span className="text-xs text-zinc-400">{trades} trades</span>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        @keyframes fadeInUpRightBar {
          from {
            opacity: 0;
            transform: translateX(40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
