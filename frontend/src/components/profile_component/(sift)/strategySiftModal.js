'use client';

import { useState } from 'react';
import { useSiftCoinStore } from '@/store/sift/strategySiftCoinStore';
import { IoClose } from 'react-icons/io5';
import { FaSearch } from 'react-icons/fa';

const initialCoins = [
  { symbol: 'BTC/USDT' },
  { symbol: 'ETH/USDT' },
  { symbol: 'SOL/USDT' },
  { symbol: 'AVAX/USDT' },
  { symbol: 'ADA/USDT' },
  { symbol: 'WLD/USDT' },
  { symbol: 'PEPE/USDT' },
  { symbol: 'DOGE/USDT' },
  { symbol: 'SUI/USDT' },
  { symbol: 'RENDER/USDT' },
  { symbol: 'APT/USDT' },
  { symbol: 'FET/USDT' },
  { symbol: 'STRK/USDT' },
  { symbol: 'NEIRO/USDT' },
  { symbol: 'ARKM/USDT' },
  { symbol: 'PNUT/USDT' },
  { symbol: 'ENA/USDT' },
  { symbol: 'EIGEN/USDT' },
  { symbol: 'ARB/USDT' },
  { symbol: 'LTC/USDT' },
];

export default function StrategySiftModal({ isOpen, onClose }) {
  const [availableCoins, setAvailableCoins] = useState(initialCoins);
  const [searchTerm, setSearchTerm] = useState('');
  const { selectedCoins, addCoin, removeCoin, clearCoins } = useSiftCoinStore();

  if (!isOpen) return null;

  const handleAdd = (coin) => {
    addCoin(coin);
    setAvailableCoins((prev) => prev.filter((c) => c.symbol !== coin.symbol));
  };

  const handleRemove = (symbol) => {
    removeCoin(symbol);
    const restored = initialCoins.find((c) => c.symbol === symbol);
    if (restored) {
      setAvailableCoins((prev) => [...prev, restored]);
    }
  };

  const filteredCoins = availableCoins.filter(coin => 
    coin.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-zinc-900 w-[800px] h-[500px] rounded-lg p-4 flex gap-4 text-white relative">
        {/* Kapatma Butonu */}
        <button className="absolute top-3 right-3 z-10 text-xl hover:text-red-500" onClick={onClose}>
          <IoClose />
        </button>

        {/* Coin Listesi (Sol Bölme) */}
        <div className="w-1/2 border-r border-zinc-700 pr-4 flex flex-col h-full">
          <div className="sticky top-0 bg-zinc-900 pb-2">
            <h2 className="text-sm font-bold mb-2">Tüm Coinler</h2>
            <div className="relative mb-2">
              <input
                type="text"
                placeholder="Coin ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-zinc-800 p-2 pl-8 rounded text-sm"
              />
              <FaSearch className="absolute top-3 right-2 text-zinc-400 text-sm" />
            </div>
          </div>
          <div className="overflow-y-auto flex-1 space-y-2">
            {filteredCoins.length === 0 ? (
              <div className="text-sm text-zinc-400">
                {searchTerm ? "Sonuç bulunamadı." : "Tüm coinler eklendi."}
              </div>
            ) : (
              filteredCoins.map((coin) => (
                <div key={coin.symbol} className="bg-zinc-800 p-2 rounded flex justify-between items-center">
                  <div className="text-sm font-medium">{coin.symbol}</div>
                  <button
                    onClick={() => handleAdd(coin)}
                    className="text-xs px-2 py-1 bg-blue-700 rounded hover:bg-blue-800"
                  >
                    Ekle
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Seçilen Coinler (Sağ Bölme) */}
        <div className="w-1/2 pl-4 flex flex-col h-full">
          <h2 className="text-sm font-bold mb-2 sticky top-0 bg-zinc-900">Seçilen Coinler</h2>
          <div className="flex-1 overflow-y-auto space-y-2">
            {selectedCoins.length === 0 ? (
              <div className="text-sm text-zinc-400">Henüz coin seçilmedi.</div>
            ) : (
              selectedCoins.map((coin) => (
                <div key={coin.symbol} className="bg-zinc-800 p-2 rounded flex justify-between items-center">
                  <div>{coin.symbol}</div>
                  <button
                    onClick={() => handleRemove(coin.symbol)}
                    className="text-xs px-2 py-1 bg-red-600 rounded hover:bg-red-700"
                  >
                    Kaldır
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}