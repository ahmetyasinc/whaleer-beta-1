'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { IoIosSearch } from "react-icons/io";
import useBotDropdownSearchStore from '@/store/showcase/botDropdownSearchStore';
import useBotDataStore from '@/store/showcase/botDataStore';
import { useTranslation } from 'react-i18next';
import { FiTrendingUp, FiTrendingDown, FiUser } from 'react-icons/fi';

const Input = () => {
  const { t, i18n } = useTranslation('searchButton');
  const locale = i18n.language || 'en-US';

  const [showDropdown, setShowDropdown] = useState(false);
  const wrapperRef = useRef(null);

  const {
    searchQuery,
    setSearchQuery,
    filteredBots,
    loading,
    error,
    hasLoadedOnce,
    fetchBots,
  } = useBotDropdownSearchStore();

  const { inspectBot } = useBotDataStore();

  // İlk açılışta (daha önce yüklenmemişse) botları çek
  useEffect(() => {
    if (!hasLoadedOnce && !loading) {
      fetchBots();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLoadedOnce, loading]);

  // Dropdown’ı dışarı tıklayınca kapat
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatUSD = (n) =>
    typeof n === 'number'
      ? new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
      : null;

  const formatPct = (n) => `${n >= 0 ? '+' : ''}${Number(n || 0).toFixed(2)}%`;

  const hasAnyPrice = (bot) =>
    typeof bot.salePriceUSD === 'number' || typeof bot.rentPriceUSD === 'number';

  const emptyState = useMemo(
    () => showDropdown && !loading && !error && filteredBots.length === 0 && (searchQuery?.trim().length > 0),
    [showDropdown, loading, error, filteredBots.length, searchQuery]
  );

  // Bir bot seçildiğinde: inspect et + dropdown’ı kapat
  const handleSelectBot = useCallback((botId) => {
    try {
      inspectBot(botId);
    } finally {
      setShowDropdown(false);
    }
  }, [inspectBot]);

  // Klavye ile seçim (Enter/Space)
  const handleItemKeyDown = useCallback((e, botId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectBot(botId);
    }
  }, [handleSelectBot]);

  return (
    <div ref={wrapperRef} className="relative group">
      <div className="relative w-[600px] z-20 mx-auto">
        <input
          placeholder={t('placeholder.search')}
          className="font-inherit text-base bg-zinc-950/80 border border-zinc-800 text-zinc-300 py-3 pl-6 pr-12 rounded-full w-full h-[44px] transition-all duration-300 focus:bg-zinc-950 focus:border-cyan-500/50 focus:shadow-[0_0_15px_-3px_rgba(6,182,212,0.3)] outline-none placeholder:text-zinc-600 text-center focus:text-left backdrop-blur-sm"
          type="text"
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => setSearchQuery(e.target.value)}
          value={searchQuery}
          aria-label={t('aria.searchInput')}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="bot-search-dropdown"
        />
        <button
          className="absolute right-2 top-1/2 transform -translate-y-1/2 border-none bg-transparent h-[36px] w-[36px] grid place-items-center rounded-full transition-colors duration-200 hover:bg-zinc-800/50 cursor-pointer text-zinc-500 hover:text-cyan-400 z-30"
          onClick={() => setShowDropdown((s) => !s)}
          aria-label={t('aria.toggleDropdown')}
          type="button"
        >
          <IoIosSearch className="text-xl" />
        </button>
      </div>

      {showDropdown && (
        <div
          id="bot-search-dropdown"
          className="absolute top-[52px] left-0 w-full max-w-[1000px] p-2 bg-zinc-950/95 backdrop-blur-xl border border-zinc-800 rounded-2xl shadow-2xl z-50 max-h-[500px] overflow-y-auto custom-scrollbar"
          role="listbox"
          aria-label={t('aria.searchResults')}
        >
          {loading && <div className="p-4 text-center text-zinc-500 text-sm animate-pulse">{t('info.loading')}</div>}
          {!!error && <div className="p-4 text-center text-rose-400 text-sm">{t('info.error', { message: String(error) })}</div>}
          {!loading && !error && emptyState && (
            <div className="p-4 text-center text-zinc-500 text-sm">{t('info.empty')}</div>
          )}

          {!loading && !error && filteredBots.map((bot) => (
            <div
              key={bot.id}
              className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg transition-all duration-75 border border-transparent hover:bg-zinc-900/60 hover:border-zinc-800/60 cursor-pointer group/item relative overflow-hidden mb-0.5"
              role="option"
              tabIndex={0}
              aria-selected={false}
              onClick={() => handleSelectBot(bot.id)}
              onKeyDown={(e) => handleItemKeyDown(e, bot.id)}
            >
              {/* Hover Glow */}
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5 opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="flex flex-col gap-0.5 min-w-0 relative z-10 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-200 font-semibold text-[14px] tracking-wide group-hover/item:text-cyan-100 transition-colors truncate">{bot.name}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none ${bot.type === 'futures'
                    ? 'text-blue-300 bg-blue-500/10'
                    : 'text-emerald-300 bg-emerald-500/10'
                    }`}>
                    {bot.type === 'futures' ? t('type.futures') : t('type.spot')}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-zinc-500 text-[12px] flex items-center gap-1">
                    <FiUser className="w-3 h-3" />
                    @{bot.creator}
                  </span>
                  <span className={`text-[12px] font-bold flex items-center gap-1 ${bot.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {bot.totalProfit >= 0 ? <FiTrendingUp className="w-3 h-3" /> : <FiTrendingDown className="w-3 h-3" />}
                    {t('labels.totalProfit')} {formatPct(bot.totalProfit)}
                  </span>
                </div>
              </div>

              {hasAnyPrice(bot) && (
                <div className="flex items-center gap-2 flex-shrink-0 relative z-10">
                  {typeof bot.salePriceUSD === 'number' && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full leading-none bg-amber-500/10 text-amber-300">
                      {t('labels.forSale', { price: formatUSD(bot.salePriceUSD) })}
                    </span>
                  )}
                  {typeof bot.rentPriceUSD === 'number' && (
                    <span className="text-[10px] font-bold px-2 py-1 rounded-full leading-none bg-indigo-500/10 text-indigo-300">
                      {t('labels.forRent', { price: formatUSD(bot.rentPriceUSD) })}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Input;
