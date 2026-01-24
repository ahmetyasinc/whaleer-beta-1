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

  const formatCurrencyAbs = (value) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 1,
    }).format(Math.abs(value));

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
      case 'FLIP_LONG_OPEN':
        return t('types.flipLongOpen');
      case 'FLIP_SHORT_OPEN':
        return t('types.flipShortOpen');
      case 'FLIP_LONG_CLOSE':
        return t('types.flipLongClose');
      case 'FLIP_SHORT_CLOSE':
        return t('types.flipShortClose');
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
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800/50 rounded-xl p-5 shadow-lg overflow-hidden">
      <div className="flex justify-between items-center mb-5 border-b border-zinc-800/50 pb-3">
        <h3 className="text-zinc-100 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
          <span className="w-1 h-4 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]"></span>
          {t('titles.tradeHistory')}
        </h3>
        <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800">
          <span className="w-2 h-2 bg-zinc-500 rounded-full animate-pulse"></span>
          <span className="text-zinc-400 text-xs font-mono">
            {t('headers.totalTrades', { count: trades.length })}
          </span>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent rounded-lg border border-zinc-800/50">        <table className="w-full text-xs">
        <thead className="bg-zinc-900/80">
          <tr>
            <th className="text-left text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.date')}</th>
            <th className="text-left text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.type')}</th>
            <th className="text-left text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.leverage')}</th>
            <th className="text-center text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.usedPct')}</th>
            <th className="text-right text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.amount')}</th>
            <th className="text-right text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.value')}</th>
            <th className="text-right text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.commission')}</th>
            <th className="text-right text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.plDollar')}</th>
            <th className="text-right text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.plPercent')}</th>
            <th className="text-right text-zinc-500 font-semibold uppercase tracking-wider py-3 px-4 border-b border-zinc-800">{t('table.priceClose')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/50">
          {trades.map((trade) => {
            const isClose = trade.type.endsWith('CLOSE');
            const investedAmount = trade?.value || trade.amount * trade.price;
            const commission = trade.commission || 0;
            const pnlPercentage = trade.pnlPercentage || null;
            const pnlAmount = trade.pnlAmount || null;

            return (
              <tr key={trade.id} className="hover:bg-zinc-800/30 transition-colors duration-100 group">
                <td className="py-3 px-4 text-zinc-400 font-mono whitespace-nowrap">{formatDate(trade.date)}</td>

                <td className="py-3 px-4">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border shadow-sm whitespace-nowrap ${trade.type.includes('OPEN') || trade.type.includes('SCALE_IN')
                      ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50 shadow-emerald-900/10'
                      : 'bg-rose-950/30 text-rose-400 border-rose-900/50 shadow-rose-900/10'
                      }`}
                  >
                    {formatTypeLabel(trade.type)}
                  </span>
                </td>

                <td className="py-3 px-4 text-left text-zinc-300 font-mono font-medium">
                  {trade.leverage}
                </td>

                <td className="py-3 px-4 text-center text-zinc-300 font-mono">
                  {trade.usedPercentage}
                </td>

                <td className="py-3 px-4 text-right text-zinc-300 font-mono">
                  {formatAmount(trade.amount)}
                </td>

                <td className="py-3 px-4 text-right text-zinc-300 font-mono">
                  {formatCurrency(investedAmount)}
                </td>

                <td className="py-3 px-4 text-right text-orange-400/90 font-mono">
                  {formatCurrency(commission)}
                </td>

                <td className="py-3 px-4 text-right font-medium font-mono">
                  {isClose ? (
                    <span
                      className={pnlPercentage >= 0 ? 'text-emerald-400' : 'text-rose-400'}
                    >
                      {pnlPercentage >= 0 ? '+' : '-'}
                      {formatCurrencyAbs(pnlAmount)}
                    </span>
                  ) : (
                    <span className="text-zinc-600">–</span>
                  )}
                </td>

                <td className="py-3 px-4 text-right font-bold font-mono">
                  {isClose ? (
                    <span
                      className={pnlPercentage >= 0 ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.3)]' : 'text-rose-400 drop-shadow-[0_0_5px_rgba(244,63,94,0.3)]'}
                    >
                      {pnlPercentage >= 0 ? '+' : ''}
                      {formatPercentage(pnlPercentage)}
                    </span>
                  ) : (
                    <span className="text-zinc-600">–</span>
                  )}
                </td>

                <td className="py-3 px-4 text-right text-zinc-400 font-mono">
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
