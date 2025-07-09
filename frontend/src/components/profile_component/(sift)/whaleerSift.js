'use client';

import { useState } from 'react';

const timeRanges = ['1dk','3dk','5dk', '15dk', '30dk', '1saat', '2saat', '4saat', '6saat', '1gun', '1hafta'];

const sampleCoins = [
  { symbol: 'BTC', name: 'Bitcoin', longSignals: 12, shortSignals: 3 },
  { symbol: 'ETH', name: 'Ethereum', longSignals: 21, shortSignals: 4 },
  { symbol: 'SOL', name: 'Solana', longSignals: 8, shortSignals: 2 },
  { symbol: 'ADA', name: 'Cardano', longSignals: 7, shortSignals: 5 },
  { symbol: 'BNB', name: 'Binance Coin', longSignals: 6, shortSignals: 1 },
  { symbol: 'XRP', name: 'Ripple', longSignals: 5, shortSignals: 6 },
  { symbol: 'DOT', name: 'Polkadot', longSignals: 4, shortSignals: 7 },
  { symbol: 'DOGE', name: 'Dogecoin', longSignals: 3, shortSignals: 9 },
  { symbol: 'AVAX', name: 'Avalanche', longSignals: 2, shortSignals: 10 },
  { symbol: 'SHIB', name: 'Shiba Inu', longSignals: 9, shortSignals: 12 },
  { symbol: 'MATIC', name: 'Polygon', longSignals: 10, shortSignals: 0 },
  { symbol: 'LTC', name: 'Litecoin', longSignals: 3, shortSignals: 11 },
  { symbol: 'LINK', name: 'Chainlink', longSignals: 11, shortSignals: 2 },
  { symbol: 'UNI', name: 'Uniswap', longSignals: 4, shortSignals: 8 },
  { symbol: 'ATOM', name: 'Cosmos', longSignals: 7, shortSignals: 3 },
];

export default function whaleerSift() {
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRanges[0]);
  const [coinSearch, setCoinSearch] = useState('');

  // Arama çubuğu filtreleme
  const filteredCoins = sampleCoins.filter((coin) =>
    coin.symbol.toLowerCase().includes(coinSearch.toLowerCase()) ||
    coin.name.toLowerCase().includes(coinSearch.toLowerCase())
  );

  // Long sinyallere göre sırala
  const topLongCoins = [...filteredCoins]
    .sort((a, b) => b.longSignals - a.longSignals)
    .slice(0, 5);

  // Short sinyallere göre sırala
  const topShortCoins = [...filteredCoins]
    .sort((a, b) => b.shortSignals - a.shortSignals)
    .slice(0, 5);

  // Coin kartı bileşeni
  const CoinCard = ({ coin }) => (
    <div className="flex justify-between items-center p-2 bg-zinc-800 rounded mb-2 border-1 border-zinc-700">
      <div className="flex items-center">
        <div className="mr-2 bg-zinc-700 rounded-full w-6 h-6 flex items-center justify-center text-xs">
          {coin.symbol.charAt(0)}
        </div>
        <div>
          <div className="font-medium text-xs">{coin.symbol}</div>
          <div className="text-xs text-zinc-400">{coin.name}</div>
        </div>
      </div>
      <div className="flex items-center">
        <div className="text-green-500 text-xs mr-3">{coin.longSignals} Long</div>
        <div className="text-red-500 text-xs">{coin.shortSignals} Short</div>
      </div>
    </div>
  );

  return (
    <div className="h-full w-full bg-zinc-900 shadow-lg rounded p-2 text-white">
      <h2 className="text-sm font-bold mb-3 text-center">Whaleer Radarı</h2>

      {/* Arama ve Filtreler */}
      <div className="mb-2">
        <input
          type="text"
          value={coinSearch}
          onChange={(e) => setCoinSearch(e.target.value)}
          placeholder="Kripto ara..."
          className="w-full p-1 rounded bg-zinc-800 text-white border-1 border-zinc-500 text-xs placeholder:text-zinc-400"
        />
      </div>

      <div className="flex gap-2 mb-3">
        <div className="w-full">
          <label className="block text-xs mb-1">Periyot</label>
          <select
            value={selectedTimeRange}
            onChange={(e) => setSelectedTimeRange(e.target.value)}
            className="w-full p-1 rounded bg-zinc-800 text-white border-1 border-zinc-500 text-xs"
          >
            {timeRanges.map((range) => (
              <option key={range} value={range}>
                {range}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Long Sinyali En Çok Olan Coinler */}
      <div className="mb-4">
        <h3 className="text-sm font-semibold mb-3 border-b border-zinc-700 pb-1 flex items-center">
          <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
          En Çok Long Sinyal
        </h3>
        <div className="max-h-[220px] overflow-y-auto">
          {topLongCoins.length > 0 ? (
            topLongCoins.map((coin) => (
              <CoinCard key={`long-${coin.symbol}`} coin={coin} />
            ))
          ) : (
            <div className="text-zinc-500 text-xs text-center py-2">Coin bulunamadı</div>
          )}
        </div>
      </div>

      {/* Short Sinyali En Çok Olan Coinler */}
      <div>
        <h3 className="text-sm font-semibold mb-3 border-b border-zinc-700 pb-1 flex items-center">
          <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
          En Çok Short Sinyal
        </h3>
        <div className="max-h-[220px] overflow-y-auto">
          {topShortCoins.length > 0 ? (
            topShortCoins.map((coin) => (
              <CoinCard key={`short-${coin.symbol}`} coin={coin} />
            ))
          ) : (
            <div className="text-zinc-500 text-xs text-center py-2">Coin bulunamadı</div>
          )}
        </div>
      </div>
    </div>
  );
}