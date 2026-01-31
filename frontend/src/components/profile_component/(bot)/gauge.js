import React, { useState, useRef } from 'react';
import { createPortal } from "react-dom";
import { GrCircleQuestion } from "react-icons/gr";
import { useTranslation } from "react-i18next";

/* ---- Portal Tooltip Component ---- */
const PortalTooltip = ({ children, content }) => {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const showTooltip = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top - 10,
        left: rect.left + rect.width / 2
      });
      setVisible(true);
    }
  };

  const hideTooltip = () => setVisible(false);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-flex items-center"
      >
        {children}
      </div>
      {visible && createPortal(
        <div
          className="fixed z-[9999] -translate-x-1/2 -translate-y-full w-48 p-2 bg-black border border-zinc-700 rounded-md shadow-xl text-xs text-zinc-300 text-center leading-relaxed pointer-events-none animate-in fade-in zoom-in-95 duration-150"
          style={{ top: coords.top, left: coords.left }}
        >
          {content}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black border-r border-b border-zinc-700 rotate-45"></div>
        </div>,
        document.body
      )}
    </>
  );
};

const Gauge = ({ value = 0, label = "Güç Puanı", isEligible = false }) => {
  const { t } = useTranslation("botCard");
  const constrainedValue = Math.min(Math.max(value, 0), 100);
  const rotation = (constrainedValue / 100) * 180 - 90;

  const step = Math.floor(constrainedValue / 4);
  const hue = step * (120 / 25);
  const dynamicColor = `hsl(${hue}, 100%, 50%)`;

  return (
    <div className="gauge-container">
      <div className="gauge-outer">
        {/* Yarım Daire (Track) */}
        <div className="gauge-body"></div>

        {/* Sayılar */}
        <div className="gauge-ticks">
          {[0, 25, 50, 75, 100].map((tick) => (
            <span key={tick} className={`tick tick-${tick}`}>{tick}</span>
          ))}
        </div>

        {/* İbre (Neon Ok) */}
        <div
          className="gauge-needle"
          style={{ transform: `rotate(${rotation}deg)` }}
        ></div>
      </div>

      {/* Bilgi Alanı */}
      <div className="gauge-info">
        <div className="gauge-value">
          {constrainedValue}
        </div>
        <div className="gauge-label flex items-center justify-center gap-1">
          {label}
          <PortalTooltip content={t("performance.powerPointTooltip")}>
            <GrCircleQuestion className="text-zinc-500 hover:text-cyan-400 cursor-pointer text-[17px]" />
          </PortalTooltip>
        </div>
      </div>

      <style jsx>{`
        .gauge-container {
          width: 120px;
          margin: 10px auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          font-family: 'Segoe UI', Roboto, sans-serif;
          background: transparent;
        }

        .gauge-outer {
          position: relative;
          width: 100px;
          height: 50px;
          overflow: visible;
        }

        .gauge-body {
          width: 100%;
          height: 100px;
          border: 8px solid rgba(67, 67, 75);
          border-bottom-color: transparent;
          border-radius: 50%;
          box-sizing: border-box;
          position: absolute;
          top: 0;
          left: 0;
        }

        /* --- YUVARLAK UÇLAR --- */
        .gauge-body::before,
        .gauge-body::after {
          content: "";
          position: absolute;
          width: 8px; /* Border kalınlığı ile aynı olmalı */
          height: 8px;
          background-color: rgba(67, 67, 75); /* Track rengi ile aynı */
          border-radius: 50%;
          bottom: ${isEligible ? '10%' : '11%'}; /* Tam orta çizgiye hizala */
          transform: translateY(50%);
        }

        .gauge-body::before {
          left: 6px; /* Sol uç */
        }

        .gauge-body::after {
          right: 6px; /* Sağ uç */
        }
        /* ---------------------- */

        .gauge-needle {
          width: 3px;
          height: 40px;
          background: ${dynamicColor};
          position: absolute;
          bottom: 0;
          left: calc(50% - 1.5px);
          transform-origin: bottom center;
          transition: transform 1s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
          border-radius: 10px;
          box-shadow: 0 0 8px ${dynamicColor}, 0 0 15px ${dynamicColor};
        }

        .gauge-needle::after {
          content: "";
          position: absolute;
          bottom: -3px;
          left: -3px;
          width: 8px;
          height: 8px;
          background: ${dynamicColor};
          border-radius: 50%;
          box-shadow: 0 0 10px ${dynamicColor};
        }

        .gauge-ticks {
          position: absolute;
          width: 100%;
          height: 100%;
          z-index: 5;
          font-size: 9px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
        }

        .tick { position: absolute; }
        .tick-0 { bottom: -12px; left: -8px; }
        .tick-25 { top: 5px; left: 3px; }
        .tick-50 { top: -13px; left: calc(50% - 8px); }
        .tick-75 { top: 5px; right: 5px; }
        .tick-100 { bottom: -12px; right: -15px; }

        .gauge-info {
          text-align: center;
          margin-top: 10px;
        }

        .gauge-value {
          font-size: 1.5rem;
          font-weight: 200;
          color: ${dynamicColor};
          text-shadow: 0 0 10px ${dynamicColor};
        }

        .gauge-label {
          font-size: 0.8rem;
          color: #aaa;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
      `}</style>
    </div>
  );
};

export default Gauge;