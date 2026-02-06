import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const SortModal = ({ isOpen, onClose, currentSort, onApply }) => {
    const { t } = useTranslation('botsList');
    const [localSort, setLocalSort] = useState(currentSort);
    const [profitPeriod, setProfitPeriod] = useState((currentSort?.key === 'profitMargin' && currentSort?.period) || 'day');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            setLocalSort(currentSort);
            if (currentSort?.key === 'profitMargin' && currentSort?.period) {
                setProfitPeriod(currentSort.period);
            }
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, currentSort]);

    const handleApply = () => {
        onApply(localSort);
        onClose();
    };

    const handleSelect = (key, direction) => {
        const extra = key === 'profitMargin' ? { period: profitPeriod } : {};
        setLocalSort({ key, direction, ...extra });
    };

    const handlePeriodChange = (e) => {
        const newPeriod = e.target.value;
        setProfitPeriod(newPeriod);
        if (localSort?.key === 'profitMargin') {
            setLocalSort(prev => ({ ...prev, period: newPeriod }));
        }
    };

    if (!isOpen || !mounted || !localSort) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-zinc-800/50">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/30">
                    <h3 className="text-lg font-semibold text-zinc-100">{t('sort.title')}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {/* Default Option */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">{t('sort.default')}</label>
                        <button
                            type="button"
                            onClick={() => handleSelect('default', 'desc')}
                            className={`w-full py-2.5 text-sm font-medium rounded-lg transition-all duration-200 border 
                                    outline-none ring-0 focus:ring-0 focus:outline-none active:outline-none 
                                    ${localSort.key === 'default'
                                    ? 'bg-zinc-800 text-cyan-400 border-zinc-700/50 shadow-sm'
                                    : 'bg-zinc-900/50 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border-zinc-800/50'
                                }`}
                        >
                            {t('sort.defaultLabel')}
                        </button>
                    </div>

                    <div className="h-px bg-zinc-800/50 my-4" />

                    {[
                        'salePrice',
                        'rentalPrice',
                        'profitMargin',
                        'powerScore',
                        'usageTime',
                        'createdAt',
                        'saleCount',
                        'rentalCount',
                    ].map((key) => {
                        const isDate = key === 'createdAt';
                        const isProfit = key === 'profitMargin';
                        const ascLabel = isDate ? t('sort.directions.oldest') : t('sort.directions.asc');
                        const descLabel = isDate ? t('sort.directions.newest') : t('sort.directions.desc');
                        const isActive = localSort.key === key;

                        return (
                            <div key={key} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-sm font-medium text-zinc-300">{t(`sort.labels.${key}`)}</label>
                                    {isProfit && (
                                        <select
                                            value={profitPeriod}
                                            onChange={handlePeriodChange}
                                            className="bg-zinc-900 border border-zinc-700 text-xs rounded px-2 py-1 text-zinc-300 focus:outline-none focus:border-cyan-500/50 cursor-pointer"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <option value="day">{t('filter.periods.day')}</option>
                                            <option value="week">{t('filter.periods.week')}</option>
                                            <option value="month">{t('filter.periods.month')}</option>
                                            <option value="all">{t('filter.periods.all')}</option>
                                        </select>
                                    )}
                                </div>
                                <div className="flex bg-zinc-900/50 p-1 rounded-lg border border-zinc-800/50">
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(key, 'asc')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 capitalize select-none outline-none focus:outline-none focus:ring-0 ring-0 ${isActive && localSort.direction === 'asc'
                                            ? 'bg-zinc-800 text-cyan-400 shadow-sm border border-zinc-700/50'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent'
                                            }`}
                                    >
                                        {ascLabel}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(key, 'desc')}
                                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors duration-200 capitalize select-none outline-none focus:outline-none focus:ring-0 ring-0 ${isActive && localSort.direction === 'desc'
                                            ? 'bg-zinc-800 text-cyan-400 shadow-sm border border-zinc-700/50'
                                            : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 border border-transparent'
                                            }`}
                                    >
                                        {descLabel}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors mr-2"
                    >
                        {t('sort.cancel')}
                    </button>
                    <button
                        onClick={handleApply}
                        className="px-4 backdrop-blur-sm border py-1 rounded-lg font-bold transition-all duration-100 relative overflow-hidden group bg-gradient-to-r from-cyan-500/30 to-purple-500/30 border-cyan-500/60 text-cyan-50 hover:border-cyan-400/80 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.6)] cursor-pointer bg-zinc-900 border-zinc-800"
                    >
                        {t('sort.apply')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default SortModal;
