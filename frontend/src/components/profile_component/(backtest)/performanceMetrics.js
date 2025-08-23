'use client';

export default function PerformanceMetrics({ performance }) {
  const formatCurrency = (value) => {
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
      label: 'Return Rate',
      value: formatPercentage(performance.returnPercentage),
      color: performance.returnPercentage >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Total Profit/Loss',
      value: formatCurrency(performance.totalPnL),
      color: performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Buy-and-Hold Return',
      value: formatPercentage(performance.buyHoldReturn),
      color: performance.sharpeRatio >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: 'Total Trades',
      value: performance.totalTrades,
      color: 'text-blue-400',
    },
    {
      label: 'Winning Trades',
      value: performance.winningTrades,
      color: 'text-green-400',
    },
    {
      label: 'Losing Trades',
      value: performance.losingTrades,
      color: 'text-red-400',
    },
    {
      label: 'Initial Balance',
      value: formatCurrency(performance.initialBalance),
      color: 'text-gray-300',
    },
    {
      label: 'Final Balance',
      value: formatCurrency(performance.finalBalance),
      color: 'text-gray-300',
    },
    {
      label: 'Win Rate',
      value: formatPercentageRate(performance.winRate),
      color: performance.winRate >= 50 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Sharpe Ratio',
      value: performance.sharpeRatio.toFixed(3),
      color: performance.sharpeRatio >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: 'Sortino Ratio',
      value: performance.sortinoRatio.toFixed(3),
      color: performance.sortinoRatio >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: 'Profit Factor',
      value: performance.profitFactor != null ? performance.profitFactor.toFixed(3) : 'N/A',
      color: performance.profitFactor != null && performance.profitFactor >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: 'Max Drawdown',
      value: formatCurrency(performance.maxDrawdown),
      color: 'text-red-400',
    },
    {
      label: 'Most Profitable Trade',
      value: formatPercentage(performance.mostProfitableTrade),
      color: 'text-green-400',
    },
    {
      label: 'Most Losing Trade',
      value: formatPercentage(performance.mostLosingTrade),
      color: 'text-red-400',
    },
    {
      label: 'Trade Duration Ratio',
      value: performance.durationOftradeRatio,
      color: 'text-blue-500',
    },
    {
      label: 'Commission Cost',
      value: formatCurrency(performance.commissionCost),
      color: 'text-orange-400',
    },
    {
      label: 'Trade Volume',
      value: formatCurrency(performance.volume),
      color: 'text-blue-500',
    }
  ];

  return (
    <div className="bg-gray-900 rounded-xl p-4 shadow-md border border-gray-800">
      <h3 className="text-white text-base font-semibold mb-4 flex items-center gap-2">
        Performance Metrics
      </h3>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-lg px-3 py-2 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="text-gray-300 text-xs mb-1">{metric.label}</div>
            <div className={`text-base font-semibold ${metric.color}`}>
              {metric.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
