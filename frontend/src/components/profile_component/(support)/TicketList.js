"use client";

import { useSupportStore } from "@/store/support/supportStore";
import TicketItem from "./TicketItem";

export default function TicketList() {
  const tickets = useSupportStore((s) => s.tickets);
  const loading = useSupportStore((s) => s.loading);
  const fetchTickets = useSupportStore((s) => s.fetchTickets);

  return (
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Geçmiş Talepler</h3>
        <button onClick={fetchTickets} className="text-sm text-blue-600">Yenile</button>
      </div>

      {loading && <div className="text-sm text-gray-500">Yükleniyor...</div>}

      {!loading && tickets.length === 0 && (
        <div className="text-sm text-gray-500">Henüz destek talebiniz yok.</div>
      )}

      <ul className="space-y-2">
        {tickets.map((t) => (
          <li key={t.id}>
            <TicketItem ticket={t} />
          </li>
        ))}
      </ul>
    </div>
  );
}
