'use client';

import { useState, useMemo } from 'react';
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
    isBacktestLoading,
    initialBalanceInput,           // NEW
    setInitialBalanceInput,        // NEW
  } = useBacktestStore();

  const isReady = selectedStrategy && selectedCrypto && selectedPeriod !== '';

  const isInitialBalanceValid = useMemo(() => {
    const s = (initialBalanceInput ?? '').trim();
    if (!s) return true; // empty is allowed
    const normalized = s.replace(/\s/g, '').replace(',', '.');
    const v = Number(normalized);
    return Number.isFinite(v) && v > 0;
  }, [initialBalanceInput]);

  const handleBacktest = async () => {
    setIsOpen(false);
    if (isReady && isInitialBalanceValid) {
      await runBacktest();
    }
  };

  return (
    <>
      <header className="w-full bg-black text-white px-6 py-3 h-[60px] flex justify-between items-center">
        <h1></h1>
        <div className="flex gap-4">
          <button
            className="bg-black border-1 border-gray-700 text-white px-4 h-[35px] rounded-lg hover:border-gray-600 transition flex items-center gap-2"
            onClick={() => setIsOpen(true)}
          >
            <FaPlus className="w-3 h-3 mt-[2px]" />
            Run Backtest
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="absolute right-0 top-[60px] h-[calc(100vh-60px)] w-1/4 max-w-md bg-gray-900 text-white shadow-lg flex flex-col justify-between p-0 z-50 rounded-l-xl">
          <div className="p-6 overflow-y-auto flex-1">
            <h2 className="text-xl font-bold mb-4">Create Backtest</h2>

            <div className="flex flex-col gap-4">
              <ChooseStrategy />
              <CryptoSelectButton />

              <select
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                <option value="">Select Period</option>
                <option value="1m">1 min</option>
                <option value="3m">3 min</option>
                <option value="5m">5 min</option>
                <option value="15m">15 min</option>
                <option value="30m">30 min</option>
                <option value="1h">1 hour</option>
                <option value="2h">2 hours</option>
                <option value="4h">4 hours</option>
                <option value="1d">1 day</option>
                <option value="1w">1 week</option>
              </select>

              {/* NEW: Optional Initial Balance */}
              <div className="flex flex-col gap-1">
                <input
                  inputMode="decimal"
                  placeholder="Initial Balance (USD)"
                  className={`bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded outline-none border ${
                    isInitialBalanceValid ? 'border-transparent' : 'border-red-500'
                  } ${!initialBalanceInput?.trim() ? 'text-center' : 'text-left'}`}
                  value={initialBalanceInput ?? ''}
                  onChange={(e) => setInitialBalanceInput(e.target.value)}
                />
                <p className="text-xs text-gray-400">
                  Leave empty to use the first close price as the starting balance.
                </p>
                {!isInitialBalanceValid && (
                  <p className="text-xs text-red-400">Please enter a positive number.</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 border-t border-gray-800">
            <button
              disabled={!isReady || isBacktestLoading || !isInitialBalanceValid}
              onClick={handleBacktest}
              className={`w-full px-4 py-2 rounded transition flex items-center justify-center gap-2 ${
                isReady && !isBacktestLoading && isInitialBalanceValid
                  ? 'bg-blue-600 text-white hover:bg-blue-500 cursor-pointer'
                  : 'bg-gray-500 text-white cursor-not-allowed'
              }`}
            >
              Run Backtest
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
