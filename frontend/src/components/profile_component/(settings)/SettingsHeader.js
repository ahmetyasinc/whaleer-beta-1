import React from 'react';
import { IoReturnDownBackOutline } from "react-icons/io5";
import { FiSave, FiRefreshCcw } from "react-icons/fi";

export default function SettingsHeader({ 
  t, 
  savedInfo, 
  saving, 
  loading, 
  onSave, 
  onReset, 
  onBack 
}) {
  return (
    <header className="h-[60px] bg-black border-b border-zinc-900 flex items-center justify-between px-6 shrink-0 z-10">
      {/* Sol Taraf: Başlık */}
      <h1 className="text-2xl border-l border-zinc-500 pl-4 font-semibold text-zinc-200 ml-10 mb-1 tracking-wide">
        {t("title")}
      </h1>

      {/* Sağ Taraf: Aksiyonlar */}
      <div className="flex items-center gap-3">
        {savedInfo && (
          <span className="text-sm text-emerald-400 font-medium mr-2 animate-pulse">
            {savedInfo}
          </span>
        )}

        {/* Geri Dön Butonu */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-black border border-gray-700 hover:border-zinc-500 text-zinc-200 text-sm transition-all"
        >
          <IoReturnDownBackOutline className="text-xl" />
          {t("myprofile")}
        </button>

        {/* Kaydet Butonu 
        <button
          onClick={onSave}
          disabled={saving || loading}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiSave className="text-lg" />
          {saving ? t("saving") : t("save")}
        </button>
*/}

        {/* Sıfırla Butonu */}
        <button
          onClick={onReset}
          disabled={saving}
          className="flex items-center justify-center w-9 h-9 rounded-lg bg-black border border-gray-700 hover:border-zinc-500 text-zinc-200 hover:text-white transition-all"
          title={t("reset")}
        >
          <FiRefreshCcw className="text-lg" />
        </button>
      </div>
    </header>
  );
}