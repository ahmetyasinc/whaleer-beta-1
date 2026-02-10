import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import AuthenticatedImage from "@/components/AuthenticatedImage";

// Helper to check if it's a blob url (local preview)
const isBlobUrl = (url) => url?.startsWith("blob:");

export default function ImageLightbox({ src, alt, onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-zinc-950/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Sabit Kapatma Butonu - Sağ Üst */}
      <button
        className="fixed top-6 right-6 z-[10000] text-zinc-400 hover:text-white bg-zinc-900/50 hover:bg-red-500/80 border border-zinc-700/50 rounded-full w-10 h-10 flex items-center justify-center backdrop-blur-sm transition-all shadow-lg"
        onClick={onClose}
        title="Kapat (ESC)"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
      </button>

      <div className="relative max-h-full max-w-full flex flex-col items-center justify-center">
        {isBlobUrl(src) ? (
          <img
            src={src}
            alt={alt || ""}
            className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl border border-zinc-800 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <AuthenticatedImage
            src={src}
            alt={alt || ""}
            className="max-h-[85vh] max-w-[90vw] rounded-lg shadow-2xl border border-zinc-800 object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>,
    document.body
  );
}
