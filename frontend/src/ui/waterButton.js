'use client';

import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';

const Button = ({ onClick, icon, spinning }) => {
  const { t } = useTranslation('notFound');

  return (
    <StyledWrapper>
      <button className="button" onClick={onClick}>
        <span className="liquid" />
        <span className="btn-content text-black">
          {icon}
          <span className="btn-txt text-black text-sm">{t('goHome')}</span>
        </span>
      </button>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .button {
    background-color: #ffff;
    border: 0px;
    outline: 0px;
    color: #fff;
    width: 300px;
    padding: 20px;
    border-radius: 50px;
    position: relative;
    overflow: hidden;
    cursor: pointer;
    margin-top: 20px;
  }

  .btn-content {
    display: flex;
    align-items: center;
    gap: 10px;
    position: relative;
    z-index: 1;
  }

  .btn-txt {
    font-size: 18px;
    font-family: sans-serif;
    letter-spacing: 1.5px;
  }

  .liquid {
    background-color: #2893eb;
    width: 100%;
    height: 70px;
    position: absolute;
    bottom: 0;
    left: 0;
    box-shadow: inset 5px -5px 25px #104e81,
                inset -5px 0px 25px #104e81;
  }

  .liquid::after,
  .liquid::before {
    content: '';
    width: 450px;
    height: 400px;
    position: absolute;
    left: -110px;
    top: -380px;
    border-radius: 45%;
    animation: animate 5s linear infinite;
    z-index: 0;
  }

  .liquid::after {
    background: #ffff;
    animation-delay: 2s;
  }

  .liquid::before {
    background: rgb(68, 160, 235);
    animation-delay: 1.8s;
    border-radius: 40%;
  }

  @keyframes animate {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;

export default Button;
