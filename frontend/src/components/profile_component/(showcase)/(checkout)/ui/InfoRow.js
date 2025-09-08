// components/checkout/ui/InfoRow.js
"use client";

import React from "react";

export default function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between bg-gray-900 rounded-lg px-3 py-2 border border-gray-700">
      <span className="text-xs text-gray-300">{label}</span>
      <span className={`text-sm text-white font-semibold ${mono ? "font-mono" : ""}`}>{value}</span>
    </div>
  );
}
