"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaExclamationTriangle } from "react-icons/fa";
import { useTranslation, Trans } from "react-i18next";

const CriticalConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation("criticalConfirmModal");
  const [countdown, setCountdown] = useState(5);
  const [showWhiteFlash, setShowWhiteFlash] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setCountdown(5);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  return createPortal(
    <>
      {showWhiteFlash && (
        <div className="fixed inset-0 z-[9999] bg-white animate-fadeout pointer-events-none" />
      )}

      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm">
        <div className="relative grid min-h-dvh place-items-center p-4">
          <div
            className="bg-gradient-to-br from-zinc-900 via-zinc-950 to-black text-white rounded-2xl shadow-2xl shadow-red-500/20 border border-zinc-800 ring-1 ring-red-500/20 w-full max-w-md p-8 relative max-h-[calc(100dvh-2rem)] overflow-y-auto animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-labelledby="critical-confirm-title"
            aria-describedby="critical-confirm-desc"
          >
            {/* Glow overlay */}
            <div
              className="absolute inset-0 rounded-2xl 
                          bg-gradient-to-br from-red-600/10 to-orange-500/5 
                          pointer-events-none blur-sm"
            />

            <div className="relative z-10">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-full bg-red-900/30 ring-1 ring-red-600/30">
                  <FaExclamationTriangle className="text-red-400 text-2xl" />
                </div>
                <div>
                  <h2 id="critical-confirm-title" className="text-xl font-bold text-white">
                    {t("title")}
                  </h2>
                  <p id="critical-confirm-desc" className="text-sm text-zinc-400">
                    {t("subtitle")}
                  </p>
                </div>
              </div>

              {/* Content */}
              <div className="mb-8 p-4 rounded-xl bg-red-900/20 border border-red-700/40">
                <p className="text-sm leading-relaxed text-zinc-200">
                  <Trans
                    i18nKey="message"
                    ns="criticalConfirmModal"
                    components={{ strong: <strong className="text-red-400" /> }}
                  />
                </p>
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button
                  disabled={countdown > 0}
                  onClick={onConfirm}
                  className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${countdown > 0
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/40 transform hover:scale-[1.01]"
                    }`}
                  aria-live="polite"
                  aria-label={
                    countdown > 0
                      ? t("actions.confirmCountdown", { count: countdown })
                      : t("actions.confirm")
                  }
                >
                  {countdown > 0 ? (
                    <span className="flex items-center justify-center gap-2">
                      <div
                        className="w-4 h-4 border-2 border-zinc-500 border-t-transparent rounded-full animate-spin"
                        role="status"
                        aria-label={t("loading")}
                      />
                      {t("actions.confirmCountdown", { count: countdown })}
                    </span>
                  ) : (
                    t("actions.confirm")
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="w-full py-3 px-4 rounded-xl font-semibold 
                             bg-zinc-800 hover:bg-zinc-700 
                             text-zinc-300 transition-all duration-200 
                             hover:scale-[1.01]"
                  aria-label={t("actions.cancel")}
                >
                  {t("actions.cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default CriticalConfirmModal;
