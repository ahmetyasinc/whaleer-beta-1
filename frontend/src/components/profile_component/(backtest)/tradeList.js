'use client';

import useBacktestStore from '@/store/backtest/backtestStore';
import { useTranslation } from 'react-i18next';

export default function TradesList({ trades }) {
  const { t } = useTranslation('backtestTradesList');
  const { selectedCrypto } = useBacktestStore();

  const formatCurrency = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 1,
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
        return t('types.longOpen');
      case 'LONG_CLOSE':
        return t('types.longClose');
      case 'SHORT_OPEN':
        return t('types.shortOpen');
      case 'SHORT_CLOSE':
        return t('types.shortClose');
      case 'LONG_TAKE_PROFIT_CLOSE':
        return t('types.longTakeProfitClose');
      case 'LONG_STOP_LOSS_CLOSE':
        return t('types.longStopLossClose');
      case 'SHORT_TAKE_PROFIT_CLOSE':
        return t('types.shortTakeProfitClose');
      case 'SHORT_STOP_LOSS_CLOSE':
        return t('types.shortStopLossClose');
      case 'LONG_SCALE_IN':
        return t('types.longScaleIn');
      case 'SHORT_SCALE_IN':
        return t('types.shortScaleIn');
      case 'LONG_SCALE_OUT':
        return t('types.longScaleOut');
      case 'SHORT_SCALE_OUT':
        return t('types.shortScaleOut');
      case 'FORCE_CLOSE':
        return t('types.forceClose');
      default:
        return type;
    }
  };

  const formatAmount = (amount) => {
    return amount.toFixed(5);
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-white text-lg font-semibold flex items-center gap-2">
          {t('titles.tradeHistory')}
        </h3>
        <div className="text-gray-400 text-sm">
          {t('headers.totalTrades', { count: trades.length })}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left text-gray-400 font-medium py-2">{t('table.date')}</th>
              <th className="text-left text-gray-400 font-medium py-2">{t('table.type')}</th>
              <th className="text-left text-gray-400 font-medium py-2">{t('table.leverage')}</th>
              <th className="text-center text-gray-400 font-medium py-2">{t('table.usedPct')}</th>
              <th className="text-right text-gray-400 font-medium py-2">{t('table.amount')}</th>
              <th className="text-right text-gray-400 font-medium py-2">{t('table.value')}</th>
              <th className="text-right text-gray-400 font-medium py-2">{t('table.commission')}</th>
              <th className="text-right text-gray-400 font-medium py-2">{t('table.plDollar')}</th>
              <th className="text-right text-gray-400 font-medium py-2">{t('table.plPercent')}</th>
              <th className="text-right text-gray-400 font-medium py-2">{t('table.priceClose')}</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const isClose = trade.type.endsWith('CLOSE');
              const investedAmount = trade?.value || trade.amount * trade.price;
              const commission = trade.commission || 0;
              const pnlPercentage = trade.pnlPercentage || null;
              const pnlAmount = trade.pnlAmount || null;

              return (
                <tr key={trade.id} className="border-b border-gray-700 hover:bg-gray-800">
                  <td className="py-3 text-gray-300">{formatDate(trade.date)}</td>

                  <td className="py-3">
                    <span
                      className={`px-2 py-1 rounded-xl text-xs font-medium ${
                        trade.type.includes('OPEN') || trade.type.includes('SCALE_IN')
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

                  <td className="py-3 text-center text-gray-300 font-mono">
                    {trade.usedPercentage}
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
                        className={pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'}
                      >
                        {pnlPercentage >= 0 ? '+' : ''}
                        {formatCurrency(pnlAmount)}
                      </span>
                    ) : (
                      <span className="text-gray-500">–</span>
                    )}
                  </td>

                  <td className="py-3 text-right font-medium">
                    {isClose ? (
                      <span
                        className={pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'}
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
