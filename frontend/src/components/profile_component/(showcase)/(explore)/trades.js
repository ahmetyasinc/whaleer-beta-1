'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { BiTransfer } from 'react-icons/bi';
import { useTranslation } from 'react-i18next';

/* =========================
   Timezone helpers
   ========================= */

const pad = (n) => String(n).padStart(2, '0');

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
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

// Giren zamanı sağlamca UTC epoch saniyeye dönüştür
function parseToUtcSeconds(value) {
  if (value == null) return null;

  if (typeof value === 'number') {
    // ms mi s mi?
    if (value > 1e12) return Math.floor(value / 1000); // ms → s
    if (value > 1e10) return Math.floor(value); // zaten s (bazı timestamp'ler 10+ haneli gelebilir)
    return Math.floor(value); // küçük değerler yine s varsayılır
  }

  if (typeof value === 'string') {
    // sadece rakamsa
    if (/^\d+$/.test(value)) {
      const num = Number(value);
      return num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
    }

    // Z veya timezone offset içeriyor mu?
    const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
    const iso = hasTz ? value : `${value.replace(' ', 'T')}Z`;

    const ms = Date.parse(iso);
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000);
  }

  // Fallback
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// UTCTimestamp(saniye) veya business day'i, verilen ofsete göre Date'e çevir
function timeToZonedDate(utcSeconds, offsetMinutes) {
  const msUTC = (utcSeconds || 0) * 1000;
  return new Date(msUTC + (offsetMinutes || 0) * 60 * 1000);
}

function makeFormatter(offsetMinutes) {
  const twoDigitYear = (Y) => String(Y).slice(2);
  return (utcSeconds) => {
    if (utcSeconds == null) return '';
    const d = timeToZonedDate(utcSeconds, offsetMinutes);
    const Y = d.getUTCFullYear();
    const yy = twoDigitYear(Y);
    const M = pad(d.getUTCMonth() + 1);
    const D = pad(d.getUTCDate());
    const h = pad(d.getUTCHours());
    const m = pad(d.getUTCMinutes());
    return `${D}.${M}.${yy} ${h}:${m}`;
  };
}

/* =========================
   Component
   ========================= */

const Trades = ({ trades = [], positions = [] }) => {
  const { t } = useTranslation('trades');

  const [tzOffsetMin, setTzOffsetMin] = useState(0);

  useEffect(() => {
    setTzOffsetMin(readTimezoneOffsetMinutesFromCookie());
  }, []);

  const formatTime = useMemo(() => makeFormatter(tzOffsetMin), [tzOffsetMin]);

  const renderTradeTime = (timeVal) => {
    const sec = parseToUtcSeconds(timeVal);
    return sec == null ? '—' : formatTime(sec);
  };

  return (
    <div className="mb-6 bg-gray-800 p-6 border border-gray-700 rounded-xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Trade History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BiTransfer className="w-4 h-4 text-gray-300" />
            <h3 className="text-sm font-semibold text-white">{t('titles.tradeHistory')}</h3>
            <span className="text-xs text-gray-400">
              {t('counts.trades', { count: trades.length })}
            </span>
          </div>
          <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-xl p-4">
            <div className="space-y-2">
              {trades.map((trade) => (
                <div
                  key={trade.id}
                  className="flex items-center justify-between py-2 border-b border-gray-600 last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">{trade.pair}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.type === 'LONG'
                          ? 'bg-green-900 text-green-300'
                          : 'bg-red-900 text-red-300'
                      }`}
                    >
                      {trade.type}
                    </span>
                    <span className="text-xs text-gray-400 hidden sm:inline truncate">
                      {trade.action}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 hidden sm:inline">
                    {renderTradeTime(trade.time)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Open Positions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BiTransfer className="w-4 h-4 text-gray-300 rotate-90" />
            <h3 className="text-sm font-semibold text-white">{t('titles.openPositions')}</h3>
            <span className="text-xs text-gray-400">
              {t('counts.positions', { count: positions.length })}
            </span>
          </div>
          <div className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-xl p-4">
            <div className="space-y-2">
              {positions.map((pos) => (
                <div
                  key={pos.id}
                  className="flex items-center justify-between py-2 border-b border-gray-600 last:border-b-0"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="text-sm font-medium text-white">{pos.pair}</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        pos.type === 'LONG'
                          ? 'bg-green-900 text-green-300'
                          : pos.type === 'SHORT'
                          ? 'bg-red-900 text-red-300'
                          : 'bg-gray-800 text-gray-300'
                      }`}
                    >
                      {pos.type}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-medium ${
                      parseFloat(pos.profit) > 0
                        ? 'text-green-400'
                        : parseFloat(pos.profit) < 0
                        ? 'text-red-400'
                        : 'text-gray-400'
                    }`}
                  >
                    {parseFloat(pos.profit) > 0 ? '+' : ''}
                    {pos.profit}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Trades;
