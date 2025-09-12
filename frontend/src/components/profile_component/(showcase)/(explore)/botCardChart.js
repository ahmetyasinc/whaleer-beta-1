'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

// =====================
// Timezone helpers
// =====================
const pad = (n) => String(n).padStart(2, '0');

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.split('; ').find(row => row.startsWith(name + '='));
  return m ? decodeURIComponent(m.split('=')[1]) : null;
}

// "GMT+1", "GMT-3", "GMT+5:30" → dakika cinsinden ofset
function parseGmtToMinutes(tzStr) {
  const m = /^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec((tzStr || '').trim());
  if (!m) return 0; // default GMT+0
  const sign = m[1] === '-' ? -1 : 1;
  const h = parseInt(m[2] || '0', 10);
  const mins = parseInt(m[3] || '0', 10);
  return sign * (h * 60 + mins);
}

// Cookie: wh_settings = {"timezone":"GMT+3"} gibi
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

// t → UTCTimestamp(saniye) (number) veya business day ({year,month,day})
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

// Tek formatlayıcı: DD.MM.YY HH:mm
function makeZonedFormatter(offsetMinutes) {
  const twoDigitYear = (Y) => String(Y).slice(2);
  return (t) => {
    const d  = timeToZonedDate(t, offsetMinutes);
    const Y  = d.getUTCFullYear();
    const yy = twoDigitYear(Y);
    const M  = pad(d.getUTCMonth() + 1);
    const D  = pad(d.getUTCDate());
    const h  = pad(d.getUTCHours());
    const m  = pad(d.getUTCMinutes());
    return `${D}.${M}.${yy} ${h}:${m}`;
  };
}

// =====================
// BotChart
// =====================
const BotChart = ({ data = [] }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  const [tzOffsetMin, setTzOffsetMin] = useState(0);

  // Cookie'den timezone offset'i çek
  useEffect(() => {
    setTzOffsetMin(readTimezoneOffsetMinutesFromCookie());
  }, []);

  // Chart init
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!chartContainerRef.current) return;

    const container = chartContainerRef.current;
    const fmt = makeZonedFormatter(tzOffsetMin);

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 240,
      layout: {
        background: { color: '#1f2937' },
        textColor: '#6b7280',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      timeScale: {
        borderColor: '#475569',
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: fmt,             // <- eksen etiketleri
      },
      rightPriceScale: {
        borderColor: '#6b7280',
        textColor: '#6b7280',
      },
      localization: {
        timeFormatter: fmt,                 // <- crosshair/tooltip zamanı
      },
    });

    chartRef.current = chart;

    const series = chart.addBaselineSeries({
      baseValue: { type: 'price', price: 0 }, // gerçek base birazdan setData sonrası güncellenecek
      topLineColor: '#10b981',
      topFillColor1: 'rgba(16, 185, 129, 0.28)',
      topFillColor2: 'rgba(16, 185, 129, 0.05)',
      bottomLineColor: '#ef4444',
      bottomFillColor1: 'rgba(239, 68, 68, 0.28)',
      bottomFillColor2: 'rgba(239, 68, 68, 0.05)',
      lineWidth: 2,
    });
    seriesRef.current = series;

    const resizeObserver = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, [tzOffsetMin]);

  // Data updates
  useEffect(() => {
    if (!chartRef.current || !seriesRef.current) return;

    if (!Array.isArray(data) || data.length === 0) {
      seriesRef.current.setData([]);
      return;
    }

    // Sadece gelen timestamps'i kullan (eksik aralık doldurma yok)
    const normalizedData = data.map(item => ({
      time: Math.floor(new Date(item.timestamp + 'Z').getTime() / 1000),
      value: Number(item.value),
    }));

    // Base value’yu ilk değerden al
    const baselinePrice = normalizedData[0]?.value ?? 0;
    seriesRef.current.applyOptions({
      baseValue: { type: 'price', price: baselinePrice },
    });

    seriesRef.current.setData(normalizedData);
  }, [data]);

  // Timezone değişince formatterları güncelle (chart kuruluyken)
  useEffect(() => {
    if (!chartRef.current) return;
    const fmt = makeZonedFormatter(tzOffsetMin);
    chartRef.current.applyOptions({
      localization: { timeFormatter: fmt },
      timeScale: { tickMarkFormatter: fmt },
    });
  }, [tzOffsetMin]);

  return (
    <div
      ref={chartContainerRef}
      className="w-full rounded-md overflow-hidden bg-gray-900"
    />
  );
};

export default BotChart;
