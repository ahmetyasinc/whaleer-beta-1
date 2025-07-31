'use client';

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { IoIosSearch } from "react-icons/io";
import BotDropdownModal from '@/components/profile_component/(showcase)/(explore)/botDropdownModal'; // Will define soon
import useBotDropdownSearchStore from '@/store/showcase/botDropdownSearchStore';

const Input = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const { searchQuery, setSearchQuery, loadBots } = useBotDropdownSearchStore();

  useEffect(() => {
    loadBots();
  }, [loadBots]);

  return (
    <StyledWrapper>
      <div className="search-header">
        <input
          placeholder="Search bot or creator..."
          className="search-header__input"
          type="text"
          onFocus={() => setShowDropdown(true)}
          onChange={(e) => setSearchQuery(e.target.value)}
          value={searchQuery}
        />
        <button className="search-header__button">
          <IoIosSearch className="text-xl" />
        </button>
      </div>

      {showDropdown && <BotDropdownModal onClose={() => setShowDropdown(false)} />}
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .search-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: center;
  }

  .search-header__input {
    font-family: inherit;
    font-size: 16px;
    background-color: black;
    border: solid 0.5px #646464;
    color: #646464;
    padding: 0.7rem 1rem;
    border-radius: 25px;
    width: 460px;
    height: 42px;
    transition: all ease-in-out 0.5s;
    margin-right: -2rem;
    opacity: 1;
    text-align: center;
  }

  .search-header__input:hover,
  .search-header__input:focus {
    box-shadow: 0 0 1em #00000013;
  }

  .search-header__input:focus {
    outline: none;
    background-color: black;
  }

  .search-header__input::-webkit-input-placeholder {
    font-weight: 100;
    color: #3a3a3a;
  }

  .search-header__input:focus + .search-header__button {
    background-color: transparent;
  }

  .search-header__button {
    border: none;
    background-color: transparent;
    margin-top: 0.1em;
  }

  .search-header__button:hover {
    cursor: pointer;
  }

  .search-header__icon {
    height: 1.3em;
    width: 1.3em;
    fill: #121212;
  }`;

export default Input;
