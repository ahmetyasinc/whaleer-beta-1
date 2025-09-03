'use client';
import { useEffect } from 'react';

import { FaLock } from 'react-icons/fa';
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
    archiveError
  } = useBacktestStore();

  return (
    <div className="min-h-screen">
      <BacktestHeader />
      
      <div className="flex w-full h-[calc(100vh-60px)] gap-x-4">
        
        {/* Left Side - Backtest Archive */}
        <div className="w-[40%] p-2 bg-[rgb(13,16,22,0.75)] rounded-r-xl">
          <h1 className="text-white text-lg font-semibold my-2 ml-3 pb-2 border-b border-black">
            {t('titles.archive')}
          </h1>
          
          <div className="p-3 h-[calc(100%-60px)] overflow-y-auto">
            {isArchiveLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-lg">{t('loading.archiveTitle')}</div>
                  <div className="text-gray-400 text-sm mt-2">
                    {t('loading.archiveDesc')}
                  </div>
                </div>
              </div>
            ) : archiveError ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-400 bg-red-900/20 p-6 rounded-lg">
                  <div className="text-4xl mb-4">❌</div>
                  <div className="text-lg font-semibold mb-2">{t('errors.archiveTitle')}</div>
                  <div className="text-sm">{archiveError}</div>
                  <button 
                    onClick={() => getArchivedBacktests()}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                  >
                    {t('buttons.retry')}
                  </button>
                </div>
              </div>
            ) : archivedBacktests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <FiArchive className="text-4xl mb-3" />
                <div className="text-lg font-medium mb-2">{t('empty.archiveTitle')}</div>
                <div className="text-sm">
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
        <div className="w-[59%] bg-[rgb(13,16,22,0.75)] p-2 rounded-xl">
          <h1 className="text-white text-lg font-semibold my-2 ml-3 pb-2 border-b border-black">
            {t('titles.results')}
          </h1>
          
          <div className="p-4 h-[calc(100%-60px)] overflow-y-auto">
            {isBacktestLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-lg">{t('loading.backtestTitle')}</div>
                  <div className="text-gray-400 text-sm mt-2">
                    {t('loading.backtestDesc')}
                  </div>
                </div>
              </div>
            )}

            {backtestError && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-400 bg-red-900/20 p-6 rounded-lg">
                  <div className="text-4xl mb-4">❌</div>
                  <div className="text-lg font-semibold mb-2">{t('errors.backtestTitle')}</div>
                  <div className="text-sm">{backtestError}</div>
                </div>
              </div>
            )}

            {!backtestResults && !isBacktestLoading && !backtestError && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4 flex justify-center"><FiAlignLeft /></div>
                  <div className="text-xl font-semibold mb-2">
                    {t('awaiting.title')}
                  </div>
                  <div className="text-sm">
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
                <BacktestChart chartData={backtestResults.chartData} />
                
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
