'use client';
import { useEffect } from 'react';

import BacktestHeader from '@/components/profile_component/(backtest)/backtestHeader';
import BacktestChart from '@/components/profile_component/(backtest)/backtestChart';
import PerformanceMetrics from '@/components/profile_component/(backtest)/performanceMetrics';
import TradesList from '@/components/profile_component/(backtest)/tradeList';
import BacktestInfoCard from '@/components/profile_component/(backtest)/backtestInfoCard';
import ArchivedBacktestCard from '@/components/profile_component/(backtest)/archivedBacktestCard';
import useBacktestStore from '@/store/backtest/backtestStore';
import { FiAlignLeft, FiArchive } from "react-icons/fi";
import { useTranslation } from 'react-i18next';

export default function ClientPage() {
  const { t } = useTranslation('backtestPage');

  const getArchivedBacktests = useBacktestStore((state) => state.getArchivedBacktests);
  useEffect(() => {
    const loadData = async () => {
      await getArchivedBacktests();
    };
    loadData();
  }, []);

  const {
    backtestResults,
    isBacktestLoading,
    backtestError,
    archivedBacktests,
    isArchiveLoading,
    archiveError,
    isArchiveSidebarOpen
  } = useBacktestStore();

  return (
    <div className="min-h-screen bg-zinc-950/50 text-zinc-300 font-sans selection:bg-blue-500/30">
      <BacktestHeader />

      <div className="flex w-full h-[calc(100vh-60px)] p-2 gap-4 transition-all duration-500 ease-in-out">

        {/* Left Side - Backtest Archive */}
        <div
          className={`flex flex-col bg-zinc-950/90 backdrop-blur-md border border-zinc-800/50 rounded-2xl overflow-hidden shadow-2xl shadow-black/40 transition-all duration-500 ease-in-out ${isArchiveSidebarOpen ? "w-[35%] opacity-100 translate-x-0 ml-2" : "w-0 opacity-0 -translate-x-full ml-0 border-0 pointer-events-none"
            }`}
        >
          <div className="px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/40 to-zinc-900/0 min-w-[300px]">
            <h1 className="text-zinc-100 text-sm uppercase tracking-wider font-bold flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></span>
              {t('titles.archive')}
            </h1>
          </div>

          <div className="flex-1 p-3 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent min-w-[300px]">
            {isArchiveLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-2 border-zinc-800 border-t-blue-500 mx-auto mb-4"></div>
                  <div className="text-zinc-100 font-medium">{t('loading.archiveTitle')}</div>
                  <div className="text-zinc-500 text-xs mt-1">
                    {t('loading.archiveDesc')}
                  </div>
                </div>
              </div>
            ) : archiveError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center bg-red-500/5 border border-red-500/10 p-6 rounded-2xl max-w-xs">
                  <div className="text-3xl mb-3 grayscale opacity-50">❌</div>
                  <div className="text-red-400 font-medium mb-1">{t('errors.archiveTitle')}</div>
                  <div className="text-zinc-500 text-xs mb-4">{archiveError}</div>
                  <button
                    onClick={() => getArchivedBacktests()}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-medium transition-all border border-zinc-700 hover:border-zinc-600"
                  >
                    {t('buttons.retry')}
                  </button>
                </div>
              </div>
            ) : archivedBacktests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-zinc-600">
                <div className="p-4 bg-zinc-900 rounded-full mb-3 border border-zinc-800">
                  <FiArchive className="text-2xl" />
                </div>
                <div className="text-zinc-400 font-medium mb-1">{t('empty.archiveTitle')}</div>
                <div className="text-zinc-600 text-xs max-w-[200px]">
                  {t('empty.archiveDesc')}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {archivedBacktests.map((archivedItem) => (
                  <ArchivedBacktestCard
                    key={archivedItem.id}
                    archivedItem={archivedItem}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side - Backtest Results */}
        <div
          className={`flex flex-col bg-zinc-950/90 backdrop-blur-md border border-blue-900/10 rounded-2xl overflow-hidden shadow-2xl shadow-black/20 relative transition-all duration-500 ease-in-out ${isArchiveSidebarOpen ? "w-[65%]" : "w-full"
            }`}
        >

          {/* Decorative metal shine */}
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/40 relative z-10">
            <h1 className="text-zinc-100 text-sm uppercase tracking-wider font-bold flex items-center gap-2">
              <span className="w-1 h-4 bg-blue-400 rounded-full shadow-[0_0_10px_rgba(96,165,250,0.5)]"></span>
              {t('titles.results')}
            </h1>
          </div>

          <div className="flex-1 p-4 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent relative z-10">
            {isBacktestLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-800 border-t-blue-400 mx-auto mb-5"></div>
                  <div className="text-zinc-100 text-lg font-light tracking-tight">{t('loading.backtestTitle')}</div>
                  <div className="text-zinc-500 text-sm mt-2">
                    {t('loading.backtestDesc')}
                  </div>
                </div>
              </div>
            )}

            {backtestError && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center bg-red-500/5 border border-red-500/10 p-8 rounded-3xl max-w-sm">
                  <div className="text-4xl mb-4 grayscale opacity-50">❌</div>
                  <div className="text-red-400 font-medium text-lg mb-2">{t('errors.backtestTitle')}</div>
                  <div className="text-zinc-500 text-sm">{backtestError}</div>
                </div>
              </div>
            )}

            {!backtestResults && !isBacktestLoading && !backtestError && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-zinc-600">
                  <div className="text-7xl mb-6 flex justify-center opacity-20"><FiAlignLeft /></div>
                  <div className="text-2xl text-zinc-400 font-light mb-3">
                    {t('awaiting.title')}
                  </div>
                  <div className="text-zinc-600 text-sm">
                    {t('awaiting.desc')}
                  </div>
                </div>
              </div>
            )}

            {backtestResults && (
              <div className="space-y-6">
                {/* Backtest Parameters Card */}
                <BacktestInfoCard />

                {/* Chart Card */}
                <div className="rounded-xl overflow-hidden border border-zinc-800/60 shadow-lg">
                  <BacktestChart chartData={backtestResults.chartData} />
                </div>

                {/* Performance Metrics Card */}
                <PerformanceMetrics performance={backtestResults.performance} />

                {/* Trades List Card */}
                <TradesList trades={backtestResults.trades} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
