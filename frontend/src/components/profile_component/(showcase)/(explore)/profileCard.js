'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  FiMail,
  FiInstagram
} from 'react-icons/fi';
import { FaRobot, FaUser } from 'react-icons/fa';
import useBotDataStore from '@/store/showcase/botDataStore';
import { FaLinkedin } from "react-icons/fa6";
import { FaPhoneFlip } from "react-icons/fa6";
import { FaGithub } from "react-icons/fa6";

const UserProfileCard = ({ isAnimating, onUserClick }) => {
  const { getUserData } = useBotDataStore();
  const userData = getUserData();

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

  if (!userData) return null;

  const activeBots = userData.bots?.filter(bot => bot.isActive).length || 0;

  return (
    <motion.div 
      className="bg-gray-800 rounded-2xl shadow-2xl p-6 border-1 border-gray-700"
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
      <div className="text-center mb-6">
        <div 
          className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:scale-105 transition-transform"
          onClick={() => onUserClick(userData)}
        >
          <FaUser className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-white mb-1">{userData.displayName}</h2>
        <div className="flex items-center justify-center gap-4 mt-3">
          <span className="text-xs text-gray-400">Katılım: {userData.joinDate}</span>
          <span className="text-xs text-gray-400">📍 {userData.location}</span>
        </div>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-3 gap-4 mb-6">

        <div className="text-center">
          <div className="text-base font-bold text-gray-300">{userData.allbots}</div>
          <div className="text-xs text-gray-400">Toplam Bot</div>
        </div>

        <div className="text-center">
          <div className="text-base font-bold text-gray-300">{activeBots}</div>
          <div className="text-xs text-gray-400">Aktif Bot</div>
        </div>

        <div className="text-center">
          <div className={`text-base font-bold text-gray-300`}>
            {userData.totalSold}/{userData.totalRented}
          </div>
          <div className="text-xs text-gray-400">Toplam Satılan/Kiralanan Bot</div>
        </div>

        <div className="text-center">
          <div
            className={`text-base font-bold ${
              userData.bots_winRate_LifeTime < 25
                ? 'text-red-400'
                : userData.bots_winRate_LifeTime < 50
                ? 'text-orange-400'
                : userData.bots_winRate_LifeTime < 70
                ? 'text-yellow-400'
                : 'text-green-400'
            }`}
          >
            {userData.bots_winRate_LifeTime.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-400">Botların Başarı oranı</div>
        </div>

        <div className="text-center">
          <div className={`text-base font-bold ${userData.avg_bots_profit_lifetime >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {userData.avg_bots_profit_lifetime}%
          </div>
          <div className="text-xs text-gray-400">Tüm Botların Ortalama Marjı</div>
        </div>


        <div className="text-center">
          <div className="text-base font-bold text-blue-500">{userData.totalFollowers}</div>
          <div className="text-xs text-gray-400">Botların Takipçi Sayısı</div>
        </div>

      </div>

      {/* İletişim Bilgileri */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-white mb-3">İletişim</h3>
        <div className="space-y-2">
          <ContactRow icon={<FiMail />} value={userData.email} color="text-blue-400" />
          <ContactRow icon={<FiInstagram />} value={userData.instagram} color="text-green-400" />
          <ContactRow icon={<FaLinkedin />} value={userData.linkedin} color="text-blue-400" />
          <ContactRow icon={<FaPhoneFlip  />} value={userData.gsm} color="text-blue-500" />
          <ContactRow icon={<FaGithub  />} value={userData.github} color="text-blue-500" />
        </div>
      </div>

      {/* Botlar Listesi */}
      <div>
        <h3 className="text-sm font-semibold text-white mb-3">Oluşturduğu Botlar</h3>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {userData.bots?.map((bot) => (
            <div key={bot.id} className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-lg p-3 hover:bg-gray-600 transition-colors cursor-pointer">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaRobot className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white">{bot.name}</span>
                  <span className={`w-2 h-2 rounded-full ${bot.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                </div>
                <span className={`text-xs font-medium ${
                  parseFloat(bot.profitRate || 0) > 0 ? 'text-green-400' : 'text-red-400'
                }`}>
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
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-600 text-gray-300 rounded text-xs"
                  >
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

const ContactRow = ({ icon, value, color }) => (
  <div className="flex items-center gap-2 text-xs">
    <span className={`w-3 h-3 ${color}`}>{icon}</span>
    <span className="text-gray-300">{value}</span>
  </div>
);

export default UserProfileCard;
