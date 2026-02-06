'use client';

import React, { useState } from 'react';
import { FiPlus, FiX } from 'react-icons/fi';
import FilterModal from './filterModal';
import { useTranslation } from 'react-i18next';

const FilterCard = ({ filters, setFilter, setFilters }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const { t } = useTranslation('botsList');

    const activeFilters = [];
    if (filters.onlyMyBots) activeFilters.push({ label: t('filter.onlyMyBots'), key: 'onlyMyBots', reset: false });

    if (filters.tradeType !== 'all') {
        const typeLabel = filters.tradeType === 'sale' ? t('filter.chips.trade.sale') : t('filter.chips.trade.rental');
        activeFilters.push({ label: `${t('filter.chips.trade.label')}: ${typeLabel}`, key: 'tradeType', reset: 'all' });
    }

    if (filters.botType !== 'all') {
        const typeLabel = filters.botType === 'spot' ? t('filter.chips.botType.spot') : t('filter.chips.botType.futures');
        activeFilters.push({ label: typeLabel, key: 'botType', reset: 'all' });
    }

    if (filters.salePrice.min || filters.salePrice.max) {
        let label = t('filter.chips.sale') + ': ';
        if (filters.salePrice.min && filters.salePrice.max) label += `${filters.salePrice.min}-${filters.salePrice.max}`;
        else if (filters.salePrice.min) label += `>${filters.salePrice.min}`;
        else if (filters.salePrice.max) label += `<${filters.salePrice.max}`;
        activeFilters.push({ label, key: 'salePrice', reset: { min: '', max: '' } });
    }

    if (filters.rentalPrice.min || filters.rentalPrice.max) {
        let label = t('filter.chips.rental') + ': ';
        if (filters.rentalPrice.min && filters.rentalPrice.max) label += `${filters.rentalPrice.min}-${filters.rentalPrice.max}`;
        else if (filters.rentalPrice.min) label += `>${filters.rentalPrice.min}`;
        else if (filters.rentalPrice.max) label += `<${filters.rentalPrice.max}`;
        activeFilters.push({ label, key: 'rentalPrice', reset: { min: '', max: '' } });
    }

    if (filters.minPowerScore) activeFilters.push({ label: `${t('filter.chips.power')} > ${filters.minPowerScore}`, key: 'minPowerScore', reset: '' });

    if (filters.minProfitMargin.value) {
        // period translation
        const periods = {
            day: 'day',
            week: 'week',
            month: 'month',
            all: 'all'
        };
        const periodKey = periods[filters.minProfitMargin.period] || 'day';
        const periodLabel = t(`filter.periods.${periodKey}`);

        activeFilters.push({
            label: `${t('filter.chips.profit')} > ${filters.minProfitMargin.value}% (${periodLabel})`,
            key: 'minProfitMargin',
            reset: { value: '', period: 'day' }
        });
    }

    if (filters.minUsageTime) activeFilters.push({ label: `${t('filter.chips.usage')} > ${filters.minUsageTime}h`, key: 'minUsageTime', reset: '' });

    const removeFilter = (key, resetValue) => {
        setFilter(key, resetValue);
    };

    return (
        <>
            <div className="mx-[6px] h-[60px] bg-zinc-950/95 border border-zinc-800/60 text-zinc-300 flex items-center px-6 mt-[68px] sticky top-[66px] z-40 rounded-2xl ring-4 ring-zinc-900/50 shadow-lg backdrop-blur-md overflow-x-auto no-scrollbar">
                <button
                    onClick={() => setModalOpen(true)}
                    className="flex shrink-0 bg-zinc-900 hover:bg-cyan-950/30 text-cyan-500 hover:text-cyan-300 border border-zinc-700 hover:border-cyan-500/50 px-3 py-2 rounded-md text-xs font-semibold items-center justify-center gap-2 transition-all duration-100 shadow-sm hover:shadow-[0_0_10px_-2px_rgba(6,182,212,0.3)]"
                >
                    <FiPlus className="w-4 h-4" />
                    {t('filter.addFilter')}
                </button>

                <div className="flex items-center gap-2 ml-4 overflow-x-auto scrollbar-hide">
                    {activeFilters.map((filter, index) => (
                        <div key={index} className="flex items-center gap-1 px-2 py-1.5 bg-zinc-900/50 border border-zinc-700/50 rounded-md text-xs text-zinc-300 whitespace-nowrap group hover:border-cyan-500/30 transition-colors">
                            <span>{filter.label}</span>
                            <button
                                onClick={() => removeFilter(filter.key, filter.reset)}
                                className="p-0.5 text-zinc-500 hover:text-red-400 group-hover:block transition-all rounded"
                            >
                                <FiX className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
            <FilterModal
                isOpen={isModalOpen}
                onClose={() => setModalOpen(false)}
                currentFilters={filters}
                onApply={setFilters}
            />
        </>
    );
};

export default FilterCard;
