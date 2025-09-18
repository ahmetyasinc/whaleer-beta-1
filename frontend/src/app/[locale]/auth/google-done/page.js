"use client";

import { useEffect } from "react";

export default function GoogleDonePage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status") || "unknown";
    const reason = params.get("reason") || null;

    try {
      if (window.opener && typeof window.opener.postMessage === "function") {
        window.opener.postMessage(
          { provider: "google", status, reason },
          "*" // İstersen burayı APP_ORIGIN ile sıkılaştır.
        );
      }
    } catch {}
    const t = setTimeout(() => window.close(), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif" }}>
      <h3>Google ile Giriş</h3>
      <p>Pencere kapatılabilir.</p>
    </div>
  );
}
