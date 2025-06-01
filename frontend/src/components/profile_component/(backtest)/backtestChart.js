'use client';

import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function BacktestChart() {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);


  const chartData = [
    { time: '2023-10-01', value: 100 },
       // Örnek backtest chart verisi (Zaman serisi)
  ];

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 300,
      layout: {
          textColor: "white",
          background: { type: "solid", color: "rgb(0, 4, 10)" }, //#111 önceki hali 
      },
      grid: {
          vertLines: { color: "#111", style: 1 },
          horzLines: { color: "#111", style: 1 },
      },
      timeScale: {
        borderColor: '#334155'
      },
      priceScale: {
        borderColor: '#334155'
      },
    });

    chartRef.current = chart;

    const lineSeries = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 2
    });

    lineSeries.setData(chartData);

    // Resize işlemi
    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    });

    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  return (
<>
     <div ref={chartContainerRef} className="w-full h-full" />
</>
  );
}
