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
    // 1. Yatay scroll domine ediyorsa (pan yapılıyordur), zoom yapma
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

    // 2. Standart zoom davranışı için preventDefault
    // Native sayfa scroll'unu engellemek istiyoruz.
    if (e.cancelable) e.preventDefault();

    const ts = timeScale;
    const logical = ts.coordinateToLogical(e.offsetX);
    const vr = ts.getVisibleLogicalRange();
    if (!vr) return;

    // İmlecin chart alanı dışına geldiği durumlar için orta noktaya fallback
    const cursor = (logical ?? (vr.from + vr.to) / 2);

    let from = vr.from;
    let to = vr.to;
    const currentBars = Math.max(1, to - from);
    const minBars = Math.max(1, minBarsFor(selectedPeriod));

    // 3. Delta normalizasyonu (Mouse vs Touchpad)
    // deltaMode 1 (Line) ise piksel cinsine çevir (yaklaşık 33px)
    let delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 33;

    // 4. Zoom faktörü hesaplama (Dinamik)
    // Eski sabit: %15 (0.85 / 1.15)
    // Yeni: Math.exp(delta * sensitivity)
    // Sensitivity: 0.0015 civarı, 100px scroll için ~%15 zoom verir.
    // Touchpad (delta ~1-5) için çok daha yumuşak (%0.1 - %0.7) olur.
    // delta > 0 (aşağı) -> zoom out (factor > 1)
    // delta < 0 (yukarı) -> zoom in (factor < 1)
    const sensitivity = 0.0015;
    const factor = Math.exp(delta * sensitivity);

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
