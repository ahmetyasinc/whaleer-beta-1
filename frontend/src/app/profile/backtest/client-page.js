'use client';

import { FaLock } from 'react-icons/fa';
import BacktestHeader from '@/components/profile_component/(backtest)/backtestHeader';
import BacktestChart from '@/components/profile_component/(backtest)/backtestChart';
import PerformanceMetrics from '@/components/profile_component/(backtest)/performanceMetrics';
import TradesList from '@/components/profile_component/(backtest)/tradeList';
import BacktestInfoCard from '@/components/profile_component/(backtest)/backtestInfoCard';
import ArchivedBacktestCard from '@/components/profile_component/(backtest)/archivedBacktestCard';
import useBacktestStore from '@/store/backtest/backtestStore';
import { FiAlignLeft, FiArchive } from "react-icons/fi";

const isBeta = true;

export default function ClientPage() {
  const { 
    backtestResults, 
    isBacktestLoading, 
    backtestError,
    archivedBacktests 
  } = useBacktestStore();

  if (isBeta) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        <div
          className="absolute inset-0 bg-center bg-no-repeat bg-cover blur-lg"
          style={{ backgroundImage: "url('/pages/backtest.png')" }}
        ></div>
        <div className="absolute inset-0 bg-white bg-opacity-10 z-10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
          <FaLock className="text-yellow-500 text-6xl mb-4" />
          <h1 className="text-white text-xl font-semibold">
            Bu sayfa yakında sizlerle buluşacak
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <BacktestHeader />
      
      <div className="flex w-full h-[calc(100vh-60px)] gap-x-4">
        
        {/* Sol Kısım - Backtest Arşivi */}
        <div className="w-[40%] p-2 bg-[rgb(13,16,22,0.75)] rounded-r-xl">
          <h1 className="text-white text-lg font-semibold my-2 ml-3 pb-2 border-b border-black">
            Backtest Arşivim
          </h1>
          
          <div className="p-3 h-[calc(100%-60px)] overflow-y-auto">
            {archivedBacktests.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <FiArchive className="text-4xl mb-3" />
                <div className="text-lg font-medium mb-2">Arşiv Boş</div>
                <div className="text-sm">
                  Backtest sonuçlarınızı arşivlemek için "Arşivle" butonunu kullanın.
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

        {/* Sağ Kısım - Backtest Sonuçları */}
        <div className="w-[59%] bg-[rgb(13,16,22,0.75)] p-2 rounded-xl">
          <h1 className="text-white text-lg font-semibold my-2 ml-3 pb-2 border-b border-black">
            Backtest Sonuçları
          </h1>
          
          <div className="p-4 h-[calc(100%-60px)] overflow-y-auto">
            {isBacktestLoading && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <div className="text-lg">Backtest çalışıyor...</div>
                  <div className="text-gray-400 text-sm mt-2">
                    Lütfen bekleyin, stratejiniz test ediliyor.
                  </div>
                </div>
              </div>
            )}

            {backtestError && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-red-400 bg-red-900/20 p-6 rounded-lg">
                  <div className="text-4xl mb-4">❌</div>
                  <div className="text-lg font-semibold mb-2">Hata Oluştu</div>
                  <div className="text-sm">{backtestError}</div>
                </div>
              </div>
            )}

            {!backtestResults && !isBacktestLoading && !backtestError && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-400">
                  <div className="text-6xl mb-4 flex justify-center"><FiAlignLeft /></div>
                  <div className="text-xl font-semibold mb-2">
                    Backtest Sonucu Bekleniyor
                  </div>
                  <div className="text-sm">
                    Backtest yapmak için yukarıdaki "Backtest Yap" butonunu kullanın.
                  </div>
                </div>
              </div>
            )}

            {backtestResults && (
              <div className="space-y-6">
                {/* Backtest Parametreleri Kartı */}
                <BacktestInfoCard />
                
                {/* Chart Kartı */}
                <BacktestChart chartData={backtestResults.chartData} />
                
                {/* Performans Metrikleri Kartı */}
                <PerformanceMetrics performance={backtestResults.performance} />
                
                {/* İşlem Listesi Kartı */}
                <TradesList trades={backtestResults.trades} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}