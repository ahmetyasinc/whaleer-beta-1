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
  const [selectedBotName, setSelectedBotName] = useState(null);

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

  const handleExamineBot = (bot) => {
    setSelectedBotId(bot.id);
    setSelectedBotName(bot.name);
    setIsExamineOpen(true);
    setMenuOpen(null);

    // Fetch data in background
    fetchAndStoreBotAnalysis(bot.id).catch(e => {
      console.error("Examine fetch error:", e);
    });
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
    <div className="relative bg-zinc-950/90 backdrop-blur-sm border border-zinc-700 rounded-xl p-5 shadow-lg flex flex-col w-full h-full overflow-hidden group/container hover:border-blue-900/80 transition-all duration-200">

      {/* Glow effects */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="pb-3 mb-4 border-b border-zinc-800/50 relative z-10 flex-shrink-0">
        <h3 className="text-zinc-100 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
          {t("title")}
        </h3>
      </div>

      {/* Bot List */}
      <div className="flex-1 flex flex-col relative z-10 min-h-0">
        <div className="flex-1 overflow-y-auto px-2 -mx-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {list.length > 0 ? (
            <div className="space-y-3">
              {list.map((bot, index) => {
                const isOpen = menuOpen === bot.id;
                const isActive = !!bot.active;
                const currentValue = bot.current_usd_value ?? bot.initial_usd_value ?? 0;
                const totalPnl = bot.profit_usd ?? 0;
                const marginPct = bot.profit_percent ?? 0;

                return (
                  <div
                    key={bot.id}
                    className={`group relative bg-zinc-900/30 backdrop-blur-sm rounded-lg py-3 px-4 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-blue-500/30 transition-all duration-100 hover:shadow-[0_0_15px_-5px_rgba(59,130,246,0.15)] hover:-translate-y-0.5
                    ${isOpen ? "z-50 border-blue-500/40 bg-zinc-800" : ""}`}
                    style={{ animationDelay: `${index * 100}ms`, animation: "fadeInUp 0.5s ease-out forwards" }}
                  >
                    <div className="flex items-center justify-between">
                      {/* Left */}
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="p-2 rounded-lg bg-zinc-800 border border-zinc-700 group-hover:border-blue-500/40 transition-colors">
                            <RiRobotLine className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors" />
                          </div>
                          <div className="absolute -top-1 -right-1">
                            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"}`} />
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-zinc-200 truncate max-w-[150px] group-hover:text-blue-300 transition-colors duration-100">
                            {bot.name}
                          </h3>
                          <div className={`text-[10px] uppercase tracking-wide font-bold ${isActive ? "text-emerald-500" : "text-red-500"}`}>
                            {isActive ? t("status.active") : t("status.inactive")}
                          </div>
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex items-center gap-4 sm:gap-6">
                        {/* Current Value */}
                        <div className="text-right hidden sm:block">
                          <div className="flex items-center justify-end gap-1 mb-0.5">
                            <FaDollarSign className="w-3 h-3 text-blue-500/70" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">{t("fields.currentValue")}</span>
                          </div>
                          <span className="text-sm font-mono font-bold text-blue-400">
                            {formatUsd(currentValue)}
                          </span>
                        </div>

                        {/* Margin (profit %) */}
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 mb-0.5">
                            <FaChartLine className="w-3 h-3 text-emerald-500/70" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">{t("fields.margin")}</span>
                          </div>
                          <span className={`text-sm font-mono font-bold ${Number(totalPnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {formatPercent(marginPct)}
                          </span>
                        </div>

                        {/* Total P&L (USD) */}
                        <div className="text-right">
                          <div className="flex items-center justify-end gap-1 mb-0.5">
                            <FaDollarSign className="w-3 h-3 text-purple-500/70" />
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">{t("fields.totalPl")}</span>
                          </div>
                          <span className={`text-sm font-mono font-bold ${Number(totalPnl) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {`${Number(totalPnl) >= 0 ? "+" : ""}${formatUsd(totalPnl).replace("$", "")}`}
                          </span>
                        </div>

                        {/* Menu */}
                        <div className="relative inline-block text-left menu-container" ref={menuOpen === bot.id ? menuRef : null}>
                          <button
                            onClick={() => setMenuOpen(menuOpen === bot.id ? null : bot.id)}
                            className="p-1.5 rounded-lg hover:bg-zinc-700/50 text-zinc-400 hover:text-zinc-200 transition-colors duration-75"
                          >
                            <BsThreeDotsVertical size={16} />
                          </button>

                          {menuOpen === bot.id && (
                            <div className="absolute top-8 right-0 w-32 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 overflow-hidden">
                              <button
                                onClick={() => handleExamineBot(bot)}
                                className="flex items-center gap-2 w-full px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-amber-500 hover:bg-zinc-800 transition-colors duration-75"
                              >
                                <IoSearch size={14} />
                                {t("menu.examine")}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-10 gap-3">
              <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-700/50 flex items-center justify-center shadow-[0_0_15px_-5px_rgba(0,0,0,0.5)]">
                <RiRobotLine className="w-8 h-8 text-zinc-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wide mb-1">{t("empty.title")}</h3>
                <p className="text-xs text-zinc-600 max-w-[200px] mx-auto leading-relaxed">
                  {t("empty.desc")}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <ExamineBot
        isOpen={isExamineOpen}
        onClose={() => setIsExamineOpen(false)}
        botId={selectedBotId}
        initialBotName={selectedBotName}
      />

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
