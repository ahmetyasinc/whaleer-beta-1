import React, { useState, useEffect } from 'react';
import { FiSave, FiMoon } from "react-icons/fi";

export default function ThemeCard({ t, currentTheme, onThemeChange }) {
  const [selectedTheme, setSelectedTheme] = useState(currentTheme);

  useEffect(() => {
    setSelectedTheme(currentTheme);
  }, [currentTheme]);

  const themes = [
    { key: 'system', label: t('theme_system') },
    { key: 'light', label: t('theme_light') },
    { key: 'dark', label: t('theme_dark') },
  ];

  const hasChanges = selectedTheme !== currentTheme;

  const handleSave = () => {
    if (hasChanges) onThemeChange(selectedTheme);
  };

  return (
    <section className="relative overflow-hidden rounded-2xl border border-zinc-800/80 
      bg-gradient-to-br from-zinc-950/90 via-zinc-900/80 to-zinc-950/90 
      p-5 sm:p-6 shadow-xl shadow-black/40">

      {/* Neon üst çizgi */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px 
        bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

      {/* Blur dairesel glow */}
      <div className="pointer-events-none absolute -left-14 -top-12 h-36 w-36 
        rounded-full bg-blue-500/10 blur-3xl" />

      {/* Başlık & Kaydet */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl 
            bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/30">
            <FiMoon className="text-lg" />
          </div>

          <div>
            <h2 className="text-lg font-semibold text-zinc-100">
              {t('theme')}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {t('theme_hint')}
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

      {/* Tema seçenekleri */}
      <div className="flex flex-wrap items-center gap-3">
        {themes.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSelectedTheme(opt.key)}
            className={`px-4 py-2 rounded-xl border transition-all duration-200 text-sm font-medium
              ${
                selectedTheme === opt.key
                  ? "bg-blue-900/20 text-blue-400 border-blue-500/40 ring-1 ring-blue-500/30 shadow-md shadow-blue-500/20"
                  : "bg-zinc-900/40 text-zinc-400 border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600"
              }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </section>
  );
}
