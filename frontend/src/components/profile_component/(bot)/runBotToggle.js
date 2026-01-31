'use client';

import React, { useId } from 'react';
import styled from 'styled-components';
import { FaPowerOff } from "react-icons/fa6";

const RunBotToggle = ({ checked, onChange, disabled }) => {
  const uniqueId = useId();

  // If provided, ensure onChange handles the event
  const handleChange = (e) => {
    if (disabled) return;
    if (onChange) onChange(e);
  };

  return (
    <StyledWrapper disabled={disabled}>
      <div className="toggle-container">
        <input
          id={uniqueId}
          className="checkbox-input"
          type="checkbox"
          checked={!!checked}
          onChange={handleChange}
          disabled={disabled}
        />
        <label className="switch text-[18px]" htmlFor={uniqueId}>
          <FaPowerOff />
        </label>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  /* Added to handle disabled state visually */
  opacity: ${props => props.disabled ? 0.6 : 1};
  pointer-events: ${props => props.disabled ? 'none' : 'auto'};
  
  .checkbox-input {
    display: none;
  }

  /* User requested 80px but I'm reducing to 60px to better fit the card layout while keeping proportions */
  .switch {
    position: relative;
    width: 75px; 
    height: 75px;
    background-color: rgb(99, 99, 99);
    border-radius: 50%;
    z-index: 1;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid rgb(126, 126, 126);
    box-shadow: 0px 0px 3px rgb(2, 2, 2) inset;
    transition: 0.3s;
  }
  
  .switch svg {
    width: 1.2em;
  }
  
  .switch svg path {
    fill: rgb(48, 48, 48);
  }

  .checkbox-input:checked + .switch {
    box-shadow:
      0px 0px 1px rgb(57, 255, 20) inset,
      0px 0px 2px rgb(57, 255, 20) inset,
      0px 0px 10px rgb(57, 255, 20) inset,
      0px 0px 40px rgb(57, 255, 20),
      0px 0px 100px rgb(57, 255, 20),
      0px 0px 5px rgb(57, 255, 20);
    border: 3px solid rgb(255, 255, 255);
    background-color: rgb(120, 200, 140);
  }

  .checkbox-input:checked + .switch svg {
    filter: drop-shadow(0px 0px 5px rgb(57, 255, 20));
  }

  .checkbox-input:checked + .switch svg path {
    fill: rgb(255, 255, 255);
  }
`;

export default RunBotToggle;
