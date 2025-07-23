import React from 'react';
import styled from 'styled-components';

const RunBotToggle = ({ type = "checkbox", checked, onChange, className = "" }) => {
  return (
    <StyledWrapper>
      <label className="switch">
        <input 
          className={`checkbox ${className}`}
          type={type}
          checked={!!checked}
          onChange={onChange}
         />
        <svg className="svg" width="20px" height="20px" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle className="svg-ring" cx={12} cy={12} r={6} fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeDasharray="0 5 27.7 5" strokeDashoffset="0.01" transform="rotate(-90,12,12)" />
          <line className="svg-line" x1={12} y1={6} x2={12} y2={15} stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeDasharray="9 9" strokeDashoffset={3} />
          <line className="svg-line" x1={12} y1={6} x2={12} y2={12} stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeDasharray="6 6" strokeDashoffset={6} />
        </svg>
        <span className="slider" />
      </label>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .switch {
    position: relative;
    width: 5em;
    height: 5em;
  }

  .checkbox,
  .slider,
  .svg {
    position: absolute;
    top: 0;
    left: 0;
  }

  .checkbox,
  .svg {
    width: 100%;
    height: 100%;
  }

.checkbox {
  background-color: hsl(3, 90%, 40%);
  border-radius: 50%;
  border: 2px solid hsl(227,82%,2%); /* 🔴 BORDER EKLENDİ */
  box-shadow:
    0 0 0 0.1em hsl(3, 90%, 25%) inset,
    0 0 0 0.2em hsl(3, 90%, 65%) inset,
    -0.3em 0.5em 0 hsl(3, 90%, 40%) inset,
    0 0.15em 0 hsla(0, 0%, 0%, 0.2),
    0 0 0 4px hsl(227,82%,2%); /* 🔵 RING BENZERİ EKLENDİ */
  filter: brightness(1);
  transition:
    background-color 0.15s linear,
    box-shadow 0.15s linear,
    filter 0.15s linear,
    transform 0.15s linear;
  appearance: none;
}


  .checkbox:active {
    box-shadow:
      0 0 0 0.1em hsl(3, 90%, 25%) inset,
      0 0 0 0.2em hsl(3, 90%, 65%) inset,
      -0.3em 0.5em 0 hsl(3, 90%, 50%) inset,
      0 0.05em 0 hsla(0, 0%, 0%, 0.2);
  }

  .checkbox:active,
  .checkbox:active + .svg {
    transform: scale(0.95);
  }

  .checkbox:checked {
    background-color: hsl(123, 90%, 30%);
    box-shadow:
      0 0 0 0.1em hsl(123, 90%, 15%) inset,
      0 0 0 0.2em hsl(123, 90%, 55%) inset,
      -0.3em 0.5em 0 hsl(123, 90%, 30%) inset,
      0 0.15em 0 hsla(0, 0%, 0%, 0.2);
  }

  .checkbox:checked:active {
    box-shadow:
      0 0 0 0.1em hsl(123, 90%, 15%) inset,
      0 0 0 0.2em hsl(123, 90%, 15%) inset,
      -0.3em 0.5em 0 hsl(123, 90%, 40%) inset,
      0 0.05em 0 hsla(0, 0%, 0%, 0.2);
  }

  .checkbox:focus,
  .checkbox:hover {
    filter: brightness(1.1);
  }

  .checkbox:focus {
    outline: 0;
  }

  .slider {
    clip: rect(1px, 1px, 1px, 1px);
    overflow: hidden;
    width: 1px;
    height: 1px;
  }

  .svg {
    pointer-events: none;
    transition: transform 0.15s linear;
  }

  .svg-ring,
  .svg-line {
    stroke: hsl(223, 90%, 100%);
  }

  .svg-ring {
    stroke-dasharray: 0 5 27.7 5;
    transition:
      stroke 0.15s ease-in-out,
      stroke-dasharray 0.3s 0.25s ease-in-out;
  }

  .checkbox:checked + .svg .svg-ring {
    stroke-dasharray: 0 0 0 37.7;
    transition-delay: 0s;
  }

  .svg-line {
    stroke-dashoffset: 3;
    transition:
      stroke 0.15s linear,
      stroke-dashoffset 0.3s ease-in-out;
  }

  .svg-line:nth-of-type(1) {
    transition-delay: 0s, 0.25s;
  }

  .checkbox:checked + .svg .svg-line:nth-of-type(1) {
    stroke-dashoffset: -6;
    transition-delay: 0s;
  }

  .svg-line:nth-of-type(2) {
    stroke-dashoffset: 6;
  }

  .checkbox:checked + .svg .svg-line:nth-of-type(2) {
    stroke-dashoffset: -3;
    transition-delay: 0s, 0.25s;
  }`;

export default RunBotToggle;
