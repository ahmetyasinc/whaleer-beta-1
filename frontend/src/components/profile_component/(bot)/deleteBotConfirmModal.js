"use client";

import { motion, AnimatePresence } from "framer-motion";
import { IoWarningOutline, IoClose } from "react-icons/io5";
import { useTranslation } from "react-i18next";

export default function DeleteBotConfirmModal({ isOpen, onClose, onConfirm }) {
  const { t } = useTranslation("deleteConfirm");

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          aria-modal="true"
          role="dialog"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="relative bg-zinc-950 text-zinc-100 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-sm flex flex-col overflow-hidden"
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
          >
            {/* Üst Kırmızı Işıma */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

            {/* Header */}
            <div className="relative flex justify-between items-center px-6 py-5 border-b border-zinc-900">
              <h2 className="text-lg font-semibold text-zinc-50 tracking-tight">
                {t("title")}
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
              >
                <IoClose className="text-xl" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="p-2.5 bg-orange-500/10 rounded-xl">
                    <IoWarningOutline className="text-2xl text-orange-500" />
                  </div>
                </div>

                <div className="flex flex-col justify-center gap-1">
                  <p className="text-[15px] font-medium text-zinc-200 leading-snug">
                    {t("warning")}
                  </p>
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {t("irreversible")}
                  </p>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 mt-8">
                <button
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-zinc-400 bg-transparent hover:text-zinc-100 hover:bg-zinc-900 border border-zinc-800 rounded-lg transition-all"
                >
                  {t("actions.cancel")}
                </button>

                <button
                  onClick={() => {
                    onConfirm();
                    onClose();
                  }}
                  className="flex-1 sm:flex-none px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-all shadow-lg shadow-red-900/20 active:scale-95"
                >
                  {t("actions.delete")}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}