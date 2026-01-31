"use client";

import { motion, AnimatePresence } from "framer-motion";
import { IoWarningOutline, IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";

export default function ShutDownBotModal({ isOpen, onClose, onConfirm }) {
  const { t } = useTranslation("shutDown");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
          aria-labelledby="shutdown-modal-title"
          aria-describedby="shutdown-modal-desc"
        >
          <motion.div
            className="bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-950">
              <h2 id="shutdown-modal-title" className="text-lg font-semibold tracking-wide text-zinc-50">
                {t("title")}
              </h2>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors duration-100"
              >
                <IoClose className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex items-start gap-4">
                <IoWarningOutline className="text-3xl text-orange-500 shrink-0" />
                <div className="space-y-2">
                  <p id="shutdown-modal-desc" className="text-sm text-zinc-300 leading-relaxed">
                    {t("warning")}
                  </p>
                  <p className="text-sm text-zinc-500">
                    {t("irreversible")}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-8">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 rounded-md transition-colors"
                  aria-label={t("actions.cancel")}
                >
                  {t("actions.cancel")}
                </button>
                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors shadow-lg shadow-red-900/20"
                  aria-label={t("actions.shutdown")}
                >
                  {t("actions.shutdown")}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
