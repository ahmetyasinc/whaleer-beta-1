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
    <aside className="fixed top-[60px] left-0 w-[320px] h-[calc(100vh-60px)] bg-black border-t border-gray-600 text-white shadow-2xl z-40 flex flex-col">
      <div className="p-3">
        <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          {t('title')}
        </h2>
      </div>

      <div className="overflow-y-auto flex-1 space-y-3 px-3 pb-4">
        {/* Bot Type */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.botType')}
          </label>
          <select
            value={filters.botType}
            onChange={(e) => handleInputChange('botType', e.target.value)}
            className="w-full px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-sm focus:border-blue-400 focus:outline-none"
          >
            <option value="">{t('options.all')}</option>
            <option value="spot">{t('options.spot')}</option>
            <option value="futures">{t('options.futures')}</option>
          </select>
        </div>

        {/* Price Range - Sale */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.priceRangeSale')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('placeholders.min')}
              value={filters.priceMin}
              onChange={(e) => handleInputChange('priceMin', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            />
            <input
              type="number"
              placeholder={t('placeholders.max')}
              value={filters.priceMax}
              onChange={(e) => handleInputChange('priceMax', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Price Range - Rent */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.priceRangeRent')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('placeholders.min')}
              value={filters.rentMin}
              onChange={(e) => handleInputChange('rentMin', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            />
            <input
              type="number"
              placeholder={t('placeholders.max')}
              value={filters.rentMax}
              onChange={(e) => handleInputChange('rentMax', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Only Active Bots */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md mt-3">
          <label className="inline-flex items-center space-x-2 text-sm text-gray-100">
            <input
              type="checkbox"
              checked={filters.isActive}
              onChange={(e) => handleInputChange('isActive', e.target.checked)}
              className="form-checkbox h-4 w-4 text-blue-600 bg-gray-800 border-gray-600 rounded"
            />
            <span>{t('fields.onlyActive')}</span>
          </label>
        </div>

        {/* Profit Factor */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.profitFactor', { value: filters.profitFactor.toFixed(0) })}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={filters.profitFactor}
            onChange={(e) => handleInputChange('profitFactor', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>10</span>
          </div>
        </div>

        {/* Risk Factor */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.riskFactor', { value: filters.riskFactor.toFixed(0) })}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="1"
            value={filters.riskFactor}
            onChange={(e) => handleInputChange('riskFactor', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>10</span>
          </div>
        </div>

        {/* Creation Time */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.creationTime')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('placeholders.value')}
              value={filters.creationTime}
              onChange={(e) => handleInputChange('creationTime', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            />
            <select
              value={filters.creationUnit}
              onChange={(e) => handleInputChange('creationUnit', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            >
              {/* Not: value alanlarını orijinal dosyadaki gibi bıraktım (işlev değişmesin diye) */}
              <option value="gün">{t('units.day')}</option>
              <option value="hafta">{t('units.week')}</option>
              <option value="ay">{t('units.month')}</option>
            </select>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.profitMargin')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="%"
              value={filters.profitMargin}
              onChange={(e) => handleInputChange('profitMargin', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            />
            <select
              value={filters.profitMarginUnit}
              onChange={(e) => handleInputChange('profitMarginUnit', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            >
              <option value="day">{t('units.day')}</option>
              <option value="week">{t('units.week')}</option>
              <option value="month">{t('units.month')}</option>
              <option value="all">{t('units.all')}</option>
            </select>
          </div>
        </div>

        {/* Transaction Frequency */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.transactionFrequency')}
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder={t('placeholders.value')}
              value={filters.transactionFrequency}
              onChange={(e) => handleInputChange('transactionFrequency', e.target.value)}
              className="w-full px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Usage Time */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.usageTime')}
          </label>
          <input
            type="number"
            placeholder={t('placeholders.exampleHours')}
            value={filters.usageTime}
            onChange={(e) => handleInputChange('usageTime', e.target.value)}
            className="w-full px-2 py-1 bg-gray-800/50 text-white rounded border border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
          />
        </div>

        {/* Demand */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            {t('fields.demand', { value: filters.demand })}
          </label>
          <input
            type="range"
            min="0"
            max="5"
            step="1"
            value={filters.demand}
            onChange={(e) => handleInputChange('demand', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>5</span>
          </div>
        </div>

        {/* Apply Filter Button */}
        <div className="pt-2">
          <button
            onClick={applyFilters}
            disabled={!isAnyFilterActive()}
            className={`w-full backdrop-blur-lg border text-gray-300 py-2 px-6 rounded-2xl font-semibold transition-all duration-200 relative overflow-hidden group ${
              isAnyFilterActive()
                ? 'bg-white/20 border-white/20 hover:bg-white/30 hover:border-white/50 hover:shadow-xl shadow-md hover:scale-x-95 cursor-pointer'
                : 'bg-gray-800 border-gray-600 cursor-not-allowed opacity-50'
            }`}
          >
            {isAnyFilterActive() && (
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/80 to-purple-400/80 opacity-40 group-hover:opacity-80 transition-opacity duration-200"></div>
            )}
            <div className="relative flex items-center justify-center gap-2">
              <FiFilter className="w-5 h-5" />
              {t('actions.apply')}
            </div>
          </button>
        </div>

        {/* Clear Filter Button */}
        {isFilterApplied && (
          <div className="pt-2 text-sm">
            <button
              onClick={clearFilters}
              className="w-full bg-red-600/20 backdrop-blur-lg border border-red-500/20 text-red-300 py-[6px] rounded-xl font-semibold transition-all duration-200 hover:bg-red-600/30 hover:shadow-xl shadow-md relative overflow-hidden group"
            >
              <div className="relative flex items-center justify-center gap-2">
                <FiX className="w-5 h-5" />
                {t('actions.clear')}
              </div>
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          box-shadow: 0 0 2px 0 #555;
        }
        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
          box-shadow: 0 0 2px 0 #555;
        }
      `}</style>
    </aside>
  );
};

export default BotFilterSidebar;
