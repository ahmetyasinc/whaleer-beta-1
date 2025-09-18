"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupportStore } from "@/store/support/supportStore";
import { useAttachmentsStore } from "@/store/support/attachmentsStore";
import MessageList from "@/components/profile_component/(support)/MessageList";
import api from "@/api/axios";

function StatCard({ label, value, tone = "slate" }) {
  const tones = {
    slate: "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    blue: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-100",
    green:
      "bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-100",
    red: "bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-100",
  };
  return (
    <div className={`rounded-xl p-4 shadow-sm border border-black/5 ${tones[tone]}`}>
      <div className="text-xs opacity-80">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

export default function ModeratorSupportPanel(user) {
  const { tickets, currentTicket, fetchTickets, fetchTicket, loading } = useSupportStore();
  const { uploadAttachment } = useAttachmentsStore();

  const [selectedId, setSelectedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [replyText, setReplyText] = useState("");
  const [files, setFiles] = useState([]);

  // 1) İlk yüklemede çek
  useEffect(() => {
    fetchTickets({});
  }, [fetchTickets]);

  // 2) Filtre değişince tekrar çek + seçimi sıfırla
  useEffect(() => {
    const params = {
      status: statusFilter || undefined,
      priority: priorityFilter || undefined,
    };
    setSelectedId(null);
    fetchTickets(params);
  }, [statusFilter, priorityFilter, fetchTickets]);

  // 3) Seçim değişince detay çek
  useEffect(() => {
    if (selectedId) fetchTicket(selectedId);
  }, [selectedId, fetchTicket]);

  const isClosed = currentTicket?.status === "closed";

  // 4) Client-side güvenlik ağı: backend filtrelemezse bile burada süz
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const okStatus = !statusFilter || t.status === statusFilter;
      const okPriority = !priorityFilter || t.priority === priorityFilter;
      return okStatus && okPriority;
    });
  }, [tickets, statusFilter, priorityFilter]);

  // 5) İstatistikler filtreli listeye göre
  const stats = useMemo(() => {
    const inProgress = filteredTickets.filter((t) => t.status === "in_progress").length;
    const closed = filteredTickets.filter((t) => t.status === "closed").length;
    const arr = filteredTickets
      .map((t) => t.satisfaction_rating)
      .filter((n) => typeof n === "number");
    const avg = arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : "—";
    return { inProgress, closed, avg };
  }, [filteredTickets]);

  const onPickFiles = (e) => setFiles(Array.from(e.target.files || []));

  const sendReply = async () => {
    if (!selectedId || !replyText.trim()) return;
    try {
      const res = await api.post(
        `/api/support/admin/tickets/${selectedId}/messages`,
        { message: replyText, is_internal: false }
      );
      const newMessage = res.data;
      for (const f of files) {
        await uploadAttachment(f, null, newMessage.id);
      }
      setReplyText("");
      setFiles([]);
      await fetchTicket(selectedId);
    } catch (err) {
      console.error("Mesaj gönderilemedi:", err);
      alert(err?.response?.data?.detail || "Mesaj gönderilirken bir hata oluştu.");
    }
  };

  const statusTone = (s) => {
    switch (s) {
      case "open":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100";
      case "in_progress":
        return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100";
      case "resolved":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-100";
      case "closed":
        return "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-100";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Sol: liste & filtreler */}
      <aside className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Ortalama" value={stats.avg} tone="blue" />
          <StatCard label="İşlemde" value={stats.inProgress} tone="green" />
          <StatCard label="Kapalı" value={stats.closed} tone="red" />
        </div>

        <div className="rounded-xl border border-black/10 dark:border-white/10 p-3 bg-white dark:bg-gray-800 space-y-2">
          <div className="text-sm font-medium mb-1">Filtreler</div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full p-2 rounded border dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            >
              <option value="">Durum: Tümü</option>
              <option value="open">open</option>
              <option value="in_progress">in_progress</option>
              <option value="resolved">resolved</option>
              <option value="closed">closed</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full p-2 rounded border dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
            >
              <option value="">Öncelik: Tümü</option>
              <option value="low">low</option>
              <option value="normal">normal</option>
              <option value="high">high</option>
              <option value="urgent">urgent</option>
            </select>
            {/* İstersen butonu bırak, ama artık gerek yok */}
            {/* <button onClick={() => {}} className="px-3 py-2 rounded bg-slate-900 text-white text-sm">Yenile</button> */}
          </div>
        </div>

        <div className="rounded-xl border border-black/10 dark:border-white/10 overflow-hidden bg-white dark:bg-gray-800">
          <div className="px-3 py-2 text-sm font-medium border-b dark:border-gray-700">
            Atanmış Taleplerim
          </div>
          <div className="divide-y dark:divide-gray-700 max-h-[60vh] overflow-auto">
            {filteredTickets.map((t) => {
              const active = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    active ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 text-xs mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700">
                      {t.priority}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full ${statusTone(t.status)}`}>
                      {t.status}
                    </span>
                    <span className="text-gray-500">#{t.id}</span>
                  </div>
                  <div className="text-sm font-medium truncate">{t.subject}</div>
                </button>
              );
            })}
            {!filteredTickets.length && (
              <div className="p-4 text-sm text-gray-500">Kayıt yok.</div>
            )}
          </div>
        </div>
      </aside>

      {/* Sağ: detay & mesajlaşma */}
      <section className="lg:col-span-2">
        {!selectedId || !currentTicket ? (
          <div className="h-full min-h-[40vh] grid place-items-center text-sm text-gray-500">
            Soldan bir talep seçin.
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-black/10 dark:border-white/10 overflow-hidden">
            <div className="px-4 py-3 border-b dark:border-gray-700 flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold">{currentTicket.subject}</div>
                <div className="text-xs text-gray-500">
                  #{currentTicket.id} • {currentTicket.priority} •{" "}
                  <span className={`px-2 py-0.5 rounded-full ${statusTone(currentTicket.status)}`}>
                    {currentTicket.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700">
                  Moderatör
                </span>
              </div>
            </div>

            <div className="h-[50vh] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
              <MessageList
                messages={currentTicket.messages || []}
                currentUserId={user?.user?.id}
                useAdminAttachmentUrls
                noRetryOnImageError
              />
            </div>

            {isClosed ? (
              <div className="p-3 border-t dark:border-gray-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-sm">
                Bu talep <b>kapalı</b>. Moderatör olarak yalnızca görüntüleyebilirsiniz.
              </div>
            ) : (
              <div className="p-3 border-t dark:border-gray-700 space-y-2">
                <textarea
                  rows={3}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Yanıtınızı yazın…"
                  className="w-full p-2 rounded border dark:border-gray-700 bg-white dark:bg-gray-900"
                />
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="file"
                    multiple
                    onChange={onPickFiles}
                    className="block w-full text-sm"
                    accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar"
                  />
                  <button
                    onClick={sendReply}
                    disabled={loading || !replyText.trim()}
                    className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60"
                  >
                    Gönder
                  </button>
                </div>
                {!!files.length && (
                  <div className="text-xs text-gray-500">
                    {files.length} dosya seçildi.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
