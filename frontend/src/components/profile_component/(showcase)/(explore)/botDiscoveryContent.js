'use client';

import React, { useState, useEffect } from 'react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';
import BotCard from './botCards';
import UserProfileCard from './profileCard';
import useBotDataStore from '@/store/showcase/botDataStore';
import ShowcaseLoader from '@/ui/showcaseLoader';
import BotChart from './botCardChart';
import BotterGuide from './botterGuide';
import Trades from './trades';
import { useTranslation } from 'react-i18next';

const BotDiscoveryApp = () => {
  const { t } = useTranslation('botDiscoveryApp');

  const {
    initializeBots,
    getCurrentBot,
    navigateBot,
    isLoading
  } = useBotDataStore();

  const botData = getCurrentBot();
  const isFollowed = useBotDataStore(state => state.isBotFollowed(botData?.bot?.bot_id));
  const follow = useBotDataStore(state => state.followBot);
  const viewMode = useBotDataStore(s => s.viewMode);

  useEffect(() => {
    initializeBots();
  }, [initializeBots, viewMode]);

  const handleNavigation = (dir) => {
    navigateBot(dir);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 h-[calc(100vh-60px)] max-h-screen mt-[60px] relative overflow-auto pl-[280px] pr-[335px] flex items-center justify-center">
        <ShowcaseLoader />
      </div>
    );
  }

  if (!botData) {
    return (
      <div className="flex-1 p-6 h-[calc(100vh-60px)] max-h-screen mt-[60px] relative overflow-auto pl-[280px] pr-[335px] flex items-center justify-center">
        <div className="text-center text-gray-400 text-sm bg-gray-800/50 p-6 rounded-xl border border-gray-600">
          <p className="text-lg font-semibold text-gray-200 mb-2">{t('empty.title')}</p>
          <p className="text-sm text-gray-400">{t('empty.desc')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 h-[calc(100vh-60px)] max-h-screen mt-[60px] relative overflow-auto pl-[280px] pr-[322px]">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-2">
        {/* User Profile Card */}
        <div>
          <UserProfileCard
            userData={botData?.user}
            isAnimating={false}
            onUserClick={(user) => console.log('User clicked', user)}
          />
        </div>

        {/* Bot Card */}
        <div className="relative">
          <BotCard
            botData={botData?.bot}
            isFollowed={isFollowed}
            onFollow={follow}
            isAnimating={false}
          />
        </div>

        {/* Full-width chart card */}
        <div className="col-span-2 mt-[-3px]">
          <div className="bg-zinc-950 rounded-2xl shadow-2xl p-4 my-2 border border-zinc-800/60 hover:border-cyan-500/30 hover:shadow-[0_0_15px_-3px_rgba(6,182,212,0.15)] transition-all duration-300 relative group">
            {/* Neon Glow Border Effect */}
            <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-cyan-500/20 via-zinc-800/0 to-purple-500/20 -z-10 opacity-30 transition-opacity" />

            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 px-1">{t('chart.profitPctTitle')}</h3>
            <div className="overflow-hidden">
              <BotChart data={botData.chartData} />
            </div>
          </div>
        </div>

        <div className="col-span-2 ">
          <Trades trades={botData.bot.trades} positions={botData.bot.positions} />
        </div>

        <div className="col-span-2 mt-[-41px]">
          <BotterGuide username={botData.bot.creator} bot={botData} />
        </div>
      </div>

      {/* Navigation Arrows */}
      <div className="fixed right-[271px] top-1/2 transform -translate-y-1/2 flex flex-col gap-3 z-40">
        <button
          onClick={() => handleNavigation('up')}
          className="p-3 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/60 rounded-full shadow-xl hover:bg-zinc-800 hover:border-cyan-500/50 hover:shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)] hover:text-cyan-400 transition-all duration-300 hover:-translate-y-1 group"
          title={t('nav.prevTooltip')}
        >
          <FiChevronUp className="w-6 h-6 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
        </button>

        <button
          onClick={() => handleNavigation('down')}
          className="p-3 bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/60 rounded-full shadow-xl hover:bg-zinc-800 hover:border-cyan-500/50 hover:shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)] hover:text-cyan-400 transition-all duration-300 hover:translate-y-1 group"
          title={t('nav.nextTooltip')}
        >
          <FiChevronDown className="w-6 h-6 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
        </button>
      </div>
    </div>
  );
};

export default BotDiscoveryApp;
