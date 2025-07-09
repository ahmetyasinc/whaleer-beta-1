"use client";

import { IoMdClose } from "react-icons/io";
import { useEffect } from "react";

export default function ExamineBot({ 
  isOpen, 
  onClose, 
  botName = "Bot", 
  trades = [], 
  openPositions = [] 
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-zinc-900 w-[1100px] h-[85vh] rounded-xl shadow-lg overflow-hidden relative flex">
        {/* Sol: İşlem Geçmişi */}
        <div className="flex flex-col w-3/4 border-r border-zinc-700">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-zinc-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-yellow-100">{botName} - İşlem Geçmişi</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              <IoMdClose />
            </button>
          </div>

          {/* İçerik */}
          <div className="overflow-y-auto px-4 py-2 flex-1">
            {trades.length === 0 ? (
              <p className="text-sm text-center text-zinc-500 py-10">Hiç işlem bulunamadı.</p>
            ) : (
              <table className="w-full text-sm text-left text-white border-collapse">
                <thead className="text-xs border-b border-zinc-700 text-zinc-400 uppercase sticky top-0 bg-zinc-900 z-10">
                  <tr>
                    <th className="py-2">Tarih</th>
                    <th>Kripto</th>
                    <th>Fiyat</th>
                    <th>Yön</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, index) => (
                    <tr key={index} className="border-b border-zinc-800 hover:bg-zinc-800 transition">
                      <td className="py-2 pl-2">{trade.date}</td>
                      <td>{trade.symbol}</td>
                      <td>${trade.price}</td>
                      <td className={trade.direction === "LONG" ? "text-green-500" : "text-red-500"}>
                        {trade.direction}
                      </td>
                      <td className="text-zinc-300">
                        {trade.status === "closed" ? "Pozisyon Kapatıldı" : "Pozisyon Açıldı"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Sağ: Açık Pozisyonlar */}
        <div className="w-1/4 flex flex-col bg-zinc-900 h-full p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-yellow-100 mb-4 border-b border-zinc-600 pb-2">
            Açık Pozisyonlar
          </h3>

          {/* Açık pozisyonlar listesi */}
          {openPositions.length === 0 ? (
            <p className="text-sm text-center text-zinc-500 py-10">Açık pozisyon bulunamadı.</p>
          ) : (
            openPositions.map((pos, i) => (
              <div key={i} className="mb-3 py-2 px-3 rounded bg-zinc-950">
                <div className="text-sm font-semibold text-white">{pos.symbol}</div>
                <div className="text-xs text-zinc-400">Miktar: {pos.amount}</div>
                <div className="text-xs text-zinc-400">Maliyet: ${pos.cost}</div>
                <div className={`text-xs font-semibold ${pos.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  Kar/Zarar: {pos.pnl}$
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}