'use client';

import { useState, useEffect } from 'react';
import useStrategyStore from '@/store/indicator/strategyStore';
import StrategySiftModal from './strategySiftModal';

// Periyotlar ve mum offsetleri
const periods = ['1dk','3dk','5dk', '15dk', '30dk', '1saat', '2saat', '4saat', '6saat', '1gun', '1hafta'];
const candleOffsets = ['Son mum', '2. mum', '3. mum', '4. mum', '5. mum'];

// Örnek coin verileri
const dummyLongCoins = [
  { symbol: 'BTC/USDT', price: '62,483' },
  { symbol: 'ETH/USDT', price: '3,127' },
  { symbol: 'SOL/USDT', price: '138.5' },
  { symbol: 'BNB/USDT', price: '574.3' },
  { symbol: 'ADA/USDT', price: '0.451' },
  { symbol: 'DOGE/USDT', price: '0.127' },
  { symbol: 'XRP/USDT', price: '0.542' },
  { symbol: 'DOT/USDT', price: '6.84' },
];

const dummyShortCoins = [
  { symbol: 'SHIB/USDT', price: '0.00002145' },
  { symbol: 'AVAX/USDT', price: '32.48' },
  { symbol: 'LINK/USDT', price: '17.26' },
  { symbol: 'MATIC/USDT', price: '0.758' },
  { symbol: 'ATOM/USDT', price: '9.24' },
];

export default function StrategySift() {
  // Zustand store'dan sadece strategies arrayini çekiyoruz
  const { strategies } = useStrategyStore();

  // Sadece strategies arrayini kullanıyoruz
  const allStrategies = strategies;
  
  // State yönetimi
  const [selectedStrategy, setSelectedStrategy] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState(periods[0]);
  const [selectedOffset, setSelectedOffset] = useState(candleOffsets[0]);
  const [longCoins, setLongCoins] = useState(dummyLongCoins);
  const [shortCoins, setShortCoins] = useState(dummyShortCoins);
  const [isModalOpen, setIsModalOpen] = useState(false);


  // Stratejiler yüklendiğinde ilk stratejiyi seçmek için
  useEffect(() => {
    if (allStrategies.length > 0 && !selectedStrategy) {
      setSelectedStrategy(allStrategies[0].id);
    }
  }, [allStrategies, selectedStrategy]);

  const handleCoinAdd = () => {
    console.log('Coin eklendi.');
  };

  // Seçili strateji nesnesini bul
  const currentStrategy = allStrategies.find(s => s.id === selectedStrategy) || {};

  const CoinList = ({ coins, direction }) => {
    const isLong = direction === 'LONG';
    return (
      <div className="mt-2">
        <h3 className={`text-xs font-bold mb-1 ${isLong ? 'text-green-500' : 'text-red-500'}`}>
          {isLong ? 'LONG Sinyali' : 'SHORT Sinyali'}
        </h3>
        <div className="max-h-[160px] overflow-y-auto pr-1">
          {coins.map((coin, index) => (
            <div 
              key={index} 
              className="flex justify-between items-center p-2 mb-1 bg-zinc-800 rounded border-1 border-zinc-700 hover:bg-zinc-700 cursor-pointer"
            >
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full ${isLong ? 'bg-green-500' : 'bg-red-500'} mr-2`}></div>
                <div className="font-medium text-sm">{coin.symbol}</div>
              </div>
              <div className="text-sm">{coin.price}$</div>
            </div>
          ))}
          {coins.length === 0 && (
            <div className="text-center text-zinc-500 text-sm py-4">
              Bu tarama sonucu herhangi bir coin bulunamadı
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed top-2 h-screen w-[400px] bg-zinc-900 shadow-lg rounded p-4 text-white">
      <h2 className="text-sm font-bold text-center mb-4">Strateji Tarama</h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Strateji Dropdown */}
        <div>
          <label className="block text-xs mb-1">Strateji</label>
          <select
            value={selectedStrategy}
            onChange={(e) => setSelectedStrategy(e.target.value)}
            className="w-full p-[6px] rounded bg-zinc-800 text-white border-1 border-zinc-500 text-sm"
          >
            {allStrategies.length > 0 ? (
              allStrategies.map((strat) => (
                <option key={strat.id} value={strat.id}>
                  {strat.name || strat.id}
                </option>
              ))
            ) : (
              <option value="">Strateji seçin</option>
            )}
          </select>
        </div>

        {/* Periyot Dropdown */}
        <div>
          <label className="block text-xs mb-1">Periyot</label>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="w-full p-[6px] rounded bg-zinc-800 text-white border-1 border-zinc-500 text-sm"
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        {/* Mum Offset Dropdown */}
        <div>
          <label className="block text-xs mb-1">Hedef Mum</label>
          <select
            value={selectedOffset}
            onChange={(e) => setSelectedOffset(e.target.value)}
            className="w-full p-[6px] rounded bg-zinc-800 text-white border-1 border-zinc-500 text-sm"
          >
            {candleOffsets.map((offset) => (
              <option key={offset} value={offset}>
                {offset}
              </option>
            ))}
          </select>
        </div>

        {/* Coin Ekle Butonu */}
        <div className="flex items-end">
          <button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-blue-700 hover:bg-blue-900 text-white pt-[7px] pb-[8px] rounded text-sm"
          >
            Coin Ekle
          </button>
          <StrategySiftModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
        </div>
      </div>

      {/* Sonuç Bölümü - İki Bölmeli Yapı */}
      <div className="border-t border-zinc-700 pt-2 flex flex-col">
        {/* Long Sinyali Veren Coinler */}
        <div className="flex-1 overflow-hidden">
          <CoinList coins={longCoins} direction="LONG" />
        </div>
        
        {/* Short Sinyali Veren Coinler */}
        <div className="flex-1 overflow-hidden mt-2 ">
          <CoinList coins={shortCoins} direction="SHORT" />
        </div>
      </div>
    </div>
  );
}