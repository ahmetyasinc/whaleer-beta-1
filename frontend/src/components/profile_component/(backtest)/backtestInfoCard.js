'use client';

import useBacktestStore from '@/store/backtest/backtestStore';
import { FaRegFileAlt } from "react-icons/fa";
import { PiBroomDuotone } from "react-icons/pi";
import { MdRocketLaunch } from "react-icons/md";

export default function BacktestInfoCard() {
  const {
    selectedStrategy,
    selectedPeriod,
    selectedCrypto,
    backtestResults,
    clearBacktestResults,
    archiveBacktest
  } = useBacktestStore();

  const handleSave = () => {
    archiveBacktest();
  };

  const handleClear = () => {
    clearBacktestResults();
  };

  const getPeriodLabel = (period) => {
    const periodLabels = {
      '1m': '1 Minute',
      '3m': '3 Minutes',
      '5m': '5 Minutes',
      '15m': '15 Minutes',
      '30m': '30 Minutes',
      '1h': '1 Hour',
      '2h': '2 Hours',
      '4h': '4 Hours',
      '1d': '1 Day',
      '1w': '1 Week'
    };
    return periodLabels[period] || period;
  };

  if (!backtestResults) {
    return null;
  }

  return (
    <div className="bg-gray-900 rounded-xl p-6 mb-6 shadow-md hover:shadow-lg transition">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex flex-wrap items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Strategy:</span>
            <span className="bg-blue-800 text-blue-300 px-3 py-[2px] rounded-full font-medium text-sm">
              {selectedStrategy?.name || 'Not Selected'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Crypto:</span>
            <span className="bg-yellow-800 text-yellow-300 px-3 py-[2px] rounded-full font-medium text-sm">
              {selectedCrypto?.symbol || 'Not Selected'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Period:</span>
            <span className="bg-green-800 text-green-300 px-3 py-[2px] rounded-full font-medium text-sm">
              {getPeriodLabel(selectedPeriod)}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition text-sm font-medium flex items-center gap-2"
          >
            <FaRegFileAlt className="w-4 h-4" />
            Archive
          </button>

          <button
            onClick={handleClear}
            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg transition text-sm font-medium flex items-center gap-2"
          >
            <PiBroomDuotone className="w-4 h-4" />
            Clear
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400 flex flex-wrap gap-4">
        <span>🔵 Test Date: {new Date().toLocaleDateString('en-GB')}</span>
        <span>🔵 Total Trades: {backtestResults?.performance?.totalTrades || 0}</span>
        <span>🔵 Status: Completed</span>
      </div>
    </div>
  );
}
