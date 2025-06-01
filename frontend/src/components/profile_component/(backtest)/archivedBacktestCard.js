'use client';

import { FiTrendingUp, FiTrendingDown, FiEye, FiTrash2 } from 'react-icons/fi';
import useBacktestStore from '@/store/backtest/backtestStore';
import { useState } from 'react';


export default function ArchivedBacktestCard({ archivedItem }) {
  const { deleteArchivedBacktest, loadArchivedBacktest } = useBacktestStore();

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleDelete = () => {
    deleteArchivedBacktest(archivedItem.id);
  };

  const handleView = () => {
    loadArchivedBacktest(archivedItem);
  };

  const getPeriodLabel = (period) => {
    const periodLabels = {
      '1m': '1dk',
      '3m': '3dk',
      '5m': '5dk',
      '15m': '15dk',
      '30m': '30dk',
      '1h': '1s',
      '2h': '2s',
      '4h': '4s',
      '1d': '1g',
      '1w': '1h'
    };
    return periodLabels[period] || period;
  };

  const isProfit = archivedItem.performance.totalPnL > 0;


  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-3 border-1 border-gray-700 hover:border-gray-600 transition-colors">
      {/* Üst Kısım - Temel Bilgiler */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm">
              {archivedItem.strategy?.name || 'Strateji'}
            </span>
            <span className="text-xs text-gray-400">•</span>
            <span className="text-yellow-400 text-sm font-medium">
              {archivedItem.crypto?.symbol || 'BTC'}
            </span>
            <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded text-xs">
              {getPeriodLabel(archivedItem.period)}
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {archivedItem.date}
          </div>
        </div>

        {/* Kar/Zarar Göstergesi */}
        <div className={`flex items-center gap-1 ${isProfit ? 'text-green-400' : 'text-red-400'}`}>
          {isProfit ? <FiTrendingUp size={16} /> : <FiTrendingDown size={16} />}
          <span className="text-sm font-medium">
            {isProfit ? ' +' : ' -'}{archivedItem.performance.returnPercentage}%
          </span>
        </div>
      </div>

      {/* Orta Kısım - Performans Metrikleri */}
      <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-400 mb-1">İşlemler</div>
          <div className="flex justify-between text-white">
            <span className="text-green-400">Kârlı İşlem: {archivedItem.performance.winningTrades}</span>
            <span className="text-red-400">Zararlı İşlem: {archivedItem.performance.losingTrades}</span>
          </div>
        </div>
        <div className="bg-gray-900 rounded p-2">
          <div className="text-gray-400 mb-1">Başarı Oranı</div>
          <div className="text-white font-medium">
            %{archivedItem.performance.winRate.toFixed(1)}
          </div>
        </div>
      </div>

      {/* Alt Kısım - Butonlar */}
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleView}
          className=" bg-[rgb(27,150,113)] hover:bg-[rgb(27,150,150)] text-white px-3 py-2 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
        >
          <FiEye size={18} />
          İncele
        </button>
        <button
          onClick={() => setIsDeleteConfirmOpen(true)}
          className="bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded text-xs font-medium flex items-center justify-center transition-colors"
        >
          <FiTrash2 size={16} />
        </button>

        {isDeleteConfirmOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-900 p-6 rounded-lg shadow-lg text-white max-w-sm w-full">
              <h2 className="text-lg font-semibold mb-4">Silmek istediğinize emin misiniz?</h2>
              <p className="mb-6 text-sm text-gray-300">Bu arşiv kalıcı olarak silinecek ve geri alınamaz.</p>
              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm"
                >
                  Vazgeç
                </button>
                <button
                  onClick={() => {
                    handleDelete();
                    setIsDeleteConfirmOpen(false);
                  }}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-sm"
                >
                  Evet, Sil
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}