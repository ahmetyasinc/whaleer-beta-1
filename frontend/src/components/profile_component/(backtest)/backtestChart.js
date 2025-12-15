'use client';

import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import useBacktestStore from '@/store/backtest/backtestStore';
import { useTranslation } from 'react-i18next';

// ---- Timezone helpers ----
const pad = (n) => String(n).padStart(2, '0');

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return m ? decodeURIComponent(m.split('=')[1]) : null;
}

function parseGmtToMinutes(tzStr) {
  // "GMT+1", "GMT-3", "GMT+5:30" desteklenir
  const m = /^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec((tzStr || '').trim());
  if (!m) return 0; // default GMT+0
  const sign = m[1] === '-' ? -1 : 1;
  const h = parseInt(m[2] || '0', 10);
  const mins = parseInt(m[3] || '0', 10);
  return sign * (h * 60 + mins);
}

function readTimezoneOffsetMinutesFromCookie() {
  try {
    const raw = getCookie('wh_settings');
    if (!raw) return 0; // GMT+0
    const obj = JSON.parse(raw);
    return parseGmtToMinutes(obj?.timezone || 'GMT+0');
  } catch {
    return 0; // parse hatası → GMT+0
  }
}

// t → business day ({year,month,day}) veya UNIX saniye (number)
function timeToZonedDate(t, offsetMinutes) {
  let msUTC;
  if (t && typeof t === 'object' && 'year' in t && 'month' in t && 'day' in t) {
    msUTC = Date.UTC(t.year, t.month - 1, t.day, 0, 0, 0);
  } else {
    const sec = (typeof t === 'number' ? t : 0);
    msUTC = sec * 1000;
  }
  return new Date(msUTC + (offsetMinutes || 0) * 60 * 1000);
}

// Saatlik ve daha uzun periyotlarda iki haneli yıl (yy) gösterir
function makeZonedFormatter(period, offsetMinutes) {
  const isMins = ['1m', '5m', '15m'].includes(period) || period === '3m' || period === '30m';
  const isHours = ['1h', '2h', '4h'].includes(period);
  const isDays = period === '1d';
  const isWeeks = period === '1w';
  const twoDigitYear = (Y) => String(Y).slice(2);

  return (t) => {
    const d = timeToZonedDate(t, offsetMinutes);
    const Y = d.getUTCFullYear();
    const yy = twoDigitYear(Y);
    const M = pad(d.getUTCMonth() + 1);
    const D = pad(d.getUTCDate());
    const h = pad(d.getUTCHours());
    const m = pad(d.getUTCMinutes());

    if (isMins) return `${D}.${M} ${h}:${m}`;     // 1–30m → yıl yok
    if (isHours) return `${D}.${M}.${yy} ${h}:00`; // 1h–4h → DD.MM.yy HH:00
    if (isDays) return `${D}.${M}.${yy}`;         // 1d     → DD.MM.yy
    if (isWeeks) return `${D}.${M}.${yy}`;         // 1w     → DD.MM.yy
    return `${D}.${M}.${yy} ${h}:${m}`;
  };
}

export default function BacktestChart() {
  const { t } = useTranslation('backtestChart');

  const mainChartContainerRef = useRef(null);
  const mainChartRef = useRef(null);
  const candlestickSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);

  const returnsChartContainerRef = useRef(null);
  const returnsChartRef = useRef(null);
  const histogramSeriesRef = useRef(null);

  const [showCandlestick, setShowCandlestick] = useState(true);
  const [showLine, setShowLine] = useState(true);

  const [tzOffsetMin, setTzOffsetMin] = useState(0);

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
      textColor: '#a1a1aa', // zinc-400
      background: { type: 'solid', color: '#18181b' }, // zinc-900 (matches bg-zinc-900)
    },
    grid: {
      vertLines: { color: '#27272a', style: 1 }, // zinc-800
      horzLines: { color: '#27272a', style: 1 }, // zinc-800
    },
    timeScale: {
      borderColor: '#27272a',
      timeVisible: true,
      secondsVisible: ['1m', '5m', '15m'].includes(period),
    },
    priceScale: {
      borderColor: '#27272a',
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
    setTzOffsetMin(readTimezoneOffsetMinutesFromCookie());
  }, []);

  useEffect(() => {
    const container = mainChartContainerRef.current;
    if (!container) return;

    const fmt = makeZonedFormatter(period, tzOffsetMin);

    const mainChart = createChart(container, {
      ...getChartConfig(300),
      width: container.clientWidth,
      localization: { timeFormatter: fmt },
      timeScale: {
        ...getChartConfig(300).timeScale,
        timeVisible: true,
        secondsVisible: ['1m', '5m', '15m'].includes(period),
        tickMarkFormatter: fmt,
      },
    });

    mainChartRef.current = mainChart;

    const candlestickSeries = mainChart.addCandlestickSeries({
      upColor: '#10b981', // emerald-500
      downColor: '#ef4444', // red-500
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444'
    });
    candlestickSeriesRef.current = candlestickSeries;

    const lineSeries = mainChart.addLineSeries({
      color: '#3b82f6', // blue-500
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

    const fmt = makeZonedFormatter(period, tzOffsetMin);

    const returnsChart = createChart(container, {
      ...getChartConfig(150),
      width: container.clientWidth,
      localization: { timeFormatter: fmt },
      timeScale: {
        ...getChartConfig(150).timeScale,
        timeVisible: true,
        secondsVisible: ['1m', '5m', '15m'].includes(period),
        tickMarkFormatter: fmt,
      },
    });


    returnsChartRef.current = returnsChart;

    const histogramSeries = returnsChart.addHistogramSeries({
      color: '#10b981', // emerald-500
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
  // Visibility updates
  useEffect(() => {
    if (candlestickSeriesRef.current) {
      candlestickSeriesRef.current.applyOptions({ visible: showCandlestick });
    }
    if (lineSeriesRef.current) {
      lineSeriesRef.current.applyOptions({ visible: showLine });
    }
  }, [showCandlestick, showLine]);

  // price + overlay updates
  useEffect(() => {
    // seri güncellemeleri
    if (candlestickSeriesRef.current && candles.length > 0) {
      const formatted = candles.map((c) => ({
        time: c.time,
        open: +c.open,
        high: +c.high,
        low: +c.low,
        close: +c.close,
      }));
      candlestickSeriesRef.current.setData(formatted);
    }

    if (lineSeriesRef.current && chartData.length > 0) {
      lineSeriesRef.current.setData(chartData);
    }

    const fmt = makeZonedFormatter(period, tzOffsetMin);

    if (mainChartRef.current) {
      mainChartRef.current.applyOptions({
        localization: { timeFormatter: fmt },
        timeScale: {
          secondsVisible: ['1m', '5m', '15m'].includes(period),
          tickMarkFormatter: fmt,
        },
      });
    }

    if (returnsChartRef.current) {
      returnsChartRef.current.applyOptions({
        localization: { timeFormatter: fmt },
        timeScale: {
          secondsVisible: ['1m', '5m', '15m'].includes(period),
          tickMarkFormatter: fmt,
        },
      });
    }
  }, [candles, chartData, period, tzOffsetMin]);


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
          let color = '#10b981'; // emerald-500
          const valNum = +rawVal;
          if (bottomMetric === 'position') {
            color = valNum > 0 ? '#10b981' : valNum < 0 ? '#ef4444' : '#94a3b8';
          } else {
            color = valNum >= 0 ? '#10b981' : '#ef4444';
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
      const fmt = makeZonedFormatter(period, tzOffsetMin);
      returnsChartRef.current.applyOptions({
        localization: { timeFormatter: fmt },
        timeScale: {
          secondsVisible: ['1m', '5m', '15m'].includes(period),
          tickMarkFormatter: fmt,
        },
      });
    }
  }, [returns, period, bottomMetric, tzOffsetMin]);

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5 shadow-lg flex flex-col space-y-4">

      {/* Chart Title Container - Metallic Header style used elsewhere */}
      <div className="flex justify-between items-center border-b border-zinc-800/50 pb-3">
        <h3 className="text-zinc-100 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
          {t('titles.priceChart')}
        </h3>

        <div className="flex gap-2">
          <button
            onClick={toggleCandlestick}
            disabled={showCandlestick && !showLine}
            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all duration-100 ${showCandlestick
              ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
              : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
              } ${showCandlestick && !showLine
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
              }`}
            aria-label={t('buttons.candles')}
            title={t('buttons.candles')}
          >
            {t('buttons.candles')}
          </button>
          <button
            onClick={toggleLine}
            disabled={showLine && !showCandlestick}
            className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all duration-100 ${showLine
              ? 'bg-blue-950/30 border-blue-500/50 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]'
              : 'bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600'
              } ${showLine && !showCandlestick
                ? 'opacity-50 cursor-not-allowed'
                : 'cursor-pointer'
              }`}
            aria-label={t('buttons.line')}
            title={t('buttons.line')}
          >
            {t('buttons.line')}
          </button>
        </div>
      </div>

      <div className="flex-1 relative rounded-lg overflow-hidden border border-zinc-800/50">
        <div ref={mainChartContainerRef} className="w-full h-80" />
      </div>

      <div className="relative rounded-lg overflow-hidden border border-zinc-800/50">
        <div ref={returnsChartContainerRef} className="w-full h-40" />

        {/* Metric Switcher Overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-2 p-1 bg-zinc-900/80 backdrop-blur-sm rounded-lg border border-zinc-800/50 z-10 pointer-events-auto">
          <div className="flex gap-1">
            <button
              onClick={() => setBottomMetric('returns')}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${bottomMetric === 'returns'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
              aria-label={t('metrics.returns')}
              title={t('metrics.returns')}
            >
              {t('metrics.returns')}
            </button>
            <button
              onClick={() => setBottomMetric('position')}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${bottomMetric === 'position'
                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
              aria-label={t('metrics.position')}
              title={t('metrics.position')}
            >
              {t('metrics.position')}
            </button>
            <button
              onClick={() => setBottomMetric('percentage')}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors ${bottomMetric === 'percentage'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                : 'text-zinc-500 hover:text-zinc-300'
                }`}
              aria-label={t('metrics.percentage')}
              title={t('metrics.percentage')}
            >
              {t('metrics.percentage')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
