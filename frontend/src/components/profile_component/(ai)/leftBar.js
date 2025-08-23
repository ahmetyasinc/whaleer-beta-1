'use client';

import React, { useState } from 'react';
import useAiStore from '@/store/ai/aiStore';
import { HiOutlineTrash, HiOutlinePlus } from 'react-icons/hi';
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import ConfirmDeleteModal from '@/components/profile_component/(ai)/confirmDeleteModal';

const LeftBar = () => {
  const { 
    chats, 
    activeChat, 
    createNewChat, 
    selectChat, 
    deleteChat 
  } = useAiStore();

  // Modal ve silinecek chat için state:
  const [modalOpen, setModalOpen] = useState(false);
  const [toDeleteChatId, setToDeleteChatId] = useState(null);

  const handleNewChat = () => {
    createNewChat();
  };

  const handleChatSelect = (chatId) => {
    selectChat(chatId);
  };

  // Butona tıklanınca sadece modal açılıyor:
  const handleDeleteClick = (chatId, e) => {
    e.stopPropagation();
    setToDeleteChatId(chatId);
    setModalOpen(true);
  };

  // Onay verilirse chat siliniyor:
  const handleConfirmDelete = () => {
    if (toDeleteChatId) {
      deleteChat(toDeleteChatId);
      setToDeleteChatId(null);
    }
    setModalOpen(false);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setToDeleteChatId(null);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Bugün';
    if (diffDays === 2) return 'Dün';
    if (diffDays <= 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="fixed left-0 top-0 w-60 bg-neutral-950 text-white flex flex-col h-screen border-r border-neutral-800 z-10">
      {/* Header */}
      <div className="px-4 pt-[10px] pb-[12px] border-b border-neutral-800">
        <button
          onClick={handleNewChat}
          className="w-40 ml-[40px] bg-neutral-900 border border-gray-700 hover:border-gray-500 text-sm text-neutral-200 font-medium py-2 px-3 rounded-md transition-colors duration-100 flex items-center justify-center gap-2 shadow-lg"
        >
          <HiOutlinePlus className="w-4 h-4" />
          Yeni Sohbet
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <span className="ml-1 text-sm text-neutral-400">Sohbetler </span>
          {chats.length === 0 ? (
            <div className="text-neutral-500 text-center py-8 px-4">
              <IoChatbubbleEllipsesOutline className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Henüz sohbet yok</p>
              <p className="text-xs mt-1 opacity-70">Yeni bir sohbet başlatın</p>
            </div>
          ) : (
            <div className="space-y-[1px] mt-2">
              {chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => handleChatSelect(chat.id)}
                  className={`group relative px-3 pb-1 pt-2 rounded-xl cursor-pointer flex items-center justify-between ${
                    activeChat?.id === chat.id
                      ? 'bg-neutral-900 text-neutral-200 shadow-lg'
                      : 'hover:bg-neutral-800 text-neutral-300 hover:shadow-md'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm text-neutral-200 font-medium truncate mb-1">
                      {chat.title}
                    </h3>
                    {/* İstersen tarihi de gösterebilirsin */}
                    {/* <div className="text-xs text-neutral-500">{formatDate(chat.date)}</div> */}
                  </div>
                  <button
                    onClick={(e) => handleDeleteClick(chat.id, e)}
                    className="ml-3 p-1 rounded-lg text-red-700 hover:text-red-600 transition-all duration-200"
                    title="Sohbeti Sil"
                  >
                    <HiOutlineTrash className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      <ConfirmDeleteModal
        open={modalOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        message="Bu sohbeti silmek istediğinizden emin misiniz?"
      />

      {/* Footer */}
      <div className="p-3 border-t border-neutral-800">
        <div className="text-xs text-neutral-500 text-center">
          WhaleerAI Chat Interface v1.0
        </div>
      </div>
    </div>
  );
};

export default LeftBar;
