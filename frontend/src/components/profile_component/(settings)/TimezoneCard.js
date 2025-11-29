import React, { useState, useEffect, useMemo } from 'react';
import { FiSave, FiClock } from "react-icons/fi";

// --- Yardımcı Fonksiyonlar ---
function getAllTimezones() {
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    try {
      const vals = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(vals) && vals.length > 0) return vals;
    } catch {}
  }
  return [
    'UTC', 'Europe/Istanbul', 'Europe/London', 'Europe/Berlin',
    'Europe/Paris', 'America/New_York', 'Asia/Tokyo'
  ];
}

function ianaToGmtOffset(tz) {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset',
      hour12: false,
    }).formatToParts(now);
    const name = parts.find(p => p.type === 'timeZoneName')?.value || 'UTC+00:00';
    return name.replace(/^UTC/, 'GMT');
  } catch {
    return 'GMT+00:00';
  }
}

function labelForIana(tz) {
  return `${ianaToGmtOffset(tz)} ${tz}`;
}

export default function TimezoneCard({ t, currentTimezone, onTimezoneChange }) {
  const [allTimezones, setAllTimezones] = useState([]);
  const [tzQuery, setTzQuery] = useState('');
  const [selectedIana, setSelectedIana] = useState('Europe/Istanbul');

  useEffect(() => {
    const tzs = getAllTimezones();
    setAllTimezones(tzs);

    if (currentTimezone === 'GMT+03:00' && tzs.includes('Europe/Istanbul')) {
      setSelectedIana('Europe/Istanbul');
    } else if (tzs.includes('UTC') && currentTimezone.includes('GMT+00:00')) {
      setSelectedIana('UTC');
    }
  }, [currentTimezone]);

  const filteredTimezones = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return allTimezones;
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q));
  }, [tzQuery, allTimezones]);

  const selectedGmt = useMemo(() => ianaToGmtOffset(selectedIana), [selectedIana]);

  const hasChanges = selectedGmt !== currentTimezone;

  const handleSelect = (tz) => {
    setSelectedIana(tz);
  };

  const handleSave = () => {
    if (hasChanges) onTimezoneChange(selectedGmt);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 
      bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-zinc-950/90 
      p-5 sm:p-6 shadow-xl shadow-black/40">

      {/* Neon Üst Çizgi */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px 
        bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

      {/* Blur Glow Arka Plan */}
      <div className="pointer-events-none absolute -right-14 -top-12 h-40 w-40 
        rounded-full bg-blue-500/10 blur-3xl" />

      {/* Başlık + Kaydet */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl
            bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
            <FiClock className="text-lg" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-100">{t('timezone')}</h2>
            <p className="text-xs text-zinc-500 mt-1">
              {t('timezone_hint_short')}
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 
            text-sm font-medium transition-all duration-200
            ${
              hasChanges
                ? "bg-blue-600/90 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
                : "bg-zinc-900/80 text-zinc-500 ring-1 ring-zinc-800/80 cursor-not-allowed opacity-60"
            }`}
        >
          <FiSave className="text-base" />
          {t('save')}
        </button>
      </div>

      {/* Mevcut Saat Dilimi */}
      <div className="mb-3 text-sm text-zinc-400">
        {t('current_timezone')}{" "}
        <span className="font-medium text-zinc-200">{currentTimezone}</span>
      </div>

      {/* Arama Kutusu */}
      <div className="mb-4">
        <input
          type="text"
          value={tzQuery}
          onChange={(e) => setTzQuery(e.target.value)}
          placeholder={t('timezone_search')}
          className="w-full px-3 py-2 text-sm rounded-lg outline-none bg-zinc-900/40 text-zinc-50 
            border border-zinc-800 placeholder-zinc-500 transition-all
            focus:border-blue-500/70 focus:ring-2 focus:ring-blue-600/40"
        />
      </div>

      {/* Timezone Listesi */}
      <div className="max-h-64 overflow-y-auto border border-zinc-800 rounded-xl custom-scrollbar">
        <ul className="divide-y divide-zinc-800">
          {filteredTimezones.map((tz) => {
            const isSelected = selectedIana === tz;
            return (
              <li
                key={tz}
                title={tz}
                onClick={() => handleSelect(tz)}
                className={`flex items-center justify-between px-3 py-2 cursor-pointer text-sm
                  transition-colors
                  ${
                    isSelected
                      ? "bg-blue-900/20 text-blue-300 hover:bg-blue-900/30"
                      : "text-zinc-300 hover:bg-zinc-800/50"
                  }`}
              >
                <span>{labelForIana(tz)}</span>
                {isSelected && (
                  <span className="text-xs text-blue-400 font-medium">{t('selected')}</span>
                )}
              </li>
            );
          })}

          {filteredTimezones.length === 0 && (
            <li className="px-3 py-2 text-zinc-500 text-sm text-center">
              {t('no_results')}
            </li>
          )}
        </ul>
      </div>

      <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
        {t('timezone_hint')}
      </p>
    </section>
  );
}
