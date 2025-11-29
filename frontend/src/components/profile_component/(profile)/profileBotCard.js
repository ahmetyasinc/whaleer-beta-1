"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import { FaRobot, FaDollarSign, FaChartLine } from "react-icons/fa";
import { RiRobotLine } from "react-icons/ri";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoSearch } from "react-icons/io5";
import { FaEye } from "react-icons/fa";
import useBotExamineStore from "@/store/bot/botExamineStore";
import ExamineBot from "@/components/profile_component/(bot)/examineBot";
import { useTranslation } from "react-i18next";

export default function ModernBotList({ bots = [] }) {
  const { t, i18n } = useTranslation("botsList");
  const locale = i18n.language || "en";

  const { fetchAndStoreBotAnalysis } = useBotExamineStore();
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);
  const [isExamineOpen, setIsExamineOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [examineLoadingId, setExamineLoadingId] = useState(null);

  // Dışarı tıklayınca menüyü kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest(".menu-container")) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // UI’da kullanacağımız listeyi stabilize et
  const list = useMemo(() => (Array.isArray(bots) ? bots : []), [bots]);

  const handlePreviewBot = (botId) => {
    setMenuOpen(null);
  };

  const handleExamineBot = async (botId) => {
    try {
      setExamineLoadingId(botId);
      await fetchAndStoreBotAnalysis(botId);
      setSelectedBotId(botId);
      setIsExamineOpen(true);
    } catch (e) {
      console.error("Examine fetch error:", e);
    } finally {
      setExamineLoadingId(null);
      setMenuOpen(null);
    }
  };

  const formatUsd = (v) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(Number(v || 0));

  const formatPercent = (v) =>
    `${Number(v || 0) >= 0 ? "" : "-"}${Math.abs(Number(v || 0)).toFixed(2)}%`;

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6 bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="mb-8 border-b border-gray-700 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent">
            {t("title")}
          </h1>
        </div>
      </div>

      {/* Bot List */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto px-3 max-h-[calc(100vh-250px)]">
          {list.length > 0 ? (
            <div className="space-y-2">
              {list.map((bot, index) => {
                const isOpen = menuOpen === bot.id;
                const isActive = !!bot.active;
                const currentValue = bot.current_usd_value ?? bot.initial_usd_value ?? 0;
                const totalPnl = bot.profit_usd ?? 0;
                const marginPct = bot.profit_percent ?? 0;

                return (
                  <div
                    key={bot.id}
                    className={`group relative bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-lg py-3 px-3 border border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5
                    ${isOpen ? "z-50" : ""}`}
                    style={{ animationDelay: `${index * 200}ms`, animation: "fadeInUp 1s ease-out forwards" }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left */}
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="p-2.5 rounded-full bg-gray-600">
                            <RiRobotLine className="w-5 h-5 text-neutral-400" />
                          </div>
                          <div className="absolute -top-1 -right-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-red-400"} animate-pulse`} />
                            <div className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${isActive ? "bg-emerald-400" : "bg-red-400"} opacity-30 animate-ping`} />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-base font-semibold text-white truncate max-w-[200px] group-hover:text-blue-300 transition-colors duration-300">
                            {bot.name}
                          </h3>
                          <p className={`text-xs ${isActive ? "text-emerald-400" : "text-red-400"} font-medium`}>
                            {isActive ? t("status.active") : t("status.inactive")}
                          </p>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex items-center gap-6">
                        {/* Current Value */}
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FaDollarSign className="w-3.5 h-3.5 text-blue-400" />
                            <span className="text-xs text-gray-400">{t("fields.currentValue")}</span>
                          </div>
                          <span className="text-sm font-bold text-blue-400">
                            {formatUsd(currentValue)}
                          </span>
                        </div>

                        {/* Margin (profit %) */}
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FaChartLine className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-xs text-gray-400">{t("fields.margin")}</span>
                          </div>
                          <span className={`text-sm font-bold ${Number(totalPnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatPercent(marginPct)}
                          </span>
                        </div>

                        {/* Total P&L (USD) */}
                        <div className="text-right">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FaDollarSign className="w-3.5 h-3.5 text-purple-400" />
                            <span className="text-xs text-gray-400">{t("fields.totalPl")}</span>
                          </div>
                          <span className={`text-sm font-bold ${Number(totalPnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {`${Number(totalPnl) >= 0 ? "+" : ""}${formatUsd(totalPnl).replace("$", "")}`}
                          </span>
                        </div>

                        {/* Menu */}
                        <div className="relative inline-block text-left menu-container" ref={menuOpen === bot.id ? menuRef : null}>
                          <button
                            onClick={() => setMenuOpen(menuOpen === bot.id ? null : bot.id)}
                            className="p-2 rounded hover:bg-gray-700 transition-colors duration-200"
                          >
                            <BsThreeDotsVertical className="text-gray-300" size={20} />
                          </button>

                          {menuOpen === bot.id && (
                            <div className="absolute top-0 right-10 w-36 bg-gray-900 rounded-lg shadow-lg z-50 border border-gray-700">
                              <button
                                onClick={() => handleExamineBot(bot.id)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-amber-400 hover:bg-gray-800 rounded-t-lg transition-colors duration-200 disabled:opacity-60"
                                disabled={examineLoadingId === bot.id}
                              >
                                <IoSearch size={16} />
                                {examineLoadingId === bot.id ? t("menu.loading") : t("menu.examine")}
                              </button>
                              {/*<button
                                onClick={() => handlePreviewBot(bot.id)}
                                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-violet-400 hover:bg-stone-800 rounded-b-lg transition-colors duration-200"
                              >
                                <FaEye size={16} /> {t("menu.preview")}
                              </button>*/}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-6 bg-slate-800/30 rounded-full mb-4">
                <FaRobot className="w-12 h-12 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">{t("empty.title")}</h3>
              <p className="text-gray-500 max-w-sm">
                {t("empty.desc")}
              </p>
            </div>
          )}
        </div>
      </div>

      <ExamineBot
        isOpen={isExamineOpen}
        onClose={() => setIsExamineOpen(false)}
        botId={selectedBotId}
      />

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
