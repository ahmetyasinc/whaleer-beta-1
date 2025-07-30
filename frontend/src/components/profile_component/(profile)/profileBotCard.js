"use client";

import React from "react";
import { FaRobot, FaDollarSign, FaChartLine } from "react-icons/fa";
import { RiRobotLine } from "react-icons/ri";
import useProfileBotStore from "@/store/profile/profileBotStore";
import { useRef, useEffect, useState } from "react";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoSearch } from "react-icons/io5";
import { FaEye } from "react-icons/fa";


export default function ModernBotList() {
  const { bots } = useProfileBotStore();
  const [menuOpen, setMenuOpen] = useState(null); // hangi botun ID'si açık
  const menuRef = useRef(null);

  // Dışarı tıklayınca kapatma
useEffect(() => {
  const handleClickOutside = (event) => {
    if (menuRef.current && !menuRef.current.contains(event.target)) {
      setMenuOpen(null);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  return (
    <div className="w-full h-full flex flex-col overflow-hidden p-6 bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl border-1 border-gray-700">
      {/* Header */}
      <div className="mb-8 border-b border-gray-700 pb-2">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-gray-100 bg-clip-text text-transparent">
            Botlarım
          </h1>
        </div>
      </div>

      {/* Bot List */}
{/* Bot List */}
      <div className="flex-1 overflow-y-auto">
        {bots.length > 0 ? (
          <div className="space-y-2">
            {bots.map((bot, index) => (
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
                    {/* Bot Icon & Status */}
                    <div className="relative">
                      <div
                        className="p-2.5 rounded-full bg-gray-600"
                      >
                        <RiRobotLine
                          className="w-5 h-5 text-neutral-400"
                        />
                      </div>
                      {/* Status Dot */}
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

                    {/* Bot Name & Status */}
                    <div>
                      <h3 className="text-base font-semibold text-white truncate max-w-[200px] group-hover:text-blue-300 transition-colors duration-300">
                        {bot.name}
                      </h3>
                      <p
                        className={`text-xs ${
                          bot.isActive ? "text-emerald-400" : "text-red-400"
                        } font-medium`}
                      >
                        {bot.isActive ? "Aktif" : "Devre Dışı"}
                      </p>
                    </div>
                  </div>

                  {/* Right Section - Stats & Menu */}
                  <div className="flex items-center gap-6">
                    {/* Managed Amount */}
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FaDollarSign className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-gray-400">Yönetilen</span>
                      </div>
                      <span className="text-sm font-bold text-blue-400">
                        ${bot.managedAmount.toLocaleString()}
                      </span>
                    </div>

                    {/* Performance (Win Rate) */}
                    <div className="text-right">
                      <div className="flex items-center gap-1.5 mb-1">
                        <FaChartLine className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-xs text-gray-400">Marj</span>
                      </div>
                      <span className="text-sm font-bold text-emerald-400">
                        {bot.winRate}%
                      </span>
                    </div>

                    {/* Three Dots Menu */}
                    <div className="relative inline-block text-left" ref={menuRef}>
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
                              // İncele işlevi buraya gelecek
                              setMenuOpen(null);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-stone-800 rounded-t-lg transition-colors duration-200"
                          >
                            <IoSearch size={16} /> İncele
                          </button>

                          <button
                            onClick={() => {
                              // Önizle işlevi buraya gelecek
                              setMenuOpen(null);
                            }}
                            className="flex items-center gap-2 w-full px-4 py-2 text-sm text-purple-400 hover:bg-stone-800 rounded-b-lg transition-colors duration-200"
                          >
                            <FaEye size={16} /> Önizle
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Hover Effect Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-6 bg-slate-800/30 rounded-full mb-4">
              <FaRobot className="w-12 h-12 text-gray-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              Henüz Bot Yok
            </h3>
            <p className="text-gray-500 max-w-sm">
              Trading botunuzu oluşturmak için otomatik botlarım sayfasından yeni bot ekle butonuna
              tıklayın.
            </p>
          </div>
        )}
      </div>

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