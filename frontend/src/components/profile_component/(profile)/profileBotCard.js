"use client";

import React from "react";
import { FaRobot, FaDollarSign, FaChartLine } from "react-icons/fa";
import { RiRobotLine } from "react-icons/ri";
import { useBotStore } from "@/store/bot/botStore";
import useBotExamineStore from "@/store/bot/botExamineStore";
import { useRef, useEffect, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoSearch } from "react-icons/io5";
import { FaEye } from "react-icons/fa";
import ExamineBot from "@/components/profile_component/(bot)/examineBot";


export default function ModernBotList() {
  const { bots } = useBotStore();
  const { getBot, fetchAndStoreBotAnalysis } = useBotExamineStore();
  const [menuOpen, setMenuOpen] = useState(null);
  const menuRef = useRef(null);
  const [isExamineOpen, setIsExamineOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState(null);

  // Bot analiz verilerini yükle
  useEffect(() => {
    bots.forEach(bot => {
      fetchAndStoreBotAnalysis(bot.id);
    });
  }, [bots, fetchAndStoreBotAnalysis]);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Eğer menüden ya da butondan değilse kapat
      if (!event.target.closest(".menu-container")) {
        setMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);


  // Bot verilerini birleştir - ExamineBot'ta olduğu gibi getBot kullan
  // Bot verilerini birleştir
  const enrichedBots = bots.map(bot => {
    const examineData = getBot(bot.id);
    const managedAmount = bot.balance || 0;
    const totalPnl = examineData?.bot_profit || 0;
    const currentValue = examineData?.bot_current_value || 0;
    const analysisLoaded = !!examineData;

    // Margin hesaplama
    let margin = 0;
    if (analysisLoaded && totalPnl !== 0) {
      if (totalPnl > 0) {
        margin = ( totalPnl / (currentValue - totalPnl)) * 100;
      } else {
        margin = ( Math.abs(totalPnl) / (currentValue + Math.abs(totalPnl)) ) * 100;
      }
    }

    return {
      ...bot,
      managedAmount,
      totalPnl,
      currentValue,
      analysisLoaded,
      margin, // yeni margin değeri
    };
  });


  const handleViewBot = (botId) => {
    // Bot görüntüleme işlemi
    console.log("Viewing bot:", botId);
    setMenuOpen(null);
  };

  const handlePreviewBot = (botId) => {
    // Bot önizleme işlemi
    console.log("Previewing bot:", botId);
    setMenuOpen(null);
  };

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6 bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl border-1 border-gray-700">
      {/* Header */}
      <div className="mb-8 border-b border-gray-700 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent">
            My Bots
          </h1>
        </div>
      </div>

      {/* Bot List */}
      <div className="flex-1 flex flex-col">
        {/* Scrollable Bot List */}
        <div className="flex-1 overflow-y-auto px-3 max-h-[calc(100vh-250px)]">
          {enrichedBots.length > 0 ? (
            <div className="space-y-2">
              {enrichedBots.map((bot, index) => (
                <div
                  key={bot.id}
                  className="group relative bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm rounded-lg py-3 px-3 border-1 border-slate-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-0.5"
                  style={{
                    animationDelay: `${index * 200}ms`,
                    animation: "fadeInUp 1s ease-out forwards",
                  }}
                >
                  <div className="flex items-center justify-between">
                    {/* Left Section - Bot Info */}
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="p-2.5 rounded-full bg-gray-600">
                          <RiRobotLine className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div className="absolute -top-1 -right-1">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              bot.isActive ? "bg-emerald-400" : "bg-red-400"
                            } animate-pulse`}
                          ></div>
                          <div
                            className={`absolute inset-0 w-2.5 h-2.5 rounded-full ${
                              bot.isActive ? "bg-emerald-400" : "bg-red-400"
                            } opacity-30 animate-ping`}
                          ></div>
                        </div>
                      </div>
                          
                      <div>
                        <h3 className="text-base font-semibold text-white truncate max-w-[200px] group-hover:text-blue-300 transition-colors duration-300">
                          {bot.name}
                        </h3>
                        <p
                          className={`text-xs ${
                            bot.isActive ? "text-emerald-400" : "text-red-400"
                          } font-medium`}
                        >
                          {bot.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>
                        
                    {/* Right Section */}
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FaDollarSign className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-xs text-gray-400">Current Value</span>
                        </div>
                        <span className="text-sm font-bold text-blue-400">
                          {bot.analysisLoaded 
                            ? `$${bot.currentValue.toLocaleString()}` 
                            : `$${bot.managedAmount.toLocaleString()}`
                          }
                        </span>
                      </div>
                        
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FaChartLine className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs text-gray-400">Margin</span>
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            bot.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {bot.analysisLoaded
                            ? `${bot.totalPnl >= 0 ? "" : "-"}${bot.margin.toFixed(2)}%`
                            : "Loading..."}
                        </span>
                      </div>
                        
                      <div className="text-right">
                        <div className="flex items-center gap-1.5 mb-1">
                          <FaDollarSign className="w-3.5 h-3.5 text-purple-400" />
                          <span className="text-xs text-gray-400">Total P&L</span>
                        </div>
                        <span
                          className={`text-sm font-bold ${
                            bot.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {bot.analysisLoaded
                            ? `${bot.totalPnl >= 0 ? "+" : ""}$${bot.totalPnl.toLocaleString()}`
                            : "Loading..."}
                        </span>
                      </div>
                          
                      <div className="relative inline-block text-left menu-container">
                        <button
                          onClick={() => setMenuOpen(menuOpen === bot.id ? null : bot.id)}
                          className="p-2 rounded hover:bg-gray-700 transition-colors duration-200"
                        >
                          <BsThreeDotsVertical className="text-gray-300" size={20} />
                        </button>
                          
                        {menuOpen === bot.id && (
                          <div className="absolute top-0 right-10 w-36 bg-stone-900 rounded-lg shadow-lg z-10 border-1 border-stone-700">
                            <button
                              onClick={() => {
                                setSelectedBotId(bot.id);
                                setIsExamineOpen(true);
                                setMenuOpen(null); // menüyü kapat
                              }}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-amber-400 hover:bg-stone-800 rounded-t-lg transition-colors duration-200"
                            >
                              <IoSearch size={16} /> Examine
                            </button>
                            <button
                              onClick={() => handlePreviewBot(bot.id)}
                              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-violet-400 hover:bg-stone-800 rounded-b-lg transition-colors duration-200"
                            >
                              <FaEye size={16} /> Preview
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                      
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-6 bg-slate-800/30 rounded-full mb-4">
                <FaRobot className="w-12 h-12 text-gray-500" />
              </div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Bots Yet</h3>
              <p className="text-gray-500 max-w-sm">
                To create your trading bot, go to the automated bots page and click the "Add New Bot" button.
              </p>
            </div>
          )}
        </div>
      </div>

          <ExamineBot
            isOpen={isExamineOpen}
            onClose={() => setIsExamineOpen(false)}
            botId={selectedBotId}
          />

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}