// components/checkout/ModalFrame.js
"use client";

import React from "react";
import { FiX } from "react-icons/fi";

export default function ModalFrame({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-gray-800 border border-gray-700 shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-white font-semibold">{title}</h3>
          <button className="p-2 rounded-lg hover:bg-gray-700 text-gray-300" onClick={onClose}>
            <FiX className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}
