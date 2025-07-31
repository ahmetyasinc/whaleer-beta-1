'use client';

import { motion } from 'framer-motion';
import React, { useEffect, useRef } from 'react';
import useBotDropdownSearchStore from '@/store/showcase/botDropdownSearchStore';

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
      className="p-2 scrollbar-hide absolute top-[52px] left-[-80px] w-[600px] bg-[rgb(0,0,1)] border-1 border-gray-900 rounded-b-3xl shadow-xl z-50 max-h-[500px] overflow-y-auto"
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.30 }}
    >
      {filteredBots.map((bot) => {
        const weekly = parseFloat(bot.weeklyProfit);
        const monthly = parseFloat(bot.monthlyProfit);
        const weeklyColor = weekly < 0 ? 'text-red-400' : 'text-green-400';
        const monthlyColor = monthly < 0 ? 'text-red-400' : 'text-green-400';

        return (
          <div
            key={bot.id}
            className="p-2 mb-1 rounded-xl border-b border-gray-700 hover:bg-gray-900 text-sm"
          >
            <div className="flex justify-between items-center">
              {/* Left: Bot name and creator */}
              <div>
                <div className="text-white font-medium">{bot.name}</div>
                <div className="text-gray-400 text-xs">{bot.creator}</div>
              </div>

              {/* Right: Win rate and profit/loss */}
              <div className="text-xs text-gray-300 flex flex-col items-end gap-1">
                <div className="flex items-center gap-4">
                  <span className="text-blue-400">Total Win Rate: %{bot.winRate}</span>
                  <span className="flex gap-1">
                    <span className={`${weeklyColor} font-semibold`}>
                      {weekly}%
                    </span>
                    /
                    <span className={`${monthlyColor} font-semibold`}>
                      {monthly}%
                    </span>
                  </span>
                </div>
                <div className="text-gray-500">Weekly / Monthly</div>
              </div>
            </div>
          </div>
        );
      })}

      {filteredBots.length === 0 && (
        <div className="text-center text-gray-400 py-6 text-sm">No results found</div>
      )}
    </motion.div>
  );
};

export default BotDropdownModal;
