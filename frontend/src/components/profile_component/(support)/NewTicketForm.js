// components/NewTicketForm.jsx  (GÜNCELLE)
"use client";

import { useState, useEffect } from "react";
import { useSupportStore } from "@/store/support/supportStore";

export default function NewTicketForm({ onTicketCreated }) {
  const { categories, createTicket } = useSupportStore();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState("normal");
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (categories.length === 0) {
      useSupportStore.getState().fetchCategories();
    }
  }, [categories.length]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    if (!subject.trim() || !message.trim()) {
      setError("Lütfen konu ve mesaj girin.");
      return;
    }

    setLoading(true);
    try {
      // Tek istek: ticket + ilk mesaj + ekler
      const created = await createTicket({
        subject,
        message,
        priority,
        category_id: categoryId || null,
        files, // ← önemli
      });

      // Formu temizle
      setSubject("");
      setMessage("");
      setCategoryId("");
      setPriority("normal");
      filePreviews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      setFiles([]);
      setFilePreviews([]);

      if (onTicketCreated) onTicketCreated(created);
    } catch (err) {
      console.error(err);
      setError("İşlem sırasında hata oluştu: " + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  }

  function handleFilesChange(e) {
    const selectedFiles = Array.from(e.target.files);

    // Mevcut dosyalara ekle (duplicate kontrolü yapalım)
    const newFiles = selectedFiles.filter(newFile => {
      return !files.some(existingFile =>
        existingFile.name === newFile.name &&
        existingFile.size === newFile.size &&
        existingFile.lastModified === newFile.lastModified
      );
    });

    if (newFiles.length === 0) return;

    const newPreviews = newFiles.map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setFilePreviews(prev => [...prev, ...newPreviews]);

    // Aynı dosyayı tekrar seçebilmek için input'u sıfırla
    e.target.value = "";
  }

  function removeFile(index) {
    const nextFiles = files.filter((_, i) => i !== index);
    const nextPreviews = filePreviews.filter((_, i) => i !== index);
    const removed = filePreviews[index];
    if (removed?.url) URL.revokeObjectURL(removed.url);
    setFiles(nextFiles);
    setFilePreviews(nextPreviews);
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-6 backdrop-blur-sm mb-6">
      <h2 className="text-xl font-semibold mb-6 text-white">Yeni Destek Talebi</h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Kategori */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Kategori</label>
          <div className="relative">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full p-2.5 border border-zinc-700 rounded-lg bg-zinc-950/70 text-zinc-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all appearance-none"
              required
            >
              <option value="" className="bg-zinc-900">Kategori seçin</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-zinc-900">
                  {c.name}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>

        {/* Konu */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Konu</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="block w-full rounded-lg border border-zinc-700 bg-zinc-950/50 p-2.5 text-zinc-200 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all"
            placeholder="Destek talebinizin kısa özeti"
            required
          />
        </div>

        {/* Mesaj */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1.5">Mesaj</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="block w-full rounded-lg border border-zinc-700 bg-zinc-950/50 p-2.5 text-zinc-200 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none transition-all resize-none"
            placeholder="Sorununuzu detaylı bir şekilde açıklayın..."
            required
          />
        </div>

        {/* Öncelik + Dosya */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Öncelik</label>
            <div className="relative">
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="block w-full rounded-lg border border-zinc-700 bg-zinc-950/50 p-2.5 text-zinc-200 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none appearance-none transition-all"
              >
                <option value="low" className="bg-zinc-900">Düşük</option>
                <option value="normal" className="bg-zinc-900">Normal</option>
                <option value="high" className="bg-zinc-900">Yüksek</option>
                <option value="urgent" className="bg-zinc-900">Acil</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-zinc-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-1.5">Dosya Ekle</label>
            <input
              type="file"
              onChange={handleFilesChange}
              multiple
              className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700 transition-all cursor-pointer"
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar"
            />
          </div>
        </div>

        {/* Önizlemeler */}
        {filePreviews.length > 0 && (
          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-zinc-300">Seçili dosyalar:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filePreviews.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-zinc-900/80 border border-zinc-800 rounded-lg group">
                  {p.url ? (
                    <img src={p.url} alt={p.name} className="w-10 h-10 object-cover rounded bg-zinc-800" />
                  ) : (
                    <div className="w-10 h-10 bg-zinc-800 rounded flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{p.name}</p>
                    <p className="text-xs text-zinc-500">{formatFileSize(p.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="p-1 text-zinc-500 hover:text-red-400 transition-colors">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hata */}
        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="w-56 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 px-4 rounded-xl disabled:opacity-50 transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Oluşturuluyor...
              </span>
            ) : (
              "Talep Oluştur"
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
