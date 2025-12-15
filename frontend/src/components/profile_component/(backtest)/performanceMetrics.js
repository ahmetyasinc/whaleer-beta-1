'use client';

import { useTranslation } from 'react-i18next';

export default function PerformanceMetrics({ performance }) {
  const { t } = useTranslation('backtestPerformanceMetrics');

  const formatCurrency = (value) => {
    // Davranışı değiştirmemek için aynı locale/currency
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatPercentageRate = (value) => {
    return `${value.toFixed(2)}%`;
  };

  const metrics = [
    {
      label: t('labels.returnRate'),
      value: formatPercentage(performance.returnPercentage),
      color: performance.returnPercentage >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: t('labels.totalPnL'),
      value: formatCurrency(performance.totalPnL),
      color: performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: t('labels.buyHoldReturn'),
      value: formatPercentage(performance.buyHoldReturn),
      color: performance.sharpeRatio >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: t('labels.totalTrades'),
      value: performance.totalTrades,
      color: 'text-blue-400',
    },
    {
      label: t('labels.winningTrades'),
      value: performance.winningTrades,
      color: 'text-green-400',
    },
    {
      label: t('labels.losingTrades'),
      value: performance.losingTrades,
      color: 'text-red-400',
    },
    {
      label: t('labels.initialBalance'),
      value: formatCurrency(performance.initialBalance),
      color: 'text-gray-300',
    },
    {
      label: t('labels.finalBalance'),
      value: formatCurrency(performance.finalBalance),
      color: 'text-gray-300',
    },
    {
      label: t('labels.winRate'),
      value: formatPercentageRate(performance.winRate),
      color: performance.winRate >= 50 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: t('labels.sharpeRatio'),
      value: performance.sharpeRatio.toFixed(3),
      color: performance.sharpeRatio >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: t('labels.sortinoRatio'),
      value: performance.sortinoRatio.toFixed(3),
      color: performance.sortinoRatio >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: t('labels.profitFactor'),
      value: performance.profitFactor != null ? performance.profitFactor.toFixed(3) : t('values.na'),
      color: performance.profitFactor != null && performance.profitFactor >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: t('labels.maxDrawdown'),
      value: formatCurrency(performance.maxDrawdown),
      color: 'text-red-400',
    },
    {
      label: t('labels.mostProfitableTrade'),
      value: formatPercentage(performance.mostProfitableTrade),
      color: 'text-green-400',
    },
    {
      label: t('labels.mostLosingTrade'),
      value: formatPercentage(performance.mostLosingTrade),
      color: 'text-red-400',
    },
    {
      label: t('labels.tradeDurationRatio'),
      value: performance.durationOftradeRatio,
      color: 'text-blue-500',
    },
    {
      label: t('labels.commissionCost'),
      value: formatCurrency(performance.commissionCost),
      color: 'text-orange-400',
    },
    {
      label: t('labels.tradeVolume'),
      value: formatCurrency(performance.volume),
      color: 'text-blue-500',
    }
  ];

  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5 shadow-lg">
      <h3 className="text-zinc-100 text-sm font-bold uppercase tracking-wider mb-5 flex items-center gap-2 border-b border-zinc-800/50 pb-3">
        <span className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
        {t('titles.performanceMetrics')}
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="group bg-zinc-900/60 border border-zinc-800 hover:border-zinc-700/80 rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-100"
          >
            <div className="text-zinc-500 text-[10px] font-medium uppercase tracking-wide mb-1.5 whitespace-normal leading-tight" title={metric.label}>
              {metric.label}
            </div>
            <div className={`text-sm font-bold font-mono tracking-tight ${metric.color} drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]`}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
