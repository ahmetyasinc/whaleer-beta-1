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
import DeleteBotConfirmModal from "./deleteBotConfirmModal";
import ShotDownBotModal from "./shotDownBotModal";

export const BotCard = ({ bot, column }) => {
  const removeBot = useBotStore((state) => state.removeBot);
  const updateBot = useBotStore((state) => state.updateBot);
  const toggleBotActive = useBotStore((state) => state.toggleBotActive);
  const { fetchAndStoreBotAnalysis } = useBotExamineStore.getState();
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [isShotDownModalOpen, setShotDownModalOpen] = useState(false);

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
    return (
    <>
      <div className="rounded-r-full px-4 py-4 relative border-2 border-cyan-900 bg-[hsl(227,82%,2%)] text-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="border-r border-gray-700 pr-4">
            <h3 className="text-[18px] pl-1 font-semibold mb-2 text-white border-b border-gray-600 pb-[10px]">{bot.name}</h3>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">API:</span> {bot.api}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Strategy:</span> {bot.strategy}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Period:</span> {bot.period}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">Days:</span> {Array.isArray(bot.days) ? bot.days.join(', ') : 'Undefined'}
            </p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Hours:</span> {bot.startTime} - {bot.endTime}</p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">Status:</span>{' '}
              <span className={bot.isActive ? 'text-green-400' : 'text-[rgb(216,14,14)]'}>
                {bot.isActive ? 'Bot Active' : 'Bot Inactive'}
              </span>
            </p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Profit/Loss:</span></p>
          </div>

          <div className="flex flex-col pr-1 border-r border-gray-700">
            <h4 className="text-sm font-semibold mb-2 bg-gradient-to-r from-violet-900 via-sky-600 to-purple-500 text-transparent bg-clip-text">
              Cryptocurrencies
            </h4>
            <div className="absolute left-44 top-4">
              <div className="relative inline-block text-left" ref={menuRef}>
                <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded hover:bg-gray-700">
                  <BsThreeDotsVertical className="text-gray-300" size={20} />
                </button>
                {menuOpen && (
                  <div className="absolute top-0 right-10 w-32 bg-gray-900 rounded shadow-md z-10">
                    <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-800">
                      <FiEdit3 size={16} /> Edit
                    </button>
                    <button onClick={() => { setSelectedBotId(bot.id); setDeleteModalOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800">
                      <FaRegTrashAlt size={16} /> Delete
                    </button>
                    <button onClick={() => { setIsExamineOpen(true); fetchAndStoreBotAnalysis(bot.id); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700">
                      <IoSearch size={16} /> Examine
                    </button>
                    <button onClick={() => { setSelectedBotId(bot.id); setShotDownModalOpen(true); setMenuOpen(false); }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-700"
                      title="Shuts down the bot and all open trades">
                      <FaBan size={16} /> Shutdown
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="h-44 overflow-y-auto mr-4 scrollbar-hide">
              {bot.cryptos?.length > 0 ? (
                bot.cryptos.map((coin) => (
                  <div key={coin} className="w-full text-center text-[14px] bg-gradient-to-r from-[rgb(14,20,35)] to-neutral-800 border border-slate-700 px-2 py-1 rounded text-white mb-1">
                    {coin}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-gray-500">No selected coins</span>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center items-center">
            <label className="absolute flex items-center gap-3 mb-[152px] mr-[7px] z-10 pointer-events-none">
              <SpinningWheel isActive={bot.isActive} />
            </label>
            <label className="flex items-center gap-3 z-20">
              <RunBotToggle type="checkbox" checked={bot.isActive} onChange={() => toggleBotActive(bot.id)} />
            </label>
          </div>
        </div>

        {editing && <BotModal mode="edit" bot={bot} onClose={() => setEditing(false)} />}
        {isExamineOpen && <ExamineBot isOpen={isExamineOpen} onClose={() => setIsExamineOpen(false)} botId={bot.id} />}
      </div>

      <DeleteBotConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
      />
      <ShotDownBotModal
        isOpen={isShotDownModalOpen}
        onClose={() => setShotDownModalOpen(false)}
        onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
      />
    </>
    );
  } else {
    return (
    <>
      <div className="rounded-l-full px-4 py-4 border-2 border-cyan-900 relative bg-[hsl(227,82%,2%)] text-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col justify-center items-center">
            <label className="absolute flex items-center gap-3 mb-[152px] ml-[7px] z-10 pointer-events-none scale-x-[-1]">
              <SpinningWheel isActive={bot.isActive} />
            </label>
            <label className="flex items-center gap-3 z-50">
              <RunBotToggle type="checkbox" checked={bot.isActive} onChange={() => toggleBotActive(bot.id)} />
            </label>
          </div>

          <div className="flex flex-col border-x pl-4 border-gray-700">
            <h4 className="text-sm font-semibold mb-2 bg-gradient-to-r from-violet-900 via-sky-600 to-purple-500 text-transparent bg-clip-text">
              Cryptocurrencies
            </h4>
            <div className="h-44 overflow-y-auto mr-4 scrollbar-hide">
              {bot.cryptos?.length > 0 ? (
                bot.cryptos.map((coin) => (
                  <div key={coin} className="w-full text-center text-[14px] bg-gradient-to-r from-[rgb(14,20,35)] to-neutral-800 border border-slate-700 px-2 py-1 rounded text-white mb-1">
                    {coin}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-gray-500">No selected coins</span>
              )}
            </div>
          </div>

          <div className="border-gray-700 pr-4">
            <h3 className="text-[18px] pl-1 font-semibold mb-2 text-white border-b border-gray-600 pb-[10px]">{bot.name}</h3>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">API:</span> {bot.api}</p>
            <p className="mb-1 text-[14px] flex items-center gap-1 max-w-[180px] overflow-hidden whitespace-nowrap">
              <span className="text-stone-500 shrink-0">Strategy:</span>
              <span className="truncate">{bot.strategy}</span>
            </p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Period:</span> {bot.period}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Days:</span> {Array.isArray(bot.days) ? bot.days.join(', ') : 'Undefined'}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Hours:</span> {bot.startTime} - {bot.endTime}</p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Status:</span> <span className={bot.isActive ? 'text-green-400' : 'text-[rgb(216,14,14)]'}>{bot.isActive ? 'Bot Active' : 'Bot Inactive'}</span></p>
            <p className="mb-1 text-[14px]"><span className="text-stone-500">Profit/Loss:</span></p>
          </div>
        </div>

        <div className="absolute top-2 right-2">
          <div className="relative inline-block text-left" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded hover:bg-gray-700">
              <BsThreeDotsVertical className="text-gray-300" size={20} />
            </button>
            {menuOpen && (
              <div className="absolute top-0 right-10 w-32 bg-gray-900 rounded shadow-md z-10">
                <button onClick={() => { setEditing(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-800">
                  <FiEdit3 size={16} /> Edit
                </button>
                <button onClick={() => { setSelectedBotId(bot.id); setDeleteModalOpen(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800">
                  <FaRegTrashAlt size={16} /> Delete
                </button>
                <button onClick={() => { setIsExamineOpen(true); fetchAndStoreBotAnalysis(bot.id); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-gray-700">
                  <IoSearch size={16} /> Examine
                </button>
                <button onClick={() => { setSelectedBotId(bot.id); setShotDownModalOpen(true); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-700"
                  title="Shuts down the bot and all open trades">
                  <FaBan size={16} /> Shutdown
                </button>
              </div>
            )}
          </div>
        </div>

        {editing && <BotModal mode="edit" bot={bot} onClose={() => setEditing(false)} />}
        {isExamineOpen && <ExamineBot isOpen={isExamineOpen} onClose={() => setIsExamineOpen(false)} botId={bot.id} />}
      </div>

      <DeleteBotConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
      />
      <ShotDownBotModal
        isOpen={isShotDownModalOpen}
        onClose={() => setShotDownModalOpen(false)}
        onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
      />
    </>
    );
  }
};
