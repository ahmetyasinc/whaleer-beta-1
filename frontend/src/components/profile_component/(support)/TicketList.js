// components/TicketList.jsx
"use client";

import { useSupportStore } from "@/store/support/supportStore";
import TicketItem from "./TicketItem";

export default function TicketList({ onSelectTicket, selectedTicketId, isModerator = false, hideHeader = false }) {
  const tickets = useSupportStore((s) => s.tickets);

  return (
    <div className="w-full">
      {/* Sticky Header Bölümü - hideHeader true ise gizle */}
      {!hideHeader && (
        <div className="pb-4 mb-2 border-b border-zinc-800/50">
          <h2 className="text-sm font-semibold ml-2 uppercase tracking-wider text-zinc-400">
            {isModerator ? "Tüm Talepler" : "Geçmiş Taleplerim"}
          </h2>
          {isModerator && (
            <p className="text-xs text-zinc-500 mt-1 ml-2">
              Toplam {tickets.length} talep
            </p>
          )}
        </div>
      )}

      <ul className="space-y-2">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <div
              role="button"
              tabIndex={0}
              onClick={() => onSelectTicket?.(ticket.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectTicket?.(ticket.id);
              }}
              className="w-full text-left"
            >
              <TicketItem
                ticket={ticket}
                onSelect={onSelectTicket}
                isSelected={selectedTicketId === ticket.id}
                showUserInfo={isModerator}
              />
            </div>
          </li>
        ))}

        {tickets.length === 0 && (
          <li className="p-8 text-center text-zinc-500 text-sm italic">
            Henüz hiç destek talebiniz bulunmuyor.
          </li>
        )}
      </ul>
    </div>
  );
}
