// components/MessageComposer.jsx
"use client";

import React from "react";
import { useSupportStore } from "@/store/support/supportStore";
import { useAttachmentsStore } from "@/store/support/attachmentsStore";

export default function MessageComposer({ ticketId }) {
  const { addMessage, appendAttachmentToMessage } = useSupportStore();
  const { uploadAttachment, uploading } = useAttachmentsStore();

  const [text, setText] = React.useState("");
  const [files, setFiles] = React.useState([]);
  const [previews, setPreviews] = React.useState([]);
  const [sending, setSending] = React.useState(false);
  const disabled = sending || uploading;

  const onFiles = (e) => {
    const list = Array.from(e.target.files || []);
    setFiles(list);
    setPreviews((old) => {
      old.forEach((p) => p.url && URL.revokeObjectURL(p.url));
      return list.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type,
        url: f.type.startsWith("image/") ? URL.createObjectURL(f) : null,
      }));
    });
  };

  const reset = () => {
    setText("");
    setFiles([]);
    previews.forEach((p) => p.url && URL.revokeObjectURL(p.url));
    setPreviews([]);
  };

  const send = async () => {
    if (!text.trim() && files.length === 0) return;
    setSending(true);
    try {
      // 1) Mesajı oluştur
      const msg = await addMessage(ticketId, { message: text || "(ek)", is_internal: false });

      // 2) Ekler varsa yükle
      for (const f of files) {
        const saved = await uploadAttachment(f, ticketId, msg.id);
        // 3) Mesaja ekleri anında iliştir (optimistic görünsün)
        appendAttachmentToMessage(ticketId, msg.id, saved);
      }
      reset();
    } catch (e) {
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-start gap-2">
        <textarea
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Mesajınızı yazın…"
          className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
          }}
        />

        <div className="flex flex-col gap-2">
          <label className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md cursor-pointer text-sm">
            Dosya
            <input
              type="file"
              className="hidden"
              multiple
              onChange={onFiles}
              accept=".jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.txt,.zip,.rar"
            />
          </label>

          <button
            onClick={send}
            disabled={disabled || (!text.trim() && files.length === 0)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md disabled:opacity-50"
            title="Ctrl/⌘ + Enter"
          >
            {disabled ? "Gönderiliyor…" : "Gönder"}
          </button>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {previews.map((p, i) => (
            <div key={i} className="relative rounded border overflow-hidden">
              {p.url ? (
                <img src={p.url} alt={p.name} className="w-full h-24 object-cover" />
              ) : (
                <div className="h-24 flex items-center justify-center text-xs text-gray-500">{p.name}</div>
              )}
              <button
                type="button"
                className="absolute top-1 right-1 bg-black/60 text-white text-xs rounded px-1"
                onClick={() => {
                  setFiles((arr) => arr.filter((_, idx) => idx !== i));
                  setPreviews((arr) => {
                    const cp = [...arr];
                    if (cp[i]?.url) URL.revokeObjectURL(cp[i].url);
                    cp.splice(i, 1);
                    return cp;
                  });
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
