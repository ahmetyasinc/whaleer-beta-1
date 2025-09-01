'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import useBacktestStore from '@/store/backtest/backtestStore';

export default function BacktestChart() {
  const mainChartContainerRef = useRef(null);
  const mainChartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);

  const returnsChartContainerRef = useRef(null);
  const returnsChartRef = useRef(null);
  const histogramSeriesRef = useRef(null);

  const [showCandlestick, setShowCandlestick] = useState(true);
  const [showLine, setShowLine] = useState(true);

  // NEW: which metric to show in the bottom chart
  const [bottomMetric, setBottomMetric] = useState('returns'); // 'returns' | 'position' | 'percentage'

  const chartData = useBacktestStore((state) => state.backtestResults?.chartData || []);
  const candles = useBacktestStore((state) => state.backtestResults?.candles || []);
  const returns = useBacktestStore((state) => state.backtestResults?.returns || []);
  const period = useBacktestStore((state) => state.selectedPeriod);

  const getChartConfig = (height = 500) => ({
    width: 0,
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
      mode: 1,
    },
  });

  const toggleCandlestick = () => {
    if (showCandlestick && !showLine) return;
    setShowCandlestick(!showCandlestick);
  };

  const toggleLine = () => {
    if (showLine && !showCandlestick) return;
    setShowLine(!showLine);
  };

  useEffect(() => {
    const container = mainChartContainerRef.current;
    if (!container) return;

    const mainChart = createChart(container, {
      ...getChartConfig(300),
      width: container.clientWidth,
    });

    mainChartRef.current = mainChart;

    const candlestickSeries = mainChart.addCandlestickSeries();
    candlestickSeriesRef.current = candlestickSeries;

    const lineSeries = mainChart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2,
    });
    lineSeriesRef.current = lineSeries;

    const resizeObserver = new ResizeObserver(() => {
      if (mainChartContainerRef.current) {
        mainChart.applyOptions({ width: mainChartContainerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      mainChart.remove();
    };
  }, []);

  useEffect(() => {
    const container = returnsChartContainerRef.current;
    if (!container) return;

    const returnsChart = createChart(container, {
      ...getChartConfig(150),
      width: container.clientWidth,
    });

    returnsChartRef.current = returnsChart;

    const histogramSeries = returnsChart.addHistogramSeries({
      color: '#22c55e',
      priceFormat: { type: 'percent', precision: 4 }, // default; we’ll switch per metric later
    });
    histogramSeriesRef.current = histogramSeries;

    const resizeObserver = new ResizeObserver(() => {
      if (returnsChartContainerRef.current) {
        returnsChart.applyOptions({ width: returnsChartContainerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      returnsChart.remove();
    };
  }, []);

  // keep time scales synced
  useEffect(() => {
    if (!mainChartRef.current || !returnsChartRef.current) return;

    const mainChart = mainChartRef.current;
    const returnsChart = returnsChartRef.current;

    const handleMainCrosshairMove = (param) => {
      if (param.time) {
        returnsChart.timeScale().setVisibleLogicalRange(
          mainChart.timeScale().getVisibleLogicalRange()
        );
      }
    };

    const handleReturnsCrosshairMove = (param) => {
      if (param.time) {
        mainChart.timeScale().setVisibleLogicalRange(
          returnsChart.timeScale().getVisibleLogicalRange()
        );
      }
    };

    const syncTimeScales = () => {
      const mainRange = mainChart.timeScale().getVisibleLogicalRange();
      const returnsRange = returnsChart.timeScale().getVisibleLogicalRange();
      if (mainRange && returnsRange) {
        if (
          Math.abs(mainRange.from - returnsRange.from) > 0.1 ||
          Math.abs(mainRange.to - returnsRange.to) > 0.1
        ) {
          returnsChart.timeScale().setVisibleLogicalRange(mainRange);
        }
      }
    };

    mainChart.subscribeCrosshairMove(handleMainCrosshairMove);
    returnsChart.subscribeCrosshairMove(handleReturnsCrosshairMove);
    mainChart.timeScale().subscribeVisibleLogicalRangeChange(syncTimeScales);

    return () => {
      mainChart.unsubscribeCrosshairMove(handleMainCrosshairMove);
      returnsChart.unsubscribeCrosshairMove(handleReturnsCrosshairMove);
      mainChart.timeScale().unsubscribeVisibleLogicalRangeChange(syncTimeScales);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mainChartRef.current, returnsChartRef.current]);

  // price + overlay updates
  useEffect(() => {
    if (candlestickSeriesRef.current && candles.length > 0) {
      const formatted = candles.map((c) => ({
        time: c.time,
        open: +c.open,
        high: +c.high,
        low: +c.low,
        close: +c.close,
      }));
      candlestickSeriesRef.current.setData(showCandlestick ? formatted : []);
    }

    if (lineSeriesRef.current && chartData.length > 0) {
      lineSeriesRef.current.setData(showLine ? chartData : []);
    }

    if (mainChartRef.current) {
      mainChartRef.current.applyOptions({
        timeScale: {
          secondsVisible: ['1m', '5m', '15m'].includes(period),
        },
      });
    }
  }, [candles, chartData, period, showCandlestick, showLine]);

  // bottom chart updates (NEW: switchable metric)
  useEffect(() => {
    if (!histogramSeriesRef.current) return;

    try {
      const metricIndex = (item) => {
        if (!Array.isArray(item)) return null;
        switch (bottomMetric) {
          case 'returns':
            return item.length >= 2 ? 1 : null;
          case 'position':
            return item.length >= 3 ? 2 : null;
          case 'percentage':
            return item.length >= 4 ? 3 : (item.length >= 2 ? 1 : null); 
          default:
            return item.length >= 2 ? 1 : null;
        }
      };

      const formatted = (returns || [])
        .map((arr) => {
          const idx = metricIndex(arr);
          if (idx == null) return null;

          const [time] = arr;
          const rawVal = arr[idx];

          if (time == null || rawVal == null || Number.isNaN(+rawVal)) return null;

          // color logic:
          // - returns / percentage: green >=0, red <0
          // - position: green >0, gray =0, red <0
          let color = '#22c55e';
          const valNum = +rawVal;
          if (bottomMetric === 'position') {
            color = valNum > 0 ? '#22c55e' : valNum < 0 ? '#ef4444' : '#94a3b8';
          } else {
            color = valNum >= 0 ? '#22c55e' : '#ef4444';
          }

          return { time, value: valNum, color };
        })
        .filter(Boolean);

      // Switch price format per metric
      if (bottomMetric === 'position') {
        histogramSeriesRef.current.applyOptions({
          priceFormat: { type: 'price', precision: 2, minMove: 1 },
        });
      } else {
        // returns / percentage are decimal ratios, keep percent format
        histogramSeriesRef.current.applyOptions({
          priceFormat: { type: 'percent', precision: 4 },
        });
      }
      // Switch price format per metric
      if (bottomMetric === 'position') {
        histogramSeriesRef.current.applyOptions({
          priceFormat: { type: 'price', precision: 2, minMove: 1 },
        });
      } else {
        // returns / percentage: show 3 decimals with Turkish comma
        histogramSeriesRef.current.applyOptions({
          priceFormat: {
            type: 'custom',
            minMove: 0.001, // 3 decimal steps
            formatter: (p) =>
              `${Number(p).toLocaleString('tr-TR', {
                minimumFractionDigits: 1,
                maximumFractionDigits: 3,
              })}%`,
          },
        });
      }
      if (formatted.length > 0) {
        histogramSeriesRef.current.setData(formatted);
      } else {
        histogramSeriesRef.current.setData([]);
      }
    } catch (error) {
      console.error('Bottom series formatting error:', error);
    }

    if (returnsChartRef.current) {
      returnsChartRef.current.applyOptions({
        timeScale: {
          secondsVisible: ['1m', '5m', '15m'].includes(period),
        },
      });
    }
  }, [returns, period, bottomMetric]);

  return (
    <div className="w-full h-full flex flex-col space-y-2">
      <div className="flex-1 relative">
        <div ref={mainChartContainerRef} className="w-full h-78" />
        <div className="absolute top-2 left-2 flex items-center gap-4 text-sm font-light pointer-events-auto z-10">
          <span className="text-gray-400">Price Chart</span>
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

      <div className="flex-shrink-0 relative">
        <div ref={returnsChartContainerRef} className="w-full h-36" />
        {/* NEW: metric switcher */}
        <div className="absolute top-2 left-2 flex items-center gap-2 text-sm font-light z-10 pointer-events-auto">
          <span className="text-gray-400">
            {bottomMetric === 'returns'
              ? 'Returns'
              : bottomMetric === 'position'
              ? 'Position'
              : 'Percentage'}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setBottomMetric('returns')}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                bottomMetric === 'returns'
                  ? 'bg-emerald-700 border-emerald-600 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-opacity-80'
              }`}
            >
              Returns
            </button>
            <button
              onClick={() => setBottomMetric('position')}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                bottomMetric === 'position'
                  ? 'bg-indigo-700 border-indigo-600 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-opacity-80'
              }`}
            >
              Position
            </button>
            <button
              onClick={() => setBottomMetric('percentage')}
              className={`px-2 py-1 rounded text-xs border transition-colors ${
                bottomMetric === 'percentage'
                  ? 'bg-cyan-700 border-cyan-600 text-white'
                  : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-opacity-80'
              }`}
            >
              Percentage
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
