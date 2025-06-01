'use client';

import { useState, useEffect } from 'react';
import { BotModal } from '@/components/profile_component/(bot)/botModal';
import { BotCard } from '@/components/profile_component/(bot)/botCard';
import { useBotStore } from '@/store/bot/botStore';
import useApiStore from '@/store/api/apiStore';
import { load_strategies } from '@/api/load_strategies';
import { HiPlusSmall } from 'react-icons/hi2';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function BotsPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const bots = useBotStore((state) => state.bots);
  const loadBots = useBotStore((state) => state.loadBots);
  const loadApiKeys = useApiStore((state) => state.loadApiKeys);

  useEffect(() => {
    const loadData = async () => {
      await loadApiKeys();
      await load_strategies();
      await loadBots();
    };
  
    loadData();
  }, []);


  return (
    <div>
      <header className="flex justify-end h-[60px] bg-black items-center mb-6">
        <button
          onClick={() => setModalOpen(true)}
          className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md bg-gray-800/90 backdrop-blur-lg px-6 py-1 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:shadow-md hover:shadow-gray-600/50 mr-6"
        >
          <span className="text-[13px]">Yeni Bot Oluştur</span>
          <HiPlusSmall className="text-2xl relative font-semibold" />
          <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
            <div className="relative h-full w-10 bg-white/20"></div>
          </div>
        </button>
      </header>
      <ToastContainer position="top-center" />
      {modalOpen && <BotModal onClose={() => setModalOpen(false)} />}
      
      <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {bots.map((bot) => (
          <BotCard key={bot.id} bot={bot} />
        ))}
      </div>
    </div>
  );
}
