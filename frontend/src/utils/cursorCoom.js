// utils/cursorZoom.js
import { nextSeq, setLastRangeCache, RANGE_EVENT, FUTURE_PADDING_BARS, minBarsFor } from "@/utils/chartSync";

export function installCursorWheelZoom({
  chart,
  chartId,
  selectedPeriod,
  containerEl,
  isApplyingRef,
  lastSeqAppliedRef,
}) {
  const timeScale = chart.timeScale();

  // Kütüphanenin kendi wheel zoom'unu kapat
  chart.applyOptions({
    handleScale: { mouseWheel: false, pinch: true },
    handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
  });

  const onWheelZoom = (e) => {
    // Sadece dikey wheel’e tepki verelim; touchpad “pinch-zoom” zaten açık
    if (!e || typeof e.deltaY !== "number") return;

    // Scroll yerine zoom davranışı istiyoruz → varsayılanı engelle
    e.preventDefault();

    const ts = timeScale;
    const logical = ts.coordinateToLogical(e.offsetX);
    const vr = ts.getVisibleLogicalRange();
    if (!vr) return;

    // İmlecin chart alanı dışına geldiği durumlar için orta noktaya fallback
    const cursor = (logical ?? (vr.from + vr.to) / 2);

    let from = vr.from;
    let to = vr.to;
    const currentBars = Math.max(1, to - from);
    const minBars = Math.max(1, minBarsFor(selectedPeriod)); // sizde 50

    // Zoom hızı (negatif deltaY → zoom in)
    const zoomIn = e.deltaY < 0;
    const factor = zoomIn ? 0.85 : 1.15; // %15 adım
    let newBars = currentBars * factor;

    // Aşırı yaklaşmayı engelle
    if (newBars < minBars) newBars = minBars;

    // İmleç oranını koru: cursor, görünür aralık içinde hangi yüzde?
    const leftRatio = (cursor - from) / currentBars; // 0..1 arası

    let newFrom = cursor - leftRatio * newBars;
    let newTo = newFrom + newBars;

    // Sağdaki geleceğe olan boşluğu koru (rightOffset)
    const rightOffset = ts.getRightOffset ? ts.getRightOffset() : FUTURE_PADDING_BARS;

    // Uygula (yayınlama guard’ı)
    isApplyingRef.current = true;
    if (rightOffset != null) ts.applyOptions({ rightOffset });
    ts.setVisibleLogicalRange({ from: newFrom, to: newTo });
    requestAnimationFrame(() => { isApplyingRef.current = false; });

    // Cache & broadcast (lider sizseniz diğer paneller sizi takip etsin)
    const payload = { from: newFrom, to: newTo, rightOffset, sourceId: chartId };
    setLastRangeCache(payload);
    const seq = nextSeq();
    window.dispatchEvent(new CustomEvent(RANGE_EVENT, { detail: { ...payload, seq } }));
  };

  // Pasif olmamalı (preventDefault için)
  containerEl.addEventListener("wheel", onWheelZoom, { passive: false });

  return () => containerEl.removeEventListener("wheel", onWheelZoom);
}
