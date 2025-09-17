"use client";
import { useEffect, useMemo, useState, useCallback } from "react";

export default function ResponsiveGallery({ images = [], className = "" }) {
  const [items, setItems] = useState([]);           // { src, w, h, aspect }
  const [lightbox, setLightbox] = useState({ open: false, index: 0 });

  // Görsellerin doğal boyutlarını oku
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const results = await Promise.all(
        images.map(
          (src) =>
            new Promise((resolve) => {
              const img = new Image();
              img.onload = () => resolve({ src, w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
              img.onerror = () => resolve({ src, w: 1, h: 1 }); // hata olsa da bozma
              img.src = src;
            })
        )
      );
      if (!cancelled) {
        setItems(results.map(({ src, w, h }) => ({ src, w, h, aspect: w / h })));
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [images]);

  // Span sınıfları (md+ için). Mobilde hepsi 12.
  const getSpan = useCallback((a) => {
    if (a >= 1.8) return "md:col-span-12";
    if (a >= 1.3) return "md:col-span-8";
    if (a >= 0.9) return "md:col-span-6";
    return "md:col-span-4";
  }, []);

  const openAt = useCallback((i) => setLightbox({ open: true, index: i }), []);
  const close = useCallback(() => setLightbox({ open: false, index: 0 }), []);
  const prev = useCallback(
    () => setLightbox((s) => ({ ...s, index: (s.index - 1 + items.length) % items.length })),
    [items.length]
  );
  const next = useCallback(
    () => setLightbox((s) => ({ ...s, index: (s.index + 1) % items.length })),
    [items.length]
  );

  // ESC kapatma
  useEffect(() => {
    function onKey(e) {
      if (!lightbox.open) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox.open, close, prev, next]);

  if (!items.length) return null;

  return (
    <>
      {/* GRID */}
      <div
        className={`grid grid-cols-12 gap-4 ${className}`}
        // otomatik satır yüksekliği serbest kalsın: img'ler doğal oranında akar
      >
        {items.map((it, i) => (
          <figure
            key={it.src + i}
            className={`col-span-12 ${getSpan(it.aspect)} bg-white/5 border border-white/10 rounded-lg overflow-hidden hover:border-sky-400/40 transition`}
          >
            <button
              type="button"
              onClick={() => openAt(i)}
              className="block w-full text-left group"
              aria-label="Open image"
            >
              <img
                src={it.src}
                alt=""
                className="w-full h-auto block"
                loading="lazy"
                decoding="async"
              />
              {/* Hover mini overlay */}
              <div className="opacity-0 group-hover:opacity-100 transition p-2 text-xs text-neutral-300 bg-black/30">
                Click to enlarge
              </div>
            </button>
          </figure>
        ))}
      </div>

      {/* LIGHTBOX */}
      {lightbox.open && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-w-[95vw] max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={items[lightbox.index].src}
              alt=""
              className="max-w-full max-h-full object-contain"
              loading="eager"
            />

            {/* Close */}
            <button
              onClick={close}
              className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg"
            >
              ✕
            </button>

            {/* Prev / Next */}
            {items.length > 1 && (
              <>
                <button
                  onClick={prev}
                  className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg"
                  aria-label="Previous"
                >
                  ‹
                </button>
                <button
                  onClick={next}
                  className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg"
                  aria-label="Next"
                >
                  ›
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
