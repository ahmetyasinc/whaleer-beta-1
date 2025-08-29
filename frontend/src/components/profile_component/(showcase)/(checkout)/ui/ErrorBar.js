// components/checkout/ui/ErrorBar.js
"use client";

import React from "react";
import { FiAlertTriangle } from "react-icons/fi";

export default function ErrorBar({ message }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2 bg-red-900/60 border border-red-700 text-red-200 p-3 rounded-lg">
      <FiAlertTriangle className="w-4 h-4 flex-shrink-0" />
      <span className="text-sm">{message}</span>
    </div>
  );
}
