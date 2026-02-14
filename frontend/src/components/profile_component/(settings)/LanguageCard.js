import React, { useState, useEffect } from 'react';
import { FiSave, FiGlobe } from "react-icons/fi";

export default function LanguageCard({ t, currentLang, onLanguageChange }) {
  const [selectedLang, setSelectedLang] = useState(currentLang);

  useEffect(() => {
    setSelectedLang(currentLang);
  }, [currentLang]);

  const languages = [
    { key: 'tr', label: t('languages.tr'), icon: '/country-icons/tr.svg' },
    { key: 'en', label: t('languages.en'), icon: '/country-icons/en.svg' },
  ];

  const hasChanges = selectedLang !== currentLang;

  const handleSave = () => {
    if (hasChanges) onLanguageChange(selectedLang);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-zinc-950/90 p-5 sm:p-6 shadow-xl shadow-black/40">

      {/* Üst ince mavi glow çizgisi */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

      {/* Arka planda hafif blur mavi daire */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-blue-500/10 blur-3xl" />

      {/* Başlık + Kaydet */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
            <FiGlobe className="text-lg" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-zinc-100 sm:text-lg">
              {t("language")}
            </h2>
            <p className="mt-1 text-xs text-zinc-500 sm:text-sm">
              {t("language_hint")}
            </p>
          </div>
        </div>

        {/* Kaydet Butonu */}
        <button
          onClick={handleSave}
          disabled={!hasChanges}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all duration-200
            ${hasChanges
              ? "bg-blue-600/90 text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0"
              : "bg-zinc-900/80 text-zinc-500 ring-1 ring-zinc-800/80 cursor-not-allowed opacity-60"
            }`}
        >
          <FiSave className="text-base" />
          {t("save")}
        </button>
      </div>

      {/* Dil Seçenekleri */}
      <div className="flex flex-wrap items-center gap-3">
        {languages.map((lng) => (
          <button
            key={lng.key}
            onClick={() => setSelectedLang(lng.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all duration-200 group
              ${selectedLang === lng.key
                ? "bg-blue-900/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30 shadow-blue-500/20 shadow-md"
                : "bg-zinc-800/40 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600"
              }`}
          >
            <div className={`relative w-5 h-5 rounded-full overflow-hidden border transition-colors ${selectedLang === lng.key ? "border-blue-500/50" : "border-zinc-600 group-hover:border-zinc-500"
              }`}>
              <img
                src={lng.icon}
                alt={lng.label}
                className="w-full h-full object-cover"
              />
            </div>
            {lng.label}
          </button>
        ))}
      </div>
    </section>
  );
}
