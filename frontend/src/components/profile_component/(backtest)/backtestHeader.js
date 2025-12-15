'use client';

import { useState, useMemo } from 'react';
import ChooseStrategy from './chooseStrategy';
import CryptoSelectButton from './cryptoSelectButton';
import useCryptoStore from '@/store/indicator/cryptoPinStore';
import useBacktestStore from '@/store/backtest/backtestStore';
import { FaPlus } from "react-icons/fa";
import { useTranslation } from 'react-i18next';

export default function BacktestHeader() {
  const { t } = useTranslation('backtestHeader');
  const [isOpen, setIsOpen] = useState(false);

  const { selectedCrypto } = useCryptoStore();
  const {
    selectedStrategy,
    setSelectedStrategy,
    selectedPeriod,
    setSelectedPeriod,
    runBacktest,
    isBacktestLoading,
    initialBalanceInput,
    setInitialBalanceInput,
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
      <header className="w-full bg-black border-b border-zinc-900 text-white px-6 py-3 h-[60px] flex justify-between items-center">
        <h1></h1>
        <div className="flex gap-4">
          <button
            className="bg-black border border-gray-800 text-white px-4 h-[35px] rounded-lg hover:border-gray-600 transition flex items-center gap-2"
            onClick={() => setIsOpen(true)}
            aria-label={t('buttons.runBacktest')}
            title={t('buttons.runBacktest')}
          >
            <FaPlus className="w-3 h-3 mt-[2px]" />
            {t('buttons.runBacktest')}
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="absolute right-0 top-[60px] h-[calc(100vh-60px)] w-1/4 max-w-md bg-zinc-950/95 backdrop-blur-xl border-l border-zinc-800 shadow-2xl flex flex-col justify-between p-0 z-50">

          {/* Metalik Parlama Efekti */}
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

          <div className="p-6 overflow-y-auto flex-1">
            <h2 className="text- zinc-100 text-lg font-bold mb-6 uppercase tracking-wider flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
              {t('titles.createBacktest')}
            </h2>

            <div className="flex flex-col gap-5">
              <ChooseStrategy />
              <CryptoSelectButton />

              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide ml-1">
                  {t('periods.select')}
                </label>
                <select
                  className="bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-zinc-200 px-4 py-3 rounded-lg outline-none transition-all focus:ring-1 focus:ring-blue-500/50 appearance-none"
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                >
                  <option value="" className="bg-zinc-900">{t('periods.select')}</option>
                  <option value="1m">{t('periods.m1')}</option>
                  <option value="3m">{t('periods.m3')}</option>
                  <option value="5m">{t('periods.m5')}</option>
                  <option value="15m">{t('periods.m15')}</option>
                  <option value="30m">{t('periods.m30')}</option>
                  <option value="1h">{t('periods.h1')}</option>
                  <option value="2h">{t('periods.h2')}</option>
                  <option value="4h">{t('periods.h4')}</option>
                  <option value="1d">{t('periods.d1')}</option>
                  <option value="1w">{t('periods.w1')}</option>
                </select>
              </div>

              {/* Optional Initial Balance */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wide ml-1">
                  {t('inputs.initialBalancePlaceholder')}
                </label>
                <input
                  inputMode="decimal"
                  placeholder="10000"
                  className={`bg-zinc-900 text-zinc-200 px-4 py-3 rounded-lg outline-none border transition-all placeholder:text-zinc-600 ${isInitialBalanceValid
                    ? 'border-zinc-700 hover:border-zinc-500 focus:border-blue-500/50 focus:shadow-[0_0_10px_-2px_rgba(59,130,246,0.2)]'
                    : 'border-red-500/50 focus:border-red-500'
                    }`}
                  value={initialBalanceInput ?? ''}
                  onChange={(e) => setInitialBalanceInput(e.target.value)}
                />
                <p className="text-[10px] text-zinc-500 ml-1">
                  {t('inputs.initialBalanceHelp')}
                </p>
                {!isInitialBalanceValid && (
                  <p className="text-xs text-red-400 ml-1 font-medium">{t('inputs.initialBalanceInvalid')}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 border-t border-zinc-800 bg-zinc-900/30">
            <button
              disabled={!isReady || isBacktestLoading || !isInitialBalanceValid}
              onClick={handleBacktest}
              className={`w-full px-4 py-3.5 rounded-lg transition-all font-bold tracking-wide uppercase text-sm shadow-lg ${isReady && !isBacktestLoading && isInitialBalanceValid
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20 hover:shadow-blue-600/30 hover:-translate-y-0.5'
                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                }`}
              aria-label={t('buttons.runBacktest')}
              title={t('buttons.runBacktest')}
            >
              {isBacktestLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading...
                </span>
              ) : (
                t('buttons.runBacktest')
              )}
            </button>
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-2 rounded-full hover:bg-zinc-800"
            aria-label={t('buttons.close')}
            title={t('buttons.close')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
