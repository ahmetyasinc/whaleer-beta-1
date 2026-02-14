'use client';

import React, { useState } from 'react';
import { FiSearch, FiList } from 'react-icons/fi';
import SortModal from './sortModal';
import { useTranslation } from 'react-i18next';
import { useBotCardStore } from '@/store/botmarket/botCardStore';
import BotCard from './botCard';
import { FaSpinner, FaRobot } from 'react-icons/fa';

const BotsList = ({ sort, setSort, filters }) => {
    const [isSortModalOpen, setSortModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const { t } = useTranslation('botMarketBotsList');
    const { bots, isLoading, error } = useBotCardStore();

    const filteredBots = bots.filter(bot => {
        // Search Query
        const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            bot.publisher.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        // Only My Bots
        if (filters.onlyMyBots && !bot.isMine) return false;

        // Trade Type
        if (filters.tradeType === 'sale' && !bot.isForSale) return false;
        if (filters.tradeType === 'rental' && !bot.isForRent) return false;

        // Bot Type
        if (filters.botType !== 'all' && bot.type.toLowerCase() !== filters.botType.toLowerCase()) return false;

        // Sale Price Range
        if (filters.tradeType !== 'rental') { // Only check if not strictly rental (so all or sale)
            if (filters.salePrice.min && bot.salePrice < parseFloat(filters.salePrice.min)) return false;
            if (filters.salePrice.max && bot.salePrice > parseFloat(filters.salePrice.max)) return false;
        }

        // Rental Price Range
        if (filters.tradeType !== 'sale') { // Only check if not strictly sale (so all or rental)
            if (filters.rentalPrice.min && bot.rentalPrice < parseFloat(filters.rentalPrice.min)) return false;
            if (filters.rentalPrice.max && bot.rentalPrice > parseFloat(filters.rentalPrice.max)) return false;
        }

        // Power Score
        if (filters.minPowerScore && bot.powerScore < parseFloat(filters.minPowerScore)) return false;

        // Profit Margin
        if (filters.minProfitMargin.value) {
            const period = filters.minProfitMargin.period || 'day';
            const botMargin = bot.profitMargin[period];
            if (botMargin < parseFloat(filters.minProfitMargin.value)) return false;
        }

        // Usage Time
        if (filters.minUsageTime && bot.usageTime < parseFloat(filters.minUsageTime)) return false;

        return true;
    });

    const sortedBots = [...filteredBots].sort((a, b) => {
        if (!sort || sort.key === 'default') return 0;

        let aValue, bValue;

        if (sort.key === 'profitMargin') {
            const period = sort.period || 'day';
            aValue = a.profitMargin[period];
            bValue = b.profitMargin[period];
        } else if (sort.key === 'createdAt') {
            aValue = new Date(a.createdAt).getTime();
            bValue = new Date(b.createdAt).getTime();
        } else {
            aValue = a[sort.key];
            bValue = b[sort.key];
        }

        if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
        return 0;
    });

    const getSortLabel = () => {
        if (!sort) return '';

        const label = t(`sort.labels.${sort.key}`, { defaultValue: sort.key });
        const isDate = sort.key === 'createdAt';
        const directionKey = isDate
            ? (sort.direction === 'asc' ? 'oldest' : 'newest')
            : (sort.direction === 'asc' ? 'asc' : 'desc');
        const direction = t(`sort.directions.${directionKey}`);

        if (sort.key === 'profitMargin' && sort.period) {
            const periodLabel = t(`filter.periods.${sort.period}`);
            return `${label} (${periodLabel}) (${direction})`;
        }

        return `${label} (${direction})`;
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950/95 mx-[6px] rounded-t-2xl border border-zinc-800/60 shadow-2xl">
                <div className="relative flex items-center justify-center">
                    {/* Dışarıdaki dönen halka */}
                    <FaSpinner className="animate-spin text-5xl text-cyan-500 opacity-80" />

                    {/* Ortadaki sabit robot ikonu (Bot temasına uygun) */}
                    <FaRobot className="absolute text-xl text-cyan-400 animate-pulse" />
                </div>

                <div className="mt-6 flex flex-col items-center gap-2">
                    <span className="text-cyan-500 font-mono text-xs tracking-[0.2em] uppercase animate-pulse">
                        {t('loading')}
                    </span>
                    {/* İlerleme çubuğu efekti (Opsiyonel) */}
                    <div className="w-32 h-[1px] bg-zinc-800 overflow-hidden">
                        <div className="w-full h-full bg-cyan-500 animate-loading-bar"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 mx-[6px] mt-1 bg-zinc-950/95 border border-zinc-800/60 text-zinc-300 z-40 rounded-t-2xl rounded-b-none ring-4 ring-zinc-900/50 shadow-lg backdrop-blur-md flex flex-col min-h-0">
            <div className="flex items-center p-4 border-b border-zinc-800/50">
                {/* Search Bar */}
                <div className="relative flex-1 max-w-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FiSearch className="h-4 w-4 text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-zinc-700 rounded-l-lg leading-5 bg-zinc-900 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:bg-zinc-950 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 sm:text-xs transition-colors duration-100"
                        placeholder={t('searchPlaceholder')}
                    />
                </div>

                {/* Result Count badge */}
                <div className="hidden sm:flex items-center justify-center px-3 h-[33.5px] bg-zinc-900 border border-t-zinc-700 border-b-zinc-700 border-r-zinc-700 border-l-transparent rounded-r-lg shadow-sm">
                    <span className="text-neutral-500 text-[11px] mt-0.5 font-semibold">
                        <span className="mr-1.5">{sortedBots.length}</span>
                        {t('results')}
                    </span>
                </div>

                {/* Sort Button */}
                <div className="flex items-center gap-3 ml-4">
                    <button
                        onClick={() => setSortModalOpen(true)}
                        className="flex bg-zinc-900 hover:bg-cyan-950/30 text-cyan-500 hover:text-cyan-300 border border-zinc-700 hover:border-cyan-500/50 px-3 py-2 rounded-md text-xs font-semibold items-center justify-center gap-2 transition-all duration-100 shadow-sm hover:shadow-[0_0_10px_-2px_rgba(6,182,212,0.3)] h-[34px]"
                    >
                        <FiList className="w-4 h-4" />
                        {t('sort.button')}
                    </button>
                    {sort && sort.key !== 'default' && (
                        <span className="text-xs font-medium text-cyan-400/70 bg-cyan-950/30 px-2 py-2 rounded-md border border-cyan-900/50 hidden sm:inline-block">
                            {getSortLabel()}
                        </span>
                    )}
                </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="flex flex-col gap-4">
                    {sortedBots.length > 0 ? (
                        sortedBots.map(bot => (
                            <BotCard key={bot.id} bot={bot} />
                        ))
                    ) : (
                        <div className="col-span-full py-20 text-center text-zinc-600 text-sm flex flex-col items-center justify-center">
                            <FaRobot className="mb-2 text-3xl opacity-50" />
                            {t('empty.list')}
                        </div>
                    )}
                </div>
            </div>

            <SortModal
                isOpen={isSortModalOpen}
                onClose={() => setSortModalOpen(false)}
                currentSort={sort}
                onApply={setSort}
            />
        </div>

    );
};

export default BotsList;
