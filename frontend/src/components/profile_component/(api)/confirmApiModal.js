'use client';
import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function ConfirmApiModal({ isOpen, onClose, onConfirm, apiData }) {
  const [userInputBalance, setUserInputBalance] = useState('');

  useEffect(() => {
    if (isOpen) {
      setUserInputBalance('');
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
        >
          <motion.div
            key="modal-content"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="bg-[hsl(245,25%,10%)] rounded p-6 w-full max-w-sm shadow-lg text-white"
          >
            <h2 className="text-base font-semibold mb-4">
              API bağlantınız başarılı. Lütfen hesabınızdaki USDT bakiyesini girerek kimliğinizi doğrulayın.
            </h2>

            <div className="mb-4">
              <label htmlFor="balanceInput" className="block mb-1 text-sm">
                Hesabınızda gördüğünüz USDT bakiyesi:
              </label>
              <div className="relative w-full">
                <input
                  id="balanceInput"
                  type="number"
                  inputMode="decimal"
                  value={userInputBalance}
                  onChange={(e) => setUserInputBalance(e.target.value)}
                  className="w-full px-3 py-1 pr-8 rounded-sm bg-black text-white focus:outline-none appearance-none 
                             [&::-webkit-outer-spin-button]:appearance-none 
                             [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Örn: 1000.00"
                />
                {/* Dolar ikonu */}
                <span className="absolute inset-y-0 right-2 flex items-center text-gray-400 pointer-events-none text-lg">
                  $
                </span>
              </div>
            </div>

            <div className="flex justify-start space-x-3">
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 px-2 py-0.5 rounded"
              >
                Vazgeç
              </button>
              <button
                onClick={() => onConfirm(userInputBalance)}
                className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded"
              >
                Onayla
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
