'use client'

import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const Button = ({ onClick, icon }) => {
  const { t } = useTranslation('notFound');

  return (
    <StyledWrapper>
      <button className="drip-button mt-8" onClick={onClick}>
        <span className="spin">
          {icon}
        </span>

        <span className="btn-txt text-white text-sm">{t('goHome')}</span>
        {/* Drip elemanları */}
        {[...Array(10)].map((_, i) => (
          <span key={i} className="drip" />
        ))}
      </button>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .drip-button {
    display: flex;           
    align-items: center;   
    justify-content: center;  
    gap: 8px; /* Gap biraz küçültüldü */
    position: relative;
    background-color: #007bff;
    color: white;
    /* Boyutlar küçültüldü */
    padding: 0.6em 1.2em; 
    font-size: 14px; 
    cursor: pointer;
    overflow: hidden;
    border-radius: 8px;
    transition: background-color 0.01s ease;
    border: 3px solid #0056b3; /* Kenarlık inceltildi */
    z-index: 30;
  }

  .drip-button:hover {
    background-color: #004da0;
  }

  .drip-button .drip {
    position: absolute;
    width: 10px; /* Damla boyutu küçültüldü */
    height: 10px;
    background-color: #007bff;
    border-radius: 50%;
    opacity: 0;
    animation: drip 0s ease-in-out;
    z-index: 100;
  }

  .drip-button:hover .drip {
    animation: drip 1s ease-in-out infinite;
  }

  .drip-button:active {
    background-color: #003a77;
  }

  /* Staggered efektleri (aynı kaldı, sadece damla sayılarını map ile optimize edebilirsiniz) */
  .drip-button .drip:nth-child(1) { left: 0%; animation-delay: 0.8s; }
  .drip-button .drip:nth-child(2) { left: 11%; animation-delay: 0.2s; }
  .drip-button .drip:nth-child(3) { left: 20%; animation-delay: 0.4s; }
  .drip-button .drip:nth-child(4) { left: 31%; animation-delay: 0.7s; }
  .drip-button .drip:nth-child(5) { left: 39%; animation-delay: 0.3s; }
  .drip-button .drip:nth-child(6) { left: 49%; animation-delay: 0.6s; }
  .drip-button .drip:nth-child(7) { left: 61%; animation-delay: 1s; }
  .drip-button .drip:nth-child(8) { left: 69%; animation-delay: 0.1s; }
  .drip-button .drip:nth-child(9) { left: 79%; animation-delay: 0.9s; }
  .drip-button .drip:nth-child(10) { left: 90%; animation-delay: 0.5s; }

  @keyframes drip {
    0% {
      top: 60%;
      opacity: 1;
    }
    50% {
      top: 100%;
      opacity: 0.7;
    }
    100% {
      opacity: 0;
      top: 140%;
      transform: scaleY(1.5);
    }
  }
`;

export default Button;