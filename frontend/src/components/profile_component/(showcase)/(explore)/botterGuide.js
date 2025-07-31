// components/botterGuide.js
'use client';

import React from 'react';
import useBotDataStore from '@/store/showcase/botDataStore';

const BotterGuide = ({ username }) => {
  const { getUserData } = useBotDataStore();
  const userData = getUserData();

  // Use description from store if available, otherwise fallback to default
  const guideText = userData?.description || 'This bot performs automated trading operations using advanced algorithms.';

  return (
    <div className="mt-6 p-4 bg-gray-800 rounded-xl border-1 border-gray-700">
      <h2 className="text-white text-base font-semibold mb-2">
        By {username}:
      </h2>
      <p className="text-sm mt-8 px-4 pt-6 pb-8 rounded-md text-gray-300 bg-gradient-to-r from-gray-950 to-zinc-900 leading-relaxed">
        {guideText}
      </p>
    </div>
  );
};

export default BotterGuide;
