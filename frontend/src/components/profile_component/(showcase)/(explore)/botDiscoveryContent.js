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

const BotDiscoveryApp = () => {
  const {
    initializeBots,
    getCurrentBot,
    navigateBot,
    isLoading
  } = useBotDataStore();

  const botData = getCurrentBot();
  const isFollowed = useBotDataStore(state => state.isBotFollowed(botData?.bot?.bot_id));
  const follow = useBotDataStore(state => state.followBot);


  useEffect(() => {
    initializeBots();
  }, []);

  const handleNavigation = (dir) => {
    navigateBot(dir);
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 h-[calc(100vh-60px)] max-h-screen mt-[60px] relative overflow-auto pl-[340px] pr-[395px] flex items-center justify-center">
        <ShowcaseLoader />
      </div>
    );
  }
  
  if (!botData) {
    return (
      <div className="flex-1 p-6 h-[calc(100vh-60px)] max-h-screen mt-[60px] relative overflow-auto pl-[340px] pr-[395px] flex items-center justify-center">
        <div className="text-center text-gray-400 text-sm bg-gray-800/50 p-6 rounded-xl border border-gray-600">
          <p className="text-lg font-semibold text-white mb-2">Aradığınız kriterlerde bot bulunamadı.</p>
          <p className="text-sm text-gray-400">Lütfen filtrelerinizi değiştirerek tekrar deneyin.</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex-1 p-6 h-[calc(100vh-60px)] max-h-screen mt-[60px] relative overflow-auto pl-[340px] pr-[382px]">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-2">
        {/* Kullanıcı Profil Kartı */}
        <div>
          <UserProfileCard 
            userData={botData?.user}
            isAnimating={true}
            onUserClick={(user) => console.log('User clicked', user)}
          />
        </div>

        {/* Bot Kartı */}
        <div className="relative">
          <BotCard
            botData={botData?.bot}
            isFollowed={isFollowed}
            onFollow={follow}
            isAnimating={true}
          />
        </div>

        {/* Yeni kart (tam genişlikte olacak) */}
        <div className="col-span-2 mt-[-3px]">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 my-2 border-1 border-gray-700">
          <h3 className="text-sm font-semibold text-white mb-3">Anapara / Zaman</h3>
          <div className="overflow-hidden">
            <BotChart data={botData.chartData} />
          </div>
        </div>
        </div>

        <div className="col-span-2 ">
          <Trades trades={botData.bot.trades} positions={botData.bot.positions} />
        </div>

        <div className="col-span-2 mt-[-41px]">
          <BotterGuide username={botData.bot.creator} />
        </div>

      </div>


      {/* Navigasyon Okları */}
      <div className="fixed right-[330px] top-1/2 transform -translate-y-1/2 flex flex-col gap-2 z-40">
        <button
          onClick={() => handleNavigation('up')}
          className="p-3 bg-gray-700 rounded-full shadow-lg hover:bg-gray-600 transition-all duration-200 hover:scale-110"
          title="Önceki bot/kullanıcı"
        >
          <FiChevronUp className="w-5 h-5 text-gray-300" />
        </button>

        <button
          onClick={() => handleNavigation('down')}
          className="p-3 bg-gray-700 rounded-full shadow-lg hover:bg-gray-600 transition-all duration-200 hover:scale-110"
          title="Sonraki bot/kullanıcı"
        >
          <FiChevronDown className="w-5 h-5 text-gray-300" />
        </button>
      </div>
    </div>
  );
};

export default BotDiscoveryApp;