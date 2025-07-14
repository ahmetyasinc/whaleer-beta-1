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
      },
      rightPriceScale: {
        borderColor: '#6b7280',
        textColor: '#6b7280',
      },
    });

    const baselinePrice = data[0].value;

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

    series.setData(data);

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