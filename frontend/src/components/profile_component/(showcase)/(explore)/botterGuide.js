// components/botterGuide.js
'use client';

import React from 'react';
import useBotDataStore from '@/store/showcase/botDataStore';
import { useTranslation } from 'react-i18next';

const BotterGuide = ({ username, bot }) => {
  const { t } = useTranslation('botterGuide');
  console.log("BotterGuide userData:", bot);
  // Store'daki açıklama varsa onu kullan; yoksa i18n'deki varsayılan metne düş
  const guideText = bot?.user?.description || t('defaultGuideText');

  return (
    <div className="mt-6 p-4 bg-gray-800 rounded-xl border border-gray-700">
      <h2 className="text-white text-base font-semibold mb-2">
        {t('title', { username })}
      </h2>
      <p className="text-sm mt-8 px-4 pt-6 pb-8 rounded-md text-gray-300 bg-gradient-to-r from-gray-950 to-zinc-900 leading-relaxed">
        {guideText}
      </p>
    </div>
  );
};

export default BotterGuide;
