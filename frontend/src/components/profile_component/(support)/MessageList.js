// components/MessageList.jsx
"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import AuthenticatedImage from "@/components/AuthenticatedImage";
import api from "@/api/axios";

import ImageLightbox from "@/components/profile_component/(support)/ImageLightbox";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("supportMessageList");
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
    <div className="space-y-1">
      {messages.map((message) => {
        const mine = message.user_id === currentUserId;
        const bubble =
          "max-w-xs lg:max-w-md px-4 py-2 rounded-2xl " +
          (mine
            ? "bg-[#144D37] text-white rounded-tr-sm"
            : "bg-zinc-800 text-zinc-200 rounded-tl-sm border border-zinc-700");

        return (
          <div
            key={message.id}
            className={`flex ${mine ? "justify-end" : "justify-start"}`}
          >
            <div className={bubble}>
              {/* Metin */}
              {message.message && (
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.message}</p>
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
                            onClick={() => openPreview(fileUrl)}
                            onKeyDown={(e) =>
                              (e.key === "Enter" || e.key === " ") &&
                              openPreview(fileUrl)
                            }
                            title={t("clickToEnlarge")}
                            className="outline-none ring-0 focus-visible:ring-2 focus-visible:ring-white/60 rounded overflow-hidden"
                          >
                            <AuthenticatedImage
                              src={thumbnailUrl}
                              alt={att.filename || ""}
                              className="w-full max-h-48 object-cover rounded border border-black/20"
                            />
                          </div>
                          <div className="mt-1 text-xs opacity-70">
                            {att.filename} • {formatFileSize(att.size_bytes)}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={att.id}
                        className={`rounded p-2 flex items-center justify-between ${mine ? "bg-blue-700/50" : "bg-zinc-900/50"}`}
                      >
                        <div className="flex items-center min-w-0">
                          <svg
                            className="w-5 h-5 opacity-70 mr-2 flex-shrink-0"
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
                            <p className="text-sm font-medium truncate opacity-90">
                              {att.filename}
                            </p>
                            <p className="text-xs opacity-60">
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
                              alert(t("downloadFailed"));
                            }
                          }}
                          className="text-xs ml-3 flex-shrink-0 bg-white/10 hover:bg-white/20 rounded px-2 py-1 transition-colors"
                        >
                          {t("download")}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Zaman */}
              {message.created_at && (
                <p className={`text-[10px] mt-1 text-right ${mine ? "text-blue-100/70" : "text-zinc-500"}`}>
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
