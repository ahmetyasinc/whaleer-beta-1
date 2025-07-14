// components/BotFilterSidebar.js
'use client';

import React, { useState } from 'react';
import { FiFilter, FiX } from 'react-icons/fi';

const BotFilterSidebar = () => {
  const [filters, setFilters] = useState({
    priceMin: '',
    priceMax: '',
    profitFactor: 0,
    riskFactor: 0,
    creationTime: '',
    creationUnit: 'gün',
    usageTime: '',
    popularity: [],
    transactionFrequency: '',
    transactionFrequencyUnit: 'gün',
    profitMargin: '',
    profitMarginUnit: 'gün'
  });

  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const popularityOptions = [
    { id: 'very_low', label: 'Çok Az' },
    { id: 'low', label: 'Az' },
    { id: 'medium', label: 'Orta' },
    { id: 'high', label: 'Çok' },
    { id: 'very_high', label: 'Çok Fazla' }
  ];

  const handleInputChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handlePopularityChange = (optionId) => {
    setFilters(prev => ({
      ...prev,
      popularity: prev.popularity.includes(optionId)
        ? prev.popularity.filter(id => id !== optionId)
        : [...prev.popularity, optionId]
    }));
  };

  const isAnyFilterActive = () => {
    return (
      filters.priceMin !== '' ||
      filters.priceMax !== '' ||
      filters.profitFactor > 0 ||
      filters.riskFactor > 0 ||
      filters.creationTime !== '' ||
      filters.usageTime !== '' ||
      filters.popularity.length > 0 ||
      filters.transactionFrequency !== '' ||
      filters.profitMargin !== ''
    );
  };

  const clearFilters = () => {
    setFilters({
      priceMin: '',
      priceMax: '',
      profitFactor: 0,
      riskFactor: 0,
      creationTime: '',
      creationUnit: 'gün',
      usageTime: '',
      popularity: [],
      transactionFrequency: '',
      transactionFrequencyUnit: 'gün',
      profitMargin: '',
      profitMarginUnit: 'gün'
    });
    setIsFilterApplied(false);
  };

  const applyFilters = () => {
    console.log('Filters applied:', filters);
    setIsFilterApplied(true);
    // Burada filtreleme işlemini yapabilirsiniz
  };

  return (
    <aside className="fixed top-[60px] left-0 w-[320px] h-[calc(100vh-60px)] bg-black border-t border-gray-600 text-white shadow-2xl z-40 flex flex-col">
      <div className="p-3">
        <h2 className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
          Filtreler
        </h2>
      </div>

      <div className="overflow-y-auto flex-1 space-y-3 px-3 pb-4">
        {/* Fiyat Aralığı */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">Fiyat Aralığı ($)</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="En az" 
              value={filters.priceMin}
              onChange={(e) => handleInputChange('priceMin', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border-1 border-gray-600 text-xs focus:border-blue-400 focus:outline-none" 
            />
            <input 
              type="number" 
              placeholder="En çok" 
              value={filters.priceMax}
              onChange={(e) => handleInputChange('priceMax', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border-1 border-gray-600 text-xs focus:border-blue-400 focus:outline-none" 
            />
          </div>
        </div>

        {/* Kar Faktörü */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            Kar Faktörü (en az): {filters.profitFactor.toFixed(1)}
          </label>
          <input 
            type="range" 
            min="0" 
            max="2" 
            step="0.1"
            value={filters.profitFactor}
            onChange={(e) => handleInputChange('profitFactor', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0.0</span>
            <span>2.0</span>
          </div>
        </div>

        {/* Risk Faktörü */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">
            Risk Faktörü (en çok): {filters.riskFactor.toFixed(1)}
          </label>
          <input 
            type="range" 
            min="0" 
            max="2" 
            step="0.1"
            value={filters.riskFactor}
            onChange={(e) => handleInputChange('riskFactor', parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0.0</span>
            <span>2.0</span>
          </div>
        </div>

        {/* Oluşturulma Zamanı */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">Oluşturulma Süresi (en az)</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="Sayı" 
              value={filters.creationTime}
              onChange={(e) => handleInputChange('creationTime', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border-1 border-gray-600 text-xs focus:border-blue-400 focus:outline-none" 
            />
            <select 
              value={filters.creationUnit}
              onChange={(e) => handleInputChange('creationUnit', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border-1 border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            >
              <option value="gün">Gün</option>
              <option value="hafta">Hafta</option>
              <option value="ay">Ay</option>
            </select>
          </div>
        </div>

        {/* İşlem sıklığı */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">İşlem Sıklığı (en az)</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="Sayı" 
              value={filters.transactionFrequency}
              onChange={(e) => handleInputChange('transactionFrequency', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border-1 border-gray-600 text-xs focus:border-blue-400 focus:outline-none" 
            />
            <select 
              value={filters.transactionFrequencyUnit}
              onChange={(e) => handleInputChange('transactionFrequencyUnit', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border-1 border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            >
              <option value="gün">Günde</option>
              <option value="hafta">Haftada</option>
              <option value="ay">Ayda</option>
            </select>
          </div>
        </div>

        {/* Kar Marjı */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">Kar Marjı (en az)</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              placeholder="%" 
              value={filters.profitMargin}
              onChange={(e) => handleInputChange('profitMargin', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border-1 border-gray-600 text-xs focus:border-blue-400 focus:outline-none" 
            />
            <select 
              value={filters.profitMarginUnit}
              onChange={(e) => handleInputChange('profitMarginUnit', e.target.value)}
              className="w-1/2 px-2 py-1 bg-gray-800/50 text-white rounded border-1 border-gray-600 text-xs focus:border-blue-400 focus:outline-none"
            >
              <option value="gün">Günde</option>
              <option value="hafta">Haftada</option>
              <option value="ay">Ayda</option>
              <option value="all">Tüm Zamanlar</option>
            </select>
          </div>
        </div>

        {/* Kullanım Süresi */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">Kullanım Süresi (saat)(en az)</label>
          <input 
            type="number" 
            placeholder="Örn: 525" 
            value={filters.usageTime}
            onChange={(e) => handleInputChange('usageTime', e.target.value)}
            className="w-full px-2 py-1 bg-gray-800/50 text-white rounded border-1 border-gray-600 text-xs focus:border-blue-400 focus:outline-none" 
          />
        </div>

        {/* Rağbet */}
        <div className="bg-gradient-to-r from-[rgb(0,4,4)] to-[rgba(30,30,55,0.4)] backdrop-blur-sm p-3 shadow-md shadow-white/10 rounded-md">
          <label className="block text-sm font-medium text-gray-100 mb-2">Rağbet Durumu</label>
          <div className="space-y-2">
            {popularityOptions.map(option => (
              <label key={option.id} className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.popularity.includes(option.id)}
                  onChange={() => handlePopularityChange(option.id)}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 focus:ring-2"
                />
                <span className="text-xs text-gray-300">{option.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Filtreyi Uygula Butonu */}
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
              Filtreyi Uygula
            </div>
          </button>
        </div>

        {/* Filtreyi Temizle Butonu */}
        {isFilterApplied && (
          <div className="pt-2 text-sm">
            <button 
              onClick={clearFilters}
              className="w-full bg-red-600/20 backdrop-blur-lg border-1 border-red-500/20 text-red-300 py-[6px] rounded-xl font-semibold transition-all duration-200 hover:bg-red-600/30 hover:shadow-xl shadow-md relative overflow-hidden group"
            >
              <div className="relative flex items-center justify-center gap-2">
                <FiX className="w-5 h-5" />
                Filtreyi Temizle
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