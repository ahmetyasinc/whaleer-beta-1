"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiClock,
  FiUserPlus,
  FiCheck,
  FiBarChart
} from 'react-icons/fi';
import { FaRobot, FaUser, FaShoppingCart, FaClock as FaClockSolid } from 'react-icons/fa';
import { LuChartNoAxesCombined } from "react-icons/lu";
import { LiaChargingStationSolid } from "react-icons/lia";
import { useSiwsStore } from "@/store/auth/siwsStore";
import { useTranslation } from "react-i18next";

import BuyModal from "@/components/profile_component/(botmarket)/BuyModal";
import RentModal from "@/components/profile_component/(botmarket)/RentModal";

/* ---- Helpers ---- */
const pad = (n) => String(n).padStart(2, '0');

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
  return m ? decodeURIComponent(m.split('=')[1]) : null;
}

function parseGmtToMinutes(tzStr) {
  const m = /^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec((tzStr || '').trim());
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  const h = parseInt(m[2] || '0', 10);
  const mins = parseInt(m[3] || '0', 10);
  return sign * (h * 60 + mins);
}

function readTimezoneOffsetMinutesFromCookie() {
  try {
    const raw = getCookie('wh_settings');
    if (!raw) return 0;
    const obj = JSON.parse(raw);
    return parseGmtToMinutes(obj?.timezone || 'GMT+0');
  } catch {
    return 0;
  }
}

// Değer → UTC saniye
function parseToUtcSeconds(value) {
  if (value == null) return null;
  if (typeof value === 'number') {
    if (value > 1e12) return Math.floor(value / 1000); // ms → s
    return Math.floor(value); // s
  }
  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) {
      const num = Number(value);
      return num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
    }
    const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
    const iso = hasTz ? value : `${value.replace(' ', 'T')}Z`;
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000);
  }
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// UTC saniye + offset → Date
function timeToZonedDate(utcSeconds, offsetMinutes) {
  const msUTC = (utcSeconds || 0) * 1000;
  return new Date(msUTC + (offsetMinutes || 0) * 60 * 1000);
}

// Sadece tarih: DD.MM.YYYY
function formatDateOnly(value, offsetMinutes) {
  const sec = parseToUtcSeconds(value);
  if (sec == null) return '—';
  const d = timeToZonedDate(sec, offsetMinutes);
  const Y = d.getUTCFullYear();
  const M = pad(d.getUTCMonth() + 1);
  const D = pad(d.getUTCDate());
  return `${D}.${M}.${Y}`;
}

// ---- helpers for TypeBadge ----
const getTypeBadgeClasses = (type) => {
  const t = String(type || '').toLowerCase();
  if (t === 'futures' || t.includes('future') || t.includes('perp')) {
    return 'bg-amber-500/15 text-amber-300 border border-amber-700';
  }
  return 'bg-emerald-500/15 text-emerald-300 border border-emerald-700';
};

function TypeBadge({ type }) {
  const { t: tr } = useTranslation('showcaseBotCard');
  const label = (type || 'spot').toString().toUpperCase();
  return (
    <span
      className={`px-3 py-[4px] rounded-full uppercase tracking-wide text-[10px] ${getTypeBadgeClasses(type)} shrink-0`}
      title={tr ? tr('typeBadgeTitle', { type: label }) : label}
    >
      {label}
    </span>
  );
}

const BotCard = ({ botData, isFollowed, onFollow, isAnimating = false }) => {
  if (!botData) return null;

  const { t } = useTranslation('showcaseBotCard');
  const { walletLinked } = useSiwsStore();
  const isAnyWalletConnected = walletLinked;

  const [buyOpen, setBuyOpen] = useState(false);
  const [rentOpen, setRentOpen] = useState(false);

  const [tzOffsetMin, setTzOffsetMin] = useState(0);
  useEffect(() => {
    setTzOffsetMin(readTimezoneOffsetMinutesFromCookie());
  }, []);

  const formatRunningTime = (minutesInput) => {
    const m = Math.max(0, Math.floor(Number(minutesInput) || 0));
    if (m < 1) return t("runtime.justNow");

    const minutes = m % 60;
    const totalHours = Math.floor(m / 60);
    const hours = totalHours % 24;
    const totalDays = Math.floor(totalHours / 24);
    const days = totalDays % 7;
    const totalWeeks = Math.floor(totalDays / 7);
    const weeks = totalWeeks % 52;
    const years = Math.floor(totalWeeks / 52);

    if (years > 0) return weeks === 0 && days === 0 && hours === 0 ? t("runtime.yearsOnly", { years }) : t("runtime.yearsWeeks", { years, weeks });
    if (weeks > 0) return days === 0 && hours === 0 ? t("runtime.weeksOnly", { weeks }) : t("runtime.weeksDays", { weeks, days });
    if (days > 0) return hours === 0 ? t("runtime.daysOnly", { days }) : t("runtime.daysHours", { days, hours });
    if (totalHours > 0) return minutes === 0 ? t("runtime.hoursOnly", { hours: totalHours }) : t("runtime.hoursMinutes", { hours: totalHours, minutes });
    return t("runtime.minutesOnly", { minutes });
  };

  const coins = useMemo(() => {
    if (typeof botData.coins === 'string') {
      return botData.coins.split(',').map(c => c.trim());
    }
    if (Array.isArray(botData.coins)) return botData.coins;
    return [];
  }, [botData?.coins]);

  const totalMarginNum = Number.parseFloat(botData.totalMargin ?? 0);

  return (
    <>
      <motion.div
        className="group relative rounded-xl overflow-hidden transition-all duration-300 bg-zinc-950 border w-full border-zinc-800/60 hover:border-cyan-500/30 hover:shadow-[0_0_15px_-3px_rgba(6,182,212,0.15)] flex flex-col h-full"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: isAnimating ? -20 : 0, opacity: isAnimating ? 0.8 : 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {/* Neon Glow Border Effect */}
        <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-cyan-500/20 via-zinc-800/0 to-purple-500/20 -z-10 opacity-30 transition-opacity" />

        <div className="absolute top-3 right-3 z-10">
          <TypeBadge type={botData.bot_type || botData.type || 'spot'} />
        </div>

        <div className="p-4 sm:p-5 flex flex-col h-full bg-zinc-950">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center gap-3 min-w-0 mb-3">
              <div className="p-2.5 bg-zinc-900 border border-zinc-700/60 rounded-xl flex-shrink-0 text-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
                <FaRobot className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 to-blue-200 truncate leading-tight drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
                  {botData.name}
                </h2>
                <div className="flex items-center gap-2 text-zinc-400 text-xs mt-0.5">
                  <FaUser className="w-3 h-3 flex-shrink-0 text-cyan-500/50" />
                  <span>{t('labels.by', { creator: botData.creator })}</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-zinc-500 font-mono space-y-0.5 ml-1">
              <p>Purchased: <span className="text-zinc-300">{botData.soldCount}</span></p>
              <p>Rented: <span className="text-zinc-300">{botData.rentedCount}</span></p>
            </div>

            <div className="flex items-center gap-2 mt-4">
              <span
                className={`px-3 py-1.5 rounded-md text-xs font-bold font-mono border ${totalMarginNum > 0
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-400'
                  }`}
              >
                {totalMarginNum > 0 ? '+' : ''}{botData.totalMargin}%
              </span>

              <button
                onClick={() => onFollow?.(botData)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold border transition-all ${isFollowed
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-cyan-400 hover:border-cyan-500/30'
                  }`}
                type="button"
              >
                {isFollowed ? (
                  <>
                    <FiCheck className="w-3.5 h-3.5" />
                    {t('actions.following')}
                  </>
                ) : (
                  <>
                    <FiUserPlus className="w-3.5 h-3.5" />
                    {t('actions.follow')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Buy / Rent */}
          <div className="flex w-full gap-2 mb-4">
            <PurchaseButton
              enabledFlag={Boolean(botData.for_sale)}
              walletLinked={isAnyWalletConnected}
              price={botData.sell_price}
              label={t('purchase.buy')}
              actionType="buy"
              onClick={() => setBuyOpen(true)}
              lockedMessage={t('purchase.locked')}
            />
            <PurchaseButton
              enabledFlag={Boolean(botData.for_rent)}
              walletLinked={isAnyWalletConnected}
              price={botData.rent_price}
              label={t('purchase.rentDaily')}
              actionType="rent"
              onClick={() => setRentOpen(true)}
              lockedMessage={t('purchase.locked')}
            />
          </div>

          {/* Stats */}
          <div className="flex flex-col gap-2 mb-4">
            <StatBox
              icon={<FiCalendar />}
              title={t('stats.createdOn')}
              value={formatDateOnly(botData.startDate, tzOffsetMin)}
            />
            <StatBox
              icon={<FiClock />}
              title={t('stats.uptime')}
              value={formatRunningTime(botData.runningTime)}
            />
            <StatBox icon={<LuChartNoAxesCombined />} title={t('stats.totalMargin')} value={`${botData.totalMargin}%`} />
            <StatBox icon={<LiaChargingStationSolid />} title={t('stats.avgFullness')} value={`${botData.avg_fullness}%`} />
            <StatBoxTrades icon={<FiBarChart />} title={t('stats.plDWM')} value={`${botData.dayMargin}% / ${botData.weekMargin}% / ${botData.monthMargin}%`} />
          </div>

          {/* Strategy */}
          <div className="mb-4">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">{t('strategy.title')}</h3>
            <span className="inline-block px-3 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-xs font-semibold text-zinc-300 truncate max-w-full hover:border-cyan-500/30 transition-colors">
              {botData.strategy}
            </span>
          </div>

          {/* Coins */}
          <div className="mt-auto">
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 px-1">{t('coins.title')}</h3>
            <div className="flex flex-wrap gap-1.5">
              {coins.map((coin, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded text-[10px] font-bold hover:text-cyan-400 hover:border-cyan-500/30 transition-colors cursor-default"
                >
                  {coin}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* BUY MODAL */}
      {buyOpen && (
        <BuyModal
          botId={botData.bot_id}
          onClose={() => setBuyOpen(false)}
        />
      )}

      {/* RENT MODAL */}
      {rentOpen && (
        <RentModal
          botId={botData.bot_id}
          onClose={() => setRentOpen(false)}
          minDays={1}
        />
      )}
    </>
  );
};

const PurchaseButton = ({
  enabledFlag,
  walletLinked,
  price,
  label,
  actionType,
  lockedMessage,
  onClick,
}) => {
  const { t } = useTranslation('showcaseBotCard');
  const isAvailable = Boolean(enabledFlag);
  const isConnected = Boolean(walletLinked);
  const disabled = !isAvailable || !isConnected;
  const isBuy = actionType === 'buy';

  const wrapperTitle = !isAvailable
    ? t('purchase.notAvailable')
    : (!isConnected ? lockedMessage : undefined);

  // Colors based on action
  const activeBorder = isBuy ? 'border-emerald-500/30 hover:border-emerald-500/60' : 'border-cyan-500/30 hover:border-cyan-500/60';
  const activeBg = isBuy ? 'bg-emerald-950/20 hover:bg-emerald-950/40' : 'bg-cyan-950/20 hover:bg-cyan-950/40';
  const activeText = isBuy ? 'text-emerald-400' : 'text-cyan-400';
  const priceColor = isBuy ? 'text-emerald-300' : 'text-cyan-300';

  const finalClass = disabled
    ? 'bg-zinc-900/30 border-zinc-800 text-zinc-600 cursor-not-allowed'
    : `${activeBg} ${activeBorder} cursor-pointer group`;

  return (
    <div className="w-1/2" title={wrapperTitle}>
      <button
        disabled={disabled}
        type="button"
        className={`w-full py-2 px-2 rounded-lg h-14 border flex flex-col justify-between items-center transition-all duration-300 relative overflow-hidden ${finalClass}`}
        onClick={() => !disabled && onClick?.()}
      >
        {isAvailable && (
          <span className={`text-base font-bold font-mono ${disabled ? 'text-zinc-600' : priceColor}`}>
            {price} $
          </span>
        )}
        <div className="flex items-center gap-1.5 mt-auto">
          {actionType === 'buy'
            ? <FaShoppingCart className={`text-[10px] ${disabled ? 'text-zinc-700' : 'text-emerald-500/70'}`} />
            : <FaClockSolid className={`text-[10px] ${disabled ? 'text-zinc-700' : 'text-cyan-500/70'}`} />
          }
          <span className={`text-[9px] uppercase tracking-wider font-bold ${disabled ? 'text-zinc-600' : activeText}`}>
            {label}
          </span>
        </div>

        {!disabled && (
          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-t ${isBuy ? 'from-emerald-500/10' : 'from-cyan-500/10'} to-transparent`} />
        )}
      </button>
    </div>
  );
};

const StatBox = ({ icon, title, value }) => (
  <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg py-2 px-3 shadow-sm h-10 hover:border-cyan-500/20 transition-colors group/stat">
    <div className="flex items-center gap-3 h-full">
      <div className="text-zinc-500 group-hover/stat:text-cyan-400 transition-colors flex-shrink-0 text-sm">
        {icon}
      </div>
      <div className="flex items-center justify-between w-full text-[11px] font-medium">
        <span className="text-zinc-500">{title}</span>
        <span className="text-zinc-200 font-mono">{value}</span>
      </div>
    </div>
  </div>
);

const StatBoxTrades = ({ icon, title, value }) => {
  const [day, week, month] = value.split('/').map(v => Number.parseFloat(v) || 0);
  const getColor = (val) => (val < 0 ? 'text-rose-400' : 'text-emerald-400');
  // Use dash for formatting consistency if needed, but current value is correct
  const fmt = (v) => `${v}%`;

  return (
    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg py-2 px-3 shadow-sm h-10 hover:border-cyan-500/20 transition-colors group/stat">
      <div className="flex items-center gap-3 h-full">
        <div className="text-zinc-500 group-hover/stat:text-cyan-400 transition-colors flex-shrink-0 text-sm">{icon}</div>
        <div className="flex items-center justify-between w-full text-[11px] font-medium">
          <span className="text-zinc-500">{title}</span>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className={getColor(day)}>{fmt(day)}</span>
            <span className="text-zinc-700">|</span>
            <span className={getColor(week)}>{fmt(week)}</span>
            <span className="text-zinc-700">|</span>
            <span className={getColor(month)}>{fmt(month)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotCard;