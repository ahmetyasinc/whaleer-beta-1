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
import CandleLoader from "@/components/profile_component/(indicator)/candleLoader";
import { useTranslation } from "react-i18next";

export default function ClientPage() {
  const { t } = useTranslation("supportClientPage");
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
        const res = await api.get("/user-info", { signal: controller.signal });
        if (!ignore) setUserInfo(res.data);
      } catch (err) {
        if (!ignore) {
          console.error("Kullanıcı bilgileri alınamadı:", err);
          setErrorUser(t("error.userInfoLoad"));
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
      <div className="relative min-h-screen flex items-center justify-center hard-gradient overflow-hidden">

        {/* Blur katmanı */}
        <div className="absolute inset-0 backdrop-blur-md bg-black/40" />

        {/* İçerik */}
        <div className="relative text-center">
          <CandleLoader />
          <p className="mt-4 text-zinc-400">{t("loading")}</p>
        </div>
      </div>
    );

  }
  if (errorUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center text-red-500">
          <p>{errorUser}</p>
        </div>
      </div>
    );
  }


  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans">

      {/* Header Bar */}
      <header className="shrink-0 flex items-center justify-between px-6 py-3 border-b border-zinc-800 bg-black backdrop-blur-sm z-20 relative">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight border-l border-gray-600 px-4 py-1 text-white ml-10">
            {t("header.title")}
          </h1>
          {isAdmin && (
            <span className="px-2.5 py-0.5 bg-red-500/10 text-red-400 text-xs font-medium rounded-full border border-red-500/20">
              {t("header.adminRole")}
            </span>
          )}
          {isModerator && (
            <span className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 text-xs font-medium rounded-full border border-blue-500/20">
              {t("header.moderatorRole")}
            </span>
          )}
        </div>
        <p className="hidden md:block text-sm text-zinc-500">
          {isAdmin
            ? t("header.descAdmin")
            : isModerator
              ? t("header.descModerator")
              : t("header.descUser")}
        </p>
      </header>

      {/* Body Container */}
      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        {!isAdmin && !isModerator && (
          <aside
            className={`
              w-full md:w-80 lg:w-96 shrink-0 border-r border-zinc-800 bg-zinc-900/20 flex flex-col
              ${selectedTicketId ? 'hidden md:flex' : 'flex'}
            `}
          >
            {/* Sabit Başlık */}
            <div className="shrink-0 px-4 pt-4 pb-3 border-b border-zinc-800/50 bg-zinc-950 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
                {t("sidebar.myPastTickets")}
              </h2>
              <button
                onClick={() => setSelectedTicketId(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                {t("sidebar.newTicket")}
              </button>
            </div>
            {/* Scroll Edilebilir Liste */}
            <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
              <TicketList
                isModerator={false}
                onSelectTicket={setSelectedTicketId}
                selectedTicketId={selectedTicketId}
                hideHeader={true}
              />
            </div>
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden bg-gradient-to-br from-black via-[rgb(0,39,83)] to-black">
          <div className={`flex-1 flex flex-col min-h-0 p-4 ${selectedTicketId ? "overflow-hidden" : "overflow-y-auto custom-scrollbar"}`}>
            {isAdmin ? (
              <AdminSupportPanel />
            ) : isModerator ? (
              <ModeratorSupportPanel user={userInfo} />
            ) : (
              selectedTicketId ? (
                <TicketDetail
                  ticketId={selectedTicketId}
                  onBack={() => setSelectedTicketId(null)}
                  user={userInfo}
                />
              ) : (
                <NewTicketForm
                  onTicketCreated={(t) => setSelectedTicketId(t.id)}
                />
              )
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
