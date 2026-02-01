import React from 'react';
import styled from 'styled-components';


const Loader = () => {
  return (
    <StyledWrapper>
      <div className="main-container">
        <div className="loader">
          <svg viewBox="0 0 800 500" xmlns="http://www.w3.org/2000/svg">
            {/*Run bot butonu buraya gelecek*/}
            <g id="traces">
              <path d="M100 100 H200 V210 H326" className="trace-bg" />
              <path d="M100 100 H200 V210 H326" className="trace-flow blue2" />
              <path d="M80 180 H180 V230 H326" className="trace-bg" />
              <path d="M80 180 H180 V230 H326" className="trace-flow blue" />
              <path d="M60 260 H150 V250 H326" className="trace-bg" />
              <path d="M60 260 H150 V250 H326" className="trace-flow blue2" />
              <path d="M100 350 H200 V270 H326" className="trace-bg" />
              <path d="M100 350 H200 V270 H326" className="trace-flow blue" />
              <path d="M700 90 H560 V210 H474" className="trace-bg" />
              <path d="M700 90 H560 V210 H474" className="trace-flow blue" />
              <path d="M740 160 H580 V230 H474" className="trace-bg" />
              <path d="M740 160 H580 V230 H474" className="trace-flow blue2" />
              <path d="M720 250 H590 V250 H474" className="trace-bg" />
              <path d="M720 250 H590 V250 H474" className="trace-flow blue" />
              <path d="M680 340 H570 V270 H474" className="trace-bg" />
              <path d="M680 340 H570 V270 H474" className="trace-flow blue2" />
            </g>
            <g>
              <rect x={322} y={205} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={322} y={225} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={322} y={245} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={322} y={265} width={8} height={10} fill="url(#pinGradient)" rx={2} />
            </g>
            <g>
              <rect x={470} y={205} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={470} y={225} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={470} y={245} width={8} height={10} fill="url(#pinGradient)" rx={2} />
              <rect x={470} y={265} width={8} height={10} fill="url(#pinGradient)" rx={2} />
            </g>
            <text x={400} y={240} fontFamily="Arial, sans-serif" fontSize={22} fill="url(#textGradient)" textAnchor="middle" alignmentBaseline="middle">
              Loading
            </text>
            <circle cx={100} cy={100} r={5} fill="black" />
            <circle cx={80} cy={180} r={5} fill="black" />
            <circle cx={60} cy={260} r={5} fill="black" />
            <circle cx={100} cy={350} r={5} fill="black" />
            <circle cx={700} cy={90} r={5} fill="black" />
            <circle cx={740} cy={160} r={5} fill="black" />
            <circle cx={720} cy={250} r={5} fill="black" />
            <circle cx={680} cy={340} r={5} fill="black" />
          </svg>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .main-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
  }

  .loader {
    width: 45%;
  }

  .trace-bg {
    stroke: #252525;
    stroke-width: 3;
    fill: none;
  }

  .trace-flow {
    stroke-width: 3;
    fill: none;
    stroke-dasharray: 20 200; 
    stroke-dashoffset: 220; 
    filter: drop-shadow(0 0 8px currentColor);
    animation: flow 4s linear infinite; 
  }

  /* Renk sınıflarını birleştirdik */
  .blue, .blue2 {
    stroke: #5aeb3f;
    color: #5aeb3f;
  }

  @keyframes flow {
    from {
      stroke-dashoffset: 440; 
    }
    to {
      stroke-dashoffset: 0;
    }
  }

  /* Çip ve Bileşen Tasarımları */
  .chip-body {
    rx: 20;
    ry: 20;
  }

  .chip-text {
    font-weight: bold;
    letter-spacing: 1px;
  }

  .chip-pin {
    stroke: #444;
    stroke-width: 0.5;
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.6));
  }`;

export default Loader;
