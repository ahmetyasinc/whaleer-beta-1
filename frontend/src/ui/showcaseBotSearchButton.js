'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { IoIosSearch } from "react-icons/io";
import useBotDropdownSearchStore from '@/store/showcase/botDropdownSearchStore';
import useBotDataStore from '@/store/showcase/botDataStore'; // NEW

const Input = () => {
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

  const { inspectBot } = useBotDataStore(); // NEW

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
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
      : null;

  const formatPct = (n) => `${n >= 0 ? '+' : ''}${Number(n || 0).toFixed(2)}%`;

  const hasAnyPrice = (bot) =>
    typeof bot.salePriceUSD === 'number' || typeof bot.rentPriceUSD === 'number';

  const emptyState = useMemo(
    () => showDropdown && !loading && !error && filteredBots.length === 0 && (searchQuery?.trim().length > 0),
    [showDropdown, loading, error, filteredBots.length, searchQuery]
  );

  // Bir bot seçildiğinde: inspect et + dropdown’ı kapat
  const handleSelectBot = useCallback((botId) => {        // NEW
    try {
      inspectBot(botId);                                  // NEW
    } finally {
      setShowDropdown(false);                             // NEW
    }
  }, [inspectBot]);                                       // NEW

  // Klavye ile seçim (Enter/Space)                           // NEW
  const handleItemKeyDown = useCallback((e, botId) => {   // NEW
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelectBot(botId);
    }
  }, [handleSelectBot]);                                  // NEW

  return (
    <StyledWrapper ref={wrapperRef}>
      <div className="search-header">
        <input
          placeholder="Search bot or creator..."
          className="search-header__input"
          type="text"
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => setSearchQuery(e.target.value)}
          value={searchQuery}
          aria-label="Search bot or creator"
          role="combobox"                                  // NEW (erişilebilirlik)
          aria-expanded={showDropdown}                     // NEW
          aria-controls="bot-search-dropdown"              // NEW
        />
        <button
          className="search-header__button"
          onClick={() => setShowDropdown((s) => !s)}
          aria-label="Toggle search results"
          type="button"
        >
          <IoIosSearch className="text-xl" />
        </button>
      </div>

      {showDropdown && (
        <div
          id="bot-search-dropdown"                         // NEW
          className="dropdown"
          role="listbox"
          aria-label="Search results"
        >
          {loading && <div className="info">Loading…</div>}
          {!!error && <div className="error">An error occurred: {error}</div>}
          {!loading && !error && emptyState && (
            <div className="empty">No results found</div>
          )}

          {!loading && !error && filteredBots.map((bot) => (
            <div
              key={bot.id}
              className="item"
              role="option"
              tabIndex={0}
              aria-selected={false}
              onClick={() => handleSelectBot(bot.id)}           // NEW
              onKeyDown={(e) => handleItemKeyDown(e, bot.id)}   // NEW
            >
              <div className="left">
                <div className="title-row">
                  <span className="name">{bot.name}</span>
                  <span className={`type-badge ${bot.type === 'futures' ? 'futures' : 'spot'}`}>
                    {bot.type === 'futures' ? 'Futures' : 'Spot'}
                  </span>
                </div>
                <div className="meta">
                  <span className="creator">@{bot.creator}</span>
                  <span className={`profit ${bot.totalProfit >= 0 ? 'pos' : 'neg'}`}>
                    Total Profit: {formatPct(bot.totalProfit)}
                  </span>
                </div>
              </div>

              {hasAnyPrice(bot) && (
                <div className="right">
                  {typeof bot.salePriceUSD === 'number' && (
                    <span className="pill pill-sale">For Sale: {formatUSD(bot.salePriceUSD)}</span>
                  )}
                  {typeof bot.rentPriceUSD === 'number' && (
                    <span className="pill pill-rent">For Rent: {formatUSD(bot.rentPriceUSD)}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  position: relative;

  .search-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: center;
  }

  .search-header__input {
    font-family: inherit;
    font-size: 16px;
    background-color: #0a0a0a;
    border: solid 1px #2b2b2b;
    color: #d0d0d0;
    padding: 0.7rem 1rem;
    border-radius: 9999px;
    width: 460px;
    height: 44px;
    transition: all 160ms ease;
    margin-right: -2rem;
    text-align: center;
  }

  .search-header__input:hover,
  .search-header__input:focus {
    box-shadow: 0 0 0 4px rgba(255,255,255,0.03);
    border-color: #3a3a3a;
  }

  .search-header__input:focus {
    outline: none;
    background-color: #0c0c0c;
  }

  .search-header__input::placeholder {
    font-weight: 400;
    color: #6f6f6f;
  }

  .search-header__button {
    border: none;
    background-color: transparent;
    margin-top: 0.1em;
    height: 44px;
    width: 44px;
    display: grid;
    place-items: center;
    border-radius: 9999px;
    transition: background 120ms ease;
  }

  .search-header__button:hover {
    cursor: pointer;
    background: rgba(255,255,255,0.05);
  }

  /* Dropdown */
  .dropdown {
    position: absolute;
    top: 52px;
    left: 0;
    width: 100%;
    max-width: 650px;
    padding: 8px;
    background: #0a0a0a;
    border: 1px solid #2b2b2b;
    border-radius: 16px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.35);
    z-index: 50;
  }

  .info, .error, .empty {
    padding: 16px 12px;
    font-size: 14px;
    text-align: center;
  }
  .info { color: #bdbdbd; }
  .error { color: #ff7b7b; }
  .empty { color: #9f9f9f; }

  .item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 14px;
    border-radius: 12px;
    transition: background 120ms ease, border-color 120ms ease;
    border: 1px solid transparent;
  }

  .item:hover,
  .item:focus {
    background: rgba(255,255,255,0.03);
    border-color: #2b2b2b;
    cursor: pointer;
    outline: none;
  }

  .left {
    display: flex;
    flex-direction: column;
    gap: 6px;
    min-width: 0;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .name {
    color: #eaeaea;
    font-weight: 600;
    font-size: 15px;
    letter-spacing: 0.2px;
  }

  .type-badge {
    font-size: 11px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 9999px;
    line-height: 1;
    border: 1px solid;
  }

  .type-badge.spot {
    color: #9ae6b4;
    background: rgba(24, 121, 78, 0.18);
    border-color: rgba(24, 121, 78, 0.35);
  }

  .type-badge.futures {
    color: #90cdf4;
    background: rgba(30, 64, 175, 0.18);
    border-color: rgba(30, 64, 175, 0.35);
  }

  .meta {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .creator {
    color: #a5a5a5;
    font-size: 13px;
  }

  .profit {
    font-size: 13px;
    font-weight: 600;
  }
  .profit.pos { color: #7bd88f; }
  .profit.neg { color: #ff7b7b; }

  .right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .pill {
    font-size: 12px;
    font-weight: 700;
    padding: 6px 10px;
    border-radius: 9999px;
    line-height: 1;
    border: 1px solid transparent;
    white-space: nowrap;
  }

  .pill-sale {
    color: #fbd38d;
    background: rgba(202, 138, 4, 0.18);
    border-color: rgba(202, 138, 4, 0.4);
  }

  .pill-rent {
    color: #c4b5fd;
    background: rgba(99, 102, 241, 0.18);
    border-color: rgba(99, 102, 241, 0.4);
  }

  @media (max-width: 720px) {
    .search-header__input {
      width: 100%;
      margin-right: 0;
      text-align: left;
      padding-left: 44px;
    }
    .dropdown {
      max-width: 100%;
    }
  }
`;

export default Input;
