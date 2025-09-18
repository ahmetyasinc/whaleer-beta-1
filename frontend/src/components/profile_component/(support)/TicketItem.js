// components/TicketItem.jsx
"use client";

import { useState } from "react";

const priorityColors = {
  low: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  normal: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  high: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  urgent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const statusColors = {
  open: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  resolved: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
};

const priorityLabels = { low: "Düşük", normal: "Normal", high: "Yüksek", urgent: "Acil" };
const statusLabels = { open: "Açık", in_progress: "İşlemde", resolved: "Çözüldü", closed: "Kapalı" };

export default function TicketItem({ ticket, onSelect, isSelected }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const handleClick = () => {
    if (onSelect) return onSelect(ticket.id);
    setExpanded((x) => !x);
  };

  return (
    <div
      className={`border border-gray-200 dark:border-gray-700 rounded-lg p-4 transition-all cursor-pointer ${
        isSelected ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700" : "hover:bg-gray-50 dark:hover:bg-gray-700"
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}>
              {priorityLabels[ticket.priority]}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
              {statusLabels[ticket.status]}
            </span>
          </div>

          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{ticket.subject}</h4>

          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDate(ticket.created_at)} • #{ticket.id}
          </p>

          {(expanded || isSelected) && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                {ticket.messages?.[0]?.message || "Mesaj bulunamadı"}
              </p>
            </div>
          )}
        </div>

        {/* “ok” artık buton değil, span */}
        {!onSelect && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((x) => !x);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.stopPropagation();
                setExpanded((x) => !x);
              }
            }}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
            aria-label={expanded ? "Kapat" : "Genişlet"}
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        )}
      </div>
    </div>
  );
}
