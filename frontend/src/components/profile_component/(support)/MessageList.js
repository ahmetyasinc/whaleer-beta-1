// components/MessageList.jsx
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import api from "@/api/axios";

// Basit, dosya içi Lightbox
function ImageLightbox({ src, alt = "", onClose }) {
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
      <AuthenticatedImage
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[95vw] rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />
      <button
        className="absolute top-4 right-4 text-white/90 bg-black/40 hover:bg-black/60 rounded-full px-3 py-1"
        onClick={onClose}
      >
        ✕
      </button>
    </div>
  );
}

const isImage = (m) => (m || "").startsWith("image/");

const formatFileSize = (bytes = 0) => {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${parseFloat((bytes / Math.pow(1024, i)).toFixed(1))} ${units[i]}`;
};

// --- helpers: cookie -> settings ---
function readWhSettingsFromCookie() {
  try {
    const m = document.cookie.match(/(?:^|;\s*)wh_settings=([^;]+)/);
    if (!m) return null;
    return JSON.parse(decodeURIComponent(m[1]));
  } catch {
    return null;
  }
}

// "GMT+02:00" -> +120 (dakika), "GMT-03:30" -> -210
function parseGmtOffsetMinutes(str) {
  const m = /^GMT([+-])(\d{2})(?::?(\d{2}))?$/i.exec(str || "");
  if (!m) return null;
  const sign = m[1] === "+" ? 1 : -1;
  const hh = parseInt(m[2], 10) || 0;
  const mm = parseInt(m[3] || "0", 10) || 0;
  return sign * (hh * 60 + mm);
}

export default function MessageList({ messages = [], currentUserId }) {
  const messagesEndRef = useRef(null);
  const [previewSrc, setPreviewSrc] = useState(null);
  const [tzPref, setTzPref] = useState(null); // cookie'den gelen timezone string

  // Cookie'den timezone'u al
  useEffect(() => {
    const settings = readWhSettingsFromCookie();
    if (settings?.timezone) setTzPref(settings.timezone);
  }, []);

  // Yeni mesaj gelince alta kaydır
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const openPreview = useCallback((src) => setPreviewSrc(src), []);
  const closePreview = useCallback(() => setPreviewSrc(null), []);

  // "tr-TR" dilini sabit tuttuk
  const timeFormatter = useMemo(() => {
    // IANA ise (Europe/Istanbul gibi) direkt Intl ile formatlarız
    if (tzPref && !/^GMT[+-]/i.test(tzPref)) {
      try {
        return new Intl.DateTimeFormat("tr-TR", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: tzPref,
        });
      } catch {
        // geçersizse local'e düşeriz
      }
    }
    // GMT±HH:mm ise özel işleme girecek; burada formatter'ı UTC için kuruyoruz
    return new Intl.DateTimeFormat("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  }, [tzPref]);

  const formatTime = useCallback(
    (iso) => {
      const d = new Date(iso);

      if (tzPref) {
        // GMT±HH:mm -> ofseti hesaplayıp UTC'ye kaydır
        if (/^GMT[+-]/i.test(tzPref)) {
          const offMin = parseGmtOffsetMinutes(tzPref);
          if (offMin !== null) {
            const shifted = new Date(d.getTime() + offMin * 60_000);
            return timeFormatter.format(shifted);
          }
        }
        // IANA ise formatter zaten ayarlanmıştı
        try {
          return timeFormatter.format(d);
        } catch {
          // düş
        }
      }

      // Fallback: cihaz saat dilimi
      return new Intl.DateTimeFormat("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    },
    [tzPref, timeFormatter]
  );

  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const mine = message.user_id === currentUserId;
        const bubble =
          "max-w-xs lg:max-w-md px-4 py-2 rounded-lg " +
          (mine
            ? "bg-blue-600 text-white"
            : "bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100");

        return (
          <div
            key={message.id}
            className={`flex ${mine ? "justify-end" : "justify-start"}`}
          >
            <div className={bubble}>
              {/* Metin */}
              {message.message && (
                <p className="text-sm whitespace-pre-wrap">{message.message}</p>
              )}

              {/* Ekler */}
              {!!message.attachments?.length && (
                <div className="mt-2 space-y-2">
                  {message.attachments.map((att) => {
                    const fileUrl = `/support/attachments/${att.id}/file`;
                    const thumbnailUrl = `/support/attachments/${att.id}/thumbnail?size=320`;
                    const thumbnailLargeUrl = `/support/attachments/${att.id}/thumbnail?size=640`;

                    if (isImage(att.mime_type)) {
                      return (
                        <div key={att.id} className="flex flex-col">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => openPreview(fileUrl)} // TODO: Preview için de auth fetch gerekebilir, şimdilik böyle bırakalım veya ImageLightbox'ı güncelleyelim
                            onKeyDown={(e) =>
                              (e.key === "Enter" || e.key === " ") &&
                              openPreview(fileUrl)
                            }
                            title="Büyütmek için tıklayın"
                            className="outline-none ring-0 focus-visible:ring-2 focus-visible:ring-white/60 rounded"
                          >
                            <AuthenticatedImage
                              src={thumbnailUrl}
                              alt={att.filename || ""}
                              className="w-full max-h-48 object-cover rounded border border-black/5"
                            />
                          </div>
                          <div className="mt-1 text-xs text-gray-500">
                            {att.filename} • {formatFileSize(att.size_bytes)}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={att.id}
                        className="bg-white dark:bg-gray-800 rounded p-2 flex items-center justify-between"
                      >
                        <div className="flex items-center min-w-0">
                          <svg
                            className="w-6 h-6 text-gray-400 mr-2 flex-shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {att.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(att.size_bytes)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const response = await api.get(fileUrl, { responseType: 'blob' });
                              const url = window.URL.createObjectURL(new Blob([response.data]));
                              const link = document.createElement('a');
                              link.href = url;
                              link.setAttribute('download', att.filename);
                              document.body.appendChild(link);
                              link.click();
                              link.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error("Download error", err);
                              alert("İndirme başarısız oldu.");
                            }
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm ml-3 flex-shrink-0 bg-transparent border-0 cursor-pointer"
                        >
                          İndir
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Zaman */}
              {message.created_at && (
                <p className={`text-xs mt-1 ${mine ? "text-blue-200" : "text-gray-500"}`}>
                  {formatTime(message.created_at)}
                </p>
              )}
            </div>
          </div>
        );
      })}
      <div ref={messagesEndRef} />
      {previewSrc && <ImageLightbox src={previewSrc} onClose={closePreview} />}
    </div>
  );
}
