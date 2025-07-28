'use client';
import { useState, useRef, useEffect } from 'react';
import useBotExamineStore from "@/store/bot/botExamineStore";
import { useBotStore } from "@/store/bot/botStore";
import { BotModal } from './botModal';
import { FaRegTrashAlt } from 'react-icons/fa';
import { FiEdit3 } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoSearch } from "react-icons/io5";
import RunBotToggle from './runBotToggle';
import SpinningWheel from './spinningWheel';
import ExamineBot from "./examineBot";
import { FaBan } from "react-icons/fa6";


export const BotCard = ({ bot, column }) => {
  
  const removeBot = useBotStore((state) => state.removeBot);
  const updateBot = useBotStore((state) => state.updateBot);
  const toggleBotActive = useBotStore((state) => state.toggleBotActive);
  const { fetchAndStoreBotAnalysis } = useBotExamineStore.getState();

  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExamineOpen, setIsExamineOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (column === "left") {
                                     //sol sütun
    return (
    <>

      <div className="rounded-r-full px-4 py-4 relative border-2 border-cyan-900 bg-[hsl(227,82%,2%)] text-gray-200">
        {/* Grid */}
        <div className="grid grid-cols-3 gap-4">
          {/* Sol */}
          <div className="border-r border-gray-700 pr-4">
            <h3 className="text-[18px] pl-1 font-semibold mb-2 text-white border-b border-gray-600 pb-[10px]">{bot.name}</h3>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">API:</span> {bot.api}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Strateji:</span> {bot.strategy}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Periyot:</span> {bot.period}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">Günler:</span> {Array.isArray(bot.days) ? bot.days.join(', ') : 'Tanımsız'}
            </p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Saatler:</span> {bot.startTime} - {bot.endTime}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">Durum:</span>{' '}
              <span className={bot.isActive ? 'text-green-400' : 'text-[rgb(216,14,14)]'}>
                {bot.isActive ? 'Bot Aktif' : 'Bot Kapalı'}
              </span>
            </p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Edilen Kâr/Zarar:</span></p>
          </div>

          {/* Orta */}
          <div className="flex flex-col pr-1 border-r border-gray-700">
            <h4 className="text-sm font-semibold mb-2 bg-gradient-to-r from-violet-900 via-sky-600 to-purple-500 text-transparent bg-clip-text">
              Kripto Paralar
            </h4>
          {/* Menü */}
        <div className="absolute left-44 top-4">
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
                    setIsExamineOpen(true);
                    fetchAndStoreBotAnalysis(bot.id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700"
                >
                  <IoSearch size={16} /> İncele
                </button>

                <button
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-700"
                  title="Botu ve tüm açık işlemleri kapatır"
                >
                  <FaBan   size={16} /> Sonlandır 
                </button>
              </div>
            )}
          </div>
        </div>
            <div className="h-44 overflow-y-auto mr-4 scrollbar-hide">
              {bot.cryptos?.length > 0 ? (
                bot.cryptos.map((coin) => (
                  <div key={coin} className="w-full text-center text-[14px] bg-gradient-to-r from-[rgb(14,20,35)] to-neutral-800  border-1 border-slate-700 px-2 py-1 rounded text-white mb-1">
                    {coin}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-gray-500">Seçilmiş coin yok</span>
              )}
            </div>
          </div>

          {/* Sağ */}
          <div className="flex flex-col justify-center items-center">
            <label className="absolute flex items-center gap-3 mb-[152px] mr-[7px] z-10 pointer-events-none">
                <SpinningWheel isActive={bot.isActive} />
            </label>
            <label className="flex items-center gap-3 z-20">
              <RunBotToggle
                type="checkbox"
                checked={bot.isActive}
                onChange={() => toggleBotActive(bot.id)}
              />
            </label>
          </div>
        </div>

        {/* Modallar */}
        {editing && (
          <BotModal
            mode="edit"
            bot={bot}
            onClose={() => setEditing(false)}
          />
        )}
        {isExamineOpen && (
          <ExamineBot
            isOpen={isExamineOpen}
            onClose={() => setIsExamineOpen(false)}
            botId={bot.id}
          />
        )}
      </div>
    </>
    );
  } else {
    return (
    <>
      <div className="rounded-l-full px-4 py-4 border-2 border-cyan-900 relative bg-[hsl(227,82%,2%)] text-gray-200">
        {/* Grid */}
        <div className="grid grid-cols-3 gap-4">

          {/* Sağ */}
          <div className="flex flex-col justify-center items-center">
            <label className="absolute flex items-center gap-3 mb-[152px] ml-[7px] z-10 pointer-events-none scale-x-[-1]">
              <SpinningWheel isActive={bot.isActive} />
            </label>
            <label className="flex items-center gap-3 z-20">
              <RunBotToggle
                type="checkbox"
                checked={bot.isActive}
                onChange={() => toggleBotActive(bot.id)}
              />
            </label>
          </div>


          {/* Orta */}
          <div className="flex flex-col border-x pl-4 border-gray-700">
            <h4 className="text-sm font-semibold mb-2 bg-gradient-to-r from-violet-900 via-sky-600 to-purple-500 text-transparent bg-clip-text">
              Kripto Paralar
            </h4>
            <div className="h-44 overflow-y-auto mr-4 scrollbar-hide">
              {bot.cryptos?.length > 0 ? (
                bot.cryptos.map((coin) => (
                  <div key={coin} className="w-full text-center text-[14px] bg-gradient-to-r from-[rgb(14,20,35)] to-neutral-800  border-1 border-slate-700 px-2 py-1 rounded text-white mb-1">
                    {coin}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-gray-500">Seçilmiş coin yok</span>
              )}
            </div>
          </div>

            {/* Sol */}
          <div className="border-gray-700 pr-4">
            <h3 className="text-[18px] pl-1 font-semibold mb-2 text-white border-b border-gray-600 pb-[10px]">{bot.name}</h3>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">API:</span> {bot.api}</p>
            <p className="mb-1 text-[14px] flex items-center gap-1 max-w-[180px] overflow-hidden whitespace-nowrap">
              <span className="text-stone-500 shrink-0">Strateji:</span>
              <span className="truncate">{bot.strategy}</span>
            </p>

            <p className="mb-1 text-[14px]"><span className="text-stone-500">Periyot:</span> {bot.period}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">Günler:</span> {Array.isArray(bot.days) ? bot.days.join(', ') : 'Tanımsız'}
            </p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Saatler:</span> {bot.startTime} - {bot.endTime}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">Durum:</span>{' '}
              <span className={bot.isActive ? 'text-green-400' : 'text-[rgb(216,14,14)]'}>
                {bot.isActive ? 'Bot Aktif' : 'Bot Kapalı'}
              </span>
            </p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Edilen Kâr/Zarar:</span></p>
          </div>

        </div>

        {/* Menü */}
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
                    setIsExamineOpen(true);
                    fetchAndStoreBotAnalysis(bot.id);
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700"
                >
                  <IoSearch size={16} /> İncele
                </button>
                                <button
                  onClick={() => {
                    setMenuOpen(false);
                  }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-700"
                  title="Botu ve tüm açık işlemleri kapatır"
                >
                  <FaBan   size={16} /> Sonlandır 
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modallar */}
        {editing && (
          <BotModal
            mode="edit"
            bot={bot}
            onClose={() => setEditing(false)}
          />
        )}
        {isExamineOpen && (
          <ExamineBot
            isOpen={isExamineOpen}
            onClose={() => setIsExamineOpen(false)}
            botId={bot.id}
          />
        )}
      </div>
    </>
    );
  }
};


