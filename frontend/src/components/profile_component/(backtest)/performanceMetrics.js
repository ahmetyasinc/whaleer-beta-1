'use client';

export default function PerformanceMetrics({ performance }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const formatPercentageRate = (value) => {
    return `${value > 0 ? '' : ''}${value.toFixed(2)}%`;
  };

  const metrics = [
    {
      label: 'Getiri Oranı',
      value: formatPercentage(performance.returnPercentage),
      color: performance.returnPercentage >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Toplam Kar/Zarar',
      value: formatCurrency(performance.totalPnL),
      color: performance.totalPnL >= 0 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Al-Tut Getirisi',
      value: formatPercentage(performance.buyHoldReturn),
      color: performance.sharpeRatio >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: 'Toplam İşlem',
      value: performance.totalTrades,
      color: 'text-blue-400',
    },
    {
      label: 'Karlı İşlem',
      value: performance.winningTrades,
      color: 'text-green-400',
    },
    {
      label: 'Zararlı İşlem',
      value: performance.losingTrades,
      color: 'text-red-400',
    },
    {
      label: 'Başlangıç Bakiye',
      value: formatCurrency(performance.initialBalance),
      color: 'text-gray-300',
    },
    {
      label: 'Son Bakiye',
      value: formatCurrency(performance.finalBalance),
      color: 'text-gray-300',
    },
    {
      label: 'Başarı Oranı',
      value: formatPercentageRate(performance.winRate),
      color: performance.winRate >= 50 ? 'text-green-400' : 'text-red-400',
    },
    {
      label: 'Sharpe Oranı',
      value: performance.sharpeRatio.toFixed(3),
      color: performance.sharpeRatio >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: 'Sortino Oranı',
      value: performance.sortinoRatio.toFixed(3),
      color: performance.sortinoRatio >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: 'Kâr faktörü',
      value: performance.profitFactor != null ? performance.profitFactor.toFixed(3) : 'N/A',
      color: performance.profitFactor != null && performance.profitFactor >= 1 ? 'text-green-400' : 'text-yellow-400',
    },
    {
      label: 'Max Düşüş',
      value: formatCurrency(performance.maxDrawdown),
      color: 'text-red-400',
    },
    {
      label: 'En karlı İşlem',
      value: formatPercentage(performance.mostProfitableTrade),
      color: 'text-green-400',
    },
    {
      label: 'En zararlı İşlem',
      value: formatPercentage(performance.mostLosingTrade),
      color: 'text-red-400',
    },
    {
      label: 'İşlemde kalınan mumların tüm mumlara oranı',
      value: performance.durationOftradeRatio,
      color: 'text-blue-500',
    },
    {
      label: 'Komisyon maliyeti',
      value: formatCurrency(performance.commissionCost),
      color: 'text-orange-400',
    },
    {
      label: 'İşlem hacmi',
      value: formatCurrency(performance.volume),
      color: 'text-blue-500',
    }
  ];

return (
  <div className="bg-gray-900 rounded-xl p-4 shadow-md border-1 border-gray-800">
    <h3 className="text-white text-base font-semibold mb-4 flex items-center gap-2">
      Performans Metrikleri
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