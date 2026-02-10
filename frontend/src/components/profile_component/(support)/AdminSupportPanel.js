// components/profile_component/(support)/AdminSupportPanel.jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useAdminSupportStore } from "@/store/support/adminStore";

const STATUS_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "open", label: "Açık" },
  { value: "in_progress", label: "İşlemde" },
  { value: "closed", label: "Kapalı" },
];

const PRIORITY_OPTIONS = [
  { value: "", label: "Tümü" },
  { value: "low", label: "Düşük" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Yüksek" },
  { value: "urgent", label: "Acil" },
];

const ASSIGN_OPTIONS = [
  { value: "", label: "Atanmış + Atanmamış" },
  { value: "assigned", label: "Yalnızca Atanmış" },
  { value: "unassigned", label: "Yalnızca Atanmamış" },
];

const SORT_OPTIONS = [
  { value: "created_desc", label: "Tarih (Yeni → Eski)" },
  { value: "created_asc", label: "Tarih (Eski → Yeni)" },
  { value: "priority_desc", label: "Öncelik (Acil → Düşük)" },
  { value: "priority_asc", label: "Öncelik (Düşük → Acil)" },
  { value: "status_asc", label: "Durum (A→Z)" },
  { value: "status_desc", label: "Durum (Z→A)" },
];

const PRIORITY_RANK = { urgent: 4, high: 3, normal: 2, low: 1, "": 0, undefined: 0, null: 0 };

export default function AdminSupportPanel() {
  const {
    tickets,
    moderators,
    loading,
    error,
    fetchTickets,
    fetchModerators,
    assignTicket,
    unassignTicket,
    updateTicketStatus,
  } = useAdminSupportStore();

  // --- UI state ---
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedModerator, setSelectedModerator] = useState("");

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [assignState, setAssignState] = useState("");
  const [sort, setSort] = useState("created_desc");

  useEffect(() => {
    fetchTickets();
    fetchModerators();
  }, [fetchTickets, fetchModerators]);

  // --- Derived stats ---
  const stats = useMemo(() => {
    const total = tickets.length;
    const assigned = tickets.filter(
      (t) => t.assigned_moderator || (t.assignments && t.assignments.length > 0)
    ).length;
    const unassigned = total - assigned;

    const byStatus = tickets.reduce(
      (acc, t) => {
        const s = t.status || "open";
        acc[s] = (acc[s] || 0) + 1;
        return acc;
      },
      { open: 0, in_progress: 0, closed: 0 }
    );

    return { total, assigned, unassigned, byStatus };
  }, [tickets]);

  // --- Filtering & sorting ---
  const filteredSorted = useMemo(() => {
    const term = q.trim().toLowerCase();

    let list = tickets.filter((t) => {
      // text search: subject + user email/name
      const hay = `${t.subject ?? ""} ${t.user?.email ?? ""} ${t.user?.name ?? ""}`.toLowerCase();
      if (term && !hay.includes(term)) return false;

      // status filter
      if (status && t.status !== status) return false;

      // priority filter
      if (priority && t.priority !== priority) return false;

      // assignment filter
      const isAssigned = !!t.assigned_moderator || (t.assignments && t.assignments.length > 0);
      if (assignState === "assigned" && !isAssigned) return false;
      if (assignState === "unassigned" && isAssigned) return false;

      return true;
    });

    // sorting
    list.sort((a, b) => {
      switch (sort) {
        case "created_desc":
          return new Date(b.created_at ?? b.updated_at ?? 0) - new Date(a.created_at ?? a.updated_at ?? 0);
        case "created_asc":
          return new Date(a.created_at ?? a.updated_at ?? 0) - new Date(b.created_at ?? b.updated_at ?? 0);
        case "priority_desc":
          return (PRIORITY_RANK[b.priority] ?? 0) - (PRIORITY_RANK[a.priority] ?? 0);
        case "priority_asc":
          return (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0);
        case "status_asc":
          return String(a.status ?? "").localeCompare(String(b.status ?? ""));
        case "status_desc":
          return String(b.status ?? "").localeCompare(String(a.status ?? ""));
        default:
          return 0;
      }
    });

    return list;
  }, [tickets, q, status, priority, assignState, sort]);

  const handleAssignTicket = async () => {
    if (!selectedTicket || !selectedModerator) return;
    await assignTicket(selectedTicket.id, selectedModerator);
    setSelectedTicket(null);
    setSelectedModerator("");
  };

  const resetFilters = () => {
    setQ("");
    setStatus("");
    setPriority("");
    setAssignState("");
    setSort("created_desc");
  };

  return (
    <div className="bg-transparent min-h-screen text-zinc-200">
      {/* Ana Konteyner - Artık Tamamen Opak */}
      <div className="max-w-full mx-auto h-[calc(100vh-30px)] bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">

        {/* Header Bölümü */}
        <div className="p-6 border-b border-zinc-800 bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Destek Yönetim Paneli
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Sistemdeki tüm biletleri buradan yönetebilirsiniz.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchTickets()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-all border border-zinc-700 active:scale-95"
              disabled={loading}
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? "Yenileniyor..." : "Yenile"}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Hızlı İstatistik Kartları - Opak ve Gölgeli */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-xl shadow-sm">
              <StatCard label="Toplam Bilet" value={stats.total} color="text-white" />
            </div>
            <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-xl shadow-sm">
              <StatCard label="Atanmış" value={stats.assigned} color="text-blue-400" />
            </div>
            <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-xl shadow-sm">
              <StatCard label="Atanmamış" value={stats.unassigned} color="text-amber-400" />
            </div>
            <div className="bg-zinc-800 border border-zinc-700 p-5 rounded-xl shadow-sm grid grid-cols-3 gap-2">
              <MiniStat label="Açık" value={stats.byStatus.open || 0} color="emerald" />
              <MiniStat label="İşlemde" value={stats.byStatus.in_progress || 0} color="blue" />
              <MiniStat label="Kapalı" value={stats.byStatus.closed || 0} color="zinc" />
            </div>
          </div>

          {/* Filtreleme Paneli - Solid Background */}
          <div className="bg-zinc-800/40 p-5 rounded-xl border border-zinc-800 mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="lg:col-span-1">
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-zinc-500">Arama</label>
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Konu veya e-posta..."
                  className="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 placeholder-zinc-600 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>

              {[
                { label: 'Durum', value: status, setter: setStatus, options: STATUS_OPTIONS },
                { label: 'Öncelik', value: priority, setter: setPriority, options: PRIORITY_OPTIONS },
                { label: 'Atama', value: assignState, setter: setAssignState, options: ASSIGN_OPTIONS },
                { label: 'Sıralama', value: sort, setter: setSort, options: SORT_OPTIONS }
              ].map((filter, idx) => (
                <div key={idx}>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider text-zinc-500">{filter.label}</label>
                  <select
                    value={filter.value}
                    onChange={(e) => filter.setter(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-lg border border-zinc-700 bg-zinc-950 text-zinc-200 focus:ring-2 focus:ring-blue-600 outline-none transition-all cursor-pointer"
                  >
                    {filter.options.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={resetFilters}
                className="text-sm font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                Filtreleri Temizle
              </button>
            </div>
          </div>

          {/* Tablo Konteyneri */}
          <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950">
            <table className="w-full text-sm text-left">
              <thead className="bg-zinc-800 text-zinc-400 border-b border-zinc-700">
                <tr>
                  <th className="px-4 py-4 font-semibold uppercase tracking-wider text-[11px]">ID</th>
                  <th className="px-4 py-4 font-semibold uppercase tracking-wider text-[11px]">Kategori</th>
                  <th className="px-4 py-4 font-semibold uppercase tracking-wider text-[11px]">Konu</th>
                  <th className="px-4 py-4 font-semibold uppercase tracking-wider text-[11px]">Durum</th>
                  <th className="px-4 py-4 font-semibold uppercase tracking-wider text-[11px]">Öncelik</th>
                  <th className="px-4 py-4 font-semibold uppercase tracking-wider text-[11px]">Moderatör</th>
                  <th className="px-4 py-4 font-semibold uppercase tracking-wider text-[11px] text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredSorted.map((ticket) => {
                  const hasAssignee = !!ticket.assigned_moderator || (ticket.assignments && ticket.assignments.length > 0);

                  return (
                    <tr key={ticket.id} className="hover:bg-zinc-900/50 transition-colors group">
                      <td className="px-4 py-4 font-mono text-zinc-500 text-xs">#{ticket.id}</td>
                      <td className="px-4 py-4 text-zinc-400 font-medium">
                        {ticket.category ? ticket.category.name : "—"}
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-zinc-100">{ticket.subject}</div>
                        <div className="text-[11px] text-zinc-500 mt-0.5">{ticket.user_id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <select
                          value={ticket.status}
                          onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                          className="bg-zinc-800 border border-zinc-700 rounded-md px-2 py-1 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer transition-all"
                          disabled={loading}
                        >
                          {STATUS_OPTIONS.filter((o) => o.value !== "").map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-4">
                        <PriorityBadge priority={ticket.priority} />
                      </td>
                      <td className="px-4 py-4">
                        {ticket.assigned_moderator ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-bold">
                              {(ticket.assigned_moderator.name || 'A')[0].toUpperCase()}
                            </div>
                            <span className="text-zinc-300">{ticket.assigned_moderator.name || ticket.assigned_moderator.email}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic text-xs">Atanmamış</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        {!hasAssignee ? (
                          <button
                            onClick={() => { setSelectedTicket(ticket); setSelectedModerator(""); }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-lg shadow-blue-900/20 active:scale-95"
                            disabled={loading}
                          >
                            Ata
                          </button>
                        ) : (
                          <button
                            onClick={() => unassignTicket(ticket.id)}
                            className="bg-zinc-800 hover:bg-red-900/30 hover:text-red-400 hover:border-red-900/50 text-zinc-400 border border-zinc-700 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all active:scale-95"
                            disabled={loading}
                          >
                            Geri Al
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal - Opak ve Keskin Tasarım */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 p-8 rounded-2xl w-full max-w-md shadow-2xl scale-in-center">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Bilet Atama</h3>
              <p className="text-zinc-400 text-sm">
                <span className="font-mono text-blue-400">#{selectedTicket.id}</span> nolu bileti yönetmesi için bir moderatör seçin.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-500 uppercase mb-2">Moderatör Listesi</label>
                <select
                  value={selectedModerator}
                  onChange={(e) => setSelectedModerator(e.target.value)}
                  className="w-full p-3 border border-zinc-700 rounded-xl bg-zinc-950 text-zinc-200 outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Bir seçim yapın...</option>
                  {moderators.map((mod) => (
                    <option key={mod.id} value={mod.id}>
                      {mod.name || mod.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors font-medium"
                >
                  İptal
                </button>
                <button
                  onClick={handleAssignTicket}
                  disabled={!selectedModerator || loading}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/40"
                >
                  {loading ? "İşleniyor..." : "Atamayı Tamamla"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

function Th({ text }) {
  return <th className="px-4 py-3 whitespace-nowrap font-medium tracking-wider">{text}</th>;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 p-4 bg-zinc-950/50 backdrop-blur-sm hover:border-zinc-700 transition-colors">
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-2xl font-bold text-white tracking-tight">{value}</div>
    </div>
  );
}

function MiniStat({ label, value, color = "zinc" }) {
  const colors = {
    emerald: "text-emerald-300",
    blue: "text-blue-300",
    zinc: "text-zinc-300"
  }
  return (
    <div className="rounded-lg border border-zinc-800 p-3 bg-zinc-950/50 hover:border-zinc-700 transition-colors">
      <div className="text-[10px] font-medium text-zinc-500 uppercase">{label}</div>
      <div className={`text-lg font-semibold ${colors[color] || "text-white"}`}>{value}</div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const p = String(priority || "").toLowerCase();
  const map = {
    urgent: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    normal: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    low: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  };
  const cls = map[p] || "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  const label =
    p === "urgent" ? "Acil" :
      p === "high" ? "Yüksek" :
        p === "normal" ? "Normal" :
          p === "low" ? "Düşük" : "—";

  return <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${cls}`}>{label}</span>;
}
