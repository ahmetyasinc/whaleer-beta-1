// components/TicketDetail.jsx
"use client";

import { useEffect, useState } from "react";
import { useSupportStore } from "@/store/support/supportStore";
import MessageList from "./MessageList";
import SatisfactionForm from "./SatisfactionForm";
import MessageComposer from "./MessageComposer";

export default function TicketDetail({ ticketId, onBack, user }) {
  const { currentTicket, fetchTicket, closeTicket } = useSupportStore();
  const [showSatisfaction, setShowSatisfaction] = useState(false);

  useEffect(() => {
    if (ticketId) fetchTicket(ticketId);
  }, [ticketId, fetchTicket]);

  if (!currentTicket || currentTicket.id !== ticketId) {
    return <div className="p-4 text-center">Yükleniyor...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <button onClick={onBack} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
              ← Geri
            </button>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {currentTicket.subject}
            </h2>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium ${
                currentTicket.status === "open"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : currentTicket.status === "in_progress"
                  ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  : currentTicket.status === "resolved"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
              }`}
            >
              {currentTicket.status === "open"
                ? "Açık"
                : currentTicket.status === "in_progress"
                ? "İşlemde"
                : currentTicket.status === "resolved"
                ? "Çözüldü"
                : "Kapalı"}
            </span>

            {currentTicket.status !== "closed" && (
              <button
                onClick={() => setShowSatisfaction(true)}
                className="px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:hover:bg-red-800"
              >
                Kapat
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          #{currentTicket.id} • {new Date(currentTicket.created_at).toLocaleDateString("tr-TR")}
        </div>
      </div>

      {/* Mesajlar */}
      <div className="h-96 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
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
        <MessageComposer ticketId={ticketId} />
      )}
    </div>
  );
}
