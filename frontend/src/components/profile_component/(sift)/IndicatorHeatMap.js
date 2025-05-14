'use client';

import { useState } from 'react';

const allCoins = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'XRPUSDT', 'LTCUSDT', 'SOLUSDT', 'DOTUSDT', 'DOGEUSDT', 'SHIBUSDT', 'MATICUSDT', 'AVAXUSDT', 'LINKUSDT', 'TRXUSDT', 'ETCUSDT', 'XLMUSDT'];
const periods = ['1dk','3dk','5dk', '15dk', '30dk', '1saat', '2saat', '4saat', '6saat', '1gun', '1hafta'];

const indicators = [
  { name: 'RSI', value: 28 },
  { name: 'MACD', value: 62 },
  { name: 'MFI', value: 45 },
  { name: 'CMF', value: 12 },
  { name: 'ATR', value: 55 },
  { name: 'BB', value: 73 },
  { name: 'Fisher', value: 39 },
  { name: 'Stoch', value: 66 },
  { name: 'ADX', value: 52 },
  { name: 'UO', value: 61 },
  { name: 'CMO', value: 44 },
  { name: 'Acc/Dist', value: 80 },
  { name: 'BBP', value: 33 },
  { name: 'OBV', value: 58 },
  { name: 'Aroon', value: 91 },
  { name: 'CRSI', value: 27 },
  { name: 'Coppock', value: 49 },
  { name: 'ROC', value: 71 },
  { name: 'DC', value: 60 },
  { name: 'KC', value: 35 },
  { name: 'EFI', value: 20 },
  { name: 'PVT', value: 83 },
  { name: 'PPO', value: 63 },
  { name: 'TSI', value: 41 },
  { name: 'PowerS', value: 56 },
  { name: 'VD', value: 14 },
  { name: 'McGinley', value: 38 },
  { name: 'PSar', value: 70 },
  { name: 'Supertrend', value: 85 },
  { name: 'TRIX', value: 48 },
  { name: 'VORTEX', value: 77 },
  { name: 'OI', value: 50 },
];


const getColor = (name, value) => {
  if (value === null) return 'bg-gray-500'; // Null değerler için gri renk
  
  if (name === 'MACD') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'MFI') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'CMF') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'ATR') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'BB') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'Fisher') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'Stoch') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'ADX') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'UO') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'CMO') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'Acc/Dist') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'BBP') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'OBV') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'Aroon') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'CRSI') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'Coppock') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'ROC') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'DC') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'KC') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'EFI') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'PVT') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'PPO') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'TSI') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'PowerS') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'VD') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'McGinley') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'PSar') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'Supertrend') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'TRIX') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'VORTEX') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'OI') return value > 50 ? 'bg-green-500' : 'bg-red-500';
  if (name === 'RSI') {
    if (value < 15) return 'bg-green-700';
    if (value < 30) return 'bg-green-400';
    if (value < 70) return 'bg-gray-300';
    if (value < 80) return 'bg-red-400';
    return 'bg-red-700';
  }
  return 'bg-gray-300';
};

export default function IndicatorHeatMap() {
  const [selectedCoin, setSelectedCoin] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [coinSearch, setCoinSearch] = useState('');

  const filteredCoins = allCoins.filter((coin) =>
    coin.toLowerCase().includes(coinSearch.toLowerCase())
  );

  // Eğer seçili coin veya periyot yoksa veya arama sonucunda coin bulunamadıysa gösterge değerini null yap
  const shouldShowNull = selectedCoin === '' || selectedPeriod === '' || filteredCoins.length === 0;
  
  const getIndicatorValue = (indicator) => {
    return shouldShowNull ? null : indicator.value;
  };

  return (
    <div className="fixed top-2 h-screen w-[400px] bg-zinc-900 shadow-lg rounded p-4 text-white">
      <h2 className="text-sm font-bold mb-3 text-center">Teknik Tarama</h2>

      {/* Arama Çubuğu */}
      <div className="mb-2">
        <input
          type="text"
          value={coinSearch}
          onChange={(e) => setCoinSearch(e.target.value)}
          placeholder="Kripto ara..."
          className="w-full p-1 rounded bg-zinc-800 text-white border-1 border-zinc-500 text-xs placeholder:text-zinc-400"
        />
      </div>

      <div className="flex gap-2 mb-3 border-b border-gray-700 pb-3">
        <div className="w-1/2">
          <label className="block text-xs mb-1">Coin</label>
          <select
            value={selectedCoin}
            onChange={(e) => setSelectedCoin(e.target.value)}
            className="w-full p-1 rounded bg-zinc-800 text-white border-1 border-zinc-500 text-xs"
          >
            <option value="">Seçiniz</option>
            {filteredCoins.map((coin) => (
              <option key={coin} value={coin}>
                {coin}
              </option>
            ))}
          </select>
        </div>

        <div className="w-1/2">
          <label className="block text-xs mb-1">Periyot</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full p-1 rounded bg-zinc-800 text-white border-1 border-zinc-500 text-xs"
          >
            <option value="">Seçiniz</option>
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 overflow-y-auto max-h-[calc(100vh-200px)]">
        {indicators.map((ind) => {
          const value = getIndicatorValue(ind);
          return (
            <div
              key={ind.name}
              className={`p-2 rounded text-xs text-black text-center ${getColor(ind.name, value)}`}
            >
              <div className="font-semibold">{ind.name}</div>
              <div>{value !== null ? value : "ø"}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}