// src/hooks/usePhantomAvailability.js
"use client";
import { useEffect, useState } from "react";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";

export default function usePhantomAvailability() {
  const [isPhantomInstalled, setInstalled] = useState(false);
  const [readyState, setReadyState] = useState("Unknown");

  useEffect(() => {
    const update = () => {
      const installed = typeof window !== "undefined" && !!window.solana?.isPhantom;
      setInstalled(installed);
      try {
        const adapter = new PhantomWalletAdapter();
        setReadyState(adapter.readyState || "Unknown");
      } catch {
        setReadyState("Unknown");
      }
    };

    // İlk kontrol
    update();

    // Edge/Chromium: provider geç gelebilir
    const onInit = () => update();
    window.addEventListener("phantom#initialized", onInit, { once: true });

    // Yedek: kısa retry (en fazla 1sn)
    const t1 = setTimeout(update, 150);
    const t2 = setTimeout(update, 500);
    const t3 = setTimeout(update, 1000);

    return () => {
      window.removeEventListener("phantom#initialized", onInit);
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, []);

  return { isPhantomInstalled, readyState };
}
