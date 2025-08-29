// components/BotCard.js
"use client";

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiClock,
  FiTrendingUp,
  FiUserPlus,
  FiCheck,
  FiBarChart
} from 'react-icons/fi';
import { FaRobot, FaUser } from 'react-icons/fa';
import { LuChartNoAxesCombined } from "react-icons/lu";
import { GiCharging } from "react-icons/gi";
import { IoMdWarning } from "react-icons/io";
import { MdOutlineNumbers } from "react-icons/md";
import { LiaChargingStationSolid } from "react-icons/lia";
import { useSiwsStore } from "@/store/auth/siwsStore";

import BuyModal from "@/components/profile_component/(showcase)/(checkout)/BuyModal";
import RentModal from "@/components/profile_component/(showcase)/(checkout)/RentModal";

const BotCard = ({ botData, isFollowed, onFollow, isAnimating = false }) => {
  if (!botData) return null;

  const { walletLinked } = useSiwsStore();
  const [buyOpen, setBuyOpen] = useState(false);
  const [rentOpen, setRentOpen] = useState(false);

  const formatRunningTime = (hours) => {
    if (hours < 1) return 'Started today';
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return days === 0
      ? `${hours} hours`
      : remainingHours === 0
      ? `${days} days`
      : `${days} days ${remainingHours} hours`;
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
        className="bg-gray-800 rounded-2xl shadow-2xl border border-gray-700"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: isAnimating ? -20 : 0, opacity: isAnimating ? 0.8 : 1 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
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
                  <span>by {botData.creator}</span>
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-400 space-y-1">
              <p>Purchased {botData.soldCount} times</p>
              <p>Rented {botData.rentedCount} times</p>
            </div>

            <div className="flex items-center gap-2 mt-3">
              <span
                className={`px-3 py-2 rounded-full text-sm font-medium ${
                  totalMarginNum > 0 ? 'bg-green-800 text-green-200' : 'bg-red-900 text-red-300'
                }`}
              >
                {totalMarginNum > 0 ? '+' : ''}{botData.totalMargin}%
              </span>

              <button
                onClick={() => onFollow?.(botData)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
                  isFollowed
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                }`}
                type="button"
              >
                {isFollowed ? (
                  <>
                    <FiCheck className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <FiUserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Buy / Rent */}
          <div className="flex w-full gap-2 mb-4">
            <PurchaseButton
              enabledFlag={Boolean(botData.for_sale)}
              walletLinked={walletLinked}
              price={botData.sell_price}
              label="Buy"
              bg="bg-green-600"
              hover="hover:bg-green-500"
              lockedMessage="You must connect your wallet first"
              onClick={() => setBuyOpen(true)}
            />
            <PurchaseButton
              enabledFlag={Boolean(botData.for_rent)}
              walletLinked={walletLinked}
              price={botData.rent_price}
              label="Rent Daily"
              bg="bg-orange-600"
              hover="hover:bg-orange-500"
              lockedMessage="You must connect your wallet first"
              onClick={() => setRentOpen(true)}
            />
          </div>

          {/* Stats */}
          <div className="flex flex-col space-y-2 mb-6">
            <StatBox icon={<FiCalendar />} title="Created on" value={botData.startDate} />
            <StatBox icon={<FiClock />} title="Uptime" value={formatRunningTime(botData.runningTime)} />
            <StatBox icon={<FiTrendingUp />} title="Win Rate" value={`${botData.winRate}%`} />
            <StatBox icon={<LuChartNoAxesCombined />} title="Total Margin" value={`${botData.totalMargin}%`} />
            <StatBox icon={<GiCharging />} title="Profit Factor" value={botData.profitFactor} />
            <StatBox icon={<IoMdWarning />} title="Risk Factor" value={botData.riskFactor} />
            <StatBox icon={<LiaChargingStationSolid />} title="Avg. Fullness" value={`${botData.avg_fullness}%`} />
            <StatBox icon={<MdOutlineNumbers />} title="Trades (D/W/M)" value={`${botData.dayTrades} / ${botData.weekTrades} / ${botData.monthTrades}`} />
            <StatBoxTrades icon={<FiBarChart />} title="P/L (D/W/M)" value={`${botData.dayMargin}% / ${botData.weekMargin}% / ${botData.monthMargin}%`} />
          </div>

          {/* Strategy */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-white mb-3">Strategy Used</h3>
            <span className="px-2 py-1 bg-gradient-to-r from-blue-900 to-green-800 text-blue-200 rounded-lg text-xs font-medium">
              {botData.strategy}
            </span>
          </div>

          {/* Coins */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-white mb-3">Supported Coins</h3>
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
  const isAvailable = Boolean(enabledFlag);
  const isConnected = Boolean(walletLinked);
  const disabled = !isAvailable || !isConnected;

  const wrapperTitle = !isAvailable
    ? "Not available"
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
