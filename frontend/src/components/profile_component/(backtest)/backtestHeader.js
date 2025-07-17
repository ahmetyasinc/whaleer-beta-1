'use client';

import { useState } from 'react';
import ChooseStrategy from './chooseStrategy';
import CryptoSelectButton from './cryptoSelectButton';
import useCryptoStore from '@/store/indicator/cryptoPinStore';
import useBacktestStore from '@/store/backtest/backtestStore';
import { FaPlus } from "react-icons/fa";

export default function BacktestHeader() {
  const [isOpen, setIsOpen] = useState(false);

  const { selectedCrypto } = useCryptoStore();
  const {
    selectedStrategy,
    setSelectedStrategy,
    selectedPeriod,
    setSelectedPeriod,
    runBacktest,
    isBacktestLoading
  } = useBacktestStore();

  const isReady = selectedStrategy && selectedCrypto && selectedPeriod !== '';

  const handleBacktest = async () => {
    setIsOpen(false);
    if (isReady) {
      await runBacktest();
    }
  };

  return (
    <>
      <header className="w-full bg-black text-white px-6 py-3 h-[60px] flex justify-between items-center">
        <h1></h1>
        <div className="flex gap-4">
          <button className="bg-black border-1 border-gray-700 text-white px-4 h-[35px] rounded-lg hover:border-gray-600 transition">
            Backtest Optimizasyonu
          </button>
          <button
            className="bg-black border-1 border-gray-700 text-white px-4 h-[35px] rounded-lg hover:border-gray-600 transition flex items-center gap-2"
            onClick={() => setIsOpen(true)}
          >
            <FaPlus className="w-3 h-3 mt-[2px]" />
            Backtest Yap
          </button>

        </div>
      </header>

      {isOpen && (
        <div className="absolute right-0 top-[60px] h-[calc(100vh-60px)] w-1/4 max-w-md bg-gray-900 text-white shadow-lg flex flex-col justify-between p-0 z-50 rounded-l-xl">
          <div className="p-6 overflow-y-auto flex-1">
            <h2 className="text-xl font-bold mb-4">Backtest Oluştur</h2>

            <div className="flex flex-col gap-4">
              <ChooseStrategy />
              <CryptoSelectButton />

              <select
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">Periyot Seç</option>
                <option value="1m">1 dk</option>
                <option value="3m">3 dk</option>
                <option value="5m">5 dk</option>
                <option value="15m">15 dk</option>
                <option value="30m">30 dk</option>
                <option value="1h">1 saat</option>
                <option value="2h">2 saat</option>
                <option value="4h">4 saat</option>
                <option value="1d">1 gün</option>
                <option value="1w">1 hafta</option>
              </select>
            </div>
          </div>

          <div className="p-4 border-t border-gray-800">
          <button
            disabled={!isReady || isBacktestLoading}
            onClick={handleBacktest}
            className={`w-full px-4 py-2 rounded transition flex items-center justify-center gap-2 ${
              isReady && !isBacktestLoading
                ? 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
                : 'bg-gray-500 text-white cursor-not-allowed'
            }`}
          >
            Backtest Yap
          </button>

          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-2 right-4 text-gray-400 hover:text-white text-2xl font-bold"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}