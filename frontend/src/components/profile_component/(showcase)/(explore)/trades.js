'use client';

import React from 'react';
import { BiTransfer } from 'react-icons/bi';

const Trades = ({ trades = [], positions = [] }) => {
  return (
    <div className="mb-6 bg-gray-800 p-6 border-1 border-gray-700 rounded-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Geçmiş İşlemler */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BiTransfer className="w-4 h-4 text-gray-300" />
            <h3 className="text-sm font-semibold text-white">Geçmiş İşlemler</h3>
            <span className="text-xs text-gray-400">({trades.length} işlem)</span>
          </div>
          <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-xl p-4">
            <div className="space-y-2">
              {trades.map((trade) => (
                <div key={trade.id} className="flex items-center justify-between py-2 border-b border-gray-600 last:border-b-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">{trade.pair}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      trade.type === 'LONG' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {trade.type}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:inline truncate">{trade.action}</span>
                  </div>
                  <span className="text-xs text-gray-400 hidden sm:inline">{trade.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Açık Pozisyonlar */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BiTransfer className="w-4 h-4 text-gray-300 rotate-90" />
            <h3 className="text-sm font-semibold text-white">Açık Pozisyonlar</h3>
            <span className="text-xs text-gray-400">({positions.length} pozisyon)</span>
          </div>
          <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-xl p-4">
            <div className="space-y-2">
              {positions.map((pos) => (
                <div key={pos.id} className="flex items-center justify-between py-2 border-b border-gray-600 last:border-b-0">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">{pos.pair}</span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      pos.type === 'LONG'
                        ? 'bg-green-900 text-green-300'
                        : pos.type === 'SHORT'
                        ? 'bg-red-900 text-red-300'
                        : 'bg-gray-800 text-gray-300'
                    }`}>
                      {pos.type}
                    </span>
                  </div>
                  <span className={`text-xs font-medium ${
                    parseFloat(pos.profit) > 0
                      ? 'text-green-400'
                      : parseFloat(pos.profit) < 0
                      ? 'text-red-400'
                      : 'text-gray-400'
                  }`}>
                    {parseFloat(pos.profit) > 0 ? '+' : ''}{pos.profit}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Trades;
