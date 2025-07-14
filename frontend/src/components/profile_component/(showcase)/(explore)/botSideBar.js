// components/BotSidebar.js
'use client';

import { useState } from 'react';
import { FiEye, FiTrash2 } from 'react-icons/fi';
import useBotDataStore from '@/store/showcase/botDataStore';

export default function BotSidebar() {

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

  const {
    currentBotData: botData,
  } = useBotDataStore();

  const { 
    getFollowedBots, 
    unfollowBot, 
    inspectBot,
    formatDuration 
  } = useBotDataStore();
  
  const followedBots = getFollowedBots();

  const handleUnfollow = (botId) => {
    unfollowBot(botId);
  };

  const handleInspect = (botId) => {
    inspectBot(botId);
  };

  return (
    <aside className="fixed top-[60px] right-0 w-[320px] h-[calc(100vh-60px)] bg-black border-t border-gray-600 text-white shadow-2xl z-40 flex flex-col">
      <div className="p-3">
        <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Takip Edilen Botlar
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {followedBots.length} bot takip ediliyor
        </p>
      </div>

      <div className="overflow-y-auto flex-1 space-y-2 px-3 pb-4">
        {followedBots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">
              Henüz bot takip etmiyorsunuz
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Bot kartlarındaki "Takip Et" butonuna tıklayarak botları takip edebilirsiniz
            </p>
          </div>
        ) : (
          followedBots.map((bot) => (
            <div
              key={bot.id}
              className="relative bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md"
            >
              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  onClick={() => handleUnfollow(bot.id)}
                  className="text-[rgb(231,46,46)] hover:text-red-400 p-1 rounded transition-all duration-100"
                  title="Takibi Bırak"
                >
                  <FiTrash2 size={14} />
                </button>
                <button
                  onClick={() => handleInspect(bot.id)}
                  className="text-blue-600 hover:text-blue-400 p-1 rounded transition-all duration-100"
                  title="İncele"
                >
                  <FiEye size={14} />
                </button>
              </div>

              <h3 className="text-sm font-semibold text-gray-100 pr-8">{bot.name}</h3>
              <div className="space-y-0.5 mt-1">
                <p className="text-xs text-gray-400">Süre: {formatRunningTime(bot.runningTime)}</p>
                <p className="text-xs text-gray-400">Oluşturan: {bot.creator}</p>
                <p className={`text-xs mt-3 ${parseFloat(bot.totalMargin) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Durum: {parseFloat(bot.totalMargin) > 0 ? '+' : ''}{bot.totalMargin}%
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}