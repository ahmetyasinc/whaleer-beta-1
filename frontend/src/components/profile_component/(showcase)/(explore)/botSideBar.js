'use client';

import { useEffect, useState } from 'react';
import { FiEye, FiTrash2 } from 'react-icons/fi';
import useBotDataStore from '@/store/showcase/botDataStore';
import { useTranslation } from 'react-i18next';

export default function BotSidebar() {
  const { t } = useTranslation('sideBar');

  const {
    getFollowedBots,
    unfollowBot,
    followedBots,
    inspectBot
  } = useBotDataStore();

  const formatRunningTime = (hours) => {
    if (hours < 1) return t('runtime.startedToday');

    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days === 0) {
      return t('runtime.hoursOnly', { hours });
    } else if (remainingHours === 0) {
      return t('runtime.daysOnly', { days });
    } else {
      return t('runtime.daysHours', { days, hours: remainingHours });
    }
  };

  const handleUnfollow = (botId) => {
    unfollowBot(botId);
  };

  const handleInspect = (botId) => {
    inspectBot(botId);
  };

  // ⬇️ Load followed bots on first render
  useEffect(() => {
    getFollowedBots();
  }, []);

  return (
    <aside className="fixed top-[60px] right-0 w-[260px] h-[calc(100vh-60px)] bg-zinc-950/95 border-l border-zinc-800/60 text-zinc-300 shadow-2xl z-40 flex flex-col backdrop-blur-md">

      {/* Header Area */}
      <div className="p-5 border-b border-zinc-900/50">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_cyan]"></span>
          {t('title')}
        </h2>
        <p className="text-[10px] text-zinc-500 font-mono">
          {t('counts.followed', { count: followedBots.length })}
        </p>
      </div>

      <div className="overflow-y-auto flex-1 space-y-3 p-4 custom-scrollbar">
        {followedBots.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center opacity-60">
            <div className="w-12 h-12 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-600">
              <FiEye className="w-5 h-5" />
            </div>
            <p className="text-zinc-500 text-sm font-semibold">
              {t('empty.primary')}
            </p>
            <p className="text-zinc-600 text-xs mt-1 max-w-[200px]">
              {t('empty.hint')}
            </p>
          </div>
        ) : (
          followedBots.map((bot) => {
            const margin = parseFloat(bot.totalMargin);
            const isPositive = margin > 0;

            return (
              <div
                key={`${bot.id}`}
                className="group relative bg-zinc-900/30 hover:bg-zinc-900/60 transition-all duration-300 rounded-lg p-3 border border-zinc-800/40 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/50 overflow-hidden"
              >
                {/* Side Accent Strip */}
                <div className={`absolute left-0 top-0 bottom-0 w-[3px] transition-colors duration-300 ${isPositive ? 'bg-emerald-500/50 group-hover:bg-emerald-400' : 'bg-rose-500/50 group-hover:bg-rose-400'}`} />

                <div className="flex justify-between items-start mb-2 pl-2">
                  <h3 className="text-xs font-bold text-zinc-200 truncate pr-2 group-hover:text-cyan-100 transition-colors">
                    {bot.name}
                  </h3>

                  {/* Action Buttons (visible on hover or focus for accessibility, but let's keep visible for utility) */}
                  <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleInspect(bot.id)}
                      className="p-1.5 rounded-md hover:bg-cyan-500/10 text-zinc-500 hover:text-cyan-400 transition-colors"
                      title={t('actions.inspect')}
                    >
                      <FiEye size={12} />
                    </button>
                    <button
                      onClick={() => handleUnfollow(bot.id)}
                      className="p-1.5 rounded-md hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 transition-colors"
                      title={t('actions.unfollow')}
                    >
                      <FiTrash2 size={12} />
                    </button>
                  </div>
                </div>

                <div className="pl-2 grid grid-cols-2 gap-y-1 text-[10px] text-zinc-500 font-mono">
                  <div className="col-span-2 flex justify-between items-center bg-zinc-950/30 rounded px-2 py-1 mb-1 border border-zinc-800/30">
                    <span>{t('labels.status')}</span>
                    <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isPositive ? '+' : ''}{bot.totalMargin}%
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-zinc-600 uppercase tracking-wider text-[9px]">{t('labels.uptime')}</span>
                    <span className="text-zinc-400">{formatRunningTime(bot.runningTime)}</span>
                  </div>

                  <div className="flex flex-col text-right">
                    <span className="text-zinc-600 uppercase tracking-wider text-[9px]">{t('labels.creator')}</span>
                    <span className="text-zinc-400 truncate">{bot.creator}</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
