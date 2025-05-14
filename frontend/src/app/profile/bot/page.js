'use client';

export const dynamic = 'force-dynamic'; // ✅ Bu satır olmalı

import { FaLock } from 'react-icons/fa';
//import { useState } from 'react';
//import { BotModal } from '@/components/profile_component/(bot)/botModal';
//import { BotCard } from '@/components/profile_component/(bot)/botCard';
//import { useBotStore } from '@/store/bot/botStore';
//import { HiPlusSmall } from 'react-icons/hi2';

const isBeta = true; // 🔒 false yaparsan sayfa açılır

export default function BotsPage() {
  //const [modalOpen, setModalOpen] = useState(false);
  //const bots = useBotStore((state) => state.bots);

  if (isBeta) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        {/* Arka plan görseli */}
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover blur-lg"
          style={{ backgroundImage: "url('/pages/bot.png')" }}
        ></div>

        {/* Karartma */}
        <div className="absolute inset-0 bg-white bg-opacity-10 z-10" />

        {/* Kilitli mesaj */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
          <FaLock className="text-yellow-500 text-6xl mb-4" />
          <h1 className="text-white text-xl font-semibold">
            Bu sayfa yakında sizlerle buluşacak
          </h1>
        </div>
      </div>
    );
  }

  // Sayfa erişime açık
  return (
    <div>
      {/*<header className="flex justify-end h-[60px] bg-black items-center mb-6">
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

      {modalOpen && <BotModal onClose={() => setModalOpen(false)} />}

      <div className="px-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        {bots.map((bot) => (
          <BotCard key={bot.id} bot={bot} />
        ))}
      </div>*/}
    </div>
  );
}
