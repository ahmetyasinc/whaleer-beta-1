"use client";
import { useEffect } from "react";

export default function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <img
        src={src}
        alt={alt || ""}
        className="max-h-[90vh] max-w-[95vw] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        className="absolute top-4 right-4 text-white/90 bg-black/40 hover:bg-black/60 rounded-full px-3 py-1"
        onClick={onClose}
      >
        ✕ Kapat
      </button>
    </div>
  );
}
