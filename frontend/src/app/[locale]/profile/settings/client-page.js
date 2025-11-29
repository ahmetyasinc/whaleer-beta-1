'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePathname, useRouter } from 'next/navigation';
import i18n from '@/i18n';
import { toast } from 'react-toastify';

import {
  readSettingsCookie,
  writeSettingsCookie,
  mergeSettingsCookie,
} from '@/utils/cookies/settingsCookie';

// --- BİLEŞENLER ---
import SettingsHeader from '@/components/profile_component/(settings)/SettingsHeader';
import LeftMenuSettings from '@/components/profile_component/(settings)/LeftMenuSettings'; // 🔹 Yeni Sol Menü

// Kartlar
import TelegramConnect from '@/components/profile_component/(settings)/TelegramConnect';
import ProfileBasicsCard from '@/components/profile_component/(settings)/ProfileBasicsCard';
import SocialLinksCard from '@/components/profile_component/(settings)/SocialLinksCard';
import AccountSecurityCard from '@/components/profile_component/(settings)/AccountSecurityCard';
import LanguageCard from '@/components/profile_component/(settings)/LanguageCard';
import ThemeCard from '@/components/profile_component/(settings)/ThemeCard';
import TimezoneCard from '@/components/profile_component/(settings)/TimezoneCard';

/* =========================
   Defaults & Utilities
   ========================= */
const LOCALES = ['en', 'tr'];
const DEFAULTS = {
  language: 'tr',
  theme: 'dark',
  timezone: 'GMT+00:00',
};

function setLangCookie(lng) {
  const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
  const secure = (typeof location !== 'undefined' && location.protocol === 'https:') ? '; Secure' : '';
  document.cookie = `lang=${lng}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
}

function splitLocalePath(pathname, locales = LOCALES) {
  const parts = pathname.replace(/^\/+/, '').split('/');
  const maybe = parts[0];
  if (locales.includes(maybe)) {
    return { locale: maybe, rest: parts.slice(1).join('/') };
  }
  return { locale: null, rest: parts.join('/') };
}

function normalizeTimezoneCookieValue(tzValue) {
  if (!tzValue) return 'GMT+00:00';
  if (/^GMT[+-]\d{2}:\d{2}$/.test(tzValue) || tzValue === 'GMT+00:00') return tzValue;
  return 'GMT+00:00'; 
}

/* =========================
   Page Component
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

  // 🔹 Hangi sekmenin açık olduğunu tutan state
  const [activeTab, setActiveTab] = useState('basics');

  useEffect(() => {
    let mounted = true;
    try {
      const fromCookie = readSettingsCookie();
      const initial = { ...DEFAULTS, ...(fromCookie || {}) };

      if (initial.language && i18n.language !== initial.language) {
        i18n.changeLanguage(initial.language).catch(console.error);
        setLangCookie(initial.language);
      }

      const normalizedTz = normalizeTimezoneCookieValue(initial.timezone);
      initial.timezone = normalizedTz;
      if (fromCookie && fromCookie.timezone !== normalizedTz) {
        mergeSettingsCookie({ timezone: normalizedTz });
      }

      if (mounted) {
        setForm(initial);
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

  // --- Handlers ---
  const handleLanguageChange = async (lng) => {
    update('language', lng);
    try { await i18n.changeLanguage(lng); } catch {}
    mergeSettingsCookie({ language: lng });
    setLangCookie(lng);

    const { rest } = splitLocalePath(pathname, LOCALES);
    const next = `/${lng}/${rest || ''}`.replace(/\/+$/,'');
    router.replace(next || `/${lng}`);
  };

  const handleThemeChange = (newTheme) => {
    update('theme', newTheme);
    mergeSettingsCookie({ theme: newTheme });
  };

  const handleTimezoneChange = (newGmt) => {
    update('timezone', newGmt);
    mergeSettingsCookie({ timezone: newGmt });
  };

  const onSave = async () => {
    setSaving(true);
    setError(null);
    try {
      writeSettingsCookie(form);
      setSavedAt(new Date());
      toast.success(t('saved'));
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

  // 🔹 İçerik Render Mantığı
  const renderContent = () => {
    if (loading) {
      return <div className="text-zinc-500">{t('loading')}...</div>;
    }

    switch (activeTab) {
      case 'basics':
        return <ProfileBasicsCard t={t} />;
      case 'social':
        return <SocialLinksCard t={t} />;
      case 'security':
        return <AccountSecurityCard t={t} />;
      case 'language':
        return (
          <LanguageCard 
            t={t} 
            currentLang={form.language} 
            onLanguageChange={handleLanguageChange} 
          />
        );
      case 'theme':
        return (
          <ThemeCard 
            t={t} 
            currentTheme={form.theme} 
            onThemeChange={handleThemeChange} 
          />
        );
      case 'timezone':
        return (
          <TimezoneCard 
            t={t} 
            currentTimezone={form.timezone} 
            onTimezoneChange={handleTimezoneChange} 
          />
        );
      case 'telegram':
        return <TelegramConnect className="" />;
      default:
        return <ProfileBasicsCard t={t} />;
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-black/40 text-white overflow-hidden">
      
      {/* HEADER */}
      <SettingsHeader 
        t={t}
        savedInfo={savedInfo}
        saving={saving}
        loading={loading}
        onSave={onSave}
        onReset={onResetDefaults}
        onBack={() => router.push("/profile")}
      />

      {/* ALT KISIM: SOL MENÜ + SAĞ İÇERİK */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* SOL MENÜ */}
        <LeftMenuSettings 
          t={t} 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
        />

        {/* SAĞ İÇERİK ALANI */}
        <main className="flex-1 overflow-y-auto bg-transparent relative">
          <div className="max-w-5xl mx-auto py-8 px-6">
            
            {error && (
              <div className="mb-6 p-3 rounded-lg bg-rose-900/40 border border-rose-700/60 text-rose-200">
                {error}
              </div>
            )}

            {/* Dinamik İçerik */}
            <div className="transition-all duration-300 ease-in-out">
              {renderContent()}
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}