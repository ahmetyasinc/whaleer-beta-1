'use client';

import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import useBotExamineModalStore from '@/store/botmarket/BotExamineModalStore';
import { FaUser } from 'react-icons/fa';

const ExtraDataCard = ({ botId }) => {
    const { t } = useTranslation('botMarketExtraDataCard');
    const { extraData, isLoading, fetchExtraData } = useBotExamineModalStore();

    useEffect(() => {
        if (botId) {
            fetchExtraData(botId);
        }
    }, [botId, fetchExtraData]);

    const fmtMoney = (val) => val?.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[200px]">
                <div className="w-8 h-8 border-2 border-zinc-700 border-t-cyan-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!extraData) {
        return null;
    }

    return (
        <div className="w-full bg-zinc-950/50 border hover:border-cyan-500/30 transition-colors border-zinc-800/60 rounded-xl p-5">
            <div className="flex flex-row gap-4 h-full">

                {/* SOL SÜTUNLAR (%40) - İstatistikler + Kripto Listesi */}
                <div className="flex-[0.4] flex flex-row gap-4 border-r border-zinc-800/50 pr-4">

                    {/* İstatistik Kutuları */}
                    <div className="flex-1 flex flex-col gap-2">
                        {/* Strateji Adı ve Satır Sayısı */}
                        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 flex flex-col hover:border-cyan-500/30 transition-colors group/box">
                            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5 group-hover/box:text-cyan-400/70 transition-colors">{t('strategyName')}</span>
                            <span className="text-xs font-semibold text-zinc-200 truncate" title={extraData.strategyName}>{extraData.strategyName}</span>
                            <span className="text-[10px] text-zinc-500 mt-1">{extraData.strategyLines} {t('lines')}</span>
                        </div>

                        {/* Çalıştıran Kullanıcı Sayısı */}
                        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 flex flex-col hover:border-cyan-500/30 transition-colors group/box">
                            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5 group-hover/box:text-cyan-400/70 transition-colors">{t('activeUsers')}</span>
                            <span className="text-xs font-semibold text-zinc-200">{extraData.activeUsers?.toLocaleString()}</span>
                        </div>

                        {/* Yönetilen Toplam Bakiye */}
                        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 flex flex-col hover:border-cyan-500/30 transition-colors group/box">
                            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5 group-hover/box:text-cyan-400/70 transition-colors">{t('totalBalance')}</span>
                            <span className="text-xs font-semibold text-emerald-400">{fmtMoney(extraData.totalManagedBalance)}</span>
                        </div>

                        {/* Periyot */}
                        <div className="bg-zinc-900/50 border border-zinc-700/50 rounded p-2 flex flex-col hover:border-cyan-500/30 transition-colors group/box">
                            <span className="text-[10px] font-bold tracking-wider text-zinc-500 uppercase mb-0.5 group-hover/box:text-cyan-400/70 transition-colors">{t('period')}</span>
                            <span className="text-xs font-semibold text-cyan-300">{extraData.period}</span>
                        </div>
                    </div>

                    {/* Kripto Listesi */}
                    <div className="flex-1 flex flex-col">
                        <div className="flex items-center justify-between mb-3 relative z-20">
                            <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-500/80">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]"></span>
                                {t('cryptos')}
                            </h4>
                            <span className="text-[10px] font-mono text-cyan-400/60 bg-cyan-950/30 px-1.5 py-1 rounded border border-cyan-800/30">
                                {extraData.cryptos?.length || 0}
                            </span>
                        </div>

                        <div className="flex flex-col gap-2 overflow-y-auto scrollbar-hide max-h-[200px] pb-2 pr-1">
                            {extraData.cryptos?.length > 0 ? (
                                extraData.cryptos.map((coin) => (
                                    <div key={coin} className="group/coin relative w-full text-center py-1 rounded-md bg-zinc-900 border border-cyan-700/50 transition-all duration-200">
                                        <span className="text-xs font-bold text-zinc-300 transition-colors relative z-10">
                                            {coin}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <div className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-lg">
                                    <span className="text-[11px] text-zinc-600">{t('noCrypto')}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* SAĞ SÜTUN (%60) - Açıklama Alanı */}
                <div className="flex-[0.6] flex flex-col pl-4">
                    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-purple-500/80 mb-3">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.8)]"></span>
                        {t('publisherDescription')}
                        <div className="h-3 w-[1px] bg-zinc-600 mx-1"></div>
                        <FaUser className="w-2.5 h-2.5 text-zinc-400" />
                        <span className="text-zinc-400 font-medium normal-case tracking-normal">{extraData.publisherUsername}</span>
                    </h4>

                    <div className="flex-1 bg-zinc-900/30 border border-zinc-800/50 rounded-lg p-4 overflow-y-auto max-h-[200px] scrollbar-hide">
                        <p className="text-sm text-zinc-400 leading-relaxed whitespace-pre-wrap">
                            {extraData.publisherDescription}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ExtraDataCard;
