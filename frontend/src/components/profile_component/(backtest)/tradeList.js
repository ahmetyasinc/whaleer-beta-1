'use client';

import useBacktestStore from '@/store/backtest/backtestStore';

export default function TradesList({ trades }) {
  const { selectedCrypto } = useBacktestStore();

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB');
  };

  const formatPercentage = (value) => {
    const num = Number(value);
    if (isNaN(num)) return '–';
    return `${num.toFixed(2)}%`;
  };

  const formatTypeLabel = (type) => {
    switch (type) {
      case 'LONG_OPEN':
        return 'OPEN LONG';
      case 'LONG_CLOSE':
        return 'CLOSE LONG';
      case 'SHORT_OPEN':
        return 'OPEN SHORT';
      case 'SHORT_CLOSE':
        return 'CLOSE SHORT';
      default:
        return type;
    }
  };

  const formatAmount = (amount) => {
    return amount.toFixed(3);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border-1 border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-semibold flex items-center gap-2">
          Trade History
        </h3>
        <div className="text-gray-400 text-sm">
          Total {trades.length} trades
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-400 font-medium py-2">Date</th>
              <th className="text-left text-gray-400 font-medium py-2">Type</th>
              <th className="text-left text-gray-400 font-medium py-2">Leverage</th>
              <th className="text-left text-gray-400 font-medium py-2">Used %</th>
              <th className="text-right text-gray-400 font-medium py-2">Amount</th>
              <th className="text-right text-gray-400 font-medium py-2">Value</th>
              <th className="text-right text-gray-400 font-medium py-2">Commission</th>
              <th className="text-right text-gray-400 font-medium py-2">P/L (%)</th>
              <th className="text-right text-gray-400 font-medium py-2">Price (Close)</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const isClose = trade.type.endsWith('CLOSE');
              const investedAmount = trade.amount * trade.price;
              const commission = trade.commission || 0;
              const pnlPercentage = trade.pnlPercentage || null;

              return (
                <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-800">
                  <td className="py-3 text-gray-300">{formatDate(trade.date)}</td>

                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded-xl text-xs font-medium ${
                        trade.type.includes('LONG')
                          ? 'bg-green-900 text-green-300'
                          : 'bg-red-900 text-red-300'
                      }`}
                    >
                      {formatTypeLabel(trade.type)}
                    </span>
                  </td>

                  <td className="py-3 text-left text-gray-300 font-mono">
                    {trade.leverage}
                  </td>

                  <td className="py-3 text-left text-gray-300 font-mono">
                    {trade.usedPercentage}%
                  </td>

                  <td className="py-3 text-right text-gray-300 font-mono">
                    {formatAmount(trade.amount)}
                  </td>

                  <td className="py-3 text-right text-gray-300">
                    {formatCurrency(investedAmount)}
                  </td>

                  <td className="py-3 text-right text-orange-400">
                    {formatCurrency(commission)}
                  </td>

                  <td className="py-3 text-right font-medium">
                    {isClose ? (
                      <span
                        className={
                          pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'
                        }
                      >
                        {pnlPercentage >= 0 ? '+' : ''}
                        {formatPercentage(pnlPercentage)}
                      </span>
                    ) : (
                      <span className="text-gray-500">–</span>
                    )}
                  </td>

                  <td className="py-3 text-right text-gray-300">
                    {formatCurrency(trade.price)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
