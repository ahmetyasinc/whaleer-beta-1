"use client";

import { useState } from "react";
import { usePortfolioStore } from "@/store/profile/portfolioStore";
import { AiOutlineClockCircle } from "react-icons/ai";

export default function Portfolio() {
  const [activeTab, setActiveTab] = useState("portfolio"); // 'portfolio' veya 'transactions'
  const { portfolio, transactions } = usePortfolioStore();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(amount);
  };

const formatDate = (date) => {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date));
};

const formatTime = (date) => {
  return new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
};


  const getTransactionLabel = (direction) => {
    if (direction === "açma") {
      return <span className="text-green-400 font-semibold">Açma</span>;
    }
    return <span className="text-red-400 font-semibold">Kapama</span>;
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case "long":
        return "bg-green-700/40 text-green-300";
      case "short":
        return "bg-red-700/40 text-red-300";
      case "spot":
        return "bg-orange-700/70 text-orange-300";
      default:
        return "bg-gray-700/30 text-gray-300";
    }
  };

return (
  <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border-1 border-zinc-700 overflow-hidden text-white flex flex-col h-full">
    {/* Header - Fixed */}
    <div className="bg-gradient-to-r from-cyan-800 to-purple-800 px-4 py-3 flex-shrink-0">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">
          {activeTab === "portfolio" ? "Portföyüm" : "İşlem Listesi"}
        </h2>
        <div className="flex bg-black/30 rounded-lg p-1">
          <button
            onClick={() => setActiveTab("portfolio")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "portfolio"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-white hover:bg-white/10"
            }`}
          >
            Portföy
          </button>
          <button
            onClick={() => setActiveTab("transactions")}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === "transactions"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-white hover:bg-white/10"
            }`}
          >
            İşlemler
          </button>
        </div>
      </div>
    </div>

    {/* Content - Scrollable */}
    <div className="flex-1 overflow-hidden">
      <div className="h-full overflow-y-auto px-3 py-4">

      {activeTab === "portfolio" ? (
        <div className="space-y-4">
          {portfolio.length > 0 ? (
            <>
              {/* Portfolio Header - 5 sütun olarak güncellendi */}
              <div className="grid grid-cols-6 gap-2 text-xs sm:text-sm font-semibold text-gray-400 py-2 sticky top-0 bg-[rgb(0,0,0,0)] z-10 px-2">
                <div className="text-left">Kripto Para</div>
                <div className="text-right">Fiyat</div>
                <div className="text-right">Maliyet</div>
                <div className="text-right">Miktar</div>
                <div className="text-right">Kâr/Zarar</div>
                <div className="text-right">Marj</div>
              </div>
          
              {/* Portfolio Items */}
              {portfolio.map((item, index) => {
                const profitLossPercent = (item.profitLoss / item.cost) * 100;

                return (
                  <div
                    key={index}
                    className="grid grid-cols-6 gap-2 items-center py-3 hover:bg-zinc-800 rounded-lg px-2 bg-gradient-to-r from-zinc-950 to-neutral-900 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    {/* Coin Bilgisi - Mobilde daha kompakt */}
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                        {item.symbol.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-white text-sm sm:text-base truncate">
                          {item.symbol.toUpperCase()}
                        </div>
                        <div className="text-xs text-gray-400 truncate hidden sm:block">
                          {item.name}
                        </div>
                      </div>
                    </div>
                
                    {/* FİYAT */}
                    <div className="text-right">
                      <div className="font-semibold text-white text-sm sm:text-base">
                        {item.currentPrice.toFixed(2)}
                      </div>
                    </div>

                    {/* FİYAT */}
                    <div className="text-right">
                      <div className="font-semibold text-white text-sm sm:text-base">
                        {item.cost.toFixed(2)}
                      </div>
                    </div>
                
                    {/* MİKTAR */}
                    <div className="text-right">
                      <div className="font-semibold text-white text-sm sm:text-base">
                        {formatCurrency(item.amount.toFixed(2))}
                      </div>
                    </div>
                
                    {/* Kar/Zarar */}
                    <div className="text-right">
                      <span
                        className={`font-semibold text-sm sm:text-base ${
                          item.profitLoss >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {formatCurrency(item.profitLoss)}
                      </span>
                    </div>
                      
                    {/* Kar/Zarar % */}
                    <div className="text-right">
                      <span
                        className={`font-semibold text-sm sm:text-base ${
                          profitLossPercent >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {profitLossPercent >= 0 ? '+' : ''}{profitLossPercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <p>Henüz portföyünüzde kripto para bulunmuyor.</p>
              </div>
            )}
          </div>
        ) : (
  <div className="space-y-4">
    {transactions.length > 0 ? (
      <>
        {/* Transactions Header - 5 sütuna düşürüldü */}
        <div className="grid grid-cols-5 gap-3 text-xs sm:text-sm font-semibold text-gray-400 py-2 sticky top-0 bg-[rgb(0,0,0,0)] z-10 px-2">
          <div>Kripto Para</div>
          <div className="text-center">Tür</div>
          <div className="text-center">Yön</div>
          <div className="text-center">Tarih/Saat</div>
          <div className="text-right">Miktar</div>
        </div>

        {/* Transaction Items */}
        {transactions.map((transaction, index) => (
          <div
            key={index}
            className="grid grid-cols-5 gap-3 items-center py-3 bg-gradient-to-r from-zinc-950 to-neutral-900 hover:bg-zinc-800  rounded-lg px-2 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
          >
            {/* Kripto Para */}
            <div className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-sky-700 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                {transaction.symbol.substring(0, 2).toUpperCase()}
              </div>
              <span className="font-semibold text-white text-sm sm:text-base truncate">
                {transaction.symbol.toUpperCase()}
              </span>
            </div>

            {/* Tür */}
            <div className="text-center">
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(
                  transaction.type
                )}`}
              >
                {transaction.type.toUpperCase()}
              </span>
            </div>

            {/* Yön */}
            <div className="text-center">
              <span className="text-sm sm:text-base font-medium text-white">
                {getTransactionLabel(transaction.direction)}
              </span>
            </div>

            {/* Tarih/Saat */}
            <div className="text-center">
              <div className="flex flex-col items-center justify-center">
                <span className="text-xs sm:text-sm text-gray-400">
                  {formatDate(transaction.date)}
                </span>
                <span className="text-xs sm:text-sm text-gray-400">
                  {formatTime(transaction.date)}
                </span>
              </div>
            </div>
                          

            {/* Miktar */}
            <div className="text-right">
              <span className="font-semibold text-white text-sm sm:text-base">
                {formatCurrency(transaction.amount)}
              </span>
            </div>
          </div>
        ))}
      </>
    ) : (
      <div className="text-center py-12 text-gray-400">
        <p>Henüz işlem geçmişiniz bulunmuyor.</p>
      </div>
    )}
  </div>
)}
      </div>
    </div>
  </div>
);
}
