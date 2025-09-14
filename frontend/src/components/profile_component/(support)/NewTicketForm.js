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
    const fileList = Array.from(e.target.files);
    setFiles(fileList);

    const previews = fileList.map((file) => {
      const p = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
      };
      return p;
    });

    filePreviews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    setFilePreviews(previews);
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
    <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">Yeni Destek Talebi</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Kategori */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Kategori</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            required
          >
            <option value="">Kategori seçin</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Konu */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Konu</label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2"
            placeholder="Destek talebinizin kısa özeti"
            required
          />
        </div>

        {/* Mesaj */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Mesaj</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
            className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2"
            placeholder="Sorununuzu detaylı bir şekilde açıklayın..."
            required
          />
        </div>

        {/* Öncelik + Dosya */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Öncelik</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 block w-full rounded-md p-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600"
            >
              <option value="low">Düşük</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek</option>
              <option value="urgent">Acil</option>
            </select>
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Dosya Ekle</label>
            <input
              type="file"
              onChange={handleFilesChange}
              multiple
              className="mt-1 block w-full text-sm"
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar"
            />
          </div>
        </div>

        {/* Önizlemeler */}
        {filePreviews.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Seçili dosyalar:</p>
            <div className="space-y-2">
              {filePreviews.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  {p.url ? (
                    <img src={p.url} alt={p.name} className="w-12 h-12 object-cover rounded border" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                      <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(p.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                    Kaldır
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hata */}
        {error && (
          <div className="p-3 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Gönder */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md disabled:opacity-50 transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Oluşturuluyor...
            </span>
          ) : (
            "Talep Oluştur"
          )}
        </button>
      </form>
    </div>
  );
}
