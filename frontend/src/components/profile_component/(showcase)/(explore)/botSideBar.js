'use client';

import { useEffect, useState } from 'react';
import { FiEye, FiTrash2 } from 'react-icons/fi';
import useBotDataStore from '@/store/showcase/botDataStore';

export default function BotSidebar() {
  const {
    getFollowedBots,
    unfollowBot,
    followedBots,
    inspectBot
  } = useBotDataStore();

  const formatRunningTime = (hours) => {
    if (hours < 1) return 'Started today';

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days === 0) {
      return `${hours} hours`;
    } else if (remainingHours === 0) {
      return `${days} days`;
    } else {
      return `${days} days ${remainingHours} hours`;
    }
  };

  const handleUnfollow = (botId) => {
    unfollowBot(botId);
  };

  const handleInspect = (botId) => {
    inspectBot(botId);
    console.log('Inspect:', botId);
  };

  // ⬇️ Load followed bots on first render
  useEffect(() => {
    getFollowedBots();
    console.log('BotSidebar mounted, followed bots:', followedBots);
  }, []);

  return (
    <aside className="fixed top-[60px] right-0 w-[320px] h-[calc(100vh-60px)] bg-black border-t border-gray-600 text-white shadow-2xl z-40 flex flex-col">
      <div className="p-3">
        <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Followed Bots
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {followedBots.length} bots followed
        </p>
      </div>

      <div className="overflow-y-auto flex-1 space-y-2 px-3 pb-4">
        {followedBots.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400 text-sm">
              You haven't followed any bots yet
            </p>
            <p className="text-gray-500 text-xs mt-1">
              You can follow bots by clicking the "Follow" button on their cards
            </p>
          </div>
        ) : (
          followedBots.map((bot) => (
            <div
              key={`${bot.id}`}
              className="relative bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md"
            >
              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  onClick={() => handleUnfollow(bot.id)}
                  className="text-[rgb(231,46,46)] hover:text-red-400 p-1 rounded transition-all duration-100"
                  title="Unfollow"
                >
                  <FiTrash2 size={14} />
                </button>
                <button
                  onClick={() => handleInspect(bot.id)}
                  className="text-blue-600 hover:text-blue-400 p-1 rounded transition-all duration-100"
                  title="Inspect"
                >
                  <FiEye size={14} />
                </button>
              </div>

              <h3 className="text-sm font-semibold text-gray-100 pr-8">{bot.name}</h3>
              <div className="space-y-0.5 mt-1">
                <p className="text-xs text-gray-400">Uptime: {formatRunningTime(bot.runningTime)}</p>
                <p className="text-xs text-gray-400">Creator: {bot.creator}</p>
                <p className={`text-xs mt-3 ${parseFloat(bot.totalMargin) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Status: {parseFloat(bot.totalMargin) > 0 ? '+' : ''}{bot.totalMargin}%
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
