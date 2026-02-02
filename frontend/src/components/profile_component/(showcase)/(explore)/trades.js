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

// utils/formatPrice.js (ya da aynı dosyada üstte tanımlayabilirsiniz)
function formatPrice(value) {
  const n = Number(value);
  const abs = Math.abs(n);

  // Basit dinamik ondalık: büyük fiyatlar 2, daha küçükler 4-6 hane
  let frac = 2;
  if (abs < 1) frac = 4;
  if (abs < 0.01) frac = 6;

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: frac,
    maximumFractionDigits: frac,
  }).format(n);
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
    <div className="mb-6 bg-zinc-950 p-6 border border-zinc-800/60 rounded-xl hover:border-cyan-500/30 hover:shadow-[0_0_15px_-3px_rgba(6,182,212,0.15)] transition-all duration-300 relative group">
      {/* Neon Glow Border Effect */}
      <div className="absolute inset-0 rounded-xl p-[1px] bg-gradient-to-br from-cyan-500/20 via-zinc-800/0 to-purple-500/20 -z-10 opacity-30 transition-opacity" />

      <div className="flex flex-col gap-6">

        {/* Trade History */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BiTransfer className="w-4 h-4 text-zinc-400 group-hover:text-cyan-400 transition-colors" />
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('titles.tradeHistory')}</h3>
            <span className="text-[10px] font-mono text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900">
              {t('counts.trades', { count: trades.length })}
            </span>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 min-h-[120px]">
            <div className="divide-y divide-zinc-800/60">
              {trades.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-xs italic">
                  No trades yet
                </div>
              ) : (
                trades.map((trade) => {
                  const isBuy = trade.action === 'buy';
                  return (
                    <div
                      key={trade.id}
                      className="
                        grid items-center py-2.5 hover:bg-zinc-900/80 transition-colors rounded px-1
                        /* Sütun düzeni: [time] [orta alan] [price] */
                        grid-cols-[8.5rem,1fr,9.5rem]
                        gap-3
                      "
                    >
                      {/* SOL: Timestamp (baz alınan sabit genişlik) */}
                      <div className="text-[10px] text-zinc-500 font-mono tabular-nums">
                        {renderTradeTime(trade.time)}
                      </div>

                      {/* ORTA: pair + type + action */}
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-bold text-zinc-300 truncate font-mono">
                          {trade.pair}
                        </span>

                        <span
                          className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold font-mono tracking-wide uppercase ${isBuy ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            }`}
                          title={trade.type}
                        >
                          {trade.type}
                        </span>

                        <span className="text-[10px] text-zinc-600 hidden sm:inline truncate uppercase tracking-wider">
                          {trade.action}
                        </span>
                      </div>

                      {/* SAĞ: Fiyat (sabit genişlik + sağa hizalı + tabular) */}
                      <div
                        className="
                          justify-self-end w-[9.5rem]
                          text-xs font-bold
                          text-right tabular-nums font-mono
                          text-zinc-300
                        "
                        title={`${trade.price} USD`}
                      >
                        {formatPrice(trade.price)}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Open Positions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BiTransfer className="w-4 h-4 text-zinc-400 rotate-90 group-hover:text-purple-400 transition-colors" />
            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{t('titles.openPositions')}</h3>
            <span className="text-[10px] font-mono text-zinc-600 border border-zinc-800 px-1.5 py-0.5 rounded bg-zinc-900">
              {t('counts.positions', { count: positions.length })}
            </span>
          </div>
          <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 min-h-[120px]">
            <div className="space-y-1">
              {positions.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-xs italic">
                  No open positions
                </div>
              ) : (
                positions.map((pos) => (
                  <div
                    key={pos.id}
                    className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-b-0 hover:bg-zinc-900/80 transition-colors rounded px-1"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xs font-bold text-zinc-300 font-mono">{pos.pair}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold font-mono tracking-wide uppercase ${pos.type === 'LONG'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : pos.type === 'SHORT'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-zinc-800 text-zinc-400'
                          }`}
                      >
                        {pos.type}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-bold font-mono ${parseFloat(pos.profit) > 0
                        ? 'text-emerald-400'
                        : parseFloat(pos.profit) < 0
                          ? 'text-rose-400'
                          : 'text-zinc-500'
                        }`}
                    >
                      {parseFloat(pos.profit) > 0 ? '+' : ''}
                      {pos.profit}%
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Trades;
