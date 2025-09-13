"use client";

import { useEffect } from "react";
import NewTicketForm from "@/components/profile_component/(support)/NewTicketForm";
import TicketList from "@/components/profile_component/(support)/TicketList";
import { useSupportStore } from "@/store/support/supportStore";

export default function ClientPage() {
  const fetchTickets = useSupportStore((s) => s.fetchTickets);

  useEffect(() => {
    fetchTickets(); // açılışta yükle
  }, [fetchTickets]);

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Destek</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Yeni talep oluşturun veya geçmiş taleplerinizi takip edin.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NewTicketForm />
          </div>

          <aside className="lg:col-span-1">
            <div className="sticky top-8">
              <TicketList />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
