'use client';
import { useState, useRef, useEffect } from 'react';
import { useBotStore } from '@/store/bot/botStore';
import { BotModal } from './botModal';
import { FaRegTrashAlt } from 'react-icons/fa';
import { FiEdit3 } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoSearch } from "react-icons/io5";
import RunBotToggle from './runBotToggle'; // Import the RunBotToggle component
import SpinningWheel from './spinningWheel'; // Import the SpinningWheel component

export const BotCard = ({ bot }) => {
  const removeBot = useBotStore((state) => state.removeBot);
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const updateBot = useBotStore((state) => state.updateBot);
  const toggleBotActive = useBotStore((state) => state.toggleBotActive);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <>
      <div className="rounded-md px-4 py-4 shadow-xl relative bg-[hsl(227,82%,2%)] text-gray-200">
        {/* Üçlü Yatay Grid */}
        <div className="grid grid-cols-3 gap-4">

          {/* Sol: Bot Bilgileri */}
          <div className="border-r border-gray-700 pr-4">
            <h3 className="text-[18px] pl-1 font-semibold mb-2 text-white border-b border-gray-600 pb-[10px]">{bot.name}</h3>
            <p className="mb-1 text-[14px]"><span className="text-gray-300">API:</span> {bot.api}</p>
            <p className="mb-1 text-[14px]"><span className="text-gray-300">Strateji:</span> {bot.strategy}</p>
            <p className="mb-1 text-[14px]"><span className="text-gray-300">Periyot:</span> {bot.period}</p>
            <p className="mb-1 text-[14px]"><span className="text-gray-300">Günler:</span> {bot.days.join(', ')}</p>
            <p className="mb-1 text-[14px]"><span className="text-gray-300">Saatler:</span> {bot.startTime} - {bot.endTime}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-gray-300">Durum:</span>{' '}
              <span className={bot.isActive ? 'text-green-400' : 'text-red-400'}>
                {bot.isActive ? 'Bot Aktif' : 'Bot Kapalı'}
              </span>
            </p>
            <p className="mb-1 text-[14px]"><span className="text-gray-300">Edilen Kâr/Zarar:</span></p>
          </div>

          {/* Orta: Coin Listesi - Sabit yükseklik ve scroll özellikleri eklendi */}
          <div className="flex flex-col px-2 border-r border-gray-700 pr-4">
            <h4 className="text-sm text-gray-400 font-semibold mb-2">Kripto Paralar</h4>
            <div className="h-44 overflow-y-auto mr-4 scrollbar-hide">
              {bot.cryptos?.length > 0 ? (
                bot.cryptos.map((coin) => (
                  <div
                    key={coin}
                    className="w-full text-center text-[14px] bg-gray-800 px-2 py-1 rounded text-white mb-1"
                  >
                    {coin}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-gray-500">Seçilmiş coin yok</span>
              )}
            </div>
          </div>

          {/* Sağ: Toggle Switch */}
          <div className="flex flex-col justify-center items-center">
            <label className="flex items-center gap-3">
              <SpinningWheel isActive={bot.isActive} />
            </label>
            <label className="flex items-center gap-3">
              <RunBotToggle
                type="checkbox"
                checked={bot.isActive}
                onChange={() => toggleBotActive(bot.id)}
              />
            </label>
          </div>
        </div>

        {/* Menü (sağ üst) */}
        <div className="absolute top-2 right-2">
          <div className="relative inline-block text-left" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded hover:bg-gray-700"
            >
              <BsThreeDotsVertical className="text-gray-300" size={20} />
            </button>

            {menuOpen && (
              <div className="absolute top-0 right-10 w-32 bg-gray-900 rounded shadow-md z-10">
                <button
                  onClick={() => {
                    setEditing(true);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-800"
                >
                  <FiEdit3 size={16} /> Düzenle
                </button>

                <button
                  onClick={() => {
                    removeBot(bot.id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                >
                  <FaRegTrashAlt size={16} /> Sil
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700"
                >
                  <IoSearch size={16} /> İncele
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Düzenleme Modalı */}
        {editing && (
          <BotModal
            mode="edit"
            bot={bot}
            onClose={() => setEditing(false)}
          />
        )}
      </div>
    </>
  );
};