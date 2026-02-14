'use client';

import React from 'react';
import useBotExamineModalStore from '@/store/botmarket/BotExamineModalStore';
import { useTranslation } from 'react-i18next';

const TradeList = ({ botId }) => {
    const { t } = useTranslation('botMarketTradeList');
    const { extraData } = useBotExamineModalStore();
    const trades = extraData?.trades || [];

    // Side'ı market tipine göre formatla
    const formatSide = (trade) => {
        if (trade.market === 'Futures') {
            return trade.side; // LONG veya SHORT
        } else {
            // Spot için: LONG -> Alış, SHORT -> Satış, BUY -> Alış, SELL -> Satış
            if (trade.side === 'LONG' || trade.side === 'BUY') return t('sides.buy');
            if (trade.side === 'SHORT' || trade.side === 'SELL') return t('sides.sell');
            return trade.side;
        }
    };

    // Ortak badge stili
    const badgeBase = "inline-flex items-center justify-center w-20 py-1 rounded-[3px] text-[10px] font-bold font-mono tracking-wide uppercase transition-all";
    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-500/80">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                    {t('header')}
                    <div className="h-3 w-[1px] bg-zinc-600 mx-1"></div>
                    <span className="text-zinc-400 font-medium normal-case tracking-normal">{t('disclaimer')}</span>
                </h4>
                <span className="text-[10px] font-mono text-amber-400/60 bg-amber-950/30 px-1.5 py-1 rounded border border-amber-800/30">
                    {t('count', { count: trades.length })}
                </span>
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-6 gap-2 text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2 px-3">
                <span>{t('table.pair')}</span>
                <span className="text-center">{t('table.market')}</span>
                <span className="text-center">{t('table.side')}</span>
                <span className="text-center">{t('table.action')}</span>
                <span className="text-right">{t('table.price')}</span>
                <span className="text-right">{t('table.date')}</span>
            </div>

            {/* Trade List */}
            <div className="flex-1 overflow-y-auto scrollbar-hide space-y-1.5">
                {trades.length > 0 ? (
                    trades.map((trade) => (
                        <div
                            key={trade.id}
                            className="grid grid-cols-6 gap-2 items-center bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-3 py-2.5 text-xs hover:border-amber-500/30 transition-colors"
                        >
                            {/* İşlem Çifti */}
                            <span className="text-[10px] font-semibold text-zinc-200">{trade.pair}</span>

                            {/* Piyasa (Spot / Futures) */}
                            <span className="flex justify-center">
                                <span className={`${badgeBase} ${trade.market === 'Futures'
                                    ? 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
                                    : 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                                    }`}>
                                    {trade.market}
                                </span>
                            </span>

                            {/* Yön (LONG/SHORT veya ALIŞ/SATIŞ) */}
                            <span className="flex justify-center">
                                <span className={`${badgeBase} ${(trade.side === 'LONG' || trade.side === 'BUY')
                                    ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-700/30'
                                    : 'bg-rose-900/40 text-rose-400 border border-rose-700/30'
                                    }`}>
                                    {formatSide(trade)}
                                </span>
                            </span>

                            {/* Aksiyon (type + action birleşik) */}
                            <span className="flex justify-center">
                                <span className={`${badgeBase} ${trade.action === 'OPEN'
                                    ? 'bg-cyan-900/30 text-cyan-400 border border-cyan-800/30'
                                    : 'bg-purple-900/30 text-purple-400 border border-purple-800/30'
                                    }`}>
                                    {trade.type} {trade.action}
                                </span>
                            </span>

                            {/* Fiyat */}
                            <span className="text-right font-mono text-[10px] text-zinc-300">${trade.price.toLocaleString()}</span>

                            {/* Tarih */}
                            <span className="text-right text-zinc-500 text-[10px]">{trade.time}</span>
                        </div>
                    ))
                ) : (
                    <div className="flex items-center justify-center h-20 text-zinc-500 text-sm">
                        {t('empty')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TradeList;
