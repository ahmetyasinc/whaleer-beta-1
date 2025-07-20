'use client';


import React from 'react';

export default function ConfirmDeleteModal({ open, onClose, onConfirm, message = "Bu sohbeti silmek istediğinizden emin misiniz?" }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60">
      <div className="bg-zinc-900 rounded-xl shadow-2xl max-w-xs w-full p-6 text-center border-1 border-zinc-500">
        <div className="mb-4 text-white text-lg font-semibold">
          {message}
        </div>
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-all"
          >
            Vazgeç
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white font-bold transition-all"
          >
            Evet, Sil
          </button>
        </div>
      </div>
    </div>
  );
}
