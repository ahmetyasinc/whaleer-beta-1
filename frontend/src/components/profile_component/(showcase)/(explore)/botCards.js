'use client';

import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FiCalendar,
  FiClock,
  FiTrendingUp,
  FiUserPlus,
  FiCheck
} from 'react-icons/fi';
import { FaRobot, FaUser } from 'react-icons/fa';
import { BiTransfer } from 'react-icons/bi';
import useBotDataStore from '@/store/showcase/botDataStore';
import BotterGuide from './botterGuide';
import { LuChartNoAxesCombined } from "react-icons/lu";
import { GiCharging } from "react-icons/gi";
import { IoMdWarning } from "react-icons/io";
import { MdOutlineNumbers } from "react-icons/md";
import { FiBarChart } from "react-icons/fi";
import { LiaChargingStationSolid } from "react-icons/lia";

const BotCard = ({ isAnimating }) => {
  const {
    currentBotData: botData,
    loadBotData,
    currentBotId,
    followBot,
    isBotFollowed
  } = useBotDataStore();

  const formatRunningTime = (hours) => {
    if (hours < 1) return 'Bugün başladı';
    
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    
    if (days === 0) {
      return `${hours} saat`;
    } else if (remainingHours === 0) {
      return `${days} gün`;
    } else {
      return `${days} gün ${remainingHours} saat`;
    }
  };

  useEffect(() => {
    loadBotData(currentBotId);
  }, [loadBotData, currentBotId]);

  const handleFollowBot = () => {
    if (botData) {
      followBot(botData);
    }
  };

  if (!botData) return null;

  const isFollowed = isBotFollowed(botData.bot_id);

  return (
    <motion.div 
      className="bg-gray-800 rounded-2xl shadow-2xl border-1 border-gray-700"
      initial={{ y: -50, opacity: 0 }}
      animate={{ 
        y: isAnimating ? -20 : 0, 
        opacity: isAnimating ? 0.8 : 1 
      }}
      transition={{ 
        duration: 0.3, 
        ease: "easeInOut" 
      }}
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
              <div className="flex items-center gap-2 text-gray-300">
                <FaUser className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs">{botData.creator} tarafından</span>
              </div>
            </div>
          </div>

          <span className="text-xs text-gray-400 block">{botData.soldCount} kez satın alındı</span>
          <span className="text-xs text-gray-400 block mt-2">{botData.rentedCount} kez kiralandı</span>


          <div className="flex items-center gap-2 sm:gap-3 mt-3">
            <span className={`px-3 sm:px-3 py-2 rounded-full text-sm sm:text-sm font-medium whitespace-nowrap ${
              parseFloat(botData.totalMargin) > 0
                ? 'bg-green-800 text-green-200'
                : 'bg-red-900 text-red-300'
            }`}>
              {parseFloat(botData.totalMargin) > 0 ? '+' : ''}{botData.totalMargin}%
            </span>
            <button 
              onClick={handleFollowBot}
              className={`flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 text-xs sm:text-sm font-medium whitespace-nowrap ${
                isFollowed
                  ? 'bg-green-600 text-white hover:bg-green-700 border-1 border-gray-900'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              {isFollowed ? (
                <>
                  <FiCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Takip Ediliyor</span>
                  <span className="xs:hidden">Takip</span>
                </>
              ) : (
                <>
                  <FiUserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden xs:inline">Takip Et</span>
                  <span className="xs:hidden">Takip</span>
                </>
              )}
            </button>
          </div>
        </div>
      {/* Sat/ Kirala butonları */}
      <div className="flex w-full gap-2 mb-4 rounded-xl">
        {/* Satın Al Butonu */}
        <button
          disabled={!botData.for_sale}
          className={`w-1/2 py-2 rounded-lg transition h-16 ${
            botData.for_sale
              ? 'bg-green-600 hover:bg-green-500 text-white border-3 border-green-900 shadow-md shadow-green-900'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <div className={`flex items-center justify-center h-full ${botData.for_sale ? 'flex-col justify-between' : ''}`}>
            {botData.for_sale && (
              <span className="text-lg font-bold">{botData.sell_price} $</span>
            )}
            <span className="text-[10px] text-white/80">Satın Al</span>
          </div>
        </button>
          
          
        {/* Kirala Butonu */}
        <button
          disabled={!botData.for_rent}
          className={`w-1/2 py-2 rounded-lg transition h-16 ${
            botData.for_rent
              ? 'bg-orange-600 hover:bg-orange-500 text-white border-3 border-orange-800 shadow-md shadow-orange-900'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          <div className={`flex items-center justify-center h-full ${botData.for_rent ? 'flex-col justify-between' : ''}`}>
            {botData.for_rent && (
              <span className="text-lg font-bold">{botData.rent_price} $</span>
            )}
            <span className="text-[10px] text-white/80">Günlük Kirala</span>
          </div>
        </button>

      </div>
        {/* Stats */}
        <div className="flex flex-col space-y-2 mb-6">
          <StatBox icon={<FiCalendar />} title="Oluşturulma tarihi" value={botData.startDate} />
          <StatBox icon={<FiClock />} title="Çalışma Süresi" value={formatRunningTime(botData.runningTime)} />
          <StatBox icon={<FiTrendingUp />} title="Başarı Oranı" value={`${botData.winRate}%`} />
          <StatBox icon={<LuChartNoAxesCombined />} title="Toplam Marj" value={`${botData.totalMargin}%`} />
          <StatBox icon={<GiCharging />} title="Kâr Fakörü" value={`${botData.profitFactor}`} />
          <StatBox icon={<IoMdWarning />} title="Risk Faktörü " value={`${botData.riskFactor}`} />
          <StatBox icon={<LiaChargingStationSolid />} title="Ortalama Doluluk " value={`${botData.avg_fullness}%`} />
          <StatBox icon={<MdOutlineNumbers />} title="İşlem Sayısı (Günlük/Haftalık/Aylık)" value={`${botData.dayTrades} / ${botData.weekTrades} / ${botData.monthTrades}`} />
          <StatBoxTrades icon={<FiBarChart />} title="Kar/Zarar Durumu (Günlük/Haftalık/Aylık)" value={`${botData.dayMargin}% / ${botData.weekMargin}% / ${botData.monthMargin}%`} />
        </div>


      {/* Strateji */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Kullanılan Strateji</h3>
          <div>
              <span
                className="px-2 py-1 bg-gradient-to-r from-blue-900 to-green-800 text-blue-200 rounded-lg text-xs font-medium"
              >
                {botData.strategy}
              </span>
          </div>
        </div>

        {/* Coins */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-white mb-3">Desteklenen Coinler</h3>
          <div className="flex flex-wrap gap-2">
            {botData.coins.map((coin, index) => (
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
  );
};

const StatBox = ({ icon, title, value }) => (
  <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-xl py-2 px-4 shadow-md hover:shadow-lg transition h-12">
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
  // Günlük/haftalık/aylık marginleri ayır
  const [day, week, month] = value.split('/').map(v => parseFloat(v));

  // Yardımcı fonksiyon: Pozitifse yeşil, negatifse kırmızı
  const getColor = (val) => (val < 0 ? 'text-red-400' : 'text-green-400');

  return (
    <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-xl py-1 px-4 shadow-md hover:shadow-lg transition h-12">
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