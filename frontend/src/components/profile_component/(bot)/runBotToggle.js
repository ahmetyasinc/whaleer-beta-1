'use client';

import React from 'react';
import styled from 'styled-components';

const RunBotToggle = ({
  type = "checkbox",
  checked,
  onChange,
  disabled = false,
  className = "",
  title,
}) => {
  // disabled iken controlled input kuralı için no-op onChange
  const handleChange = disabled ? () => { } : (onChange || (() => { }));

  return (
    <StyledWrapper
      className={className}
      data-disabled={disabled ? 'true' : 'false'}
      title={title}
      aria-disabled={disabled}
    >
      <label className={`switch ${disabled ? 'is-disabled' : ''}`}>
        <input
          className="checkbox"
          type={type}
          checked={!!checked}
          onChange={handleChange}
          disabled={disabled}
          readOnly={disabled}
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
};

const StyledWrapper = styled.div`
  position: relative;
  display: inline-block;

  .switch {
    position: relative;
    width: 5em;
    height: 5em;
    display: inline-block;
    transition: opacity 0.15s ease, filter 0.15s ease;
  }

  .switch.is-disabled {
    opacity: 0.4;
    cursor: not-allowed;
    pointer-events: none;
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
    display: block;
  }

  .checkbox {
    z-index: 1;
    /* Closed State: Metallic Grey */
    background: linear-gradient(145deg, #4a4a4a, #2b2b2b);
    border-radius: 50%;
    border: 2px solid #1a1a1a;
    box-shadow:
      inset 2px 2px 5px rgba(0,0,0,0.5),
      inset -1px -1px 2px rgba(255,255,255,0.2),
      0 0 0 4px #0f0f15; /* Outer ring spacing */
    filter: brightness(1);
    transition:
      background 0.3s ease,
      box-shadow 0.3s ease,
      filter 0.15s linear,
      transform 0.15s linear,
      border-color 0.3s ease;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    cursor: pointer;
  }

  [data-disabled="true"] .checkbox {
    cursor: not-allowed;
  }

  .checkbox:active {
    transform: scale(0.95);
  }

  .checkbox:active + .svg {
    transform: scale(0.95);
  }

  /* Open State: Metallic Neon Green */
  .checkbox:checked {
    background: radial-gradient(circle at 30% 30%, #39ff14, #008f11);
    border-color: #8aff8a;
    box-shadow:
      inset 0 0 10px rgba(57, 255, 20, 0.5),
      0 0 15px rgba(57, 255, 20, 0.4),
      0 0 0 4px #0f0f15;
  }

  .checkbox:checked:active {
    /* Slightly dimmer or smaller when active-clicked if needed */
  }

  .checkbox:focus,
  .checkbox:hover {
    filter: brightness(1.1);
  }

  [data-disabled="true"] .checkbox:focus,
  [data-disabled="true"] .checkbox:hover {
    filter: none;
  }

  /* Spinning Border Effect (using .slider class) */
  .slider {
    z-index: 0; /* Behind checkbox */
    top: -3px; left: -3px; right: -3px; bottom: -3px; /* Thinner border (was -8px) */
    width: auto;
    height: auto;
    border-radius: 50%;
    background: conic-gradient(transparent 20%, #39ff14, transparent 90%);
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  /* Activate spin when checked */
  .checkbox:checked ~ .slider {
    opacity: 1;
    animation: spin 1.5s linear infinite;
  }

  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }

  /* SVG Styles */
  .svg {
    z-index: 2;
    pointer-events: none;
    transition: transform 0.15s linear;
  }

  .svg-ring,
  .svg-line {
    stroke: #ffffff;
    stroke-width: 1.5px; /* Thinner lines */
    transition: stroke 0.15s ease-in-out;
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
    /* Stroke remains white as requested */
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
  }
`;

export default RunBotToggle;

