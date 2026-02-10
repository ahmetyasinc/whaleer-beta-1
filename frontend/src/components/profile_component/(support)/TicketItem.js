// components/TicketItem.jsx
"use client";

import { useState } from "react";

const priorityColors = {
  low: "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20",
  normal: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  high: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  urgent: "bg-red-500/10 text-red-400 border border-red-500/20",
};

const statusColors = {
  open: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  in_progress: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  resolved: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
  closed: "bg-zinc-500/10 text-zinc-500 border border-zinc-500/20",
};

const priorityLabels = { low: "Düşük", normal: "Normal", high: "Yüksek", urgent: "Acil" };
const statusLabels = { open: "Açık", in_progress: "İşlemde", resolved: "Çözüldü", closed: "Kapalı" };

export default function TicketItem({ ticket, onSelect, isSelected, showUserInfo }) {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const handleClick = (e) => {
    // Eğer metin seçiliyse (select işlemi varsa) tıklamayı tetikleme
    if (window.getSelection().toString().length > 0) return;

    if (onSelect) return onSelect(ticket.id);
    setExpanded((x) => !x);
  };

  return (
    <div
      className={`group relative rounded-xl p-4 transition-all duration-200 cursor-pointer border ${isSelected
        ? "bg-zinc-800/50 border-zinc-700 shadow-lg shadow-black/20"
        : "bg-transparent hover:bg-zinc-900/60 border-zinc-800"
        }`}
      onClick={handleClick}
    >
      {/* Sol kenar çizgisi (aktifse görünür) */}
      {isSelected && (
        <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
      )}

      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${priorityColors[ticket.priority] || priorityColors.low}`}>
              {priorityLabels[ticket.priority] || ticket.priority}
            </span>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium ${statusColors[ticket.status] || statusColors.open}`}>
              {statusLabels[ticket.status] || ticket.status}
            </span>
            <span className="text-[10px] font-mono text-zinc-600">#{ticket.id}</span>
          </div>

          <h4 className={`text-sm font-medium mb-1 truncate transition-colors ${isSelected ? "text-blue-100" : "text-zinc-300 group-hover:text-zinc-200"}`}>
            {ticket.subject}
          </h4>

          <div className="text-xs text-zinc-500 flex items-center gap-2">
            <span>{formatDate(ticket.created_at)}</span>
            {showUserInfo && ticket.user && (
              <>
                <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                <span className="truncate max-w-[120px]" title={ticket.user.email}>{ticket.user.name || ticket.user.email}</span>
              </>
            )}
          </div>

          {(expanded || isSelected) && (
            <div className="mt-3 pt-3 border-t border-zinc-800/50">
              <p className="text-sm text-zinc-400 line-clamp-2 leading-relaxed opacity-90">
                {ticket.messages?.[0]?.message || "Mesaj içeriği bulunamadı..."}
              </p>
            </div>
          )}
        </div>

        {!onSelect && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((x) => !x);
            }}
            className="mt-1 p-1 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded transition-colors"
            aria-label={expanded ? "Kapat" : "Genişlet"}
          >
            <svg className={`w-4 h-4 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
