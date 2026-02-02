'use client';

import { motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import useBotDropdownSearchStore from '@/store/showcase/botDropdownSearchStore';
import { FiTrendingUp, FiTrendingDown, FiUser } from 'react-icons/fi';

const BotDropdownModal = ({ onClose }) => {
  const { filteredBots } = useBotDropdownSearchStore();
  const modalRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <motion.div
      ref={modalRef}
      className="scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent absolute top-[52px] left-[-80px] w-[600px] bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl z-50 max-h-[500px] overflow-y-auto overflow-x-hidden p-2"
      initial={{ opacity: 0, y: -20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.98 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-cyan-500/10 via-zinc-800/0 to-purple-500/10 -z-10 pointer-events-none" />

      {filteredBots.map((bot, index) => {
        const weekly = parseFloat(bot.weeklyProfit);
        const monthly = parseFloat(bot.monthlyProfit);

        // Colors
        const weeklyColor = weekly < 0 ? 'text-rose-400' : 'text-emerald-400';
        const monthlyColor = monthly < 0 ? 'text-rose-400' : 'text-emerald-400';

        return (
          <motion.div
            key={bot.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="group p-3 mb-1 rounded-xl hover:bg-zinc-900/60 border border-transparent hover:border-zinc-800/60 transition-all duration-200 cursor-pointer relative overflow-hidden"
          >
            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="flex justify-between items-center relative z-10">
              {/* Left: Bot info */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-colors">
                  {/* Placeholder icon or bot avatar could go here */}
                  <span className="font-bold text-xs">{bot.name.substring(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <div className="text-zinc-200 font-semibold text-sm group-hover:text-white transition-colors">
                    {bot.name}
                  </div>
                  <div className="text-zinc-500 text-xs flex items-center gap-1">
                    <FiUser className="w-3 h-3" />
                    {bot.creator}
                  </div>
                </div>
              </div>

              {/* Right: Stats */}
              <div className="text-right">
                <div className="flex items-center justify-end gap-3 mb-1">
                  {/* Win Rate Badge */}
                  <div className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-400">
                    Win Rate <span className="text-cyan-400 font-bold ml-1">% {bot.winRate}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs font-mono">
                  <div className="flex flex-col items-end">
                    <span className={`${weeklyColor} font-bold flex items-center gap-1`}>
                      {weekly > 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                      {weekly}%
                    </span>
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Weekly</span>
                  </div>

                  <div className="w-[1px] h-6 bg-zinc-800" />

                  <div className="flex flex-col items-end">
                    <span className={`${monthlyColor} font-bold flex items-center gap-1`}>
                      {monthly > 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                      {monthly}%
                    </span>
                    <span className="text-[9px] text-zinc-600 uppercase tracking-wider">Monthly</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}

      {filteredBots.length === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/50 text-zinc-600 mb-2">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <p className="text-zinc-400 text-sm font-medium">No results found</p>
          <p className="text-zinc-600 text-xs">Try adjusting your search terms</p>
        </div>
      )}
    </motion.div>
  );
};

export default BotDropdownModal;
