'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from "react-dom";
import useBotExamineStore from "@/store/bot/botExamineStore";
import { useBotStore } from "@/store/bot/botStore";
import { BotModal } from './createBotModal';
import { FaRegTrashAlt } from 'react-icons/fa';
import { FiEdit3 } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoSearch } from "react-icons/io5";
import RunBotToggle from './runBotToggle';
import WorkingBotAnimation from './workingBotAnimation';
import ExamineBot from "./examineBot";
import { FaCheck } from "react-icons/fa";
import DeleteBotConfirmModal from "./deleteBotConfirmModal";

/* ---- Portal Tooltip Component ---- */
const PortalTooltip = ({ children, content }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 10, // Biraz yukarı
        left: rect.left + rect.width / 2
      });
      setVisible(true);
    }
  };

  const hideTooltip = () => setVisible(false);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block"
      >
        {children}
      </div>
      {visible && createPortal(
        <div
          className="fixed z-[9999] -translate-x-1/2 -translate-y-full w-48 p-2 bg-black border border-zinc-700 rounded-md shadow-xl text-xs text-zinc-300 text-center leading-relaxed pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-zinc-700 rotate-45"></div>
        </div>,
        document.body
      )}
    </>
  );
};

const AnimatedDots = () => {
  const [dots, setDots] = useState("");

  useEffect(() => {
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % 6;
      if (step === 0) setDots("");
      else if (step === 1) setDots(".");
      else if (step === 2) setDots("..");
      else if (step === 3) setDots("...");
      else if (step === 4) setDots("..");
      else if (step === 5) setDots(".");
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return <span className="inline-block w-3 text-left">{dots}</span>;
};
import ShutDownBotModal from "./shutDownBotModal";
import BotToggleConfirmModal from "./botToggleConfirmModal";
import { useTranslation } from "react-i18next";
import { useBotPerformanceStore } from "@/store/bot/botPerformanceStore";
import { FaBan } from "react-icons/fa";
import { GrCircleQuestion } from "react-icons/gr";
import Gauge from './gauge';

/* ---- Type rozet stili ---- */
function getTypeBadgeClasses(type) {
  const t = (type || 'spot').toLowerCase();
  if (t === 'futures') return 'bg-amber-500/15 text-amber-300 border border-amber-700';
  return 'bg-emerald-500/15 text-emerald-300 border border-emerald-700'; // spot
}
function TypeBadge({ type }) {
  const { t: tr } = useTranslation("botCard");
  return (
    <span
      className={`px-2 py-[2px] rounded-full uppercase tracking-wide text-[10px] ${getTypeBadgeClasses(type)} shrink-0`}
      title={tr("typeBadgeTitle", { type: type || 'spot' })}
    >
      {type || 'spot'}
    </span>
  );
}

/* ---- Geri sayım yardımcıları ---- */
function pad2(n) { return String(Math.max(0, n)).padStart(2, '0'); }
function diffParts(ms) {
  const clamped = Math.max(0, ms);
  const d = Math.floor(clamped / (24 * 3600e3));
  const h = Math.floor((clamped % (24 * 3600e3)) / 3600e3);
  const m = Math.floor((clamped % 3600e3) / 60e3);
  const s = Math.floor((clamped % 60e3) / 1e3);
  return { d, h, m, s };
}

function RentedCountdown({ rent_expires_at }) {
  const { t } = useTranslation("botCard");
  const expiry = useMemo(() => rent_expires_at ? new Date(rent_expires_at).getTime() : null, [rent_expires_at]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiry]);

  const remaining = expiry ? (expiry - now) : 0;
  const expired = !expiry || remaining <= 0;
  const { d, h, m, s } = diffParts(remaining);

  return (
    <>
      <div
        className={[
          "w-full flex items-center justify-between rounded-md px-3 py-2 border",
          expired
            ? "bg-gray-800/60 border-gray-700 text-gray-400"
            : "bg-cyan-500/10 border-cyan-700 text-cyan-200"
        ].join(' ')}
        title={expired ? t("rental.ended") : t("rental.timeLeft")}
      >
        <span className="text-[11px] uppercase tracking-wider">{t("rental.label")}</span>
        <span className="font-mono text-sm">
          {pad2(d)}:{pad2(h)}:{pad2(m)}:{pad2(s)}
        </span>
      </div>
      <div className="h-px w-full bg-gray-700 my-2" />
    </>
  );
}

export const BotCard = ({ bot }) => {
  const { t } = useTranslation("botCard");
  // === STORE & ACTIONLAR ===
  const removeBot = useBotStore((state) => state.removeBot);
  const shutDownBot = useBotStore((state) => state.shutDownBot);
  const toggleBotActive = useBotStore((state) => state.toggleBotActive);
  const { fetchAndStoreBotAnalysis } = useBotExamineStore.getState();

  // === PERFORMANCE STORE ===
  const generatePerformance = useBotPerformanceStore((state) => state.generatePerformanceData);
  const perfData = useBotPerformanceStore((state) => state.performanceData[bot.id]);

  useEffect(() => {
    // Veri yoksa veya bot id/type değiştiyse oluştur
    if (bot.id && bot.type && !perfData) {
      // User request: "başlangıç bakiyesini modalden al... oluşturma tarihini de bot oluşturulduğu tarihi al"
      // bot.initial_usd_value -> Başlangıç bakiyesi
      // bot.created_at -> Başlangıç tarihi (eğer varsa, yoksa fallback)

      const initialValues = {
        initialBalance: bot.initial_usd_value || bot.balance || 0,
        currentBalance: bot.current_usd_value || bot.balance || 0,
        startDate: bot.created_at || new Date().toISOString(),
        powerPoint: bot.power_score,
        workTime: bot.work_time,
        exposure: {
          long: bot.exposure_long,
          short: bot.exposure_short,
          spot: bot.exposure_spot // For spot, we can use a single value or handle it in store
        }
      };

      generatePerformance(bot.id, bot.type, initialValues);
    }
  }, [bot.id, bot.type, bot.initial_usd_value, bot.balance, bot.created_at, generatePerformance, perfData]);

  // Yardımcı format fonksiyonları
  const fmtMoney = (val) => val?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0.00';
  const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
  const isFutures = bot.type?.toLowerCase()?.includes('future');


  // === UI STATE ===
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [isShotDownModalOpen, setShotDownModalOpen] = useState(false);
  const [isToggleConfirmOpen, setToggleConfirmOpen] = useState(false);
  const [toggleAction, setToggleAction] = useState(null); // 'start' or 'stop'

  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExamineOpen, setIsExamineOpen] = useState(false);
  const menuRef = useRef(null);

  // === RENTED KONTROL & SAYAÇ ===
  const isRented = bot?.acquisition_type === "RENTED";
  const expiryMs = isRented && bot?.rent_expires_at ? new Date(bot.rent_expires_at).getTime() : null;
  const isExpired = isRented && (expiryMs ? Date.now() >= expiryMs : true);

  // Saniyelik tick (countdown için)
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    if (!expiryMs) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiryMs]);

  // === MENÜ DIŞINA TIKLAMA ===
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // === BLOKAJ (API / VALUE EKSİKSE) ===
  const isBlocked =
    bot?.initial_usd_value == null ||
    bot?.current_usd_value == null ||
    typeof bot?.api === "undefined";

  // Toggle için temel disable title
  const disableTitle = isBlocked
    ? t("toggle.blocked")
    : isRented && isExpired
      ? t("toggle.expired")
      : undefined;

  // === TOGGLE LOGIC ===
  const canToggle = !isBlocked && !!bot.api;
  const finalToggleDisabled = !canToggle;
  const finalDisableTitle = disableTitle;

  // === Toggle Confirmation ===
  const handleConfirmToggle = () => {
    if (bot?.id) {
      toggleBotActive(bot.id);
    }
    setToggleConfirmOpen(false);
  };

  /* ==== KART TASARIMI ==== */
  return (
    <>
      <div className={`group relative rounded-xl overflow-hidden transition-all duration-300 bg-zinc-950 border w-full ${bot.isActive ? 'border-emerald-500/40 shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)]' : 'border-zinc-800/60'}`}>

        {/* Neon Glow Border Effect */}
        <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-cyan-500/30 via-zinc-800/0 to-purple-500/30 -z-10 opacity-30 transition-opacity" />

        <div className="grid grid-cols-6 h-full bg-zinc-950/80 backdrop-blur-sm p-5 w-full">

          {/* SÜTUN 1: Bot Bilgi Alanı */}
          <div className="flex flex-col gap-3 pr-4 border-r border-zinc-800/50">
            {/* Başlık satırı */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col w-[calc(100%-24px)]">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 to-blue-200 truncate leading-tight drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                    {bot.name}
                  </h3>
                  <div className="shrink-0 flex">
                    <TypeBadge type={bot.type} />
                  </div>
                </div>
              </div>

              {/* Menu */}
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-1.5 rounded-md text-zinc-400 hover:text-cyan-400 hover:bg-zinc-800/50 transition-colors"
                  aria-label={t("menu.moreActions")}
                >
                  <BsThreeDotsVertical size={18} />
                </button>
                {menuOpen && (
                  <div className="absolute left-0 top-8 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl shadow-black/50 z-50 overflow-hidden text-sm animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => { setEditing(true); setMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-cyan-400 transition-colors">
                      <FiEdit3 size={15} /> {t("menu.edit")}
                    </button>

                    <button
                      onClick={() => { setSelectedBotId(bot.id); setDeleteModalOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-zinc-300 hover:bg-zinc-800 hover:text-rose-400 transition-colors">
                      <FaRegTrashAlt size={15} /> {t("menu.deleteDev")}
                    </button>

                    <button
                      onClick={() => {
                        if (isBlocked) return;
                        setIsExamineOpen(true);
                        fetchAndStoreBotAnalysis(bot.id);
                        setMenuOpen(false);
                      }}
                      disabled={isBlocked}
                      className={`flex items-center gap-3 w-full px-4 py-2.5 transition-colors ${isBlocked ? "text-zinc-600 cursor-not-allowed" : "text-amber-400 hover:bg-zinc-800 hover:text-amber-300"
                        }`}
                    >
                      <IoSearch size={16} /> {t("menu.examine")}
                    </button>

                    <div className="h-px bg-zinc-800 my-1" />

                    <button
                      onClick={() => { setSelectedBotId(bot.id); setShotDownModalOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-orange-500 hover:bg-orange-500/10 hover:text-orange-400 transition-colors">
                      <FaBan size={15} /> {t("menu.shutdown")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Bilgi Grid Kutuları */}
            <div className="grid grid-cols-2 gap-2 mt-1">
              <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 flex flex-col hover:border-cyan-500/30 transition-colors group/box col-span-2">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5 group-hover/box:text-cyan-400/70 transition-colors">{t("fields.strategy")}</span>
                <span className="text-xs font-semibold text-zinc-200 truncate" title={bot.strategy}>{bot.strategy}</span>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 flex flex-col hover:border-cyan-500/30 transition-colors group/box">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5 group-hover/box:text-cyan-400/70 transition-colors">{t("fields.api")}</span>
                <span className="text-xs font-semibold text-zinc-200 truncate" title={bot.api}>{bot.api}</span>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 flex flex-col hover:border-cyan-500/30 transition-colors group/box">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5 group-hover/box:text-cyan-400/70 transition-colors">{t("fields.period")}</span>
                <span className="text-xs font-semibold text-zinc-200 truncate">{bot.period}</span>
              </div>


              <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 flex flex-col col-span-2 hover:border-cyan-500/30 transition-colors group/box overflow-hidden">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5 group-hover/box:text-cyan-400/70 transition-colors">{t("fields.days")}</span>
                <span className="text-xs text-zinc-300 truncate block" title={Array.isArray(bot.days) ? bot.days.join(', ') : t("daysUndefined")}>
                  {Array.isArray(bot.days) ? bot.days.join(', ') : t("daysUndefined")}
                </span>
              </div>

              <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 flex flex-col col-span-2 hover:border-cyan-500/30 transition-colors group/box">
                <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5 group-hover/box:text-cyan-400/70 transition-colors">{t("fields.hours")}</span>
                <span className="text-xs font-mono text-cyan-100">{bot.startTime} - {bot.endTime}</span>
              </div>

              <div className={`mt-1 col-span-2 rounded p-1.5 flex items-center justify-center gap-2 border ${bot.isActive
                ? "bg-emerald-950/30 border-emerald-500/20 text-emerald-400 shadow-[0_0_10px_-3px_rgba(52,211,153,0.3)]"
                : "bg-rose-950/30 border-rose-500/20 text-rose-400"
                }`}>
                <span className="relative flex h-2 w-2">
                  {bot.isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${bot.isActive ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wide">
                  {bot.isActive ? t("status.active") : t("status.inactive")}
                </span>
              </div>
            </div>
          </div>

          {/* SÜTUN 2: Kripto Paralar */}
          <div className="flex flex-col px-5 relative border-r border-zinc-800/50">
            <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-b from-zinc-950/80 to-transparent z-10 pointer-events-none" />

            {isRented && (
              <div className="mb-4">
                <RentedCountdown rent_expires_at={bot?.rent_expires_at} />
              </div>
            )}

            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-3 relative z-20">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-500/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                  {t("fields.cryptocurrencies")}
                </h4>
                <span className="text-[10px] font-mono text-cyan-400/60 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-800/30">
                  {bot.cryptos?.length || 0}
                </span>
              </div>

              {/* Coin listesi */}
              <div className="flex flex-col gap-2 overflow-y-auto scrollbar-hide max-h-[275px] pb-2 pr-1">
                {bot.cryptos?.length > 0 ? (
                  bot.cryptos.map((coin) => (
                    <div
                      key={coin}
                      className="group/coin relative w-full text-center py-1 rounded-md bg-zinc-900 border border-cyan-700/50 transition-all duration-200"
                    >
                      <span className="text-xs font-bold text-zinc-300 transition-colors relative z-10">
                        {coin}
                      </span>
                      {/* Hover glow disabled */}
                      <div className="hidden absolute inset-0 rounded-md bg-cyan-400/5 opacity-0 transition-opacity" />
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-lg">
                    <span className="text-[11px] text-zinc-600">{t("coins.none")}</span>
                  </div>
                )}
              </div>
              <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-zinc-950/80 to-transparent pointer-events-none" />
            </div>
          </div>

          {/* SÜTUN 3 & 4 (BİRLEŞİK): Performans Verileri */}
          <div className="col-span-2 border-r border-zinc-800/50 p-5 flex flex-col gap-4">
            {perfData ? (
              <>
                {/* 1. ROW: Dates & Elapsed (Top Header) */}
                <div className="flex items-center justify-between text-[10px] text-zinc-500 border-b border-zinc-800 pb-2">
                  <div className="flex flex-col">
                    <span className="uppercase tracking-wider font-bold">{t("performance.started")}</span>
                    <span className="text-zinc-300">{fmtDate(perfData.inputs?.startDate)}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="uppercase tracking-wider font-bold text-cyan-500/70">{t("performance.elapsed")}</span>
                    <span className="text-cyan-300 font-mono">{perfData.derived?.elapsedTime}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="uppercase tracking-wider font-bold text-cyan-500/70">{t("performance.workTime")}</span>
                    <span className="text-cyan-300 font-mono">{perfData.derived?.formattedWorkTime}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="uppercase tracking-wider font-bold">{t("performance.now")}</span>
                    <span className="text-zinc-300">{fmtDate(perfData.derived?.currentDate)}</span>
                  </div>
                </div>

                {/* 2. ROW: Main Balances & Change */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-zinc-900/30 rounded-lg p-3 border border-zinc-800/50">
                  {/* Initial */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{t("performance.initialBalance")}</span>
                    <span className="text-sm font-mono text-zinc-300">{fmtMoney(perfData.inputs?.initialBalance)}</span>
                  </div>

                  {/* Current */}
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{t("performance.currentBalance")}</span>
                    <span className={`text-sm font-mono font-bold ${perfData.derived?.changeAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {fmtMoney(perfData.backend?.currentBalance)}
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="col-span-2 h-px bg-zinc-800/50" />

                  {/* Change % */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{t("performance.changePercent")}</span>
                    <span className={`text-sm font-bold ${perfData.derived?.changePercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {perfData.derived?.changePercentage >= 0 ? '+' : ''}{perfData.derived?.changePercentage?.toFixed(2)}%
                    </span>
                  </div>

                  {/* Change Amount */}
                  <div className="flex flex-col gap-1 text-right">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold">{t("performance.pnl")}</span>
                    <span className={`text-sm font-mono ${perfData.derived?.changeAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {perfData.derived?.changeAmount >= 0 ? '+' : ''}{fmtMoney(perfData.derived?.changeAmount)}
                    </span>
                  </div>
                </div>

                {/* 3. ROW: Exposure / Trade % */}
                <div className="mt-auto">
                  <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1.5 block">
                    {t("performance.balanceInTrade")}
                  </span>

                  {isFutures ? (
                    <div className="flex gap-2">
                      {/* Long Box */}
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-2 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-emerald-500/10 z-0" style={{ width: `${perfData.backend?.exposure?.long || 0}%` }} />
                        <span className="text-[10px] text-emerald-500 font-bold relative z-10">{t("performance.long")}</span>
                        <span className="text-xs font-mono text-emerald-300 relative z-10">{perfData.backend?.exposure?.long || 0}%</span>
                      </div>
                      {/* Short Box */}
                      <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded p-2 flex items-center justify-between relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 bg-rose-500/10 z-0" style={{ width: `${perfData.backend?.exposure?.short || 0}%` }} />
                        <span className="text-[10px] text-rose-500 font-bold relative z-10">{t("performance.short")}</span>
                        <span className="text-xs font-mono text-rose-300 relative z-10">{perfData.backend?.exposure?.short || 0}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full bg-zinc-900 border border-zinc-800 rounded p-2 flex items-center justify-between relative overflow-hidden">
                      {/* Progress Bar Background */}
                      <div className="absolute inset-y-0 left-0 bg-cyan-500/10 z-0" style={{ width: `${perfData.backend?.exposure}%` }} />
                      <span className="text-[10px] text-cyan-500 font-bold relative z-10">{t("performance.spotExposure")}</span>
                      <span className="text-xs font-mono text-cyan-300 relative z-10">{perfData.backend?.exposure}%</span>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* SÜTUN 5: Satış Uygunluğu (Progress Bar @ 700h) + Performans İbresi */}
          <div className="border-r border-zinc-800/50 p-4 flex flex-col justify-center gap-4">
            {/* 1. SEKSİYON: SATIŞ UYGUNLUĞU */}
            {perfData?.derived?.isEligibleForSale ? (
              // SATIŞA UYGUN DURUM (Fade effect, Checkmark)
              <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500 w-full gap-1">
                <div className="flex flex-col items-center">
                  <div className="bg-emerald-500/10 p-1.5 rounded-full mb-1 border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                    <FaCheck className="text-emerald-400 text-sm" />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest text-center leading-tight">
                    {t("performance.suitableForSale")}
                  </span>
                </div>
              </div>
            ) : (
              // HENÜZ UYGUN DEĞİL (Progress Bar Filling)
              <div className="flex flex-col gap-1 w-full">
                <div className="flex justify-between items-end relative">
                  <div className="flex items-center gap-1.5 z-20">
                    <span className="text-[9px] uppercase tracking-wider text-zinc-500 font-bold leading-none">{t("performance.sellEligibility")}</span>
                    <PortalTooltip content={t("performance.sellEligibilityTooltip")}>
                      <GrCircleQuestion className="text-zinc-500 hover:text-cyan-400 cursor-pointer text-[15px] mb-1" />
                    </PortalTooltip>
                  </div>
                  <span className="text-[11px] font-mono text-cyan-500/70 leading-none">
                    {Math.floor(perfData?.derived?.sellEligibilityPercent || 0)}%
                  </span>
                </div>

                <div className="relative w-full h-2 bg-zinc-900 rounded-full border border-zinc-800 overflow-hidden">
                  <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.1)_25%,rgba(6,182,212,0.1)_50%,transparent_50%,transparent_75%,rgba(6,182,212,0.1)_75%,transparent)] bg-[length:10px_10px]" />
                  <div className="h-full bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)] transition-all duration-1000 ease-out" style={{ width: `${perfData?.derived?.sellEligibilityPercent || 0}%` }} />
                </div>

                <div className="text-[10px] text-zinc-600 text-right font-mono leading-none">
                  {perfData?.derived?.remainingForSellString
                    ? `${perfData.derived.remainingForSellString} left`
                    : ''}
                </div>
              </div>
            )}

            {/* Divider */}
            <div className="w-full h-px bg-zinc-800/50" />

            {/* 2. SEKSİYON: PERFORMANS İBRESİ */}
            <div className="flex flex-col items-center justify-center -mt-2">
              <div style={{ padding: '30px' }}>
                <Gauge
                  value={perfData?.backend?.powerPoint || 0}
                  label="Güç Puanı"
                  isEligible={perfData?.derived?.isEligibleForSale}
                />
              </div>
            </div>
          </div>

          {/* SÜTUN 6: Toggle */}
          <div className="flex flex-col justify-center items-center relative pl-4">
            {/* Decorative background glow behind toggle */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full blur-3xl transition-opacity duration-500 ${bot.isActive ? 'bg-cyan-500/10' : 'bg-transparent'}`} />

            {/* Animation behind toggle */}
            {bot.isActive && (
              <div className="absolute top-[145px] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] pointer-events-none z-0 ml-3">
                <WorkingBotAnimation />
              </div>
            )}

            <div
              className={[
                "flex flex-col items-center gap-4 z-20 relative p-4 rounded-2xl transition-all duration-300",
              ].join(' ')}
              title={finalDisableTitle}
              aria-disabled={finalToggleDisabled}
            >
              <div className="relative">
                <RunBotToggle
                  checked={bot.isActive}
                  onChange={
                    !finalToggleDisabled
                      ? () => {
                        setToggleAction(bot.isActive ? 'stop' : 'start');
                        setToggleConfirmOpen(true);
                      }
                      : undefined
                  }
                  disabled={finalToggleDisabled}
                />
              </div>

              <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${bot.isActive ? 'text-green-400 ml-3 drop-shadow-[0_0_5px_rgba(34,211,238,0.5)]' : 'text-zinc-600'}`}>
                {bot.isActive ? <>RUNNING<AnimatedDots /></> : 'STOPPED'}
              </span>
            </div>
          </div>
        </div>

        {editing && <BotModal mode="edit" bot={bot} onClose={() => setEditing(false)} />}
        {isExamineOpen && <ExamineBot isOpen={isExamineOpen} onClose={() => setIsExamineOpen(false)} botId={bot.id} />}
      </div>

      <DeleteBotConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
      />
      <ShutDownBotModal
        isOpen={isShotDownModalOpen}
        onClose={() => setShotDownModalOpen(false)}
        onConfirm={() => { shutDownBot({ scope: "bot", id: selectedBotId }); setSelectedBotId(null); }}
      />
      <BotToggleConfirmModal
        isOpen={isToggleConfirmOpen}
        onClose={() => setToggleConfirmOpen(false)}
        onConfirm={handleConfirmToggle}
        actionType={toggleAction}
      />
    </>
  );
};
