"use client";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

export default function LanguageProvider({ locale, children }) {
  const { i18n: i18next } = useTranslation(); // ✅ context’teki canlı instance
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = locale || i18next.resolvedLanguage || i18next.language;

    // Emniyet: init edilmemişse çökme olmasın
    if (typeof i18next.changeLanguage !== "function") {
      console.error("i18n not ready yet");
      setReady(true);
      return;
    }

    if (next && i18next.resolvedLanguage !== next) {
      i18next.changeLanguage(next).finally(() => setReady(true));
    } else {
      setReady(true);
    }
  }, [locale, i18next]);

  if (!ready) return null; // veya skeleton
  return children;
}
