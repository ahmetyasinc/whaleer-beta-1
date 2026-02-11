// utils/rulerTool.js
// Ruler: SVG overlay (line + translucent rectangle + guides + arrowheads)
// - Clears on zoom/scroll pan and when ruler mode turns OFF
// - Result card i18n destekli, yeşil/kırmızı değişim rengi korunur

import i18n from "@/i18n";

export function installRulerTool({ chart, series, container, isRulerModeRef, onComplete, isMagnetModeRef }) {
  if (!chart || !series || !container) return () => { };

  // i18n helper
  const tr = (k, o) => i18n.t(`ruler:${k}`, o);

  // Ensure container is positioned
  try {
    if (!container.style.position) container.style.position = "relative";
  } catch { }

  const timeScale = chart.timeScale();

  // State
  let start = null;            // { time, price, point:{x,y} }
  let overlayBox = null;       // info box
  let svg = null;              // drawing surface
  let line = null;             // main diagonal line
  let rect = null;             // translucent area
  let vGuide = null;           // vertical guide
  let hGuide = null;           // horizontal guide
  let moveQueued = null;
  let moveRafId = null;
  let hasFinalShape = false;



  // ---------- Overlay (info card) ----------
  function ensureOverlayBox() {
    if (overlayBox) return overlayBox;
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.pointerEvents = "none";
    el.style.background = "#2883c8"; // dark navy (not pure black)
    el.style.color = "#ffffff";
    el.style.padding = "8px 12px";
    el.style.fontSize = "12px";
    el.style.borderRadius = "4px";
    el.style.zIndex = "9999";
    el.style.boxShadow = "0 6px 16px rgba(0,0,0,0.35)";
    el.style.whiteSpace = "nowrap";
    container.appendChild(el);
    overlayBox = el;
    return overlayBox;
  }
  function removeOverlayBox() {
    if (overlayBox) { try { overlayBox.remove(); } catch { } overlayBox = null; }
  }
  function setOverlayHtml(html, x, y) {
    const el = ensureOverlayBox();
    el.innerHTML = html;
    el.style.left = `${x + 4}px`;
    el.style.top = `${y + 4}px`;
  }

  // ---------- SVG + shapes ----------
  const LINE_COLOR_POS = "rgb(100,180,255)";
  const LINE_COLOR_NEG = "rgb(255,100,100)";

  function setRulerColor(isPositive) {
    const color = isPositive ? LINE_COLOR_POS : LINE_COLOR_NEG;
    // setRulerColor(positive); // Infinite recursion bug, removing this line

    if (line) {
      line.setAttribute("stroke", color);
    }
    if (rect) {
      rect.setAttribute("fill", isPositive ? "rgba(100,180,255,1)" : "rgba(255,100,100,0.15)");
      // No stroke for rect
    }
    if (svg) {
      const startArrow = svg.querySelector("#rulerArrowStart path");
      const endArrow = svg.querySelector("#rulerArrowEnd path");
      if (startArrow) startArrow.setAttribute("fill", color);
      if (endArrow) endArrow.setAttribute("fill", color);
    }
  }

  function ensureSvg() {
    if (svg && line && rect) return { svg, line, rect };
    if (!svg) {
      svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      svg.style.position = "absolute";
      svg.style.left = "0"; svg.style.top = "0";
      svg.style.width = "100%"; svg.style.height = "100%";
      svg.style.pointerEvents = "none";
      svg.style.zIndex = "9998";
      container.appendChild(svg);

      // Arrowheads (reversed direction + smaller)
      const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");

      // Start marker
      const mkStart = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      mkStart.setAttribute("id", "rulerArrowStart");
      mkStart.setAttribute("viewBox", "0 0 10 10");
      mkStart.setAttribute("refX", "3");
      mkStart.setAttribute("refY", "5");
      mkStart.setAttribute("markerWidth", "4");
      mkStart.setAttribute("markerHeight", "4");
      mkStart.setAttribute("orient", "auto");
      const startPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      startPath.setAttribute("d", "M0 0 L10 5 L0 10 Z");
      startPath.setAttribute("fill", LINE_COLOR_POS);
      mkStart.appendChild(startPath);

      // End marker
      const mkEnd = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      mkEnd.setAttribute("id", "rulerArrowEnd");
      mkEnd.setAttribute("viewBox", "0 0 10 10");
      mkEnd.setAttribute("refX", "7");
      mkEnd.setAttribute("refY", "5");
      mkEnd.setAttribute("markerWidth", "3");
      mkEnd.setAttribute("markerHeight", "3");
      mkEnd.setAttribute("orient", "auto-start-reverse");
      const endPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      endPath.setAttribute("d", "M0 0 L10 5 L0 10 Z");
      endPath.setAttribute("fill", LINE_COLOR_POS);
      mkEnd.appendChild(endPath);

      defs.appendChild(mkStart); defs.appendChild(mkEnd);
      svg.appendChild(defs);
    }
    if (!rect) {
      rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("fill", "rgba(100,180,255,0.12)");
      // No stroke
      svg.appendChild(rect);
    }
    if (!line) {
      line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("stroke", LINE_COLOR_POS);
      line.setAttribute("stroke-width", "1");
      line.setAttribute("stroke-dasharray", "4,4");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("marker-start", "url(#rulerArrowStart)");
      line.setAttribute("marker-end", "url(#rulerArrowEnd)");
      svg.appendChild(line);
    }
    // No guides
    return { svg, line, rect };
  }

  function drawAllPx(p1, p2) {
    const { line, rect } = ensureSvg();
    // Main diagonal line
    line.setAttribute("x1", String(p1.x));
    line.setAttribute("y1", String(p1.y));
    line.setAttribute("x2", String(p2.x));
    line.setAttribute("y2", String(p2.y));
    // Rectangle
    const x = Math.min(p1.x, p2.x);
    const y = Math.min(p1.y, p2.y);
    rect.setAttribute("x", String(x));
    rect.setAttribute("y", String(y));
    rect.setAttribute("width", String(Math.abs(p2.x - p1.x)));
    rect.setAttribute("height", String(Math.abs(p2.y - p1.y)));
    // No guides update
  }
  function clearShapes() {
    hasFinalShape = false;
    if (svg) {
      for (const el of [line, rect, vGuide, hGuide]) {
        if (el) { try { svg.removeChild(el); } catch { } }
      }
      line = rect = vGuide = hGuide = null;
    }
  }
  function removeSvg() {
    clearShapes();
    if (svg) { try { svg.remove(); } catch { } svg = null; }
  }

  // ---------- Helpers ----------
  function fmtDuration(sec) {
    const s = Math.max(0, Math.floor(sec));

    const d = Math.floor(s / 86400); // gün
    const h = Math.floor((s % 86400) / 3600); // saat
    const m = Math.floor((s % 3600) / 60);   // dakika

    const ud = tr("units.d");
    const uh = tr("units.h");
    const um = tr("units.m");

    if (d) return `${d}${ud} ${h}${uh} ${m}${um}`;
    if (h) return `${h}${uh} ${m}${um}`;
    return `${m}${um}`;
  }


  function compute(param) {
    if (!param || !param.point) return null;
    let time = null;
    if (param.time != null) time = Number(param.time);
    else {
      try { const t = timeScale.coordinateToTime(param.point.x); if (t != null) time = Number(t); } catch { }
    }
    if (!Number.isFinite(time)) return null;

    let price = null;
    // --- Magnet Snap Logic ---
    if (isMagnetModeRef?.current && series && param.seriesData) {
      const data = param.seriesData.get(series);
      if (data) {
        if (data.open !== undefined) {
          // OHLC
          const rawPrice = series.coordinateToPrice(param.point.y);
          if (rawPrice != null) {
            const { open, high, low, close } = data;
            const candidates = [open, high, low, close];
            let closest = close;
            let minDiff = Math.abs(rawPrice - close);
            for (const c of candidates) {
              const diff = Math.abs(rawPrice - c);
              if (diff < minDiff) { minDiff = diff; closest = c; }
            }
            price = closest;
          }
        } else if (typeof data.value === 'number') {
          // Line/Area
          price = data.value;
        }
      }
    }

    // Default price logic if no snap
    if (price == null) {
      price = param.seriesPrices?.get?.(series);
      if (price == null && typeof series.coordinateToPrice === "function") price = series.coordinateToPrice(param.point.y);
      if (price == null) {
        try {
          const psR = chart.priceScale && chart.priceScale("right");
          const psL = chart.priceScale && chart.priceScale("left");
          if (psR?.coordinateToPrice) price = psR.coordinateToPrice(param.point.y);
          else if (psL?.coordinateToPrice) price = psL.coordinateToPrice(param.point.y);
        } catch { }
      }
    }

    if (!Number.isFinite(price)) return null;
    // Logical index for bar counting
    let logical = param.logical;
    if (logical == null && timeScale.coordinateToLogical) {
      logical = timeScale.coordinateToLogical(param.point.x);
    }
    return { time: Number(time), price: Number(price), point: param.point, logical: Number(logical ?? 0) };
  }
  function toPx(a) {
    const x = timeScale.timeToCoordinate(a.time);
    const y = series.priceToCoordinate(a.price);
    if (x == null || y == null) return null;
    return { x, y };
  }
  function measureHTML(a, b, { live = false } = {}) {
    const dPrice = b.price - a.price;
    const pct = (dPrice / a.price) * 100;
    const dSec = Math.abs(b.time - a.time);
    const dBars = Math.round(Math.abs(b.logical - a.logical));
    const positive = pct >= 0;
    const pctColor = positive ? "#3ae809" : "#c22121";
    const title = live ? tr("titleLive") : tr("title");
    return `
      <div style="display:grid;gap:6px;text-align:center">
        <div>${tr("fields.change")}: <b style="color:${pctColor}">${positive ? "▲" : "▼"} ${pct.toFixed(2)}%</b> (${dPrice.toFixed(2)})</div>
        <div>${tr("fields.duration")}: <b>${fmtDuration(dSec)}</b></div>
        <div>${tr("fields.bars")}: <b>${dBars}</b></div>
      </div>`;
  }

  // ---------- Pan detection (auto close on pan) ----------
  let panDetect = { isDown: false, startX: 0, startY: 0 };
  const PAN_THRESHOLD = 6; // px
  function onMouseDown(e) {
    if (!isRulerModeRef?.current) return;
    if (e.button !== 0) return;
    panDetect.isDown = true; panDetect.startX = e.clientX; panDetect.startY = e.clientY;
  }
  function onMouseUp() { panDetect.isDown = false; }
  function onMouseMovePanDetect(e) {
    if (!isRulerModeRef?.current || !panDetect.isDown) return;
    const dx = Math.abs(e.clientX - panDetect.startX);
    const dy = Math.abs(e.clientY - panDetect.startY);
    if (dx > PAN_THRESHOLD || dy > PAN_THRESHOLD) closeRulerArtifacts();
  }

  // ---------- Auto close helpers ----------
  function closeRulerArtifacts() {
    start = null;
    removeOverlayBox();
    clearShapes();
    clearShapes();
  }

  // Close on zoom/scroll range changes
  function onVisibleRangeChanged() {
    // Any external zoom/scroll (or programmatic) → clear if active/visible
    if (start || hasFinalShape) {
      closeRulerArtifacts();
      hasFinalShape = false;
    }
  }
  timeScale.subscribeVisibleTimeRangeChange(onVisibleRangeChanged);

  // ---------- Event handlers ----------
  function onClick(param) {
    if (!isRulerModeRef?.current) return;

    const cur = compute(param);

    // If result is on screen and user clicks again, clear
    if (!start && hasFinalShape) {
      closeRulerArtifacts();
      hasFinalShape = false;
      return;
    }
    if (!cur) return;

    // First point → start measuring
    if (!start) {
      start = cur;
      clearShapes();
      setOverlayHtml(
        `<div style="
            font-weight:700;
            margin-bottom:4px;
            background:rgba(255,0,0,0.15);
            padding:6px 10px;
            border-radius:6px;
          ">
            ${tr("title")}
          </div>
          <div style="
            background:rgba(255,0,0,0.15);
            padding:4px 10px;
            border-radius:6px;
          ">
            ${tr("fields.start")}: <b>${start.price.toFixed(4)}</b>
          </div>`,
        start.point.x,
        start.point.y
      );


      return;
    }

    // Second point → finalize (keep shapes)
    const end = cur;
    const p1 = toPx(start), p2 = toPx(end);
    if (p1 && p2) {
      drawAllPx(p1, p2);
      hasFinalShape = true;
      onComplete?.();
    }
    setOverlayHtml(measureHTML(start, end, { live: false }), end.point.x, end.point.y);
    // unlockInteractions() removed
    start = null;
  }

  function applyMove(param) {
    if (!isRulerModeRef?.current || !start) return;
    const cur = compute(param);
    if (!cur) return;
    const p1 = toPx(start), p2 = toPx(cur);
    if (p1 && p2) { drawAllPx(p1, p2); hasFinalShape = false; }
    setOverlayHtml(
      measureHTML(start, cur, { live: true }),
      cur.point.x, cur.point.y
    );
  }
  function onMoveThrottled(param) {
    moveQueued = param;
    if (moveRafId) return;
    moveRafId = requestAnimationFrame(() => {
      moveRafId = null;
      const p = moveQueued; moveQueued = null;
      applyMove(p);
    });
  }
  function onRightClick() {
    if (!isRulerModeRef?.current) return;
    closeRulerArtifacts(); hasFinalShape = false;
  }

  // Auto close when Ruler OFF (watch ref)
  let lastRulerOn = !!(isRulerModeRef && isRulerModeRef.current);
  let watchId = null;
  function watchRulerMode() {
    const cur = !!(isRulerModeRef && isRulerModeRef.current);
    if (lastRulerOn && !cur) {
      closeRulerArtifacts();
      hasFinalShape = false;
    }
    lastRulerOn = cur;
    watchId = requestAnimationFrame(watchRulerMode);
  }
  watchId = requestAnimationFrame(watchRulerMode);

  // Subscriptions
  chart.subscribeClick(onClick);
  chart.subscribeCrosshairMove(onMoveThrottled);
  container.addEventListener("contextmenu", onRightClick);
  container.addEventListener("mousedown", onMouseDown);
  window.addEventListener("mouseup", onMouseUp);
  container.addEventListener("mousemove", onMouseMovePanDetect);

  // Cleanup
  return () => {
    try { chart.unsubscribeClick(onClick); } catch { }
    try { chart.unsubscribeCrosshairMove(onMoveThrottled); } catch { }
    try { container.removeEventListener("contextmenu", onRightClick); } catch { }
    try { container.removeEventListener("mousedown", onMouseDown); } catch { }
    try { window.removeEventListener("mouseup", onMouseUp); } catch { }
    try { container.removeEventListener("mousemove", onMouseMovePanDetect); } catch { }
    try { timeScale.unsubscribeVisibleTimeRangeChange(onVisibleRangeChanged); } catch { }
    if (moveRafId) cancelAnimationFrame(moveRafId);
    if (watchId) cancelAnimationFrame(watchId);
    removeOverlayBox();
    removeSvg();
    start = null; hasFinalShape = false;
    start = null; hasFinalShape = false;
  };
}
