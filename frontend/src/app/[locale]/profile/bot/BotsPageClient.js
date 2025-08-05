'use client';

import { useState, useEffect } from 'react';
import { BotModal } from '@/components/profile_component/(bot)/botModal';
import { BotCard } from '@/components/profile_component/(bot)/botCard';
import { useBotStore } from '@/store/bot/botStore';
import useApiStore from '@/store/api/apiStore';
import { load_strategies } from '@/api/load_strategies';
import { HiPlusSmall } from 'react-icons/hi2';
import { ToastContainer } from 'react-toastify';
import SwitchConfirmModal from "@/components/profile_component/(bot)/switchConfirmModal";
import 'react-toastify/dist/ReactToastify.css';

export default function BotsPageClient() {
  const [modalOpen, setModalOpen] = useState(false);
  const bots = useBotStore((state) => state.bots);
  const loadBots = useBotStore((state) => state.loadBots);
  const loadApiKeys = useApiStore((state) => state.loadApiKeys);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const { deactivateAllBots } = useBotStore();
  

  useEffect(() => {
    const loadData = async () => {
      await loadApiKeys();
      await load_strategies();
      await loadBots();
    };

    loadData();
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Sticky Header */}
      <header className="h-[60px] bg-black flex justify-end items-center px-6 sticky top-0 z-50">

        {/* Panic Button */}
        <button
          className="relative inline-flex items-center justify-center px-8 py-1 overflow-hidden tracking-tighter text-white bg-[#661b1b9c] rounded-md group"
          title="Stop All Bots and Close Positions"
          onClick={() => setConfirmModalOpen(true)}
        >
          <span
            className="absolute w-0 h-0 transition-all duration-500 ease-out bg-red-600 rounded-full group-hover:w-56 group-hover:h-56"
          ></span>
          <span className="absolute bottom-0 left-0 h-full -ml-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-auto h-full opacity-100 object-stretch"
              viewBox="0 0 487 487"
            >
              <path
                fillOpacity=".1"
                fillRule="nonzero"
                fill="#FFF"
                d="M0 .3c67 2.1 134.1 4.3 186.3 37 52.2 32.7 89.6 95.8 112.8 150.6 23.2 54.8 32.3 101.4 61.2 149.9 28.9 48.4 77.7 98.8 126.4 149.2H0V.3z"
              ></path>
            </svg>
          </span>
          <span className="absolute top-0 right-0 w-12 h-full -mr-3">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="object-cover w-full h-full"
              viewBox="0 0 487 487"
            >
              <path
                fillOpacity=".1"
                fillRule="nonzero"
                fill="#FFF"
                d="M487 486.7c-66.1-3.6-132.3-7.3-186.3-37s-95.9-85.3-126.2-137.2c-30.4-51.8-49.3-99.9-76.5-151.4C70.9 109.6 35.6 54.8.3 0H487v486.7z"
              ></path>
            </svg>
          </span>
          <span
            className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-200"
          ></span>
          <span className="relative text-base font-semibold">Panic Button!</span>
        </button>

        <SwitchConfirmModal
          isOpen={confirmModalOpen}
          onClose={() => setConfirmModalOpen(false)}
          onConfirm={() => {
            deactivateAllBots();
            setConfirmModalOpen(false);
            console.log("All bots deactivated, positions closed.");
          }}
        />

        {/* Button to open the modal */}
        <button
          onClick={() => setModalOpen(true)}
          className="group/button relative inline-flex items-center justify-center overflow-hidden rounded-md ml-10 bg-gray-800/90 backdrop-blur-lg px-6 py-1 text-sm font-semibold text-white transition-all duration-300 ease-in-out hover:shadow-md hover:shadow-gray-600/50"
        >
          <span className="text-[13px]">Create New Bot</span>
          <HiPlusSmall className="text-2xl relative font-semibold" />
          <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
            <div className="relative h-full w-10 bg-white/20"></div>
          </div>
        </button>
      </header>

      {/* Scrollable content */}
      <main className="scrollbar-hide flex-1 overflow-y-auto py-6">
        <ToastContainer position="top-center" />
        {modalOpen && <BotModal onClose={() => setModalOpen(false)} />}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {bots.map((bot, index) => (
            <BotCard
              key={bot.id}
              bot={bot}
              column={index % 2 === 0 ? "left" : "right"}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
