'use client';

import { FiTrendingUp, FiTrendingDown, FiEye, FiTrash2 } from 'react-icons/fi';
import useBacktestStore from '@/store/backtest/backtestStore';
import { useState, useEffect } from 'react'; // useEffect eklendi
import { createPortal } from 'react-dom'; // createPortal eklendi
import { useTranslation } from 'react-i18next';

export default function ArchivedBacktestCard({ archivedItem }) {
  const { t } = useTranslation('backtestArchivedBacktest');
  const { deleteArchivedBacktest, loadArchivedBacktest } = useBacktestStore();

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [mounted, setMounted] = useState(false); // Hydration hatasını önlemek için

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDelete = () => {
    deleteArchivedBacktest(archivedItem.id);
  };

  const handleView = () => {
    loadArchivedBacktest(archivedItem);
  };

  const getPeriodLabel = (period) => {
    const key = `periods.${period}`;
    const label = t(key);
    return label && !label.includes('periods.') ? label : period;
  };

  const isProfit = archivedItem.performance.totalPnL > 0;

  // Modal İçeriği (Portal ile taşınacak parça)
  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Backdrop (Arka plan karartma) */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-100"
        onClick={() => setIsDeleteConfirmOpen(false)}
      />

      {/* Modal Box */}
      <div className="relative bg-zinc-950 border border-zinc-800 p-6 rounded-xl shadow-[0_0_40px_-10px_rgba(0,0,0,0.9)] text-white max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />

        <h2 className="relative text-lg font-bold text-zinc-100 mb-2">{t('modal.title')}</h2>
        <p className="relative mb-6 text-sm text-zinc-400 leading-relaxed">{t('modal.desc')}</p>

        <div className="relative flex justify-end gap-3">
          <button
            onClick={() => setIsDeleteConfirmOpen(false)}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 rounded-md text-sm transition-colors duration-100"
          >
            {t('buttons.cancel')}
          </button>
          <button
            onClick={() => {
              handleDelete();
              setIsDeleteConfirmOpen(false);
            }}
            className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-500 hover:text-red-400 border border-red-900/50 hover:border-red-500/50 rounded-md text-sm font-medium transition-all duration-100 shadow-[0_0_10px_-5px_rgba(220,38,38,0.3)]"
          >
            {t('buttons.confirmDelete')}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="group relative bg-zinc-950 border border-zinc-800 hover:border-cyan-500/50 hover:shadow-[0_0_15px_-3px_rgba(6,182,212,0.15)] rounded-xl p-4 mb-3 transition-all duration-100 ease-out overflow-hidden">

        {/* Hafif Metalik Arka Plan Gradyanı */}
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/50 to-transparent pointer-events-none" />

        {/* Top Section - Basic Info */}
        <div className="relative flex justify-between items-start mb-4 z-10">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-zinc-100 font-semibold text-sm tracking-wide drop-shadow-md">
                {archivedItem.strategy?.name || t('defaults.strategy')}
              </span>
              <span className="text-zinc-600 text-xs">•</span>
              <span className="text-cyan-400 text-sm font-bold tracking-wider drop-shadow-[0_0_3px_rgba(34,211,238,0.3)]">
                {archivedItem.crypto?.symbol || 'BTC'}
              </span>
              <span className="bg-zinc-900/80 border border-zinc-700 text-zinc-300 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider shadow-sm">
                {getPeriodLabel(archivedItem.period)}
              </span>
            </div>
            <div className="text-[11px] text-zinc-500 font-mono">
              {archivedItem.date}
            </div>
          </div>

          <div className={`flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-900/50 bg-zinc-900/30 backdrop-blur-sm ${isProfit
              ? 'text-emerald-400 shadow-[0_0_8px_-2px_rgba(52,211,153,0.3)]'
              : 'text-rose-500 shadow-[0_0_8px_-2px_rgba(244,63,94,0.3)]'
            }`}>
            {isProfit ? <FiTrendingUp size={16} /> : <FiTrendingDown size={16} />}
            <span className="text-sm font-bold tabular-nums tracking-tight">
              {isProfit ? '+' : ''}{archivedItem.performance.returnPercentage}%
            </span>
          </div>
        </div>

        {/* Middle Section - Performance Metrics */}
        <div className="relative grid grid-cols-2 gap-3 mb-4 text-xs z-10">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 transition-colors duration-100 group-hover:border-zinc-700">
            <div className="text-zinc-500 mb-1.5 font-medium tracking-wide text-[10px] uppercase">
              {t('labels.trades')}
            </div>
            <div className="flex justify-between items-center font-mono text-sm">
              <span className="text-emerald-400 drop-shadow-[0_0_2px_rgba(52,211,153,0.2)]">
                W: {archivedItem.performance.winningTrades}
              </span>
              <span className="w-px h-3 bg-zinc-800"></span>
              <span className="text-rose-400 drop-shadow-[0_0_2px_rgba(251,113,133,0.2)]">
                L: {archivedItem.performance.losingTrades}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-2.5 transition-colors duration-100 group-hover:border-zinc-700">
            <div className="text-zinc-500 mb-1.5 font-medium tracking-wide text-[10px] uppercase">
              {t('labels.successRate')}
            </div>
            <div className="text-zinc-200 font-mono font-bold text-sm">
              %{archivedItem.performance.winRate.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Bottom Section - Buttons */}
        <div className="relative flex gap-2 justify-end z-10">
          <button
            onClick={handleView}
            className="flex-1 bg-zinc-900 hover:bg-cyan-950/30 text-cyan-500 hover:text-cyan-300 border border-zinc-700 hover:border-cyan-500/50 px-3 py-2 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-100 shadow-sm hover:shadow-[0_0_10px_-2px_rgba(6,182,212,0.3)]"
            aria-label={t('buttons.view')}
            title={t('buttons.view')}
          >
            <FiEye size={16} />
            {t('buttons.view')}
          </button>

          <button
            onClick={() => setIsDeleteConfirmOpen(true)}
            className="bg-zinc-900 hover:bg-red-950/30 text-zinc-500 hover:text-red-400 border border-zinc-700 hover:border-red-500/50 px-3 py-2 rounded-md text-xs font-medium flex items-center justify-center transition-all duration-100"
            aria-label={t('buttons.delete')}
            title={t('buttons.delete')}
          >
            <FiTrash2 size={16} />
          </button>
        </div>
      </div>

      {/* PORTAL RENDER: Modal artık body'ye basılacak */}
      {mounted && isDeleteConfirmOpen && createPortal(modalContent, document.body)}
    </>
  );
}