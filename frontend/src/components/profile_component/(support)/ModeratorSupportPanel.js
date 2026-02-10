"use client";

import { useEffect, useMemo, useState } from "react";
import { useSupportStore } from "@/store/support/supportStore";
import { useAttachmentsStore } from "@/store/support/attachmentsStore";
import MessageList from "@/components/profile_component/(support)/MessageList";
import api from "@/api/axios";

function StatCard({ label, value, tone = "zinc", className = "" }) {
  const tones = {
    zinc: "bg-zinc-900/20 text-zinc-200 border-zinc-800",
    blue: "bg-blue-900/20 text-blue-200 border-blue-500",
    green: "bg-emerald-900/20 text-emerald-200 border-emerald-500",
    red: "bg-red-900/20 text-red-200 border-red-500",
    amber: "bg-amber-900/20 text-amber-200 border-amber-500",
  };
  return (
    <div className={`rounded-xl p-4 border ${tones[tone] || tones.zinc} backdrop-blur-sm ${className}`}>
      <div className="text-xs font-medium opacity-70 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold mt-1 tracking-tight">{value}</div>
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

  const onPickFiles = (e) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files)]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
        return "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      case "in_progress":
        return "bg-amber-500/10 text-amber-400 border border-amber-500/20";
      case "resolved":
        return "bg-blue-500/10 text-blue-400 border border-blue-500/20";
      case "closed":
        return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 border border-zinc-500/20";
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-[calc(100vh-40px)] antialiased">
      {/* Sol Panel: İstatistikler ve Liste */}
      <aside className="lg:col-span-4 flex flex-col space-y-4 min-h-0">

        {/* İstatistik Kartları - Tam Opak */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Ortalama" value={stats.avg} tone="green" />
          <StatCard label="Aktif" value={stats.inProgress} tone="blue" />
          <StatCard label="Kapalı" value={stats.closed} tone="red" />
        </div>

        {/* Filtreleme Alanı - Mat Arka Plan */}
        <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-3 shadow-md">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Filtreleme Paneli</span>
            <div className="h-1 w-12 bg-zinc-800 rounded-full" />
          </div>
          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 bg-zinc-950/60 border border-zinc-700 text-zinc-300 text-xs rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="">Tüm Durumlar</option>
              <option value="open">Açık</option>
              <option value="in_progress">İşlemde</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="flex-1 bg-zinc-950/60 border border-zinc-700 text-zinc-300 text-xs rounded-xl p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
            >
              <option value="">Tüm Öncelikler</option>
              <option value="high">Yüksek</option>
              <option value="urgent">Acil</option>
            </select>
          </div>
        </div>

        {/* Talep Listesi - Mat ve Belirgin */}
        <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
          <div className="px-4 py-3 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/60">
            <h2 className="text-sm font-semibold text-zinc-200">Taleplerim</h2>
            <span className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-700">
              {filteredTickets.length} Kayıt
            </span>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-zinc-800">
            {filteredTickets.map((t) => {
              const active = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-4 transition-all relative group
                  ${active ? "bg-zinc-800" : "hover:bg-zinc-800/80"}`}
                >
                  {active && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500" />}

                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-tight 
                      ${t.priority === 'urgent' ? 'bg-red-900/20 text-red-400 border border-red-500/50' :
                        t.priority === 'high' ? 'bg-amber-900/20 text-amber-500 border border-amber-500/50' :
                          t.priority === 'normal' ? 'bg-blue-900/20 text-blue-400 border border-blue-500/50' :
                            t.priority === 'low' ? 'bg-green-900/20 text-green-500 border border-green-500/50' :
                              'bg-zinc-900/20 text-zinc-400 border border-zinc-800'
                      }`}>
                      {t.priority}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 group-hover:text-zinc-300">#{t.id}</span>
                  </div>

                  <div className={`text-sm font-semibold mb-1 truncate ${active ? 'text-blue-400' : 'text-zinc-300'}`}>
                    {t.subject}
                  </div>
                  <div className="text-[11px] text-zinc-500 flex items-center gap-2 font-medium">
                    <div className={`w-2 h-2 rounded-full ${t.status === 'open' ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                    {t.status}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Sağ Panel: Chat ve Detay */}
      <section className="lg:col-span-8 flex flex-col h-full min-h-0">
        {!selectedId || !currentTicket ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-zinc-900 border-2 border-zinc-800 rounded-3xl text-zinc-600 shadow-inner">
            <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mb-4 border border-zinc-700">
              <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            </div>
            <p className="text-sm font-bold tracking-wide">DETAYLAR İÇİN TALEP SEÇİN</p>
          </div>
        ) : (
          <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl flex flex-col overflow-hidden shadow-2xl">

            {/* Header - Opak */}
            <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight leading-none mb-2">{currentTicket.subject}</h1>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-zinc-500">ID: {currentTicket.id}</span>
                  <div className="w-1.5 h-1.5 bg-zinc-800 rounded-full" />
                  <span className={`text-xs font-bold uppercase ${statusTone(currentTicket.status)}`}>{currentTicket.status}</span>
                </div>
              </div>
            </div>

            {/* Mesaj Listesi Area - Mat */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-zinc-950">
              <MessageList
                messages={currentTicket.messages || []}
                currentUserId={user?.user?.id}
                useAdminAttachmentUrls
                noRetryOnImageError
              />
            </div>

            {/* Reply Area - Solid */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-900">
              {isClosed ? (
                <div className="py-4 px-4 bg-zinc-950 rounded-2xl border border-zinc-800 text-center text-sm font-medium text-zinc-500">
                  🔒 BU TALEP KAPALI - YALNIZCA GÖRÜNTÜLENEBİLİR
                </div>
              ) : (
                <div className="bg-zinc-950 rounded-2xl border border-zinc-700 shadow-lg p-2">
                  <textarea
                    rows={3}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Yanıtınızı buraya yazın..."
                    className="w-full bg-transparent border-none focus:ring-0 text-sm text-zinc-200 placeholder-zinc-700 p-3 resize-none"
                  />

                  {/* Dosya Önizleme Alanı */}
                  {files.length > 0 && (
                    <div className="px-3 pb-2 flex gap-2 overflow-x-auto custom-scrollbar">
                      {files.map((file, i) => (
                        <div key={i} className="relative group shrink-0 w-16 h-16 rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt="preview"
                              className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                              onLoad={(e) => URL.revokeObjectURL(e.target.src)}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-500">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                            </div>
                          )}
                          <button
                            onClick={() => removeFile(i)}
                            className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/50 hover:bg-red-500/80 text-white rounded-full flex items-center justify-center backdrop-blur-sm transition-colors"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                          {/* İpucu (Tooltip benzeri dosya adı) */}
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-0.5 text-[8px] text-white truncate text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            {file.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-zinc-900 pt-2 px-2 pb-1">
                    <div className="flex items-center gap-1">
                      <label className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl cursor-pointer transition-all border border-transparent hover:border-zinc-700 relative">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
                        <input
                          type="file"
                          multiple
                          onChange={onPickFiles}
                          className="hidden"
                          value="" // Her seferinde onChange tetiklensin diye
                        />
                      </label>
                      {!!files.length && (
                        <span className="text-[10px] font-black bg-emerald-900/50 text-emerald-400 px-2 py-1.5 rounded-lg border border-emerald-800 animate-pulse">
                          {files.length} DOSYA
                        </span>
                      )}
                    </div>
                    <button
                      onClick={sendReply}
                      disabled={loading || (!replyText.trim() && files.length === 0)}
                      className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-xl text-xs font-black transition-all shadow-lg active:translate-y-0.5"
                    >
                      {loading ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <span>GÖNDER</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
