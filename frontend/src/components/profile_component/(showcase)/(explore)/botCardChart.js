'use client';

import React, { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

const BotChart = ({ data = [] }) => {
  const chartContainerRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!chartContainerRef.current || data.length === 0) return;

    const container = chartContainerRef.current;

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 240,
      layout: {
        background: { color: '#1f2937' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      timeScale: {
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#6b7280',
        textColor: '#6b7280',
      },
    });

    // ✅ Sadece mevcut verileri kullan, eksik dakikaları DOLDURMA
    const normalizedData = data.map(item => ({
      time: Math.floor(new Date(item.timestamp).getTime() / 1000), // UNIX timestamp (seconds)
      value: item.value
    }));

    const baselinePrice = normalizedData[0]?.value || 0;

    const series = chart.addBaselineSeries({
      baseValue: { type: 'price', price: baselinePrice },
      topLineColor: '#10b981',
      topFillColor1: 'rgba(16, 185, 129, 0.28)',
      topFillColor2: 'rgba(16, 185, 129, 0.05)',
      bottomLineColor: '#ef4444',
      bottomFillColor1: 'rgba(239, 68, 68, 0.28)',
      bottomFillColor2: 'rgba(239, 68, 68, 0.05)',
      lineWidth: 2,
    });

    series.setData(normalizedData);

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [data]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-md overflow-hidden bg-gray-900"
    />
  );
};

export default BotChart;
