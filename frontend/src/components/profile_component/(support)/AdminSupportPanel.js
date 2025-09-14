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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-2">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Admin Destek Yönetim Paneli
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTickets()}
            className="px-3 py-2 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
            disabled={loading}
            title="Yenile"
          >
            {loading ? "Yenileniyor..." : "Yenile"}
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard label="Toplam" value={stats.total} />
        <StatCard label="Atanmış" value={stats.assigned} />
        <StatCard label="Atanmamış" value={stats.unassigned} />
        <div className="grid grid-cols-3 gap-2">
          <MiniStat label="Açık" value={stats.byStatus.open || 0} />
          <MiniStat label="İşlemde" value={stats.byStatus.in_progress || 0} />
          <MiniStat label="Kapalı" value={stats.byStatus.closed || 0} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-end gap-3 mb-4">
        <div className="flex-1">
          <label className="block text-xs mb-1 text-gray-600 dark:text-gray-300">Ara</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Konu, kullanıcı e-postası..."
            className="w-full px-3 py-2 rounded border dark:border-gray-700 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-600 dark:text-gray-300">Durum</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 rounded border dark:border-gray-700 dark:bg-gray-700 dark:text-white"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-600 dark:text-gray-300">Öncelik</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="px-3 py-2 rounded border dark:border-gray-700 dark:bg-gray-700 dark:text-white"
          >
            {PRIORITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-600 dark:text-gray-300">Atama</label>
          <select
            value={assignState}
            onChange={(e) => setAssignState(e.target.value)}
            className="px-3 py-2 rounded border dark:border-gray-700 dark:bg-gray-700 dark:text-white"
          >
            {ASSIGN_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs mb-1 text-gray-600 dark:text-gray-300">Sırala</label>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="px-3 py-2 rounded border dark:border-gray-700 dark:bg-gray-700 dark:text-white"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Temizle
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-700 dark:text-gray-300">
          <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
            <tr>
              <Th text="ID" />
              <Th text="Kategori" />
              <Th text="Konu" />
              <Th text="Kullanıcı ID" />
              <Th text="Durum" />
              <Th text="Öncelik" />
              <Th text="Atanan" />
              <Th text="İşlemler" />
            </tr>
          </thead>
          <tbody>
            {filteredSorted.map((ticket) => {
              const hasAssignee =
                !!ticket.assigned_moderator ||
                (ticket.assignments && ticket.assignments.length > 0);

              return (
                <tr key={ticket.id} className="border-b dark:border-gray-700">
                  <td className="px-4 py-3">#{ticket.id}</td>
                  <td className="px-4 py-3">
                      {ticket.category
                        ? `${ticket.category.name}`
                        : "—"}
                    </td>

                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {ticket.subject ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {ticket.user_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={ticket.status}
                      onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                      className="border rounded p-1 dark:bg-gray-700 dark:text-white"
                      disabled={loading}
                    >
                      {STATUS_OPTIONS.filter((o) => o.value !== "").map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={ticket.priority} />
                  </td>
                  <td className="px-4 py-3">
                    {ticket.assigned_moderator
                      ? `${ticket.assigned_moderator.name ?? ticket.assigned_moderator.email ?? "—"}`
                      : "Atanmamış"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {!hasAssignee ? (
                        <button
                          onClick={() => {
                            setSelectedTicket(ticket);
                            setSelectedModerator("");
                          }}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                          disabled={loading}
                        >
                          Ata
                        </button>
                      ) : (
                        <button
                          onClick={() => unassignTicket(ticket.id)}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
                          disabled={loading}
                        >
                          Atamayı Kaldır
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredSorted.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                  Filtrene uygun ticket bulunamadı.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Assign Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-96">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">
              Ticket’ı Moderatöre Ata
            </h3>

            <div className="text-sm mb-3 text-gray-600 dark:text-gray-300">
              <div>
                <span className="font-medium">Ticket:</span>{" "}
                #{selectedTicket.id} — {selectedTicket.subject}
              </div>
            </div>

            <select
              value={selectedModerator}
              onChange={(e) => setSelectedModerator(e.target.value)}
              className="w-full p-2 border rounded mb-4 dark:bg-gray-700 dark:text-white"
              disabled={loading}
            >
              <option value="">Moderator seçin</option>
              {moderators.map((mod) => (
                <option key={mod.id} value={mod.id}>
                  {mod.name ?? mod.email ?? `ID ${mod.id}`}
                </option>
              ))}
            </select>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setSelectedTicket(null)}
                className="bg-gray-600 text-white px-4 py-2 rounded"
                disabled={loading}
              >
                İptal
              </button>
              <button
                onClick={handleAssignTicket}
                disabled={!selectedModerator || loading}
                className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
              >
                {loading ? "Atanıyor..." : "Ata"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Small UI helpers ---------- */

function Th({ text }) {
  return <th className="px-4 py-3 whitespace-nowrap">{text}</th>;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/40">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-900/60">
      <div className="text-[11px] text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">{value}</div>
    </div>
  );
}

function PriorityBadge({ priority }) {
  const p = String(priority || "").toLowerCase();
  const map = {
    urgent: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    high: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200",
    normal: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
    low: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200",
  };
  const cls = map[p] || "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-200";
  const label =
    p === "urgent" ? "Acil" :
    p === "high" ? "Yüksek" :
    p === "normal" ? "Normal" :
    p === "low" ? "Düşük" : "—";

  return <span className={`px-2 py-1 rounded text-xs font-medium ${cls}`}>{label}</span>;
}
