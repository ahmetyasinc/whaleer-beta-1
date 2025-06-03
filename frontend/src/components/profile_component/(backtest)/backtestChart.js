'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import useBacktestStore from '@/store/backtest/backtestStore';

export default function BacktestChart() {
  // Ana chart referansları
  const mainChartContainerRef = useRef(null);
  const mainChartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);

  // Returns chart referansları
  const returnsChartContainerRef = useRef(null);
  const returnsChartRef = useRef(null);
  const histogramSeriesRef = useRef(null);

  // Görünürlük state'leri
  const [showCandlestick, setShowCandlestick] = useState(true);
  const [showLine, setShowLine] = useState(true);

  // Store verilerini al
  const chartData = useBacktestStore((state) => state.backtestResults?.chartData || []);
  const candles = useBacktestStore((state) => state.backtestResults?.candles || []);
  const returns = useBacktestStore((state) => state.backtestResults?.returns || []);
  const period = useBacktestStore((state) => state.selectedPeriod);

  // Chart konfigürasyonu
  const getChartConfig = (height = 500) => ({
    width: 0, // Bu resize sırasında ayarlanacak
    height,
    layout: {
      textColor: 'white',
      background: { type: 'solid', color: 'rgb(0, 4, 10)' },
    },
    grid: {
      vertLines: { color: '#111', style: 1 },
      horzLines: { color: '#111', style: 1 },
    },
    timeScale: {
      borderColor: '#334155',
      timeVisible: true,
      secondsVisible: ['1m', '5m', '15m'].includes(period),
    },
    priceScale: {
      borderColor: '#334155',
    },
    crosshair: {
      mode: 1, // Normal crosshair mode
    },
  });

  // Grafik görünürlüğünü toggle et (en az biri görünür kalmalı)
  const toggleCandlestick = () => {
    if (showCandlestick && !showLine) return; // Son görünür grafik ise toggle yapma
    setShowCandlestick(!showCandlestick);
  };

  const toggleLine = () => {
    if (showLine && !showCandlestick) return; // Son görünür grafik ise toggle yapma
    setShowLine(!showLine);
  };

  // Ana chart'ı oluştur
  useEffect(() => {
    if (!mainChartContainerRef.current) return;

    const mainChart = createChart(mainChartContainerRef.current, {
      ...getChartConfig(300),
      width: mainChartContainerRef.current.clientWidth,
    });

    mainChartRef.current = mainChart;

    // Candlestick serisi
    const candlestickSeries = mainChart.addCandlestickSeries();
    candlestickSeriesRef.current = candlestickSeries;

    // Line serisi
    const lineSeries = mainChart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
    });
    lineSeriesRef.current = lineSeries;

    // Resize observer
    const mainResizeObserver = new ResizeObserver(() => {
      mainChart.applyOptions({ width: mainChartContainerRef.current.clientWidth });
    });
    mainResizeObserver.observe(mainChartContainerRef.current);

    return () => {
      mainResizeObserver.disconnect();
      mainChart.remove();
    };
  }, []);

  // Returns chart'ı oluştur
  useEffect(() => {
    if (!returnsChartContainerRef.current) return;

    const returnsChart = createChart(returnsChartContainerRef.current, {
      ...getChartConfig(150),
      width: returnsChartContainerRef.current.clientWidth,
    });

    returnsChartRef.current = returnsChart;

    // Histogram serisi
    const histogramSeries = returnsChart.addHistogramSeries({
      color: '#22c55e',
      priceFormat: {
        type: 'percent',
        precision: 4,
      },
    });
    histogramSeriesRef.current = histogramSeries;

    // Resize observer
    const returnsResizeObserver = new ResizeObserver(() => {
      returnsChart.applyOptions({ width: returnsChartContainerRef.current.clientWidth });
    });
    returnsResizeObserver.observe(returnsChartContainerRef.current);

    return () => {
      returnsResizeObserver.disconnect();
      returnsChart.remove();
    };
  }, []);

  // Cross senkronizasyonu
  useEffect(() => {
    if (!mainChartRef.current || !returnsChartRef.current) return;

    const mainChart = mainChartRef.current;
    const returnsChart = returnsChartRef.current;

    // Ana chart'tan returns chart'a crosshair senkronizasyonu
    const handleMainCrosshairMove = (param) => {
      if (param.time) {
        returnsChart.timeScale().setVisibleLogicalRange(
          mainChart.timeScale().getVisibleLogicalRange()
        );
      }
    };

    // Returns chart'tan ana chart'a crosshair senkronizasyonu
    const handleReturnsCrosshairMove = (param) => {
      if (param.time) {
        mainChart.timeScale().setVisibleLogicalRange(
          returnsChart.timeScale().getVisibleLogicalRange()
        );
      }
    };

    // Time scale senkronizasyonu
    const syncTimeScales = () => {
      const mainVisibleRange = mainChart.timeScale().getVisibleLogicalRange();
      const returnsVisibleRange = returnsChart.timeScale().getVisibleLogicalRange();
      
      if (mainVisibleRange && returnsVisibleRange) {
        if (Math.abs(mainVisibleRange.from - returnsVisibleRange.from) > 0.1 ||
            Math.abs(mainVisibleRange.to - returnsVisibleRange.to) > 0.1) {
          returnsChart.timeScale().setVisibleLogicalRange(mainVisibleRange);
        }
      }
    };

    // Event listener'ları ekle
    mainChart.subscribeCrosshairMove(handleMainCrosshairMove);
    returnsChart.subscribeCrosshairMove(handleReturnsCrosshairMove);
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncTimeScales);

    return () => {
      mainChart.unsubscribeCrosshairMove(handleMainCrosshairMove);
      returnsChart.unsubscribeCrosshairMove(handleReturnsCrosshairMove);
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncTimeScales);
    };
  }, [mainChartRef.current, returnsChartRef.current]);

  // Ana chart verilerini güncelle
  useEffect(() => {
    if (candlestickSeriesRef.current && candles.length > 0) {
      const formatted = candles.map(c => ({
        time: c.time,
        open: +c.open,
        high: +c.high,
        low: +c.low,
        close: +c.close,
      }));
      
      if (showCandlestick) {
        candlestickSeriesRef.current.setData(formatted);
      } else {
        candlestickSeriesRef.current.setData([]);
      }
    }

    if (lineSeriesRef.current && chartData.length > 0) {
      if (showLine) {
        lineSeriesRef.current.setData(chartData);
      } else {
        lineSeriesRef.current.setData([]);
      }
    }

    if (mainChartRef.current) {
      mainChartRef.current.applyOptions({
        timeScale: {
          secondsVisible: ['1m', '5m', '15m'].includes(period),
        },
      });
    }
  }, [candles, chartData, period, showCandlestick, showLine]);

  // Returns chart verilerini güncelle
  useEffect(() => {
    if (histogramSeriesRef.current && Array.isArray(returns) && returns.length > 0) {
      try {
        const formattedReturns = returns
          .filter(item => Array.isArray(item) && item.length >= 2) // Geçerli formatta olduğunu kontrol et
          .map(([time, value]) => ({
            time: time,
            value: +value,
            color: value >= 0 ? '#22c55e' : '#ef4444', // Pozitif yeşil, negatif kırmızı
          }));
        
        if (formattedReturns.length > 0) {
          histogramSeriesRef.current.setData(formattedReturns);
        }
      } catch (error) {
        console.error('Returns data formatting error:', error);
        console.log('Returns data:', returns);
      }
    }

    if (returnsChartRef.current) {
      returnsChartRef.current.applyOptions({
        timeScale: {
          secondsVisible: ['1m', '5m', '15m'].includes(period),
        },
      });
    }
  }, [returns, period]);

  return (
    <div className="w-full h-full flex flex-col space-y-2">
      {/* Ana Chart - Candlestick ve Line */}
      <div className="flex-1 relative">
        <div ref={mainChartContainerRef} className="w-full h-78" />
        
        {/* Chart başlığı ve toggle butonları */}
        <div className="absolute top-2 left-2 flex items-center gap-4 text-sm font-light pointer-events-auto z-10">
          <span className="text-gray-400">Price Chart</span>
          
          {/* Toggle butonları */}
          <div className="flex gap-2">
            <button
              onClick={toggleCandlestick}
              disabled={showCandlestick && !showLine}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                showCandlestick
                  ? 'bg-green-600 border-green-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-400'
              } ${
                showCandlestick && !showLine 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-opacity-80 cursor-pointer'
              }`}
            >
              Candles
            </button>
            
            <button
              onClick={toggleLine}
              disabled={showLine && !showCandlestick}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                showLine
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-400'
              } ${
                showLine && !showCandlestick 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:bg-opacity-80 cursor-pointer'
              }`}
            >
              Line
            </button>
          </div>
        </div>
      </div>
      
      {/* Returns Chart - Histogram */}
      <div className="flex-shrink-0 relative">
        <div ref={returnsChartContainerRef} className="w-full h-36" />
        <div className="absolute top-2 left-2 text-gray-400 text-sm font-light pointer-events-none z-10">
          Returns
        </div>
      </div>
    </div>
  );
}