'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FiMail,
  FiInstagram
} from 'react-icons/fi';
import { FaRobot, FaUser } from 'react-icons/fa';
import { FaLinkedin, FaPhoneFlip, FaGithub } from "react-icons/fa6";

const UserProfileCard = ({ userData, isAnimating = false, onUserClick }) => {
  if (!userData) return null;

  const formatRunningTime = (hours) => {
    if (hours < 1) return 'Bugün başladı';
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return days === 0
      ? `${hours} saat`
      : remainingHours === 0
      ? `${days} gün`
      : `${days} gün ${remainingHours} saat`;
  };

  const activeBots = userData.bots?.filter(bot => bot.isActive).length || 0;

  return (
    <motion.div
      className="bg-gray-800 rounded-2xl shadow-2xl p-6 border-1 border-gray-700"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: isAnimating ? -20 : 0, opacity: isAnimating ? 0.8 : 1 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      {/* Kullanıcı başlığı */}
      <div className="text-center mb-6">
        <div
          className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => onUserClick?.(userData)}
        >
          <FaUser className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{userData.display_name}</h2>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-gray-400">
          <span>Katılım: {userData.join_date}</span>
          <span>📍 {userData.location}</span>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4 mb-6 text-center text-gray-300">
        <StatBox title="Toplam Bot" value={userData.allbots} />
        <StatBox title="Aktif Bot" value={activeBots} />
        <StatBox title="Satılan / Kiralanan" value={`${userData.totalSold}/${userData.totalRented}`} />
        <StatBox title="Başarı Oranı" value={`${userData.bots_winRate_LifeTime.toFixed(1)}%`} color={getRateColor(userData.bots_winRate_LifeTime)} />
        <StatBox title="Ortalama Marj" value={`${userData.avg_bots_profit_lifetime}%`} color={userData.avg_bots_profit_lifetime >= 0 ? 'text-green-400' : 'text-red-400'} />
        <StatBox title="Takipçi Sayısı" value={userData.totalFollowers} color="text-blue-500" />
      </div>

      {/* İletişim Bilgileri */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">İletişim</h3>
        <div className="space-y-2 text-xs text-gray-300">
          <ContactRow icon={<FiMail />} value={userData.email} color="text-blue-400" />
          <ContactRow icon={<FiInstagram />} value={userData.instagram} color="text-green-400" />
          <ContactRow icon={<FaLinkedin />} value={userData.linkedin} color="text-blue-400" />
          <ContactRow icon={<FaPhoneFlip />} value={userData.gsm} color="text-blue-500" />
          <ContactRow icon={<FaGithub />} value={userData.github} color="text-blue-500" />
        </div>
      </div>

      {/* Oluşturduğu Botlar */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Oluşturduğu Botlar</h3>
        <div className="space-y-2 max-h-[450px] overflow-y-auto">
          {userData.bots?.map(bot => (
            <div key={bot.id} className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-lg p-3 hover:bg-gray-600 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaRobot className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">{bot.name}</span>
                  <span className="w-2 h-2 rounded-full block" title={bot.isActive ? 'Aktif' : 'Pasif'}
                    style={{ backgroundColor: bot.isActive ? '#4ade80' : '#f87171' }} />
                </div>
                <span className={`text-xs font-medium ${parseFloat(bot.profitRate || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {parseFloat(bot.profitRate || 0) > 0 ? '+' : ''}{bot.profitRate || 0}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex flex-col items-start">
                  <span>Çalışma Süresi:</span>
                  <span className="text-gray-300">{formatRunningTime(bot.runningTime || 0)}</span>
                </span>
                <span className="flex flex-col items-start">
                  <span>İşlem</span>
                  <span className="text-gray-300">{bot.totalTrades || 0}</span>
                </span>
                <span className="flex flex-col items-start">
                  <span>Başarı</span>
                  <span className="text-gray-300">%{bot.winRate || 0}</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mt-2">
                {bot.coins?.slice(0, 3).map((coin, index) => (
                  <span key={index} className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">
                    {coin}
                  </span>
                ))}
                {bot.coins?.length > 3 && (
                  <span className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs">
                    +{bot.coins.length - 3}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

const StatBox = ({ title, value, color = 'text-gray-300' }) => (
  <div className="text-center">
    <div className={`text-base font-bold ${color}`}>{value}</div>
    <div className="text-xs text-gray-400">{title}</div>
  </div>
);

const ContactRow = ({ icon, value, color }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className={`w-3 h-3 ${color}`}>{icon}</span>
    <span className="text-gray-300">{value}</span>
  </div>
);

const getRateColor = (rate) => {
  if (rate < 25) return 'text-red-400';
  if (rate < 50) return 'text-orange-400';
  if (rate < 70) return 'text-yellow-400';
  return 'text-green-400';
};

export default UserProfileCard;
