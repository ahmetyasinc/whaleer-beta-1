// components/TicketList.jsx
"use client";

import { useSupportStore } from "@/store/support/supportStore";
import TicketItem from "./TicketItem";

export default function TicketList({ onSelectTicket, selectedTicketId, isModerator = false }) {
  const tickets = useSupportStore((s) => s.tickets);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {isModerator ? "Tüm Talepler" : "Taleplerim"}
        </h2>
        {isModerator && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Toplam {tickets.length} talep
          </p>
        )}
      </div>

      <ul className="divide-y divide-gray-200 dark:divide-gray-700">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="p-3">
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
          <li className="p-6 text-center text-gray-500 dark:text-gray-400">
            Henüz talebiniz yok.
          </li>
        )}
      </ul>
    </div>
  );
}
