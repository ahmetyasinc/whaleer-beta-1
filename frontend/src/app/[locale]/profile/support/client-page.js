// ClientPage.js
"use client";

import { useEffect, useState } from "react";
import NewTicketForm from "@/components/profile_component/(support)/NewTicketForm";
import TicketList from "@/components/profile_component/(support)/TicketList";
import AdminSupportPanel from "@/components/profile_component/(support)/AdminSupportPanel";
import TicketDetail from "@/components/profile_component/(support)/TicketDetail";
import ModeratorSupportPanel from "@/components/profile_component/(support)/ModeratorSupportPanel";
import { useSupportStore } from "@/store/support/supportStore";
import { useAdminSupportStore } from "@/store/support/adminStore";
import api from "@/api/axios";

export default function ClientPage() {
  const fetchUserTickets = useSupportStore((s) => s.fetchTickets);
  const fetchAdminTickets = useAdminSupportStore((s) => s.fetchTickets);

  const [userInfo, setUserInfo] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [errorUser, setErrorUser] = useState(null);

  // Yeni: listeden seçim
  const [selectedTicketId, setSelectedTicketId] = useState(null);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingUser(true);
        const res = await api.get("/api/user-info", { signal: controller.signal });
        if (!ignore) setUserInfo(res.data);
      } catch (err) {
        if (!ignore) {
          console.error("Kullanıcı bilgileri alınamadı:", err);
          setErrorUser("Kullanıcı bilgileri yüklenirken bir hata oluştu.");
        }
      } finally {
        if (!ignore) setLoadingUser(false);
      }
    })();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    if (!userInfo?.role) return;
    const role = String(userInfo.role).toUpperCase();
    if (role === "ADMIN" || role === "MODERATOR") {
      fetchAdminTickets();
    } else {
      fetchUserTickets();
    }
  }, [userInfo, fetchUserTickets, fetchAdminTickets]);

  const role = String(userInfo?.role || "USER").toUpperCase();
  const isAdmin = role === "ADMIN";
  const isModerator = role === "MODERATOR";

  if (loadingUser) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Yükleniyor...</p>
        </div>
      </div>
    );
  }
  if (errorUser) {
    return (
      <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-500">
          <p>{errorUser}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Destek</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isAdmin
                ? "Sistemdeki tüm destek taleplerini yönetin ve moderatörlere atayın."
                : isModerator
                ? "Size atanmış destek taleplerini yönetin."
                : "Yeni talep oluşturun veya geçmiş taleplerinizi takip edin."}
            </p>
          </div>
          {isAdmin && (
            <span className="px-3 py-1 bg-red-100 text-red-800 text-sm font-medium rounded-full dark:bg-red-900 dark:text-red-200">
              Admin
            </span>
          )}
          {isModerator && (
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full dark:bg-blue-900 dark:text-blue-200">
              Moderator
            </span>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isAdmin ? (
            <div className="lg:col-span-3">
              <AdminSupportPanel />
            </div>
          ) : isModerator ? (
            <div className="lg:col-span-3">
              <ModeratorSupportPanel user={userInfo} />
            </div>
          ) : (
            <>
              <div className="lg:col-span-2">
                {selectedTicketId ? (
                  <TicketDetail
                    ticketId={selectedTicketId}
                    onBack={() => setSelectedTicketId(null)}
                    user={userInfo}
                  />
                ) : (
                  <NewTicketForm
                    onTicketCreated={(t) => setSelectedTicketId(t.id)}
                  />
                )}
              </div>
              <aside className="lg:col-span-1">
                <div className="sticky top-8">
                  <TicketList
                    isModerator={false}
                    onSelectTicket={setSelectedTicketId}
                    selectedTicketId={selectedTicketId}
                  />
                </div>
              </aside>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
