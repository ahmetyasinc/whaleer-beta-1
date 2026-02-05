'use client';

import React, { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const FilterModal = ({ isOpen, onClose, currentFilters, onApply }) => {
    const [localFilters, setLocalFilters] = useState(currentFilters);
    const { t } = useTranslation('botsList');

    useEffect(() => {
        if (isOpen) {
            setLocalFilters(currentFilters);
        }
    }, [isOpen, currentFilters]);

    const handleChange = (key, value) => {
        setLocalFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleNestedChange = (parentKey, childKey, value) => {
        setLocalFilters(prev => ({
            ...prev,
            [parentKey]: { ...prev[parentKey], [childKey]: value }
        }));
    };

    const handleApply = () => {
        onApply(localFilters);
        onClose();
    };

    if (!isOpen) return null;

    // Guard clause if localFilters is undefined (e.g. before initial sync or if prop is missing)
    if (!localFilters) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-zinc-800/50">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/30">
                    <h3 className="text-lg font-semibold text-zinc-100">{t('filter.title')}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">

                    {/* Only My Bots */}
                    <div className="flex items-center gap-2">
                        <label className={`flex items-center gap-3 cursor-pointer group p-3 rounded-lg border w-full transition-all duration-200 ${localFilters.onlyMyBots ? 'bg-cyan-950/20 border-cyan-500/50' : 'bg-zinc-900/30 border-zinc-800 hover:border-zinc-700'}`}>
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 ${localFilters.onlyMyBots ? 'bg-cyan-500 border-cyan-500' : 'bg-zinc-950 border-zinc-700 group-hover:border-zinc-500'}`}>
                                {localFilters.onlyMyBots && <svg className="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                            </div>
                            <input
                                type="checkbox"
                                className="hidden"
                                checked={localFilters.onlyMyBots}
                                onChange={(e) => handleChange('onlyMyBots', e.target.checked)}
                            />
                            <span className={`text-sm font-medium transition-colors ${localFilters.onlyMyBots ? 'text-cyan-100' : 'text-zinc-400 group-hover:text-zinc-300'}`}>{t('filter.onlyMyBots')}</span>
                        </label>
                    </div>

                    {/* Bot Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">{t('filter.botType.label')}</label>
                        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
                            {['all', 'spot', 'futures'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleChange('botType', type)}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 capitalize select-none outline-none focus:outline-none focus-visible:ring-0 border ${localFilters.botType === type
                                        ? 'bg-zinc-800 text-cyan-400 shadow-sm border-zinc-700/50'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border-transparent'
                                        }`}
                                >
                                    {t(`filter.botType.${type}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Trade Type */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">{t('filter.tradeType.label')}</label>
                        <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
                            {['all', 'sale', 'rental'].map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => handleChange('tradeType', type)}
                                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 capitalize select-none outline-none focus:outline-none focus-visible:ring-0 border ${localFilters.tradeType === type
                                        ? 'bg-zinc-800 text-cyan-400 shadow-sm border-zinc-700/50'
                                        : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border-transparent'
                                        }`}
                                >
                                    {t(`filter.tradeType.${type}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sale Price Range */}
                    {localFilters.tradeType !== 'rental' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">{t('filter.ranges.salePrice')}</label>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    placeholder={t('filter.placeholders.min')}
                                    value={localFilters.salePrice.min}
                                    onChange={(e) => handleNestedChange('salePrice', 'min', e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                                />
                                <input
                                    type="number"
                                    placeholder={t('filter.placeholders.max')}
                                    value={localFilters.salePrice.max}
                                    onChange={(e) => handleNestedChange('salePrice', 'max', e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Rental Price Range */}
                    {localFilters.tradeType !== 'sale' && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">{t('filter.ranges.rentalPrice')}</label>
                            <div className="flex gap-3">
                                <input
                                    type="number"
                                    placeholder={t('filter.placeholders.min')}
                                    value={localFilters.rentalPrice.min}
                                    onChange={(e) => handleNestedChange('rentalPrice', 'min', e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                                />
                                <input
                                    type="number"
                                    placeholder={t('filter.placeholders.max')}
                                    value={localFilters.rentalPrice.max}
                                    onChange={(e) => handleNestedChange('rentalPrice', 'max', e.target.value)}
                                    className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                                />
                            </div>
                        </div>
                    )}

                    {/* Minimum Power Score */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">{t('filter.ranges.powerScore')}</label>
                        <input
                            type="number"
                            placeholder={t('filter.placeholders.example85')}
                            value={localFilters.minPowerScore}
                            onChange={(e) => handleChange('minPowerScore', e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                        />
                    </div>

                    {/* Minimum Profit Margin */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">{t('filter.ranges.profitMargin')}</label>
                        <div className="flex gap-3">
                            <input
                                type="number"
                                placeholder={t('filter.placeholders.minPerc')}
                                value={localFilters.minProfitMargin.value}
                                onChange={(e) => handleNestedChange('minProfitMargin', 'value', e.target.value)}
                                className="w-2/3 px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                            />
                            <select
                                value={localFilters.minProfitMargin.period}
                                onChange={(e) => handleNestedChange('minProfitMargin', 'period', e.target.value)}
                                className="w-1/3 px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                            >
                                <option value="day">{t('filter.periods.day')}</option>
                                <option value="week">{t('filter.periods.week')}</option>
                                <option value="month">{t('filter.periods.month')}</option>
                                <option value="all">{t('filter.periods.all')}</option>
                            </select>
                        </div>
                    </div>

                    {/* Minimum Usage Time */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">{t('filter.ranges.usageTime')}</label>
                        <input
                            type="number"
                            placeholder={t('filter.placeholders.example24')}
                            value={localFilters.minUsageTime}
                            onChange={(e) => handleChange('minUsageTime', e.target.value)}
                            className="w-full px-3 py-2 bg-zinc-900/50 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
                        />
                    </div>

                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors mr-2"
                    >
                        {t('filter.cancel')}
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-4 backdrop-blur-sm border py-1 rounded-lg font-bold transition-all duration-100 relative overflow-hidden group bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border-cyan-500/60 text-cyan-50 hover:border-cyan-400/80 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.6)] cursor-pointer bg-zinc-900 border-zinc-800">
                        {t('filter.apply')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FilterModal;
