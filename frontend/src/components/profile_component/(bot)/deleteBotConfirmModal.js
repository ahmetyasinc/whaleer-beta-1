"use client";

import { motion, AnimatePresence } from "framer-motion";
import { IoWarningOutline } from "react-icons/io5";

export default function DeleteBotConfirmModal({ isOpen, onClose, onConfirm }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-zinc-900 text-white rounded-xl p-6 shadow-xl max-w-sm w-full"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
          >
            <h2 className="text-lg font-semibold mb-4">Botu silmek istediğinize emin misiniz?</h2>

            <div className="flex items-start gap-2 mb-2">
              <IoWarningOutline className="text-3xl text-orange-500 mt-0.5" />
              <p className="text-sm  text-zinc-200">
                Halihazırda açık işlemleriniz kapatılmayacaktır. Açık işlemlerinizin kontrolünü sağlayın.
              </p>
            </div>

            <p className="text-sm text-zinc-400 mb-3 ml-5">Bu işlem geri alınamaz.</p>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="px-4 py-2 text-sm bg-red-700 hover:bg-red-600 rounded-md text-white"
              >
                Sil
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
