'use client';


import { useState, useRef, useEffect, useMemo } from 'react';
import useBotExamineStore from "@/store/bot/botExamineStore";
import { useBotStore } from "@/store/bot/botStore";
import { BotModal } from './botModal';
import { FaRegTrashAlt } from 'react-icons/fa';
import { FiEdit3 } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoSearch } from "react-icons/io5";
import RunBotToggle from './runBotToggle';
import ExamineBot from "./examineBot";
import { FaBan } from "react-icons/fa6";
import DeleteBotConfirmModal from "./deleteBotConfirmModal";
import ShutDownBotModal from "./shutDownBotModal";
import BotToggleConfirmModal from "./botToggleConfirmModal";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

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

  // Kira bitişi (ms cinsinden)
  const expiryMs =
    isRented && bot?.rent_expires_at
      ? new Date(bot.rent_expires_at).getTime()
      : null;

  // Süresi dolmuş mu?
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

  // Toggle için temel disable title (bakiyeye bakmadan önce)
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

  /* ==== TEK KART TASARIMI ==== */
  return (
    <>
      <div className="rounded-lg px-4 py-4 relative border-2 border-cyan-900 bg-[hsl(227,82%,2%)] text-gray-200">
        <div className="grid grid-cols-3 divide-x divide-gray-700">

          {/* SOL: Bot Bilgi Alanı */}
          <div className="pr-4">
            {/* Başlık satırı: İsim + Type + Menü */}
            <div className="flex items-center gap-2 border-b border-gray-600 pb-[10px] mb-2">
              <h3 className="text-[18px] font-semibold text-white truncate flex-1">{bot.name}</h3>
              <TypeBadge type={bot.type} />
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded hover:bg-gray-700"
                  aria-label={t("menu.moreActions")}
                  title={t("menu.moreActions")}
                >
                  <BsThreeDotsVertical className="text-gray-300" size={18} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 w-40 bg-gray-900 rounded shadow-md z-50">
                    <button
                      onClick={() => { setEditing(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-800">
                      <FiEdit3 size={16} /> {t("menu.edit")}
                    </button>

                    <button
                      onClick={() => { setSelectedBotId(bot.id); setDeleteModalOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800">
                      <FaRegTrashAlt size={16} /> {t("menu.deleteDev")}
                    </button>

                    <button
                      onClick={() => {
                        if (isBlocked) return;
                        setIsExamineOpen(true);
                        fetchAndStoreBotAnalysis(bot.id);
                        setMenuOpen(false);
                      }}
                      disabled={isBlocked}
                      aria-disabled={isBlocked}
                      title={isBlocked ? t("examine.disabledTitle") : t("menu.examine")}
                      className={[
                        "flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700",
                        isBlocked ? "text-gray-500 cursor-not-allowed pointer-events-none" : "text-yellow-400"
                      ].join(' ')}
                    >
                      <IoSearch size={16} /> {t("menu.examine")}
                    </button>

                    <button
                      onClick={() => { setSelectedBotId(bot.id); setShotDownModalOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-700"
                      title={t("menu.shutdownTitle")}>
                      <FaBan size={16} /> {t("menu.shutdown")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="mb-1 text-[14px]"><span className="text-stone-500">{t("fields.api")}</span> {bot.api}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">{t("fields.strategy")}</span> {bot.strategy}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">{t("fields.period")}</span> {bot.period}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">{t("fields.days")}</span> {Array.isArray(bot.days) ? bot.days.join(', ') : t("daysUndefined")}
            </p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">{t("fields.hours")}</span> {bot.startTime} - {bot.endTime}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">{t("fields.status")}</span>{' '}
              <span className={bot.isActive ? 'text-green-400' : 'text-[rgb(216,14,14)]'}>
                {bot.isActive ? t("status.active") : t("status.inactive")}
              </span>
            </p>
          </div>

          {/* ORTA: Kripto Paralar */}
          <div className="flex flex-col px-6">
            {isRented && (
              <RentedCountdown rent_expires_at={bot?.rent_expires_at} />
            )}

            <div className="flex flex-col gap-2 mb-2">
              <h4 className="text-sm font-semibold bg-gradient-to-r from-violet-900 via-sky-600 to-purple-500 text-transparent bg-clip-text">
                {t("fields.cryptocurrencies")}
              </h4>

              {/* Coin listesi */}
              {bot.cryptos?.length > 0 ? (
                bot.cryptos.map((coin) => (
                  <div
                    key={coin}
                    className="w-full text-center text-[14px] bg-gradient-to-r from-[rgb(14,20,35)] to-neutral-800 border border-slate-700 px-2 py-1 rounded text-white"
                  >
                    {coin}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-gray-500">{t("coins.none")}</span>
              )}
            </div>
          </div>

          {/* SAĞ: Toggle */}
          <div className="flex flex-col justify-center items-center relative pl-4">
            <div
              className={[
                "flex items-center gap-3 z-20 relative",
                finalToggleDisabled ? "opacity-50 cursor-not-allowed" : ""
              ].join(' ')}
              title={finalDisableTitle}
              aria-disabled={finalToggleDisabled}
            >
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
