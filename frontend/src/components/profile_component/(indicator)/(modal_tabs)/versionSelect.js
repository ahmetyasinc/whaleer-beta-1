"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";

export default function VersionSelect({ versions, selectedId, onChange, onAdd }) {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation("indicatorEditor");

  const selected = versions.find((v) => v.id === selectedId);

  return (
    <div className="relative inline-block w-[40px] h-[30px]">
      {/* Dar kutu */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full h-full bg-[#232323] border border-gray-700 text-white text-xs py-1 rounded-sm text-center"
        title={t("versionSelect.title")}
        aria-label={t("versionSelect.title")}
      >
        {selected ? `v${selected.version}` : t("versionSelect.new")}
      </button>

      {/* Açılan menü */}
      {open && (
        <div
          className="absolute right-0 mt-1 bg-[#232323] border border-gray-700 rounded-sm shadow-lg w-[40px] z-10"
        >
          {versions.map((v) => (
            <div
              key={v.id}
              onClick={() => {
                onChange(v.id);
                setOpen(false);
              }}
              className="w-full text-center py-1 text-sm text-white hover:bg-gray-700 cursor-pointer"
              title={`v${v.version}`}
            >
              v{v.version}
            </div>
          ))}
          <div
            onClick={() => {
              onAdd();
              setOpen(false);
            }}
            className="w-full text-center py-1 text-sm text-green-400 hover:bg-gray-700 cursor-pointer"
            title={t("versionSelect.new")}
          >
            {t("versionSelect.new")}
          </div>
        </div>
      )}
    </div>
  );
}
