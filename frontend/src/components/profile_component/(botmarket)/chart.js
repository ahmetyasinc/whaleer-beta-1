'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { useTranslation } from 'react-i18next';
import useBotExamineModalStore from '@/store/botmarket/BotExamineModalStore';

const Chart = ({ botId }) => {
    const { t } = useTranslation('botMarketChart');
    const { extraData } = useBotExamineModalStore();
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const [selectedPeriod, setSelectedPeriod] = useState('all');

    const chartDataByPeriod = extraData?.chartDataByPeriod || {};
    const chartData = chartDataByPeriod[selectedPeriod] || [];

    const periods = [
        { key: 'weekly', label: t('periods.weekly') },
        { key: 'monthly', label: t('periods.monthly') },
        { key: 'sixMonths', label: t('periods.sixMonths') },
        { key: 'all', label: t('periods.all') },
    ];

    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Chart oluştur
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: 'solid', color: 'transparent' },
                textColor: '#71717a',
            },
            grid: {
                vertLines: { color: 'rgba(113, 113, 122, 0.1)' },
                horzLines: { color: 'rgba(113, 113, 122, 0.1)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight - 50,
            rightPriceScale: {
                borderColor: 'rgba(113, 113, 122, 0.3)',
            },
            timeScale: {
                borderColor: 'rgba(113, 113, 122, 0.3)',
                timeVisible: true,
            },
            crosshair: {
                horzLine: {
                    color: 'rgba(52, 211, 153, 0.5)',
                    labelBackgroundColor: '#047857',
                },
                vertLine: {
                    color: 'rgba(52, 211, 153, 0.5)',
                    labelBackgroundColor: '#047857',
                },
            },
        });

        chartRef.current = chart;

        // Area series
        const areaSeries = chart.addAreaSeries({
            topColor: 'rgba(52, 211, 153, 0.4)',
            bottomColor: 'rgba(52, 211, 153, 0.0)',
            lineColor: '#34d399',
            lineWidth: 2,
            priceFormat: {
                type: 'price',
                precision: 0,
                minMove: 1,
            },
        });

        seriesRef.current = areaSeries;

        // Resize observer
        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight - 50
                });
            }
        };

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, []);

    // Update data when period changes
    useEffect(() => {
        if (seriesRef.current && chartData.length > 0) {
            seriesRef.current.setData(chartData);
            chartRef.current?.timeScale().fitContent();
        }
    }, [chartData, selectedPeriod]);

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                    {t('title')}
                </h4>
                <div className="flex gap-1">
                    {periods.map((period) => (
                        <button
                            key={period.key}
                            onClick={() => setSelectedPeriod(period.key)}
                            className={`text-[10px] font-medium px-2 py-1 rounded transition-all ${selectedPeriod === period.key
                                ? 'bg-emerald-900/30 border border-emerald-700/30 text-emerald-400'
                                : 'bg-zinc-800/50 border border-zinc-700/30 text-zinc-400 hover:text-emerald-400'
                                }`}
                        >
                            {period.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chart Area */}
            <div ref={chartContainerRef} className="flex-1 w-full min-h-[300px]" />
        </div>
    );
};

export default Chart;
