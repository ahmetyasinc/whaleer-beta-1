// utils/rulerTool.js
// Ruler: SVG overlay (line + translucent rectangle + guides + arrowheads)
// - Clears on zoom/scroll pan and when ruler mode turns OFF
// - Result card i18n destekli, yeşil/kırmızı değişim rengi korunur

import i18n from "@/i18n";

export function installRulerTool({ chart, series, container, isRulerModeRef }) {
  if (!chart || !series || !container) return () => {};

  // i18n helper
  const tr = (k, o) => i18n.t(`ruler:${k}`, o);

  // Ensure container is positioned
  try {
    if (!container.style.position) container.style.position = "relative";
  } catch {}

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

  // Interaction lock while measuring
  let savedHandleScale = null;
  let savedHandleScroll = null;

  function lockInteractions() {
    const opts = chart.options ? chart.options() : {};
    savedHandleScale = opts?.handleScale ?? { axisPressedMouseMove: true, mouseWheel: true, pinch: true };
    savedHandleScroll = opts?.handleScroll ?? { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true };
    chart.applyOptions({
      handleScale: false,
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: true,
        horzTouchDrag: false,
        vertTouchDrag: false,
      },
    });
  }
  function unlockInteractions() {
    chart.applyOptions({
      handleScale: savedHandleScale ?? false,
      handleScroll: savedHandleScroll ?? { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
    });
    savedHandleScale = null; savedHandleScroll = null;
  }

  // ---------- Overlay (info card) ----------
  function ensureOverlayBox() {
    if (overlayBox) return overlayBox;
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.pointerEvents = "none";
    el.style.background = "rgba(16,24,40,0.92)"; // dark navy (not pure black)
    el.style.color = "#e5e7eb";
    el.style.padding = "8px 12px";
    el.style.fontSize = "12px";
    el.style.borderRadius = "8px";
    el.style.zIndex = "9999";
    el.style.boxShadow = "0 6px 16px rgba(0,0,0,0.35)";
    container.appendChild(el);
    overlayBox = el;
    return overlayBox;
  }
  function removeOverlayBox() {
    if (overlayBox) { try { overlayBox.remove(); } catch {} overlayBox = null; }
  }
  function setOverlayHtml(html, x, y) {
    const el = ensureOverlayBox();
    el.innerHTML = html;
    el.style.left = `${x + 12}px`;
    el.style.top  = `${y + 12}px`;
  }

  // ---------- SVG + shapes ----------
  const LINE_COLOR = "rgb(100,180,255)";
  function ensureSvg() {
    if (svg && line && rect && vGuide && hGuide) return { svg, line, rect, vGuide, hGuide };
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
      startPath.setAttribute("fill", LINE_COLOR);
      mkStart.appendChild(startPath);

      // End marker
      const mkEnd = document.createElementNS("http://www.w3.org/2000/svg", "marker");
      mkEnd.setAttribute("id", "rulerArrowEnd");
      mkEnd.setAttribute("viewBox", "0 0 10 10");
      mkEnd.setAttribute("refX", "7");
      mkEnd.setAttribute("refY", "5");
      mkEnd.setAttribute("markerWidth", "4");
      mkEnd.setAttribute("markerHeight", "4");
      mkEnd.setAttribute("orient", "auto-start-reverse");
      const endPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      endPath.setAttribute("d", "M0 0 L10 5 L0 10 Z");
      endPath.setAttribute("fill", LINE_COLOR);
      mkEnd.appendChild(endPath);

      defs.appendChild(mkStart); defs.appendChild(mkEnd);
      svg.appendChild(defs);
    }
    if (!rect) {
      rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("fill", "rgba(100,180,255,0.15)");
      rect.setAttribute("stroke", "rgba(100,180,255,0.5)");
      rect.setAttribute("stroke-width", "1");
      rect.setAttribute("stroke-dasharray", "4,4");
      svg.appendChild(rect);
    }
    if (!line) {
      line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("stroke", LINE_COLOR);
      line.setAttribute("stroke-width", "2");
      line.setAttribute("stroke-dasharray", "6,6");
      line.setAttribute("stroke-linecap", "round");
      line.setAttribute("marker-start", "url(#rulerArrowStart)");
      line.setAttribute("marker-end", "url(#rulerArrowEnd)");
      svg.appendChild(line);
    }
    if (!vGuide) {
      vGuide = document.createElementNS("http://www.w3.org/2000/svg", "line");
      vGuide.setAttribute("stroke", "rgba(255,255,255,0.25)");
      vGuide.setAttribute("stroke-width", "1");
      vGuide.setAttribute("stroke-dasharray", "3,3");
      svg.appendChild(vGuide);
    }
    if (!hGuide) {
      hGuide = document.createElementNS("http://www.w3.org/2000/svg", "line");
      hGuide.setAttribute("stroke", "rgba(255,255,255,0.25)");
      hGuide.setAttribute("stroke-width", "1");
      hGuide.setAttribute("stroke-dasharray", "3,3");
      svg.appendChild(hGuide);
    }
    return { svg, line, rect, vGuide, hGuide };
  }
  function drawAllPx(p1, p2) {
    const { line, rect, vGuide, hGuide } = ensureSvg();
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
    // Guides (reference p2)
    vGuide.setAttribute("x1", String(p2.x));
    vGuide.setAttribute("y1", "0");
    vGuide.setAttribute("x2", String(p2.x));
    vGuide.setAttribute("y2", "100%");
    hGuide.setAttribute("x1", "0");
    hGuide.setAttribute("y1", String(p2.y));
    hGuide.setAttribute("x2", "100%");
    hGuide.setAttribute("y2", String(p2.y));
  }
  function clearShapes() {
    hasFinalShape = false;
    if (svg) {
      for (const el of [line, rect, vGuide, hGuide]) {
        if (el) { try { svg.removeChild(el); } catch {} }
      }
      line = rect = vGuide = hGuide = null;
    }
  }
  function removeSvg() {
    clearShapes();
    if (svg) { try { svg.remove(); } catch {} svg = null; }
  }

  // ---------- Helpers ----------
  function fmtDuration(sec) {
    const s = Math.max(0, Math.floor(sec));
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
    const uh = tr("units.h"), um = tr("units.m"), us = tr("units.s");
    if (h) return `${h}${uh} ${m}${um} ${r}${us}`;
    if (m) return `${m}${um} ${r}${us}`;
    return `${r}${us}`;
  }
  function compute(param) {
    if (!param || !param.point) return null;
    let time = null;
    if (param.time != null) time = Number(param.time);
    else {
      try { const t = timeScale.coordinateToTime(param.point.x); if (t != null) time = Number(t); } catch {}
    }
    if (!Number.isFinite(time)) return null;
    let price = param.seriesPrices?.get?.(series);
    if (price == null && typeof series.coordinateToPrice === "function") price = series.coordinateToPrice(param.point.y);
    if (price == null) {
      try {
        const psR = chart.priceScale && chart.priceScale("right");
        const psL = chart.priceScale && chart.priceScale("left");
        if (psR?.coordinateToPrice) price = psR.coordinateToPrice(param.point.y);
        else if (psL?.coordinateToPrice) price = psL.coordinateToPrice(param.point.y);
      } catch {}
    }
    if (!Number.isFinite(price)) return null;
    return { time: Number(time), price: Number(price), point: param.point };
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
    const positive = pct >= 0;
    const pctColor = positive ? "#18b26b" : "#e74c3c";
    const title = live ? tr("titleLive") : tr("title");
    return `
      <div style="min-width:220px;display:grid;gap:6px;">
        <div style="font-weight:700;letter-spacing:.3px;">${title}</div>
        <div>${tr("fields.start")}: <b>${a.price.toFixed(4)}</b></div>
        <div>${tr("fields.end")}: <b>${b.price.toFixed(4)}</b></div>
        <div>${tr("fields.change")}: <b style="color:${pctColor}">${positive ? "▲" : "▼"} ${pct.toFixed(2)}%</b> (${dPrice.toFixed(4)})</div>
        <div>${tr("fields.duration")}: <b>${fmtDuration(dSec)}</b></div>
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
    unlockInteractions();
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
        `<div style="font-weight:700;margin-bottom:4px;">${tr("title")}</div><div>${tr("fields.start")}: <b>${start.price.toFixed(4)}</b></div>`,
        start.point.x, start.point.y
      );
      lockInteractions();
      return;
    }

    // Second point → finalize (keep shapes)
    const end = cur;
    const p1 = toPx(start), p2 = toPx(end);
    if (p1 && p2) {
      drawAllPx(p1, p2);
      hasFinalShape = true;
    }
    setOverlayHtml(measureHTML(start, end, { live: false }), end.point.x, end.point.y);
    unlockInteractions();
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
    try { chart.unsubscribeClick(onClick); } catch {}
    try { chart.unsubscribeCrosshairMove(onMoveThrottled); } catch {}
    try { container.removeEventListener("contextmenu", onRightClick); } catch {}
    try { container.removeEventListener("mousedown", onMouseDown); } catch {}
    try { window.removeEventListener("mouseup", onMouseUp); } catch {}
    try { container.removeEventListener("mousemove", onMouseMovePanDetect); } catch {}
    try { timeScale.unsubscribeVisibleTimeRangeChange(onVisibleRangeChanged); } catch {}
    if (moveRafId) cancelAnimationFrame(moveRafId);
    if (watchId) cancelAnimationFrame(watchId);
    removeOverlayBox();
    removeSvg();
    start = null; hasFinalShape = false;
    unlockInteractions();
  };
}
