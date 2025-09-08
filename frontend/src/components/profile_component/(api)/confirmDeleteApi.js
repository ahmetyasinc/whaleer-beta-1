// src/components/profile_component/(api)/confirmDeleteApi.jsx
'use client';

import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiAlertTriangle, FiTrash2, FiActivity, FiPauseCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

export default function ConfirmDeleteModal({
  isOpen,
  onCancel,
  onConfirm,
  bots = [],
  loading = false,
  apiName = '',
}) {
  const { t } = useTranslation('confirmDelete');

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && onCancel?.();
    if (isOpen) window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={onCancel} // backdrop tıklandıysa kapat
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            onMouseDown={(e) => e.stopPropagation()} // içe tıklama kapatmasın
            initial={{ y: 24, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full max-w-xl rounded-2xl border border-white/10 bg-gradient-to-b from-slate-900 to-slate-850 p-5 text-white shadow-2xl"
          >
            {/* Header */}
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-500/15 ring-1 ring-red-500/30">
                <FiTrash2 className="text-red-300" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">
                  {t('title')}
                </h2>
                <p className="mt-0.5 text-sm text-slate-300">
                  {apiName ? (
                    <>
                      <b>{apiName}</b> {t('subtitle.withNameSuffix')}
                    </>
                  ) : (
                    t('subtitle.noName')
                  )}
                </p>
              </div>
            </div>

            {/* Bot listesi */}
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-200">{t('botsHeader')}</p>

              {/* Loading skeleton */}
              {loading && (
                <ul className="mt-3 grid max-h-56 grid-cols-1 gap-2 overflow-auto">
                  {[1, 2, 3].map((i) => (
                    <li
                      key={`skeleton-${i}`}
                      className="h-16 animate-pulse rounded-xl border border-white/5 bg-slate-800/40"
                    >
                      <div className="h-full w-full rounded-xl bg-gradient-to-r from-slate-700/40 via-slate-600/30 to-slate-700/40" />
                    </li>
                  ))}
                </ul>
              )}

              {/* Empty */}
              {!loading && bots.length === 0 && (
                <div className="mt-3 rounded-xl border border-white/5 bg-slate-800/40 p-3 text-sm text-slate-400">
                  {t('empty')}
                </div>
              )}

              {/* Bot cards */}
              {!loading && bots.length > 0 && (
                <ul className="mt-3 grid max-h-56 grid-cols-1 gap-2 overflow-auto pr-1">
                  {bots.map((b) => {
                    const active = !!b.active;
                    const card = active
                      ? 'bg-emerald-900/25 border-emerald-700/40 ring-1 ring-emerald-500/20 hover:ring-emerald-400/40'
                      : 'bg-slate-800/40 border-slate-700/60 ring-1 ring-white/5 opacity-90 hover:opacity-100';
                    const dot = active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500';
                    const badge =
                      active
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-200'
                        : 'border-slate-600 bg-slate-700 text-slate-300';

                    return (
                      <li
                        key={b.id}
                        className={`group flex items-center justify-between rounded-xl border p-3 transition ${card}`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                          <div>
                            <p className="font-medium leading-tight">{b.name}</p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs ${badge}`}
                          title={active ? t('badge.titleActive') : t('badge.titleInactive')}
                        >
                          {active ? <FiActivity /> : <FiPauseCircle />}
                          {active ? t('badge.labelActive') : t('badge.labelInactive')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Uyarı */}
            <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-600/40 bg-amber-500/15 p-3 text-amber-200">
              <FiAlertTriangle className="mt-0.5 shrink-0" />
              <p className="text-xs leading-relaxed">
                {t('warning.part1')} <b>{t('warning.bold')}</b>, {t('warning.part2')}
              </p>
            </div>

            {/* Actions */}
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={onCancel}
                className="rounded-lg border border-white/10 bg-slate-700/60 px-4 py-2 text-sm text-slate-100 transition hover:bg-slate-600/70"
              >
                {t('buttons.cancel')}
              </button>
              <button
                onClick={onConfirm}
                className="rounded-lg border border-red-500/30 bg-gradient-to-r from-red-600 to-red-500 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-red-500 hover:to-red-400"
              >
                {t('buttons.confirm')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
