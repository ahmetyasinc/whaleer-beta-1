// components/checkout/ui/SkeletonLines.js
"use client";

import React from "react";

export default function SkeletonLines() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-4 bg-gray-700 rounded" />
      <div className="h-4 bg-gray-700 rounded" />
      <div className="h-4 bg-gray-700 rounded" />
    </div>
  );
}
