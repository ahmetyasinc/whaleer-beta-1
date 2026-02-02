// components/BotFilterSidebar.js
'use client';

import React, { useState } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';
import useBotDataStore from '@/store/showcase/botDataStore';
import { useTranslation } from 'react-i18next';

const BotFilterSidebar = () => {
  const { t } = useTranslation('botFilterSidebar');

  const [isFilterApplied, setIsFilterApplied] = useState(false);
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    rentMax: '',
    rentMin: '',
    profitFactor: 0,
    riskFactor: 0,
    demand: 0,
    creationTime: '',
    creationUnit: 'day', // minutes'e çevirip göndereceksin
    usageTime: '', // saat seçili dakikaya çevireceksin
    transactionFrequency: '',
    profitMargin: '',
    isActive: false,
    profitMarginUnit: 'day',
    botType: '' // spot | futures | ''
  });

  const handleInputChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
  };

  const isAnyFilterActive = () => {
    return (
      filters.priceMin !== '' ||
      filters.priceMax !== '' ||
      filters.rentMax !== '' ||
      filters.rentMin !== '' ||
      filters.profitFactor > 0 ||
      filters.riskFactor > 0 ||
      filters.demand > 0 ||
      filters.creationTime !== '' ||
      filters.usageTime !== '' ||
      filters.profitMargin !== '' ||
      filters.isActive !== true
    );
  };

  const clearFilters = () => {
    setFilters({
      priceMin: '',
      priceMax: '',
      rentMax: '',
      rentMin: '',
      profitFactor: 0,
      riskFactor: 0,
      demand: 0,
      creationTime: '',
      creationUnit: 'day',
      usageTime: '',
      transactionFrequency: '',
      profitMargin: '',
      profitMarginUnit: 'day',
      isActive: false,
      botType: ''
    });
    setIsFilterApplied(false);
  };

  const applyFilters = () => {
    useBotDataStore.getState().applyFilters(filters);
    setIsFilterApplied(true);
  };

  return (
    <aside className="fixed top-[60px] left-0 w-[260px] h-[calc(100vh-60px)] bg-zinc-950/95 border-r border-zinc-800/60 text-zinc-300 shadow-2xl z-40 flex flex-col backdrop-blur-md">
      {/* Header Area */}
      <div className="p-5 border-b border-zinc-900/50">
        <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-400 mb-1 flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse shadow-[0_0_8px_cyan]"></span>
          {t('title')}
        </h2>
      </div>

      <div className="overflow-y-auto flex-1 space-y-3 px-4 py-4 custom-scrollbar">
        {/* Bot Type */}
        <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/40 hover:border-zinc-700/50 transition-colors">
          <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wide">
            {t('fields.botType')}
          </label>
          <select
            value={filters.botType}
            onChange={(e) => handleInputChange('botType', e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950/50 text-zinc-300 rounded-lg border border-zinc-800 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none appearance-none transition-all"
          >
            <option value="">{t('options.all')}</option>
            <option value="spot">{t('options.spot')}</option>
            <option value="futures">{t('options.futures')}</option>
          </select>
        </div>

        {/* Price Range - Sale */}
        <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/40 hover:border-zinc-700/50 transition-colors">
          <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wide">
            {t('fields.priceRangeSale')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('placeholders.min')}
              value={filters.priceMin}
              onChange={(e) => handleInputChange('priceMin', e.target.value)}
              className="w-1/2 px-3 py-2 bg-zinc-950/50 text-zinc-300 rounded-lg border border-zinc-800 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
            />
            <input
              type="number"
              placeholder={t('placeholders.max')}
              value={filters.priceMax}
              onChange={(e) => handleInputChange('priceMax', e.target.value)}
              className="w-1/2 px-3 py-2 bg-zinc-950/50 text-zinc-300 rounded-lg border border-zinc-800 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
        </div>

        {/* Price Range - Rent */}
        <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/40 hover:border-zinc-700/50 transition-colors">
          <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wide">
            {t('fields.priceRangeRent')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('placeholders.min')}
              value={filters.rentMin}
              onChange={(e) => handleInputChange('rentMin', e.target.value)}
              className="w-1/2 px-3 py-2 bg-zinc-950/50 text-zinc-300 rounded-lg border border-zinc-800 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
            />
            <input
              type="number"
              placeholder={t('placeholders.max')}
              value={filters.rentMax}
              onChange={(e) => handleInputChange('rentMax', e.target.value)}
              className="w-1/2 px-3 py-2 bg-zinc-950/50 text-zinc-300 rounded-lg border border-zinc-800 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
            />
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/40 hover:border-zinc-700/50 transition-colors">
          <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wide">
            {t('fields.profitMargin')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="%"
              value={filters.profitMargin}
              onChange={(e) => handleInputChange('profitMargin', e.target.value)}
              className="w-1/2 px-3 py-2 bg-zinc-950/50 text-zinc-300 rounded-lg border border-zinc-800 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
            />
            <select
              value={filters.profitMarginUnit}
              onChange={(e) => handleInputChange('profitMarginUnit', e.target.value)}
              className="w-1/2 px-3 py-2 bg-zinc-950/50 text-zinc-300 rounded-lg border border-zinc-800 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none appearance-none transition-all"
            >
              <option value="day">{t('units.day')}</option>
              <option value="week">{t('units.week')}</option>
              <option value="month">{t('units.month')}</option>
              <option value="all">{t('units.all')}</option>
            </select>
          </div>
        </div>

        {/* Usage Time */}
        <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/40 hover:border-zinc-700/50 transition-colors">
          <label className="block text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wide">
            {t('fields.usageTime')}
          </label>
          <input
            type="number"
            placeholder={t('placeholders.exampleHours')}
            value={filters.usageTime}
            onChange={(e) => handleInputChange('usageTime', e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950/50 text-zinc-300 rounded-lg border border-zinc-800 text-xs focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 focus:outline-none transition-all placeholder:text-zinc-700"
          />
        </div>

        {/* Demand */}
        <div className="bg-zinc-900/30 p-3 rounded-xl border border-zinc-800/40 hover:border-zinc-700/50 transition-colors">
          <label className="text-xs font-bold text-zinc-500 mb-2 uppercase tracking-wide flex justify-between">
            {t('fields.demand', { value: '' })}
            <span className="text-cyan-400">{filters.demand}</span>
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={filters.demand}
            onChange={(e) => handleInputChange('demand', parseFloat(e.target.value))}
            className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer slider border border-zinc-800"
          />
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1 font-mono">
            <span>0</span>
            <span>5</span>
          </div>
        </div>

        {/* Apply Filter Button */}
        <div className="pt-2">
          <button
            onClick={applyFilters}
            disabled={!isAnyFilterActive()}
            className={`w-full backdrop-blur-sm border py-3 px-6 rounded-xl font-bold transition-all duration-300 relative overflow-hidden group ${isAnyFilterActive()
              ? 'bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border-cyan-500/30 text-cyan-50 hover:border-cyan-400/50 hover:shadow-[0_0_20px_-5px_rgba(6,182,212,0.3)] cursor-pointer'
              : 'bg-zinc-900 text-zinc-600 border-zinc-800 cursor-not-allowed'
              }`}
          >
            <div className="relative flex items-center justify-center gap-2">
              <FiFilter className={`w-4 h-4 ${isAnyFilterActive() ? 'group-hover:animate-pulse' : ''}`} />
              {t('actions.apply')}
            </div>
          </button>
        </div>

        {/* Clear Filter Button */}
        {isFilterApplied && (
          <div className="pt-1">
            <button
              onClick={clearFilters}
              className="w-full bg-rose-500/5 hover:bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 py-2 rounded-xl text-xs font-semibold transition-all duration-300 flex items-center justify-center gap-2"
            >
              <FiX className="w-3 h-3" />
              {t('actions.clear')}
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
          border: 2px solid #09090b;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
          transition: all 0.2s;
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 0 15px rgba(6, 182, 212, 0.7);
        }
        .slider::-moz-range-thumb {
          height: 16px;
          width: 16px;
          border-radius: 50%;
          background: #06b6d4;
          cursor: pointer;
          border: 2px solid #09090b;
          box-shadow: 0 0 10px rgba(6, 182, 212, 0.5);
          transition: all 0.2s;
        }
      `}</style>
    </aside>
  );
};

export default BotFilterSidebar;
