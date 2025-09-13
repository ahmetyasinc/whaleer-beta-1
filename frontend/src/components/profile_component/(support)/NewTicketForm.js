"use client";

import { useState } from "react";
import { useSupportStore } from "@/store/support/supportStore";
import { useAttachmentsStore } from "@/store/support/attachmentsStore";

export default function NewTicketForm() {
  const createTicket = useSupportStore((s) => s.createTicket);
  const uploadAttachment = useAttachmentsStore((s) => s.uploadAttachment);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("normal");
  const [files, setFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!subject.trim() || !message.trim()) {
      setError("Lütfen konu ve mesaj girin.");
      return;
    }

    setLoading(true);
    try {
      // 1) ticket oluştur
      const created = await createTicket({
        subject,
        message,
        priority,
        type: "user",
      });

      const ticketId = created?.id;
      // 2) varsa dosyaları upload et
      if (files.length && ticketId) {
        for (const file of files) {
          await uploadAttachment(file, ticketId);
        }
      }

      // form temizle
      setSubject("");
      setMessage("");
      setFiles([]);
      setFilePreviews([]);
      // Dosya input'unu da temizle
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      console.error(err);
      setError("İşlem sırasında hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  function handleFilesChange(e) {
    const fileList = Array.from(e.target.files);
    setFiles(fileList);

    // Önizleme için URL'leri oluştur
    const previews = fileList.map((file) => {
      const preview = {
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        url: null
      };

      // Eğer resim ise önizleme URL'i oluştur
      if (file.type.startsWith('image/')) {
        preview.url = URL.createObjectURL(file);
      }

      return preview;
    });
    
    // Önceki URL'leri temizle (memory leak'i önlemek için)
    filePreviews.forEach(preview => {
      if (preview.url) {
        URL.revokeObjectURL(preview.url);
      }
    });
    
    setFilePreviews(previews);
  }

  function removeFile(index) {
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = filePreviews.filter((_, i) => i !== index);
    
    // Kaldırılan önizleme URL'ini temizle
    if (filePreviews[index]?.url) {
      URL.revokeObjectURL(filePreviews[index].url);
    }
    
    setFiles(newFiles);
    setFilePreviews(newPreviews);
    
    // Input'u güncelle
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput && newFiles.length === 0) {
      fileInput.value = '';
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 shadow rounded-lg p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Konu</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2"
          placeholder="Destek talebinizin kısa özeti"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Mesaj</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className="mt-1 block w-full rounded-md border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-2"
          placeholder="Açıklayıcı bilgi verin..."
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Öncelik</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 block w-full rounded-md p-2 bg-white dark:bg-gray-900">
            <option value="low">Düşük</option>
            <option value="normal">Normal</option>
            <option value="high">Yüksek</option>
            <option value="urgent">Acil</option>
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Eklenti</label>
          <input 
            type="file" 
            onChange={handleFilesChange} 
            multiple 
            className="mt-1 block w-full text-sm"
            accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar"
          />
        </div>
      </div>

      {filePreviews.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Seçili dosyalar:</p>
          <div className="space-y-2">
            {filePreviews.map((preview, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                {preview.url ? (
                  <img
                    src={preview.url}
                    alt={preview.name}
                    className="w-12 h-12 object-cover rounded border"
                  />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                )}
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {preview.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(preview.size)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="text-red-500 hover:text-red-700 text-sm font-medium"
                >
                  Kaldır
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="text-sm text-red-500">{error}</div>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Gönderiliyor..." : "Yeni Talep Oluştur"}
        </button>
      </div>
    </form>
  );
}