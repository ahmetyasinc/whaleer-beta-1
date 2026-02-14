// components/MessageComposer.jsx
"use client";

import React from "react";
import { useSupportStore } from "@/store/support/supportStore";
import { useAttachmentsStore } from "@/store/support/attachmentsStore";
import { useTranslation } from "react-i18next";

export default function MessageComposer({ ticketId }) {
  const { t } = useTranslation("supportMessageList");
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
      const msg = await addMessage(ticketId, { message: text || t("attachment"), is_internal: false });

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
    <div className="flex flex-col gap-3">
      <div className="relative">
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("writeMessage")}
          className="w-full p-4 pr-32 bg-zinc-950/50 border border-zinc-700 rounded-xl text-zinc-200 placeholder-zinc-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none resize-none transition-all scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "Enter") send();
          }}
        />

        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <label className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors" title={t("addFile")}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"></path></svg>
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
            className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-900/20 active:scale-95"
            title={t("sendTooltip")}
          >
            <svg className={`w-5 h-5 ${sending ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sending ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              )}
            </svg>
          </button>
        </div>
      </div>

      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto py-2 px-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {previews.map((p, i) => (
            <div key={i} className="relative group shrink-0 w-20 h-20 rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
              {p.url ? (
                <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center">
                  <svg className="w-6 h-6 text-zinc-600 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                  <span className="text-[9px] text-zinc-500 truncate w-full px-1">{p.name}</span>
                </div>
              )}
              <button
                type="button"
                className="absolute top-0.5 right-0.5 bg-black/50 hover:bg-red-500/80 text-white rounded-md p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
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
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
