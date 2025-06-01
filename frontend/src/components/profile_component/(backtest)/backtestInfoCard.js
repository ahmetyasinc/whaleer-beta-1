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
    console.log('Backtest arşivlendi!');
  };

  const handleOptimize = () => {
    console.log('Strateji optimize ediliyor...');
  };

  const handleClear = () => {
    clearBacktestResults();
  };

  const getPeriodLabel = (period) => {
    const periodLabels = {
      '1m': '1 Dakika',
      '3m': '3 Dakika',
      '5m': '5 Dakika',
      '15m': '15 Dakika',
      '30m': '30 Dakika',
      '1h': '1 Saat',
      '2h': '2 Saat',
      '4h': '4 Saat',
      '1d': '1 Gün',
      '1w': '1 Hafta'
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
            <span className="text-gray-400">Strateji:</span>
            <span className="bg-blue-800 text-blue-300 px-3 py-[2px] rounded-full font-medium text-sm">
              {selectedStrategy?.name || 'Seçilmemiş'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Kripto:</span>
            <span className="bg-yellow-800 text-yellow-300 px-3 py-[2px] rounded-full font-medium text-sm">
              {selectedCrypto?.symbol || 'Seçilmemiş'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-gray-400">Periyot:</span>
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
            Arşivle
          </button>

          <button
            onClick={handleOptimize}
            className="bg-purple-800 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition text-sm font-medium flex items-center gap-2"
          >
            <MdRocketLaunch className="w-4 h-4" />
            Stratejiyi optimize Et
          </button>

          <button
            onClick={handleClear}
            className="bg-pink-600 hover:bg-pink-500 text-white px-4 py-2 rounded-lg transition text-sm font-medium flex items-center gap-2"
          >
            <PiBroomDuotone className="w-4 h-4" />
            Temizle
          </button>
        </div>

      </div>

      <div className="mt-4 pt-4 border-t border-gray-700 text-xs text-gray-400 flex flex-wrap gap-4">
        <span>🔵 Test Tarihi: {new Date().toLocaleDateString('tr-TR')}</span>
        <span>🔵 İşlem Sayısı: {backtestResults?.performance?.totalTrades || 0}</span>
        <span>🔵 Durum: Tamamlandı</span>
      </div>
    </div>
  );
}
