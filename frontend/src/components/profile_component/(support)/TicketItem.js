"use client";

import { useState, useEffect } from "react";
import { useAttachmentsStore } from "@/store/support/attachmentsStore";
import { getAttachmentFileUrl } from "@/api/support";

const priorityColors = {
  low: "bg-gray-100 text-gray-800",
  normal: "bg-blue-100 text-blue-800", 
  high: "bg-yellow-100 text-yellow-800",
  urgent: "bg-red-100 text-red-800"
};

const statusColors = {
  open: "bg-green-100 text-green-800",
  in_progress: "bg-blue-100 text-blue-800",
  closed: "bg-gray-100 text-gray-800",
  pending: "bg-yellow-100 text-yellow-800"
};

const priorityLabels = {
  low: "Düşük",
  normal: "Normal", 
  high: "Yüksek",
  urgent: "Acil"
};

const statusLabels = {
  open: "Açık",
  in_progress: "İşlemde",
  closed: "Kapatıldı",
  pending: "Beklemede"
};

export default function TicketItem({ ticket }) {
  const [expanded, setExpanded] = useState(false);
  const [attachmentsLoaded, setAttachmentsLoaded] = useState(false);
  
  const fetchTicketAttachments = useAttachmentsStore((s) => s.fetchTicketAttachments);
  const getTicketAttachments = useAttachmentsStore((s) => s.getTicketAttachments);
  
  const attachments = getTicketAttachments(ticket.id);

  useEffect(() => {
    if (expanded && !attachmentsLoaded) {
      fetchTicketAttachments(ticket.id)
        .then(() => setAttachmentsLoaded(true))
        .catch(console.error);
    }
  }, [expanded, attachmentsLoaded, ticket.id, fetchTicketAttachments]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isImage = (mimeType) => {
    return mimeType?.startsWith('image/');
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[ticket.priority]}`}>
              {priorityLabels[ticket.priority]}
            </span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[ticket.status]}`}>
              {statusLabels[ticket.status]}
            </span>
          </div>
          
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {ticket.subject}
          </h4>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {formatDate(ticket.created_at)} • #{ticket.id}
          </p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg 
            className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="space-y-3">
            <div>
              <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">Mesaj:</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {ticket.message}
              </p>
            </div>

            {attachments.length > 0 && (
              <div>
                <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Ekler ({attachments.length}):
                </h5>
                <div className="space-y-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {isImage(attachment.mime_type) ? (
                        <div className="flex items-center gap-3">
                          <img
                            src={getAttachmentFileUrl(attachment.id)}
                            alt={attachment.filename}
                            className="w-12 h-12 object-cover rounded border"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size_bytes)} • {attachment.width}x{attachment.height}px
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                              {attachment.filename}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size_bytes)}
                            </p>
                          </div>
                        </div>
                      )}
                      
                      <a
                        href={getAttachmentFileUrl(attachment.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                      >
                        İndir
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Son güncelleme: {formatDate(ticket.updated_at)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}