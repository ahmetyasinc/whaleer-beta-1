"use client";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";

/* -----------------------------------------------------------
 * Path normalizasyonu:
 * - http/https ise dokunma
 * - değilse public köküne göre prefixle ve basePath'i uygula
 * ----------------------------------------------------------- */
const normalizeSrc = (src) => {
  if (!src) return src;
  if (/^https?:\/\//i.test(src)) return src;
  const base = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const clean = src.startsWith("/") ? src : `/${src}`;
  return `${base}${clean}`;
};

/* -----------------------------------------------------------
 * Stabil imza (signature): içerik aynıysa aynı stringi üretir.
 * Parent her render’da yeni array oluştursa da, imza değişmiyorsa
 * state resetlenmez → sonsuz döngü kırılır.
 * ----------------------------------------------------------- */
const makeSignature = (inItems, images) => {
  if (inItems && Array.isArray(inItems) && inItems.length) {
    return inItems
      .map((it) => {
        const t = (it.type || "image").toLowerCase();
        const s = it.src || "";
        const p = it.poster || "";
        const l = (it.layout || "auto").toLowerCase();
        return `${t}|${s}|${p}|${l}`;
      })
      .join(";;");
  }
  if (images && images.length) return images.join(";;");
  return "";
};

export default function ResponsiveGallery({ items: inItems, images = [], className = "" }) {
  // 1) İMZA: içerik aynıysa stable kalsın
  const signature = useMemo(() => makeSignature(inItems, images), [inItems, images]);

  // 2) Başlangıç state: normalize edilmiş kopya (ölçüm yoksa undefined)
  const initial = useMemo(() => {
    const raw =
      inItems && Array.isArray(inItems) && inItems.length
        ? inItems
        : images && images.length
        ? images.map((src) => ({ type: "image", src }))
        : [];

    return raw.map((it) => ({
      ...it,
      src: normalizeSrc(it.src),
      poster: it.poster ? normalizeSrc(it.poster) : undefined,
      layout: (it.layout || "auto").toLowerCase(),
      // Ölçüm başlangıçta yok → undefined; yüklenince yazılacak
      w: typeof it.w === "number" ? it.w : undefined,
      h: typeof it.h === "number" ? it.h : undefined,
      aspect: typeof it.aspect === "number" ? it.aspect : undefined,
      __open: false,
    }));
  }, [signature]); // sadece imza değiştiğinde yeniden hesapla

  // 3) İç state — sadece signature değiştiğinde resetle
  const [items, setItems] = useState(initial);
  const prevSigRef = useRef(signature);

  useEffect(() => {
    if (prevSigRef.current !== signature) {
      setItems(initial);
      prevSigRef.current = signature;
    }
  }, [signature, initial]);

  // Span hesaplama: ölçüm yoksa güvenli varsayılan (orta genişlik)
  const getSpan = useCallback((it) => {
    const layout = it.layout || "auto";
    if (layout === "full")  return "sm:col-span-12";
    if (layout === "wide")  return "sm:col-span-12 lg:col-span-12";
    if (layout === "half")  return "sm:col-span-6";
    if (layout === "third") return "sm:col-span-6 md:col-span-4";

    const a = it.aspect;
    if (typeof a !== "number") {
      // ölçüm gelene kadar güvenli varsayılan
      return "sm:col-span-6 md:col-span-6";
    }
    if (a >= 1.9)  return "sm:col-span-12";
    if (a >= 1.35) return "sm:col-span-12 md:col-span-8";
    if (a >= 0.95) return "sm:col-span-6 md:col-span-6";
    return "sm:col-span-6 md:col-span-4"; // dikey
  }, []);

  // Asla yukarı ölçekleme yapma (ölçüm yoksa sadece max sınırları uygula)
  const noUpscaleStyle = (it) => {
    const style = {
      height: "auto",
      maxWidth: "100%",
      maxHeight: "80vh",
    };
    // SADECE geçerli ölçüm varsa width ver (aksi halde 1px'a kilitlenme olur)
    if (typeof it.w === "number" && it.w > 1) style.width = `${it.w}px`;
    return style;
  };

  // Lightbox açık/kapa (state'i item içine yazarak tek state kullanıyoruz)
  const openAt = useCallback((i) => {
    setItems((prev) => prev.map((x, idx) => (idx === i ? { ...x, __open: true } : { ...x, __open: false })));
  }, []);

  const close = useCallback(() => setItems((prev) => prev.map((x) => ({ ...x, __open: false }))), []);

  const prev = useCallback(() => {
    setItems((prev) => {
      const n = prev.length;
      const i = prev.findIndex((x) => x.__open);
      if (i < 0) return prev;
      const j = (i - 1 + n) % n;
      return prev.map((x, idx) => ({ ...x, __open: idx === j }));
    });
  }, []);

  const next = useCallback(() => {
    setItems((prev) => {
      const n = prev.length;
      const i = prev.findIndex((x) => x.__open);
      if (i < 0) return prev;
      const j = (i + 1) % n;
      return prev.map((x, idx) => ({ ...x, __open: idx === j }));
    });
  }, []);

  // *** ÖLÇÜM: YALNIZCA YÜKLEME TAMAMLANINCA ***
  const onImgLoad = useCallback((idx, el) => {
    if (!el) return;
    const w = el.naturalWidth || 0;
    const h = el.naturalHeight || 0;
    if (!w || !h) return;               // henüz hazır değil → yazma
    const aspect = w / h;
    setItems((prev) => {
      const cur = prev[idx];
      if (!cur) return prev;
      // aynı değer ise state yazma (loop kırıcı)
      if (cur.w === w && cur.h === h && cur.aspect === aspect) return prev;
      const next = [...prev];
      next[idx] = { ...cur, w, h, aspect };
      return next;
    });
  }, []);

  const onVideoMeta = useCallback((idx, el) => {
    if (!el) return;
    const w = el.videoWidth || 0;
    const h = el.videoHeight || 0;
    if (!w || !h) return;
    const aspect = w / h;
    setItems((prev) => {
      const cur = prev[idx];
      if (!cur) return prev;
      if (cur.w === w && cur.h === h && cur.aspect === aspect) return prev;
      const next = [...prev];
      next[idx] = { ...cur, w, h, aspect };
      return next;
    });
  }, []);

  // Scroll lock — lightbox açıkken
  const scrollYRef = useRef(0);
  const bodyLockRef = useRef(false);
  const hasOpen = items.some((x) => x.__open);

  useEffect(() => {
    if (hasOpen && !bodyLockRef.current) {
      const y = window.scrollY || window.pageYOffset || 0;
      scrollYRef.current = y;

      const body = document.body;
      body.style.position = "fixed";
      body.style.top = `-${y}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden";

      bodyLockRef.current = true;
    } else if (!hasOpen && bodyLockRef.current) {
      const body = document.body;
      const y = Math.abs(parseInt(body.style.top || "0", 10)) || scrollYRef.current;

      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";

      window.scrollTo(0, y);
      bodyLockRef.current = false;
    }
    return () => {
      if (bodyLockRef.current) {
        const body = document.body;
        const y = Math.abs(parseInt(body.style.top || "0", 10)) || scrollYRef.current;
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.overflow = "";
        window.scrollTo(0, y);
        bodyLockRef.current = false;
      }
    };
  }, [hasOpen]);

  // Klavye kısayolları (lightbox açıkken)
  useEffect(() => {
    function onKey(e) {
      if (!hasOpen) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasOpen, close, prev, next]);

  // Swipe (lightbox)
  const touchStartX = useRef(null);
  const onTouchStart = (e) => { if (hasOpen) touchStartX.current = e.touches?.[0]?.clientX ?? null; };
  const onTouchEnd = (e) => {
    if (!hasOpen || touchStartX.current == null) return;
    const dx = (e.changedTouches?.[0]?.clientX ?? 0) - touchStartX.current;
    if (Math.abs(dx) > 40) { if (dx > 0) prev(); else next(); }
    touchStartX.current = null;
  };

  if (!items.length) return null;

  const openIndex = items.findIndex((x) => x.__open);

  return (
    <>
      {/* GRID */}
      <div className={`grid grid-cols-2 sm:grid-cols-12 gap-3 sm:gap-4 ${className}`} role="list">
        {items.map((it, i) => {
          const alt = it.alt || it.caption || "Media";
          const isVideo = (it.type || "image").toLowerCase() === "video";

          return (
            <figure
              role="listitem"
              key={`${it.src}-${i}`}
              className={`col-span-2 sm:col-span-12 ${getSpan(it)} bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-sky-400/40 transition`}
            >
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); openAt(i); }}
                className="w-full h-full relative"
                aria-label={isVideo ? "Videoyu büyüt" : "Görseli büyüt"}
              >
                <div className="w-full h-full p-2 sm:p-3 flex items-center justify-center">
                  {isVideo ? (
                    it.poster ? (
                      <img
                        src={it.poster}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        style={noUpscaleStyle(it)}
                        className="block"
                        onLoad={(e) => onImgLoad(i, e.currentTarget)}   // poster yüklendiğinde ölç
                      />
                    ) : (
                      <video
                        src={it.src}
                        muted
                        playsInline
                        preload="metadata"
                        style={noUpscaleStyle(it)}
                        className="block"
                        onLoadedMetadata={(e) => onVideoMeta(i, e.currentTarget)}
                      />
                    )
                  ) : (
                    <img
                      src={it.src}
                      alt={alt}
                      loading="lazy"
                      decoding="async"
                      style={noUpscaleStyle(it)}
                      className="block"
                      onLoad={(e) => onImgLoad(i, e.currentTarget)}      // YALNIZCA yükleme tamamlanınca ölç
                    />
                  )}
                </div>

                {isVideo && (
                  <span aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <span className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-black/55 backdrop-blur-sm border border-white/20">
                      <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white/95">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </span>
                )}

                {(it.caption || isVideo) && (
                  <figcaption className="px-3 pb-3 text-xs text-neutral-300 text-center">
                    {it.caption || (isVideo ? "Videoyu oynatmak için tıkla" : "Büyütmek için tıkla")}
                  </figcaption>
                )}
              </button>
            </figure>
          );
        })}
      </div>

      {/* LIGHTBOX */}
      {openIndex >= 0 && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            className="relative max-w-[98vw] max-h-[92vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {(items[openIndex].type || "image").toLowerCase() === "video" ? (
              <video
                src={items[openIndex].src}
                poster={items[openIndex].poster}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                onLoadedMetadata={(e) => onVideoMeta(openIndex, e.currentTarget)}
              />
            ) : (
              <img
                src={items[openIndex].src}
                alt={items[openIndex].alt || ""}
                className="max-w-full max-h-full object-contain"
                loading="eager"
                onLoad={(e) => onImgLoad(openIndex, e.currentTarget)}
              />
            )}

            <button
              onClick={(e) => { e.preventDefault(); close(); }}
              className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Kapat"
            >
              ✕
            </button>

            {items.length > 1 && (
              <>
                <button
                  onClick={(e) => { e.preventDefault(); prev(); }}
                  className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label="Önceki"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); next(); }}
                  className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-white/50"
                  aria-label="Sonraki"
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
