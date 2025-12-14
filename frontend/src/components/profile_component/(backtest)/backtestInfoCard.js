'use client';

import useBacktestStore from '@/store/backtest/backtestStore';
import { FaRegFileAlt } from "react-icons/fa";
import { PiBroomDuotone } from "react-icons/pi";
import { MdRocketLaunch } from "react-icons/md";
import { useTranslation } from 'react-i18next';

export default function BacktestInfoCard() {
  const { t } = useTranslation('backtestInfoCard');

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
    const key = `periods.${period}`;
    const label = t(key);
    return label && !label.includes('periods.') ? label : period;
  };

  if (!backtestResults) {
    return null;
  }

  return (
    <div className="relative bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5 shadow-lg group hover:border-blue-900/30 transition-all duration-100">

      {/* Glow effects */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>

      <div className="flex justify-between items-center flex-wrap gap-4 relative z-10">
        <div className="flex flex-wrap items-center gap-6 text-sm">

          <div className="flex items-center gap-2.5">
            <span className="text-zinc-500 font-medium text-xs tracking-wide uppercase">{t('labels.strategy')}</span>
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1 rounded-md font-semibold text-xs shadow-[0_0_10px_-4px_rgba(59,130,246,0.5)]">
                {selectedStrategy?.name || t('defaults.notSelected')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-zinc-500 font-medium text-xs tracking-wide uppercase">{t('labels.crypto')}</span>
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <span className="bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-3 py-1 rounded-md font-semibold text-xs shadow-[0_0_10px_-4px_rgba(234,179,8,0.5)]">
                {selectedCrypto?.symbol || t('defaults.notSelected')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-zinc-500 font-medium text-xs tracking-wide uppercase">{t('labels.period')}</span>
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-md font-semibold text-xs shadow-[0_0_10px_-4px_rgba(16,185,129,0.5)]">
                {getPeriodLabel(selectedPeriod)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={handleSave}
            className="group/btn bg-zinc-900/80 hover:bg-emerald-950/30 text-emerald-500 hover:text-emerald-400 border border-zinc-700 hover:border-emerald-500/50 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all duration-100 shadow-sm"
            aria-label={t('buttons.archive')}
            title={t('buttons.archive')}
          >
            <FaRegFileAlt className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" />
            {t('buttons.archive')}
          </button>

          <button
            onClick={handleClear}
            className="group/btn bg-zinc-900/80 hover:bg-pink-950/30 text-pink-500 hover:text-pink-400 border border-zinc-700 hover:border-pink-500/50 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all duration-100 shadow-sm"
            aria-label={t('buttons.clear')}
            title={t('buttons.clear')}
          >
            <PiBroomDuotone className="w-3.5 h-3.5 transition-transform group-hover/btn:rotate-12" />
            {t('buttons.clear')}
          </button>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-zinc-800/50 text-xs text-zinc-500 flex flex-wrap gap-6 font-mono">
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></span>
          {t('stats.testDate')}: <span className="text-zinc-300">{new Date().toLocaleDateString('en-GB')}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 shadow-[0_0_5px_rgba(99,102,241,0.5)]"></span>
          {t('stats.totalTrades')}: <span className="text-zinc-300">{backtestResults?.performance?.totalTrades || 0}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></span>
          {t('stats.status')}: <span className="text-emerald-400">{t('stats.completed')}</span>
        </span>
      </div>
    </div>
  );
}
