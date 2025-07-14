'use client';

import React, { useState, useEffect } from 'react';
import { FiChevronUp, FiChevronDown } from 'react-icons/fi';
import BotCard from './botCards';
import UserProfileCard from './profileCard';
import useBotDataStore from '@/store/showcase/botDataStore';
import ShowcaseLoader from '@/ui/showcaseLoader';
import BotChart from './botCardChart';
import BotterGuide from './botterGuide';
import { BiTransfer } from 'react-icons/bi';
import Trades from './trades';


const BotDiscoveryApp = () => {
  const { chartData } = useBotDataStore();
  const { getUserData } = useBotDataStore();

  const {
    currentBotData: botData,
    loadBotData,
    currentBotId,
  } = useBotDataStore();

  const {
    getBotData,
    goToNextBot,
    goToPreviousBot
  } = useBotDataStore();

  const [currentUser, setCurrentUser] = useState(null);
  const [currentBot, setCurrentBot] = useState(null);

  // Initial data load
  useEffect(() => {
    const userData = getUserData();
    const botData = getBotData();

    if (!userData || !botData) {
      loadBotData(currentBotId);
    }

    setCurrentUser(userData);
    setCurrentBot(botData);
  }, [getUserData, getBotData, loadBotData, currentBotId]);

  const handleNavigation = (direction) => {
    if (direction === 'up') {
      goToPreviousBot();
    } else {
      goToNextBot();
    }

    const newUser = getUserData();
    const newBot = getBotData();

    setCurrentUser(newUser);
    setCurrentBot(newBot);
  };

  const handleUserClick = (userData) => {
    console.log('Kullanıcı profili tıklandı:', userData.username);
  };

  const handleBotClick = (botData) => {
    console.log('Bot detayları:', botData.name);
  };

  if (!currentUser || !currentBot) {
    return (
      <div className="flex-1 p-6 h-[calc(100vh-60px)] max-h-screen mt-[60px] relative overflow-auto pl-[340px] pr-[395px] flex items-center justify-center">
        <ShowcaseLoader />
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 h-[calc(100vh-60px)] max-h-screen mt-[60px] relative overflow-auto pl-[340px] pr-[382px]">

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-2">
        {/* Kullanıcı Profil Kartı */}
        <div>
          <UserProfileCard 
            userData={currentUser} 
            onUserClick={handleUserClick}
          />
        </div>

        {/* Bot Kartı */}
        <div className="relative">
          <BotCard />
        </div>

        {/* Yeni kart (tam genişlikte olacak) */}
        <div className="col-span-2 mt-[-3px]">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-4 my-2 border-1 border-gray-700">
          <h3 className="text-sm font-semibold text-white mb-3">Anapara / Zaman</h3>
          <div className="overflow-hidden">
            <BotChart data={chartData} />
          </div>
        </div>
        </div>

        <div className="col-span-2 ">
          <Trades />
        </div>

        <div className="col-span-2 mt-[-41px]">
            <BotterGuide username={botData.creator} />
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