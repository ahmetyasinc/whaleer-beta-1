// components/botterGuide.js
'use client';

import React from 'react';
import useBotDataStore from '@/store/showcase/botDataStore';
import { useTranslation } from 'react-i18next';
import { FaQuoteLeft } from 'react-icons/fa';

const BotterGuide = ({ username, bot }) => {
  const { t } = useTranslation('botterGuide');
  // Store'daki açıklama varsa onu kullan; yoksa i18n'deki varsayılan metne düş
  const guideText = bot?.user?.description || t('defaultGuideText');

  return (
    <div className="mt-6 p-6 bg-zinc-950 rounded-2xl border border-zinc-800/60 transition-all duration-300 relative group hover:border-cyan-500/30 hover:shadow-[0_0_15px_-3px_rgba(6,182,212,0.15)]">
      {/* Neon Glow Border Effect */}
      <div className="absolute inset-0 rounded-2xl p-[1px] bg-gradient-to-br from-cyan-500/20 via-zinc-800/0 to-purple-500/20 -z-10 opacity-30 transition-opacity" />

      <h2 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 flex items-center gap-2">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_5px_rgba(6,182,212,0.5)] animate-pulse" />
        {t('title', { username })}
      </h2>

      <div className="relative">
        <FaQuoteLeft className="absolute -top-2 -left-1 text-zinc-800/50 w-8 h-8 -z-10" />
        <p className="text-sm px-5 py-4 rounded-xl text-zinc-400 bg-zinc-900/40 border border-zinc-800/40 leading-relaxed font-mono relative z-10 italic">
          {guideText}
        </p>
      </div>
    </div>
  );
};

export default BotterGuide;
