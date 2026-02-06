'use client';

import React, { useEffect, useState } from 'react';
import { FaTimes, FaCommentDots } from 'react-icons/fa';
import { createPortal } from 'react-dom';
import BotCard from './botCard';
import { useTranslation } from 'react-i18next';
import CommentModal from './commentModal';
import ExtraDataCard from './extraDataCard';
import TradeList from './tradeList';
import Chart from './chart';
import useBotExamineModalStore from '@/store/botmarket/BotExamineModalStore';

const BotExamineModal = ({ isOpen, onClose, bot }) => {
    const { t } = useTranslation('botsList');
    const [isCommentModalOpen, setCommentModalOpen] = useState(false);

    // Store actions
    const fetchExtraData = useBotExamineModalStore((state) => state.fetchExtraData);
    const clearExtraData = useBotExamineModalStore((state) => state.clearExtraData);

    // Fetch data when modal opens
    useEffect(() => {
        if (isOpen && bot?.id) {
            fetchExtraData(bot.id);
        }

        // Clear data when modal closes
        return () => {
            if (!isOpen) {
                clearExtraData();
            }
        };
    }, [isOpen, bot?.id, fetchExtraData, clearExtraData]);

    // Prevent scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleSendComment = (comment) => {
        console.log(`Comment for bot ${bot.id} (${bot.name}) from modal:`, comment);
    }

    if (!isOpen) return null;

    // Portal to body to ensure full screen overlay
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity duration-300">
            {/* Modal Container */}
            <div className="relative w-full h-full flex flex-col bg-zinc-950 text-zinc-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
                    {/* Left Side: Bot Name + Separator + Detail Text */}
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-100 to-blue-200 drop-shadow-[0_0_10px_rgba(34,211,238,0.3)]">
                            {bot?.name}
                        </h2>

                        {/* Dikey Çizgi */}
                        <div className="h-4 w-[1px] bg-zinc-700" />

                        {/* Detaylı İnceleme Yazısı */}
                        <span className="text-xs font-medium mt-[1px] text-zinc-500 uppercase tracking-wider">
                            Detaylı İnceleme
                        </span>
                    </div>

                    {/* Right Side: Close Button */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-white hover:bg-red-900/30 hover:border-red-500/50 transition-all duration-300 group"
                        >
                            <FaTimes className="text-lg group-hover:rotate-90 transition-transform duration-300" />
                        </button>
                    </div>
                </div>

                {/* Content Area - Scrollable */}
                <div className="flex-1 overflow-y-auto p-5 md:p-10">
                    <div className="max-w-full mx-auto flex flex-col gap-8">

                        {/* Bot Card Embedded */}
                        <div className="w-full">
                            <BotCard bot={bot} isPreview={true} />
                        </div>

                        {/* Extra Data Card */}
                        <ExtraDataCard botId={bot?.id} />

                        {/* TradeList & Chart - Side by Side */}
                        <div className="flex flex-row gap-4 w-full">
                            {/* Trade List Card */}
                            <div className="flex-1 bg-zinc-950/50 border border-zinc-800/60 hover:border-amber-500/30 transition-colors rounded-xl p-5 h-[450px] overflow-hidden">
                                <TradeList botId={bot?.id} />
                            </div>

                            {/* Chart Card */}
                            <div className="flex-1 bg-zinc-950/50 border border-zinc-800/60 hover:border-emerald-500/30 transition-colors rounded-xl p-5 h-[450px] overflow-hidden">
                                <Chart botId={bot?.id} />
                            </div>
                        </div>
                    </div>
                </div>

                <CommentModal
                    isOpen={isCommentModalOpen}
                    onClose={() => setCommentModalOpen(false)}
                    onSend={handleSendComment}
                    botName={bot?.name}
                />

            </div>
        </div>,
        document.body
    );
};

export default BotExamineModal;
