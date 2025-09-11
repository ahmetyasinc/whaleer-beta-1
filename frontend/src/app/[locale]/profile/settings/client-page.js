'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter } from 'next/navigation';
import i18n from '@/i18n';
import { IoReturnDownBackOutline } from "react-icons/io5";
import { FiSave, FiRefreshCcw } from "react-icons/fi";


import {
  readSettingsCookie,
  writeSettingsCookie,
  mergeSettingsCookie,
} from '@/utils/cookies/settingsCookie';

/* =========================
   Defaults & Utilities
   ========================= */
const LOCALES = ['en', 'tr']; // i18n’de desteklediklerin
const DEFAULTS = {
  language: 'tr',
  theme: 'dark',
  timezone: 'GMT+00:00', // Cookie’de tutulacak değer (offset string)
  emailReports: false,
};

// lang cookie set
function setLangCookie(lng) {
  const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
  const secure = (typeof location !== 'undefined' && location.protocol === 'https:') ? '; Secure' : '';
  document.cookie = `lang=${lng}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
}

// "/en/profile/edit" -> { locale:"en", rest:"profile/edit" }
// "/profile"         -> { locale:null, rest:"profile" }
function splitLocalePath(pathname, locales = LOCALES) {
  const parts = pathname.replace(/^\/+/, '').split('/');
  const maybe = parts[0];
  if (locales.includes(maybe)) {
    return { locale: maybe, rest: parts.slice(1).join('/') };
  }
  return { locale: null, rest: parts.join('/') };
}

// Tarayıcı destekliyse tüm IANA TZ’leri getir, değilse fallback kullan
function getAllTimezones() {
  if (typeof Intl !== 'undefined' && typeof Intl.supportedValuesOf === 'function') {
    try {
      const vals = Intl.supportedValuesOf('timeZone');
      if (Array.isArray(vals) && vals.length > 0) return vals;
    } catch {}
  }
  return [
    'UTC',
    'Europe/Istanbul', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Moscow',
    'Africa/Cairo', 'Africa/Johannesburg',
    'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Sao_Paulo',
    'Asia/Dubai', 'Asia/Kolkata', 'Asia/Bangkok', 'Asia/Singapore', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
    'Australia/Sydney', 'Pacific/Auckland',
  ];
}

// IANA time zone -> "GMT+03:00" gibi offset string
function ianaToGmtOffset(tz) {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      timeZoneName: 'shortOffset', // "UTC+03:00"
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    }).formatToParts(now);
    const name = parts.find(p => p.type === 'timeZoneName')?.value || 'UTC+00:00';
    return name.replace(/^UTC/, 'GMT'); // "UTC+03:00" -> "GMT+03:00"
  } catch {
    return 'GMT+00:00';
  }
}

// Cookie’de timezone değeri IANA olarak gelmişse "GMT±HH:MM"’e migrate et
function normalizeTimezoneCookieValue(tzValue) {
  if (!tzValue) return 'GMT+00:00';
  if (/^GMT[+-]\d{2}:\d{2}$/.test(tzValue) || tzValue === 'GMT+00:00') return tzValue;
  if (/^[A-Za-z]+\/[A-Za-z_]+/.test(tzValue) || tzValue === 'UTC') return ianaToGmtOffset(tzValue);
  return 'GMT+00:00';
}

// UI etiketi: "(GMT+03:00) Europe/Istanbul"
function labelForIana(tz) {
  return `${ianaToGmtOffset(tz)} ${tz}`;
}

/* =========================
   Page
   ========================= */
export default function SettingsPage() {
  const { t } = useTranslation('settings');
  const pathname = usePathname();
  const router = useRouter();

  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [savedAt, setSavedAt] = useState(null);

  // Timezone UI: IANA listesi + arama + seçili IANA (cookie’ye yalnızca GMT yazıyoruz)
  const [allTimezones, setAllTimezones] = useState([]);
  const [tzQuery, setTzQuery] = useState('');
  const [selectedIana, setSelectedIana] = useState('Europe/Istanbul');

  // İlk yükleme
  useEffect(() => {
    let mounted = true;
    try {
      const fromCookie = readSettingsCookie(); // { language, theme, timezone(GMT±HH:MM ya da IANA), emailReports }
      const initial = { ...DEFAULTS, ...(fromCookie || {}) };

      // i18n dil senkronizasyonu
      if (initial.language && i18n.language !== initial.language) {
        i18n.changeLanguage(initial.language).catch(console.error);
        setLangCookie(initial.language);
      }

      // timezone’u normalize et ve gerekirse cookie’yi migrate et
      const normalizedTz = normalizeTimezoneCookieValue(initial.timezone);
      initial.timezone = normalizedTz;
      if (fromCookie && fromCookie.timezone !== normalizedTz) {
        mergeSettingsCookie({ timezone: normalizedTz });
      }

      // IANA listesi
      const tzs = getAllTimezones();

      if (mounted) {
        setAllTimezones(tzs);
        setForm(initial);
        // GMT+03:00 ise Istanbul’u highlight et
        if (normalizedTz === 'GMT+03:00' && tzs.includes('Europe/Istanbul')) {
          setSelectedIana('Europe/Istanbul');
        } else if (tzs.includes('UTC')) {
          setSelectedIana('UTC');
        }
      }
    } catch (e) {
      console.error(e);
      setError(t('errors.load'));
    } finally {
      if (mounted) setLoading(false);
    }
    return () => { mounted = false; };
  }, [t]);

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Dil değişimi: i18n + wh_settings.language + lang cookie + URL locale replace
  const onChangeLanguage = async (lng) => {
    update('language', lng);
    try { await i18n.changeLanguage(lng); } catch {}
    mergeSettingsCookie({ language: lng });
    setLangCookie(lng);

    const { rest } = splitLocalePath(pathname, LOCALES);
    const next = `/${lng}/${rest || ''}`.replace(/\/+$/,'');
    router.replace(next || `/${lng}`);
  };

  // Kaydet: tüm formu wh_settings cookie’ye yaz
  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      writeSettingsCookie(form);
      setSavedAt(new Date());
    } catch (e) {
      console.error(e);
      setError(t('errors.save'));
    } finally {
      setSaving(false);
    }
  };

  const onResetDefaults = () => {
    setForm(DEFAULTS);
    writeSettingsCookie(DEFAULTS);
    setLangCookie(DEFAULTS.language);
    i18n.changeLanguage(DEFAULTS.language).catch(console.error);

    const { rest } = splitLocalePath(pathname, LOCALES);
    const next = `/${DEFAULTS.language}/${rest || ''}`.replace(/\/+$/,'');
    router.replace(next || `/${DEFAULTS.language}`);
    setSavedAt(new Date());
  };

  const savedInfo = useMemo(() => {
    if (!savedAt) return null;
    const hh = String(savedAt.getHours()).padStart(2, '0');
    const mm = String(savedAt.getMinutes()).padStart(2, '0');
    return `✔ ${t('saved')} • ${hh}:${mm}`;
  }, [savedAt, t]);

  // TZ arama filtresi
  const filteredTimezones = useMemo(() => {
    const q = tzQuery.trim().toLowerCase();
    if (!q) return allTimezones;
    return allTimezones.filter((tz) => tz.toLowerCase().includes(q));
  }, [tzQuery, allTimezones]);

  // IANA seç → cookie’ye yalnızca GMT±HH:MM yaz, UI için IANA’yı state’te tut
  const selectTimezoneIana = (tz) => {
    const gmt = ianaToGmtOffset(tz);
    setSelectedIana(tz);
    update('timezone', gmt);
    mergeSettingsCookie({ timezone: gmt });
  };

  return (
    <div className="w-full h-screen flex flex-col bg-zinc-950/60 text-white">
      <div className="flex-1 overflow-hidden">
        <div className="h-full p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* Title + Actions */}
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-semibold">
        {t("title")}
              </h1>
              <div className="flex items-center gap-3">
                {savedInfo && <span className="text-sm text-emerald-300/90">{savedInfo}</span>}
        
                {/* Profile Button */}
                <button
                  onClick={() => router.push("/profile")}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors duration-200 hover:scale-[1.02]"
                >
                  <IoReturnDownBackOutline className="text-xl" />
                  {t("myprofile")}
                </button>
        
                {/* Save Button */}
                <button
                  onClick={onSave}
                  disabled={saving || loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <FiSave className="text-lg" />
                  {saving ? t("saving") : t("save")}
                </button>
        
                {/* Reset Button */}
                <button
                  onClick={onResetDefaults}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white border border-zinc-600 shadow-sm transition-colors duration-200 hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                  title={t("reset")}
                >
                  <FiRefreshCcw className="text-lg" />
                  {t("reset")}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-rose-900/40 border border-rose-700/60 text-rose-200">
                {error}
              </div>
            )}

            {/* Dil */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-lg font-medium mb-3">
                {t('language')}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { key: 'tr', label: t('languages.tr') },
                  { key: 'en', label: t('languages.en') },
                ].map((lng) => (
                  <button
                    key={lng.key}
                    onClick={() => onChangeLanguage(lng.key)}
                    className={`px-3 py-1.5 rounded-xl border transition
                      ${form.language === lng.key
                        ? 'bg-emerald-800/40 text-emerald-200 border-emerald-700/60'
                        : 'bg-zinc-800/60 text-zinc-200 border-zinc-700 hover:bg-zinc-800'}`}
                  >
                    {lng.label}
                  </button>
                ))}
              </div>
              <p className="text-sm text-zinc-400 mt-3">
                {t('language_hint')}
              </p>
            </section>

            {/* Tema */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-lg font-medium mb-3">
                {t('theme')}
              </h2>
              <div className="flex items-center gap-3">
                {[
                  { key: 'system', label: t('theme_system') },
                  { key: 'light', label: t('theme_light') },
                  { key: 'dark', label: t('theme_dark') },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => {
                      setForm((f) => ({ ...f, theme: opt.key }));
                      mergeSettingsCookie({ theme: opt.key });
                    }}
                    className={`px-3 py-1.5 rounded-xl border transition
                      ${form.theme === opt.key
                        ? 'bg-emerald-800/40 text-emerald-200 border-emerald-700/60'
                        : 'bg-zinc-800/60 text-zinc-200 border-zinc-700 hover:bg-zinc-800'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            {/* Zaman Dilimi (cookie: GMT±HH:MM) */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-lg font-medium mb-4">
                {t('timezone')}
              </h2>

              {/* Mevcut cookie değeri */}
              <div className="mb-2 text-sm text-zinc-300">
                {t('current_timezone')}{' '}
                <span className="font-medium">{form.timezone}</span>
              </div>

              {/* Arama */}
              <div className="mb-3">
                <input
                  type="text"
                  value={tzQuery}
                  onChange={(e) => setTzQuery(e.target.value)}
                  placeholder={t('timezone_search')}
                  className="w-full px-3 py-2 bg-zinc-800 text-white border border-zinc-700 rounded-lg outline-none focus:ring-2 focus:ring-emerald-700"
                />
              </div>

              {/* Liste */}
              <div className="max-h-64 overflow-y-auto border border-zinc-800 rounded-xl">
                <ul className="divide-y divide-zinc-800">
                  {filteredTimezones.map((tz) => {
                    const selected = selectedIana === tz;
                    return (
                      <li
                        key={tz}
                        className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-zinc-800/50 ${selected ? 'bg-emerald-900/20' : ''}`}
                        onClick={() => selectTimezoneIana(tz)}
                        title={tz}
                      >
                        <span className="text-sm">{labelForIana(tz)}</span>
                        {selected && (
                          <span className="text-xs text-emerald-300">
                            {t('selected')}
                          </span>
                        )}
                      </li>
                    );
                  })}
                  {filteredTimezones.length === 0 && (
                    <li className="px-3 py-2 text-zinc-400 text-sm">
                      {t('no_results')}
                    </li>
                  )}
                </ul>
              </div>

              <p className="text-sm text-zinc-400 mt-3">
                {t('timezone_hint')}
              </p>
            </section>

            {/* Bildirimler */}
            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
              <h2 className="text-lg font-medium mb-4">
                {t('notifications')}
              </h2>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium">
                    {t('email_reports')}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {t('email_reports_hint')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const next = !form.emailReports;
                    setForm((f) => ({ ...f, emailReports: next }));
                    mergeSettingsCookie({ emailReports: next });
                  }}
                  className={`px-3 py-1.5 rounded-xl border transition
                    ${form.emailReports
                      ? 'bg-emerald-800/40 text-emerald-200 border-emerald-700/60'
                      : 'bg-zinc-800/60 text-zinc-200 border-zinc-700 hover:bg-zinc-800'}`}
                >
                  {form.emailReports ? t('on') : t('off')}
                </button>
              </div>
            </section>

            {loading && (
              <div className="text-sm text-zinc-400">
                {t('loading')}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
