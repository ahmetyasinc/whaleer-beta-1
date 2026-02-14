// components/TicketDetail.jsx
"use client";

import { useEffect, useState } from "react";
import { useSupportStore } from "@/store/support/supportStore";
import MessageList from "./MessageList";
import SatisfactionForm from "./SatisfactionForm";
import MessageComposer from "./MessageComposer";
import { useTranslation } from "react-i18next";

import { RiLoader4Fill } from "react-icons/ri";

export default function TicketDetail({ ticketId, onBack, user }) {
  const { t, i18n } = useTranslation("supportTicketDetail");
  const { currentTicket, fetchTicket, closeTicket } = useSupportStore();
  const [showSatisfaction, setShowSatisfaction] = useState(false);

  useEffect(() => {
    if (ticketId) fetchTicket(ticketId);
  }, [ticketId, fetchTicket]);

  if (!currentTicket || currentTicket.id !== ticketId) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <RiLoader4Fill className="w-16 h-16 text-sky-500 animate-spin mb-24" />
      </div>
    );

  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="px-6 py-4 border-b bg-zinc-950/90 border-zinc-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="text-zinc-500 hover:text-zinc-300 transition-colors p-1 -ml-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
            </button>
            <h2 className="text-lg font-semibold text-white tracking-tight">
              {currentTicket.subject}
            </h2>
          </div>

          <div className="flex items-center space-x-3">
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentTicket.status === "open"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : currentTicket.status === "in_progress"
                  ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                  : currentTicket.status === "resolved"
                    ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                }`}
            >
              {currentTicket.status === "open"
                ? t("status.open")
                : currentTicket.status === "in_progress"
                  ? t("status.in_progress")
                  : currentTicket.status === "resolved"
                    ? t("status.resolved")
                    : t("status.closed")}
            </span>

            {currentTicket.status !== "closed" && (
              <button
                onClick={() => setShowSatisfaction(true)}
                className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
              >
                {t("closeTicket")}
              </button>
            )}
          </div>
        </div>
        <div className="mt-1 ml-8 text-xs text-zinc-500">
          #{currentTicket.id} • {new Date(currentTicket.created_at).toLocaleDateString(i18n.language, { year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Mesajlar */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-zinc-950/30 custom-scrollbar">
        <MessageList messages={currentTicket.messages || []} currentUserId={user?.id} />
      </div>

      {showSatisfaction && (
        <SatisfactionForm
          onSubmit={async (rating, feedback) => {
            await closeTicket(ticketId, rating, feedback);
            setShowSatisfaction(false);
          }}
          onCancel={() => setShowSatisfaction(false)}
        />
      )}

      {/* Composer (görsel ekleme destekli) */}
      {currentTicket.status !== "closed" && !showSatisfaction && (
        <div className="border-t border-zinc-800 p-4 bg-zinc-900/30">
          <MessageComposer ticketId={ticketId} />
        </div>
      )}
    </div>
  );
}
