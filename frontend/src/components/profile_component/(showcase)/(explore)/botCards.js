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
import { FaRobot, FaUser } from 'react-icons/fa';
import { LuChartNoAxesCombined } from "react-icons/lu";
import { LiaChargingStationSolid } from "react-icons/lia";
import { useSiwsStore } from "@/store/auth/siwsStore";
import { useTranslation } from "react-i18next";

import BuyModal from "@/components/profile_component/(showcase)/(checkout)/BuyModal";
import RentModal from "@/components/profile_component/(showcase)/(checkout)/RentModal";

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
    if (!raw) return 0; // GMT+0
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
    // ISO değilse UTC varsayalım
    const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
    const iso = hasTz ? value : `${value.replace(' ', 'T')}Z`;
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000);
  }

  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// UTC saniye + offset → Date (UTC getter’larıyla okunacak)
function timeToZonedDate(utcSeconds, offsetMinutes) {
  const msUTC = (utcSeconds || 0) * 1000;
  return new Date(msUTC + (offsetMinutes || 0) * 60 * 1000);
}

// Sadece tarih (saat yok): DD.MM.YYYY
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
  switch (t) {
    case 'futures':
    case 'future':
    case 'perp':
    case 'perpetual':
      return 'bg-purple-900/30 text-purple-200 border border-purple-500/40';
    case 'spot':
    default:
      return 'bg-emerald-900/30 text-emerald-200 border border-emerald-500/40';
  }
};

function TypeBadge({ type }) {
  const { t: tr } = useTranslation('showcaseBotCard');
  const label = (type || 'spot').toString().toUpperCase();
  return (
    <span
      className={`px-5 py-[8px] rounded-full uppercase tracking-wide text-[12px] ${getTypeBadgeClasses(type)} shrink-0`}
      title={tr ? tr('typeBadgeTitle', { type: label }) : label}
    >
      {label}
    </span>
  );
}

const BotCard = ({ botData, isFollowed, onFollow, isAnimating = false }) => {
  if (!botData) return null;

  const { t } = useTranslation('showcaseBotCard');

  // --- GÜNCELLEME: Sadece Solana (walletLinked) durumunu çekiyoruz ---
  const { walletLinked } = useSiwsStore();

  // Herhangi biri bağlıysa true döner
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
        className="relative bg-gray-800 rounded-2xl shadow-2xl border border-gray-700"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: isAnimating ? -20 : 0, opacity: isAnimating ? 0.8 : 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        <div className="absolute top-3 right-3 z-10">
          <TypeBadge type={botData.bot_type || botData.type || 'spot'} />
        </div>
        <div className="p-4 sm:p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 min-w-0 mb-4">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex-shrink-0">
                <FaRobot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg sm:text-xl font-bold text-white">{botData.name}</h2>
                <div className="flex items-center gap-2 text-gray-300 text-xs">
                  <FaUser className="w-3 h-3 flex-shrink-0" />
                  <span>{t('labels.by', { creator: botData.creator })}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <p>{t('meta.purchasedTimes', { count: botData.soldCount })}</p>
              <p>{t('meta.rentedTimes', { count: botData.rentedCount })}</p>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span
                className={`px-3 py-2 rounded-full text-sm font-medium ${totalMarginNum > 0 ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-300'
                  }`}
              >
                {totalMarginNum > 0 ? '+' : ''}{botData.totalMargin}%
              </span>

              <button
                onClick={() => onFollow?.(botData)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${isFollowed
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                  }`}
                type="button"
              >
                {isFollowed ? (
                  <>
                    <FiCheck className="w-4 h-4" />
                    {t('actions.following')}
                  </>
                ) : (
                  <>
                    <FiUserPlus className="w-4 h-4" />
                    {t('actions.follow')}
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Buy / Rent */}
          <div className="flex w-full gap-2 mb-2">
            <PurchaseButton
              enabledFlag={Boolean(botData.for_sale)}
              // --- GÜNCELLEME: combined değişkeni gönderiyoruz ---
              walletLinked={isAnyWalletConnected}
              price={botData.sell_price}
              label={t('purchase.buy')}
              bg="bg-green-600"
              hover="hover:bg-green-500"
              lockedMessage={t('purchase.locked')}
              onClick={() => setBuyOpen(true)}
            />
            <PurchaseButton
              enabledFlag={Boolean(botData.for_rent)}
              // --- GÜNCELLEME: combined değişkeni gönderiyoruz ---
              walletLinked={isAnyWalletConnected}
              price={botData.rent_price}
              label={t('purchase.rentDaily')}
              bg="bg-orange-600"
              hover="hover:bg-orange-500"
              lockedMessage={t('purchase.locked')}
              onClick={() => setRentOpen(true)}
            />
          </div>





          {/* Stats */}
          <div className="flex flex-col space-y-2 mb-6">
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
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">{t('strategy.title')}</h3>
            <span className="px-2 py-1 bg-gradient-to-r from-blue-900 to-green-800 text-blue-200 rounded-lg text-xs font-medium">
              {botData.strategy}
            </span>
          </div>

          {/* Coins */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-3">{t('coins.title')}</h3>
            <div className="flex flex-wrap gap-2">
              {coins.map((coin, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-gradient-to-r from-orange-900 to-red-900 text-orange-300 rounded-lg text-xs font-medium"
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
  bg,
  hover,
  lockedMessage = "You must connect your wallet first",
  onClick,
}) => {
  const { t } = useTranslation('showcaseBotCard');
  const isAvailable = Boolean(enabledFlag);
  const isConnected = Boolean(walletLinked);
  const disabled = !isAvailable || !isConnected;

  const wrapperTitle = !isAvailable
    ? t('purchase.notAvailable')
    : (!isConnected ? lockedMessage : undefined);

  const buttonClass = !isAvailable
    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
    : (isConnected
      ? `${bg} ${hover} text-white`
      : `${bg} text-white opacity-50 cursor-not-allowed`);

  const showPrice = isAvailable;
  const priceClass = isConnected ? "text-lg font-bold" : "text-lg font-bold opacity-60";

  return (
    <div className="w-1/2" title={wrapperTitle}>
      <button
        disabled={disabled}
        type="button"
        className={`w-full py-2 rounded-lg h-16 ${buttonClass}`}
        onClick={() => !disabled && onClick?.()}
      >
        <div className="flex flex-col justify-between h-full items-center">
          {showPrice && <span className={priceClass}>{price} $</span>}
          <span className="text-[10px] text-white/80">{label}</span>
        </div>
      </button>
    </div>
  );
};

const StatBox = ({ icon, title, value }) => (
  <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-xl py-2 px-4 shadow-md h-12">
    <div className="flex items-center gap-2 h-full">
      <div className="text-blue-300 flex-shrink-0">{icon}</div>
      <div className="flex items-center justify-between w-full text-xs text-gray-300 font-medium">
        <span>{title}</span>
        <span className="text-white font-semibold">{value}</span>
      </div>
    </div>
  </div>
);

const StatBoxTrades = ({ icon, title, value }) => {
  const [day, week, month] = value.split('/').map(v => Number.parseFloat(v));
  const getColor = (val) => (val < 0 ? 'text-red-400' : 'text-green-400');

  return (
    <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-xl py-1 px-4 shadow-md h-12">
      <div className="flex items-center gap-2 h-full">
        <div className="text-blue-300 flex-shrink-0">{icon}</div>
        <div className="flex items-center justify-between w-full text-xs text-gray-300 font-medium">
          <span>{title}</span>
          <div className="flex items-center gap-1 text-white font-semibold">
            <span className={getColor(day)}>{day}%</span> /
            <span className={getColor(week)}>{week}%</span> /
            <span className={getColor(month)}>{month}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BotCard;