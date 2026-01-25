import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const BotToggleConfirmModal = ({ isOpen, onClose, onConfirm, actionType }) => {
    const [isChecked, setIsChecked] = useState(false);

    useEffect(() => {
        if (isOpen) setIsChecked(false);
    }, [isOpen]);

    if (!isOpen) return null;

    const labelText = actionType === 'start'
        ? "Botun çalıştırılmasını onaylıyorum"
        : "Botun durdurulmasını onaylıyorum";

    const titleText = actionType === 'start' ? "Botu Başlat" : "Botu Durdur";

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-sm shadow-xl animate-fadeIn relative">
                <h2 className="text-xl font-semibold text-white mb-6 text-center">
                    {titleText}
                </h2>

                <div className="flex flex-col items-center gap-4 mb-8 justify-center bg-zinc-800/30 p-6 rounded-lg border border-zinc-700/50">
                    <StyledWrapper>
                        <div className="cyber-toggle-wrapper">
                            <input
                                className="cyber-toggle-checkbox"
                                id="bot-confirm-toggle"
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => setIsChecked(e.target.checked)}
                            />
                            <label className="cyber-toggle" htmlFor="bot-confirm-toggle">
                                <div className="cyber-toggle-track">
                                    <div className="cyber-toggle-track-glow" />
                                    <div className="cyber-toggle-track-dots">
                                        <span className="cyber-toggle-track-dot" />
                                        <span className="cyber-toggle-track-dot" />
                                        <span className="cyber-toggle-track-dot" />
                                    </div>
                                </div>
                                <div className="cyber-toggle-thumb">
                                    <div className="cyber-toggle-thumb-shadow" />
                                    <div className="cyber-toggle-thumb-highlight" />
                                    <div className="cyber-toggle-thumb-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                                            <path d="M16.5 12c0-2.48-2.02-4.5-4.5-4.5s-4.5 2.02-4.5 4.5 2.02 4.5 4.5 4.5 4.5-2.02 4.5-4.5zm-4.5 7.5c-4.14 0-7.5-3.36-7.5-7.5s3.36-7.5 7.5-7.5 7.5 3.36 7.5 7.5-3.36 7.5-7.5 7.5zm0-16.5c-4.97 0-9 4.03-9 9h-3l3.89 3.89.07.14 4.04-4.03h-3c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42c1.63 1.63 3.87 2.64 6.36 2.64 4.97 0 9-4.03 9-9s-4.03-9-9-9z" />
                                        </svg>
                                    </div>
                                </div>
                                <div className="cyber-toggle-particles">
                                    <span className="cyber-toggle-particle" />
                                    <span className="cyber-toggle-particle" />
                                    <span className="cyber-toggle-particle" />
                                    <span className="cyber-toggle-particle" />
                                </div>
                            </label>
                        </div>
                    </StyledWrapper>

                    <span className="text-sm font-medium text-zinc-400 select-none text-center">
                        {labelText}
                    </span>
                </div>

                <div className="flex justify-between gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition border border-zinc-700"
                    >
                        İptal
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!isChecked}
                        className={`flex-1 px-4 py-2 rounded-lg transition text-white font-medium
                            ${!isChecked
                                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed border border-zinc-700/50'
                                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-cyan-900/40 border border-cyan-500/50'}`}
                    >
                        Devam Et
                    </button>
                </div>
            </div>
        </div>
    );
};

const StyledWrapper = styled.div`
  .cyber-toggle-wrapper {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    position: relative;
  }

  .cyber-toggle-checkbox {
    position: absolute;
    opacity: 0;
    width: 0;
    height: 0;
  }

  .cyber-toggle {
    position: relative;
    display: inline-block;
    width: 64px;
    height: 32px;
    cursor: pointer;
  }

  .cyber-toggle-track {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #111;
    border-radius: 16px;
    overflow: hidden;
    box-shadow:
      0 4px 8px rgba(0, 0, 0, 0.5),
      inset 0 0 4px rgba(0, 0, 0, 0.8);
    transition: all 0.4s cubic-bezier(0.3, 1.5, 0.7, 1);
  }

  .cyber-toggle-track::before {
    content: "";
    position: absolute;
    inset: 2px;
    border-radius: 14px;
    background: #222;
    box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.5);
    z-index: 0;
    transition: all 0.4s ease;
  }

  .cyber-toggle-track-glow {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, #03e9f4, #4a00e0);
    opacity: 0;
    border-radius: 16px;
    z-index: 1;
    transition: all 0.4s ease;
  }

  .cyber-toggle-thumb {
    position: absolute;
    top: 4px;
    left: 4px;
    width: 24px;
    height: 24px;
    background: #151515;
    border-radius: 50%;
    z-index: 2;
    transition: all 0.4s cubic-bezier(0.3, 1.5, 0.7, 1);
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4);
  }

  .cyber-toggle-thumb-icon {
    position: absolute;
    inset: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 2;
    opacity: 0.7;
    transition: opacity 0.4s ease, transform 0.4s ease;
  }

  .cyber-toggle-thumb-icon svg {
    width: 14px;
    height: 14px;
    fill: #555;
    transition: fill 0.4s ease, transform 0.4s ease;
  }

  .cyber-toggle-track-dots {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding-right: 10px;
    z-index: 1;
  }

  .cyber-toggle-track-dot {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #444;
    margin-left: 3px;
    opacity: 0.5;
    transition: all 0.4s ease;
  }

  .cyber-toggle-particles {
    position: absolute;
    inset: 0;
    z-index: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .cyber-toggle-particle {
    position: absolute;
    width: 3px;
    height: 3px;
    background: #03e9f4;
    border-radius: 50%;
    opacity: 0;
    filter: blur(1px);
    transition: all 0.3s ease;
    box-shadow: 0 0 4px rgba(3, 233, 244, 0.8);
  }

  .cyber-toggle-particle:nth-child(1) { top: 15%; right: 20%; }
  .cyber-toggle-particle:nth-child(2) { top: 45%; right: 30%; }
  .cyber-toggle-particle:nth-child(3) { top: 25%; right: 40%; }
  .cyber-toggle-particle:nth-child(4) { top: 60%; right: 15%; }

  .cyber-toggle-labels {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-top: 8px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .cyber-toggle-label-off, .cyber-toggle-label-on {
    color: #555;
    transition: all 0.4s ease;
  }

  /* Aktif Durum */
  .cyber-toggle-checkbox:checked + .cyber-toggle .cyber-toggle-track-glow {
    opacity: 0.5;
  }

  .cyber-toggle-checkbox:checked + .cyber-toggle .cyber-toggle-thumb {
    left: calc(100% - 28px);
    background: #222;
  }

  .cyber-toggle-checkbox:checked + .cyber-toggle .cyber-toggle-thumb-icon {
    transform: rotate(360deg);
  }

  .cyber-toggle-checkbox:checked + .cyber-toggle .cyber-toggle-thumb-icon svg {
    fill: #03e9f4;
  }

  .cyber-toggle-checkbox:checked + .cyber-toggle .cyber-toggle-track-dot {
    background: #03e9f4;
    box-shadow: 0 0 4px #03e9f4;
    opacity: 1;
  }

  .cyber-toggle-checkbox:checked ~ .cyber-toggle-labels .cyber-toggle-label-on {
    color: #03e9f4;
    text-shadow: 0 0 5px rgba(3, 233, 244, 0.5);
  }

  .cyber-toggle-checkbox:checked + .cyber-toggle .cyber-toggle-particle {
    opacity: 1;
    animation: cyber-toggle-float 3s infinite alternate;
  }

  @keyframes cyber-toggle-float {
    0% { transform: translateY(0); }
    100% { transform: translateY(-4px); }
  }
`;

export default BotToggleConfirmModal;