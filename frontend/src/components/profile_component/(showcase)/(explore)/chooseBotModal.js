"use client";

import { useState, useEffect } from "react";
import { useBotStore } from "@/store/bot/botStore";

export default function ChooseBotModal({ open, onClose, onSelectBot }) {
  const { bots, loadBots } = useBotStore();
  const [selectedBot, setSelectedBot] = useState(null);

  useEffect(() => {
    if (open) {
      loadBots();
    }
  }, [open, loadBots]);

  if (!open) return null;

  const handleSelectBot = (bot) => {
    setSelectedBot(bot);
    onSelectBot(bot);
    onClose();
  };

return (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-xl shadow-2xl w-full max-w-2xl relative border-1 border-zinc-800 flex flex-col"
         style={{ height: 'calc(100vh - 120px)', maxHeight: 'calc(100vh - 120px)' }}>
      {/* Kapatma Butonu */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-2xl font-bold hover:text-red-400 transition-colors duration-200 w-8 h-8 flex items-center justify-center hover:bg-red-500/10 rounded-full z-10"
      >
        ×
      </button>

      {/* Header */}
      <div className="p-8 pb-4 flex-shrink-0">
        <h2 className="text-xl font-bold text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
          Bot Seç
        </h2>
      </div>

      {/* Bot Listesi - Scrollable Content */}
      <div className="flex-1 overflow-hidden px-8">
        <div className="h-full overflow-y-auto custom-scrollbar">
          {bots.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 opacity-50">🤖</div>
              <p className="text-gray-400 text-lg">Henüz bot bulunamadı</p>
              <p className="text-gray-500 text-sm mt-2">Önce bir bot oluşturun</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="bg-zinc-800/50 border-1 border-zinc-700 rounded-md px-4 py-4 hover:border-cyan-400/50 transition-all duration-200 group flex items-center gap-4"
                >
                  <div className="flex-1 flex flex-col min-w-0">
                    {/* Üstte Bot İsmi ve Durum Noktası */}
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-3 h-3 rounded-full ${bot.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                      <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                        {bot.name}
                      </h3>
                    </div>
                    {/* Altta Diğer Bot Bilgileri */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-400 min-w-0">
                      <div className="flex items-center gap-1">
                        <span>API:</span>
                        <span className="text-white">{bot.api}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Strateji:</span>
                        <span className="text-white">{bot.strategy}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Period:</span>
                        <span className="text-white">{bot.period}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Bakiye:</span>
                        <span className="text-green-400">${bot.balance}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Durum:</span>
                        <span className={bot.isActive ? 'text-green-400' : 'text-gray-400'}>
                          {bot.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Seç Butonu En Sağda */}
                  <button
                    onClick={() => handleSelectBot(bot)}
                    className="ml-4 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-semibold py-2 px-4 rounded-lg text-sm transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-cyan-400/25 whitespace-nowrap"
                  >
                    Bu Botu Seç
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer - İptal Butonu */}
      <div className="p-8 pt-4 flex-shrink-0">
        <div className="flex justify-center">
          <button
            onClick={onClose}
            className="px-8 py-2.5 bg-stone-700 hover:bg-neutral-600 text-white font-medium rounded-lg transition-all duration-200"
          >
            İptal
          </button>
        </div>
      </div>
    </div>

    <style jsx>{`
      .custom-scrollbar::-webkit-scrollbar {
        width: 8px;
      }
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #374151;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #6b7280;
        border-radius: 4px;
      }
      .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #9ca3af;
      }
    `}</style>
  </div>
);

}