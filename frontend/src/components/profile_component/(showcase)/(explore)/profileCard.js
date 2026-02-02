'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiInstagram } from 'react-icons/fi';
import { FaRobot, FaUser } from 'react-icons/fa';
import { FaLinkedin, FaPhoneFlip, FaGithub } from 'react-icons/fa6';
import { useTranslation } from 'react-i18next';

const UserProfileCard = ({ userData, isAnimating = false, onUserClick }) => {
  const { t } = useTranslation('userProfileCard');
  if (!userData) return null;

  const formatRunningTime = (hours) => {
    if (hours < 1) return t('runtime.startedToday');
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return days === 0
      ? t('runtime.hoursOnly', { hours })
      : remainingHours === 0
        ? t('runtime.daysOnly', { days })
        : t('runtime.daysHours', { days, hours: remainingHours });
  };

  const activeBots = userData.bots?.filter((bot) => bot.isActive).length || 0;

  return (
    <motion.div
      className="relative group bg-zinc-950 rounded-2xl shadow-2xl p-6 border border-zinc-800/60 hover:border-cyan-500/30 hover:shadow-[0_0_15px_-3px_rgba(6,182,212,0.15)] transition-all duration-300"
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: isAnimating ? -20 : 0, opacity: isAnimating ? 0.8 : 1 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {/* Neon Glow Border Effect */}
      <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-cyan-500/20 via-zinc-800/0 to-purple-500/20 -z-10 opacity-30 transition-opacity" />

      {/* User header */}
      <div className="text-center mb-6 relative">
        <div
          className="w-20 h-20 bg-gradient-to-r from-zinc-800 to-zinc-900 border border-zinc-700 rounded-full flex items-center justify-center mx-auto mb-4 cursor-pointer hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-all duration-300 group/avatar"
          onClick={() => onUserClick?.(userData)}
        >
          <FaUser className="w-8 h-8 text-zinc-400 group-hover/avatar:text-cyan-400 transition-colors" />
        </div>
        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 to-blue-200 mb-1 drop-shadow-[0_0_8px_rgba(34,211,238,0.2)]">
          {userData.display_name}
        </h2>
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-zinc-500 font-mono">
          <span className="bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800">{t('header.joined', { date: userData.join_date })}</span>
          <span className="bg-zinc-900/50 px-2 py-1 rounded border border-zinc-800">📍 {userData.location}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6 text-center">
        <StatBox title={t('stats.totalBots')} value={userData.allbots} />
        <StatBox title={t('stats.activeBots')} value={activeBots} valueColor="text-emerald-400" />
        <StatBox title={t('stats.soldRented')} value={`${userData.totalSold}/${userData.totalRented}`} />
        <StatBox
          title={t('stats.successRate')}
          value={`${userData.bots_winRate_LifeTime.toFixed(1)}%`}
          valueColor={getRateColor(userData.bots_winRate_LifeTime)}
        />
        <StatBox
          title={t('stats.avgMargin')}
          value={`${(userData.avg_bots_profit_lifetime * 100).toFixed(2)}%`}
          valueColor={userData.avg_bots_profit_lifetime >= 0 ? 'text-emerald-400' : 'text-rose-400'}
        />
        <StatBox title={t('stats.followers')} value={userData.totalFollowers} valueColor="text-cyan-400" />
      </div>

      {/* Contact Info */}
      <div className="mb-6 bg-zinc-900/20 rounded-xl p-4 border border-zinc-800/50">
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">{t('contact.title')}</h3>
        <div className="space-y-2.5 text-xs">
          <ContactRow icon={<FiMail />} value={userData.email} color="text-cyan-600/70" />
          <ContactRow icon={<FiInstagram />} value={userData.instagram} color="text-pink-600/70" />
          <ContactRow icon={<FaLinkedin />} value={userData.linkedin} color="text-blue-600/70" />
          <ContactRow icon={<FaPhoneFlip />} value={userData.gsm} color="text-emerald-600/70" />
          <ContactRow icon={<FaGithub />} value={userData.github} color="text-zinc-500" />
        </div>
      </div>

      {/* Created Bots */}
      <div>
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">{t('bots.title')}</h3>
        <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
          {userData.bots?.map((bot) => (
            <div key={bot.id} className="group/bot bg-zinc-900/40 border border-zinc-800/60 rounded-lg p-3 hover:bg-zinc-900 hover:border-cyan-500/30 transition-all duration-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-zinc-800/50 text-cyan-500/70 group-hover/bot:text-cyan-400 transition-colors">
                    <FaRobot className="w-3 h-3" />
                  </div>
                  <span className="text-sm font-medium text-zinc-200 group-hover/bot:text-white transition-colors">{bot.name}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full block shadow-[0_0_5px] ${bot.isActive ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-rose-500 shadow-rose-500/50'}`}
                    title={bot.isActive ? t('bots.active') : t('bots.inactive')}
                  />
                </div>
                <span
                  className={`text-xs font-mono font-bold ${parseFloat(bot.profitRate || 0) > 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                >
                  {parseFloat(bot.profitRate || 0) > 0 ? '+' : ''}
                  {bot.profitRate || 0}%
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-500 border-t border-zinc-800/50 pt-2 mb-2">
                <span className="flex flex-col items-start gap-0.5">
                  <span className="uppercase tracking-wider font-bold text-[9px]">{t('bots.uptime')}</span>
                  <span className="text-zinc-300 font-mono">{formatRunningTime(bot.runningTime || 0)}</span>
                </span>
                <span className="flex flex-col items-center gap-0.5 border-l border-zinc-800/50">
                  <span className="uppercase tracking-wider font-bold text-[9px]">{t('bots.trades')}</span>
                  <span className="text-zinc-300 font-mono">{bot.totalTrades || 0}</span>
                </span>
                <span className="flex flex-col items-end gap-0.5 border-l border-zinc-800/50">
                  <span className="uppercase tracking-wider font-bold text-[9px]">{t('bots.winRate')}</span>
                  <span className="text-zinc-300 font-mono">%{bot.winRate || 0}</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {bot.coins?.slice(0, 3).map((coin, index) => (
                  <span key={index} className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-400 rounded text-[9px] font-bold">
                    {coin}
                  </span>
                ))}
                {bot.coins?.length > 3 && (
                  <span className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-500 rounded text-[9px]">
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

const StatBox = ({ title, value, valueColor = 'text-zinc-200' }) => (
  <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-lg p-2 hover:border-cyan-500/20 transition-colors group/stat">
    <div className={`text-sm font-bold font-mono ${valueColor}`}>{value}</div>
    <div className="text-[10px] text-zinc-500 group-hover/stat:text-cyan-500/70 transition-colors uppercase tracking-wider font-bold mt-0.5">{title}</div>
  </div>
);

const ContactRow = ({ icon, value, color }) => (
  <div className="flex items-center gap-3 text-xs group/contact p-1.5 rounded hover:bg-zinc-900/50 transition-colors">
    <span className={`w-4 h-4 flex items-center justify-center text-lg ${color}`}>{icon}</span>
    <span className="text-zinc-400 font-mono group-hover/contact:text-zinc-200 transition-colors truncate">{value || '-'}</span>
  </div>
);

const getRateColor = (rate) => {
  if (rate < 25) return 'text-rose-400';
  if (rate < 50) return 'text-amber-400';
  if (rate < 70) return 'text-yellow-300';
  return 'text-emerald-400';
};

export default UserProfileCard;
