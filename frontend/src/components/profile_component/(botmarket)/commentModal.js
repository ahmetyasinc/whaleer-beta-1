'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiX } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const CommentModal = ({ isOpen, onClose, onSend, botName }) => {
    const { t } = useTranslation('botsList');
    const [comment, setComment] = useState('');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setComment(''); // Reset comment when opening
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSend = () => {
        if (comment.trim()) {
            onSend(comment);
            onClose();
        }
    };

    if (!isOpen || !mounted) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-zinc-800/50">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50 bg-zinc-900/30">
                    <h3 className="text-lg font-semibold text-zinc-100">
                        {t('comment.title', 'Yorum Yap')}: <span className="text-cyan-400">{botName}</span>
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-zinc-400 hover:text-white transition-colors rounded-full hover:bg-zinc-800"
                    >
                        <FiX className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder={t('comment.placeholder', 'Bu bot hakkındaki düşüncelerinizi yazın...')}
                        className="w-full h-40 px-4 py-3 bg-zinc-900/50 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none custom-scrollbar"
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-800/50 bg-zinc-900/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white transition-colors mr-2"
                    >
                        {t('comment.cancel', 'İptal')}
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={!comment.trim()}
                        className={`px-6 py-2 rounded-lg font-bold transition-all duration-200 relative overflow-hidden bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg
                            ${!comment.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-purple-500/20 hover:scale-[1.02]'}`}
                    >
                        {t('comment.send', 'Gönder')}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CommentModal;
