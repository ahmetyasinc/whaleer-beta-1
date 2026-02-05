'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FaUser, FaChartLine, FaClock, FaShoppingCart, FaKey, FaCoins, FaRobot, FaEye, FaCommentDots, FaUserShield, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import Gauge from '@/components/profile_component/(bot)/gauge';
import CommentModal from './commentModal';
import BotExamineModal from './botExamineModal';
import { useSiwsStore } from "@/store/auth/siwsStore";
import useSiwsAuth from "@/hooks/useSiwsAuth";

const BotCard = ({ bot, isPreview = false }) => {
    const { t } = useTranslation('botsList');
    const [isCommentModalOpen, setCommentModalOpen] = useState(false);
    const [isExamineModalOpen, setExamineModalOpen] = useState(false);

    // Phantom wallet state
    const { walletLinked } = useSiwsStore();
    const { isPhantomInstalled, readyState } = useSiwsAuth();

    const phantomInstalled = isPhantomInstalled || readyState === "Installed";
    const walletConnected = walletLinked;

    const fmtMoney = (val) => val?.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    const fmtDate = (iso) => iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';



    const handleSendComment = (comment) => {
        console.log(`Comment for bot ${bot.id} (${bot.name}):`, comment);
        // Here you would call an API/Store action
        // For now just logging
    };

    return (
        <>
            <div className="relative rounded-xl overflow-hidden transition-all duration-300 bg-zinc-950 border border-zinc-800/60 hover:border-cyan-500/20 shadow-lg hover:shadow-[0_0_10px_-3px_rgba(6,182,212,0.15)] flex flex-col h-full">
                {/* Neon Glow Border Effect */}
                <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-cyan-500/30 via-zinc-800/0 to-purple-500/30 -z-10 opacity-30 transition-opacity" />

                {/* Header: Name & Publisher */}
                <div className="py-2 px-3 border-b border-zinc-800/50 bg-zinc-900/30 shrink-0">
                    <div className="flex items-center justify-between gap-4">
                        {/* Sol Taraf: İsim ve Publisher yan yana */}
                        <div className="flex items-center ml-3 gap-3 min-w-0">
                            <h3 className="text-base font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 to-blue-200 truncate drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                                {bot.name}
                            </h3>

                            {/* Ayırıcı Çizgi (Opsiyonel, görseli netleştirir) */}
                            <span className="w-[1px] h-3 bg-zinc-700 shrink-0" />

                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 shrink-0">
                                <FaUser className="w-2.5 h-2.5" />
                                <span className="truncate max-w-[100px]">{bot.publisher}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {!isPreview && (
                                <button
                                    onClick={() => setExamineModalOpen(true)}
                                    className="group flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-300 bg-cyan-950/10 border border-cyan-500/40 text-zinc-400 hover:text-cyan-400 hover:border-cyan-500/60 hover:bg-cyan-900/20"
                                >
                                    <FaEye className="text-xs text-cyan-500/50 group-hover:text-cyan-500 transition-colors duration-300" />
                                    <span className="text-cyan-500">{t('menu.examine')}</span>
                                </button>
                            )}

                            <button
                                onClick={() => setCommentModalOpen(true)}
                                className="group flex items-center justify-center gap-2 py-1.5 px-3 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-300 bg-purple-950/10 border border-purple-500/40 text-zinc-400 hover:text-purple-400 hover:border-purple-500/60 hover:bg-purple-900/20"
                            >
                                <FaCommentDots className="text-xs text-purple-500/50 group-hover:text-purple-500 transition-colors duration-300" />
                                <span className="text-purple-500">{t('actions.comment')}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body: 3 Columns Grid with Dividers */}
                <div className="flex flex-col md:flex-row flex-1 min-h-0 bg-zinc-950/20">

                    {/* LEFT COLUMN: All Stats (Larger: 60%) */}
                    <div className="flex-[0.6] flex flex-col gap-4 p-4 min-w-0 border-r border-zinc-800/50">

                        {/* Profit Margin (Full Width) */}
                        <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <FaChartLine className="text-zinc-600 text-xs" />
                                <span className="font-bold text-zinc-300 uppercase tracking-wider text-[10px]">{t('sort.labels.profitMargin')}</span>
                            </div>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div>
                                    <span className="block text-[9px] text-zinc-500 mb-0.5">{t('filter.periods.day')}</span>
                                    <span className={`font-mono font-bold text-base md:text-lg ${bot.profitMargin.day >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {bot.profitMargin.day}%
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-zinc-500 mb-0.5">{t('filter.periods.week')}</span>
                                    <span className={`font-mono font-bold text-base md:text-lg ${bot.profitMargin.week >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {bot.profitMargin.week}%
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-zinc-500 mb-0.5">{t('filter.periods.month')}</span>
                                    <span className={`font-mono font-bold text-base md:text-lg ${bot.profitMargin.month >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {bot.profitMargin.month}%
                                    </span>
                                </div>
                                <div>
                                    <span className="block text-[9px] text-zinc-500 mb-0.5">{t('filter.periods.all')}</span>
                                    <span className={`font-mono font-bold text-base md:text-lg ${bot.profitMargin.all >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {bot.profitMargin.all}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* 4-Col Grid for Type, Time, Sales, Rents */}
                        <div className="grid grid-cols-4 gap-2">
                            {/* Type Box */}
                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg px-4 py-3 flex flex-col xl:flex-row items-center justify-between min-h-[60px] gap-2">
                                <div className="flex items-center gap-2">
                                    <FaRobot className="text-zinc-600 text-sm shrink-0" />
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold truncate">{t('filter.botType.label')}:</span>
                                </div>
                                <span className="font-mono text-zinc-200 uppercase text-xs font-bold truncate">{bot.type}</span>
                            </div>

                            {/* Usage Time */}
                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg px-4 py-3 flex flex-col xl:flex-row items-center justify-between min-h-[60px] gap-2">
                                <div className="flex items-center gap-2">
                                    <FaClock className="text-zinc-600 text-sm shrink-0" />
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold truncate">{t('sort.labels.usageTime')}:</span>
                                </div>
                                <span className="font-mono text-zinc-200 text-xs font-bold truncate">{bot.usageTime}h</span>
                            </div>

                            {/* Sale Count */}
                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg px-4 py-3 flex flex-col xl:flex-row items-center justify-between min-h-[60px] gap-2">
                                <div className="flex items-center gap-2">
                                    <FaShoppingCart className="text-zinc-600 text-sm shrink-0" />
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold truncate">{t('sort.labels.saleCount')}:</span>
                                </div>
                                <span className="font-mono text-zinc-200 text-xs font-bold truncate">{bot.saleCount}</span>
                            </div>

                            {/* Rental Count */}
                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-lg px-4 py-3 flex flex-col xl:flex-row items-center justify-between min-h-[60px] gap-2">
                                <div className="flex items-center gap-2">
                                    <FaKey className="text-zinc-600 text-sm shrink-0" />
                                    <span className="text-[10px] text-zinc-500 uppercase font-bold truncate">{t('sort.labels.rentalCount')}:</span>
                                </div>
                                <span className="font-mono text-zinc-200 text-xs font-bold truncate">{bot.rentalCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* MIDDLE COLUMN: Gauge (20%) */}
                    <div className="flex-[0.2] flex items-center justify-center p-2 border-r border-zinc-800/50">
                        <div className="scale-90 origin-center">
                            <Gauge value={bot.powerScore} label={t('sort.labels.powerScore')} />
                        </div>
                    </div>

                    {/* RIGHT COLUMN: Buttons (20%) */}
                    <div className="flex-[0.2] flex flex-col justify-end items-end gap-2 p-2 min-w-[120px]">


                        <div className="flex flex-row gap-2 w-full mt-auto">
                            {bot.isMine ? (
                                <div className="w-full py-2 px-2 rounded-md bg-indigo-600/10 border border-indigo-600/20 text-indigo-300/60 text-[11px] text-center flex flex-col items-center justify-center min-h-[50px] gap-1">
                                    <FaUserShield className="text-lg opacity-80" />
                                    <span>{t('actions.ownBotReason', 'Kendi botunuzu satın alamaz veya kiralayamazsınız.')}</span>
                                </div>
                            ) : bot.alreadyPurchased ? (
                                <div className="w-full py-2 px-2 rounded-md bg-green-600/10 border border-green-600/20 text-green-300/60 text-[11px] text-center flex flex-col items-center justify-center min-h-[50px] gap-1">
                                    <FaCheckCircle className="text-lg opacity-80" />
                                    <span>{t('actions.alreadyPurchasedReason', 'Bu botu zaten satın aldınız.')}</span>
                                </div>
                            ) : bot.alreadyRented ? (
                                <div className="w-full py-2 px-2 rounded-md bg-amber-600/10 border border-amber-600/20 text-amber-300/60 text-[11px] text-center flex flex-col items-center justify-center min-h-[50px] gap-1">
                                    <FaCheckCircle className="text-lg opacity-80" />
                                    <span>{t('actions.alreadyRentedReason', 'Bu botu zaten kiraladınız.')}</span>
                                </div>
                            ) : (
                                <div className="relative w-full flex flex-row gap-2">

                                    {/* Phantom cüzdan yönetimi yaparak butonlara bloke koyar yorum satırını kaldır yeter*/}

                                    {/*
                                    {(!phantomInstalled || !walletConnected) && (
                                        <div className="absolute inset-0 z-10 bg-red-900/40 backdrop-blur-[2px] rounded-md flex items-center justify-center p-2 border border-red-500/40">
                                            <div className="flex flex-col items-center gap-1 text-center">
                                                <FaExclamationTriangle className="text-red-400 text-sm" />
                                                <span className="text-[10px] text-red-200 font-medium leading-tight">
                                                    {!phantomInstalled
                                                        ? t('wallet.phantomRequired', 'Satın alım ve kiralama işlemleri için Phantom yüklemeniz gerekiyor')
                                                        : t('wallet.connectionRequired', 'Satın alım ve kiralama işlemleri için cüzdanınızı bağlamanız gerekiyor')
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    */}

                                    <button
                                        disabled={!bot.isForSale || !phantomInstalled || !walletConnected}
                                        className={`w-full py-2 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-0.5 min-h-[50px]
                                        ${bot.isForSale
                                                ? 'bg-lime-500/10 hover:bg-lime-500/20 text-lime-500 border border-lime-500/50 hover:border-lime-500 shadow-[0_0_10px_-3px_rgba(16,185,129,0.3)] cursor-pointer'
                                                : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        <span>{t('actions.sell')}</span>
                                        {bot.isForSale && <span className="font-mono text-[16px] opacity-80">{fmtMoney(bot.salePrice)}</span>}
                                    </button>

                                    <button
                                        disabled={!bot.isForRent || !phantomInstalled || !walletConnected}
                                        className={`w-full py-2 px-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all duration-200 flex flex-col items-center justify-center gap-0.5 min-h-[50px]
                                        ${bot.isForRent
                                                ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/50 hover:border-amber-500 shadow-[0_0_10px_-3px_rgba(6,182,212,0.3)] cursor-pointer'
                                                : 'bg-zinc-900 border border-zinc-800 text-zinc-600 cursor-not-allowed opacity-50'
                                            }`}
                                    >
                                        <span>{t('actions.rent')}</span>
                                        {bot.isForRent && <span className="font-mono text-[16px] opacity-80">{fmtMoney(bot.rentalPrice)}</span>}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer: Date */}
                <div className="p-3 border-t border-zinc-800/50 bg-zinc-900/30 text-[10px] text-zinc-500 flex justify-between items-center shrink-0">
                    <span>{t('sort.labels.createdAt')}:</span>
                    <span className="font-mono text-zinc-400">{fmtDate(bot.createdAt)}</span>
                </div>

                <CommentModal
                    isOpen={isCommentModalOpen}
                    onClose={() => setCommentModalOpen(false)}
                    onSend={handleSendComment}
                    botName={bot.name}
                />

                <BotExamineModal
                    isOpen={isExamineModalOpen}
                    onClose={() => setExamineModalOpen(false)}
                    bot={bot}
                />
            </div>
        </>
    );
};

export default BotCard;


