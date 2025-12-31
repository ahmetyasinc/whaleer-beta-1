'use client';

import { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";

export default function PnLChart({ data }) {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  // ----- Timezone helpers -----
  const pad = (n) => String(n).padStart(2, '0');

  function getCookie(name) {
    if (typeof document === 'undefined') return null;
    const m = document.cookie.split('; ').find(row => row.startsWith(name + '='));
    return m ? decodeURIComponent(m.split('=')[1]) : null;
  }

  function parseGmtToMinutes(tzStr) {
    // "GMT+1", "GMT-3", "GMT+5:30" desteklenir
    const m = /^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec((tzStr || '').trim());
    if (!m) return 0; // default GMT+0
    const sign = m[1] === '-' ? -1 : 1;
    const h = parseInt(m[2] || '0', 10);
    const mins = parseInt(m[3] || '0', 10);
    return sign * (h * 60 + mins);
  }

  function readTimezoneOffsetMinutesFromCookie() {
    try {
      const raw = getCookie('wh_settings');
      if (!raw) return 0; // GMT+0
      const obj = JSON.parse(raw);
      return parseGmtToMinutes(obj?.timezone || 'GMT+0');
    } catch {
      return 0; // parse hatası → GMT+0
    }
  }
  // t → business day ({year,month,day}) veya UNIX saniye (number)
  function timeToZonedDate(t, offsetMinutes) {
    let msUTC;
    if (t && typeof t === 'object' && 'year' in t && 'month' in t && 'day' in t) {
      msUTC = Date.UTC(t.year, t.month - 1, t.day, 0, 0, 0);
    } else {
      const sec = (typeof t === 'number' ? t : 0);
      msUTC = sec * 1000;
    }
    return new Date(msUTC + (offsetMinutes || 0) * 60 * 1000);
  }

  // Veri zaman aralığından periyodu sez (dakika/saat/gün/hafta)
  function inferPeriodFromData(arr) {
    if (!Array.isArray(arr) || arr.length < 2) return '1h'; // makul varsayılan
    // {time, value} bekliyoruz; time UNIX saniye
    const times = arr
      .map(d => (d && typeof d.time === 'number' ? d.time : null))
      .filter(t => t != null)
      .sort((a, b) => a - b);
    if (times.length < 2) return '1h';
    const deltas = [];
    for (let i = 1; i < times.length; i++) {
      const dt = times[i] - times[i - 1];
      if (dt > 0 && Number.isFinite(dt)) deltas.push(dt);
    }
    if (!deltas.length) return '1h';
    // medyan delta
    deltas.sort((a, b) => a - b);
    const mid = Math.floor(deltas.length / 2);
    const median = deltas.length % 2 ? deltas[mid] : (deltas[mid - 1] + deltas[mid]) / 2;

    // Sınırlar (saniye): <3600 → dakika, <86400 → saat, <7g → gün, aksi → hafta
    if (median < 3600) return '5m';         // dakikalık ölçek → yıl yok
    if (median < 86400) return '1h';        // saatlik → yy göster
    if (median < 86400 * 7) return '1d';    // günlük → yy göster
    return '1w';                             // haftalık → yy göster
  }

  // Saatlik ve daha uzun periyotlarda iki haneli yıl (yy) gösterir
  function makeZonedFormatter(period, offsetMinutes) {
    const isMins = ['1m', '3m', '5m', '15m', '30m'].includes(period);
    const isHours = ['1h', '2h', '4h'].includes(period);
    const isDays = period === '1d';
    const isWeeks = period === '1w';
    const twoDigitYear = (Y) => String(Y).slice(2);

    return (t) => {
      const d = timeToZonedDate(t, offsetMinutes);
      const Y = d.getUTCFullYear();
      const yy = twoDigitYear(Y);
      const M = pad(d.getUTCMonth() + 1);
      const D = pad(d.getUTCDate());
      const h = pad(d.getUTCHours());
      const m = pad(d.getUTCMinutes());

      if (isMins) return `${D}.${M} ${h}:${m}`;     // 1–30m → yıl yok
      if (isHours) return `${D}.${M}.${yy} ${h}:00`; // 1h–4h → DD.MM.yy HH:00
      if (isDays) return `${D}.${M}.${yy}`;         // 1d     → DD.MM.yy
      if (isWeeks) return `${D}.${M}.${yy}`;         // 1w     → DD.MM.yy
      return `${D}.${M}.${yy} ${h}:${m}`;
    };
  }

  const [tzOffsetMin, setTzOffsetMin] = useState(0);

  useEffect(() => {
    setTzOffsetMin(readTimezoneOffsetMinutesFromCookie());
  }, []);

  // Grafik kurulum ve güncellemeler
  useEffect(() => {
    const el = chartContainerRef.current;
    if (!el) return;

    // Periyodu veriden sez ve formatter oluştur
    const periodGuess = inferPeriodFromData(data || []);
    const fmt = makeZonedFormatter(periodGuess, tzOffsetMin);

    const chart = createChart(el, {
      width: el.clientWidth,
      height: 250,
      layout: {
        background: { color: "#09090b" },
        textColor: "#98a1ab",
      },
      grid: {
        vertLines: { color: "#09090b" },
        horzLines: { color: "#09090b" },
      },
      crosshair: {
        mode: 1, // Normal
        vertLine: { color: "#6b7280", width: 1, style: 0 },
        horzLine: { color: "#6b7280", width: 1, style: 0 },
      },
      localization: { timeFormatter: fmt },
      timeScale: {
        timeVisible: true,
        secondsVisible: isMinutes(periodGuess),
        borderColor: "#6b7280",
        tickMarkFormatter: fmt,
      },
      rightPriceScale: {
        scaleMargins: { top: 0.1, bottom: 0.1 },
        borderColor: "#6b7280",
      },
    });

    chartRef.current = chart;

    const baselineSeries = chart.addBaselineSeries({
      baseValue: { type: 'price', price: 0 },
      topLineColor: "#22c55e",
      topFillColor1: "rgba(34, 197, 94, 0.4)",
      topFillColor2: "rgba(34, 197, 94, 0.1)",
      bottomLineColor: "#dc2626",
      bottomFillColor1: "rgba(220, 38, 38, 0.4)",
      bottomFillColor2: "rgba(220, 38, 38, 0.1)",
      lineWidth: 2,
      crossHairMarkerVisible: true,
      // Son fiyat çizgisi ve etiketi
      priceLineColor: "#343434",
      lastValueLabel: {
        backgroundColor: "#9ca3af",
        borderColor: "#9ca3af",
        textColor: "#18181b",
      },
    });

    seriesRef.current = baselineSeries;

    // veri set et
    if (Array.isArray(data)) baselineSeries.setData(data);

    // responsive
    const ro = new ResizeObserver(() => {
      try {
        chart.applyOptions({ width: el.clientWidth });
      } catch { }
    });
    ro.observe(el);

    return () => {
      try { ro.disconnect(); } catch { }
      try { chart.remove(); } catch { }
      chartRef.current = null;
      seriesRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tzOffsetMin]); // mount + timezone değişince yeniden kur

  // Data değişince sadece seriyi ve (gerekirse) formatter'ı güncelle
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    // Periyodu yeniden sez (farklı granülerlikte backtest dönebilir)
    const periodGuess = inferPeriodFromData(data || []);
    const fmt = makeZonedFormatter(periodGuess, tzOffsetMin);

    chartRef.current.applyOptions({
      localization: { timeFormatter: fmt },
      timeScale: {
        secondsVisible: isMinutes(periodGuess),
        tickMarkFormatter: fmt,
      },
    });

    seriesRef.current.setData(Array.isArray(data) ? data : []);
  }, [data, tzOffsetMin]);

  function isMinutes(p) {
    return ['1m', '3m', '5m', '15m', '30m'].includes(p);
  }

  return <div ref={chartContainerRef} className="w-full" />;
}
