'use client'

import { useState, useRef, useEffect } from "react";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import useStrategyStore from "@/store/indicator/strategyStore";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoSearch } from "react-icons/io5";
import { FiUpload } from "react-icons/fi";
import { PublishStrategyModal } from './publishStrategyModal';
import { PublishIndicatorModal } from './publishIndicatorModal';
import React from 'react';

export default function StrategyIndicatorCard() {
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  const { strategies } = useStrategyStore();
  const { indicators } = useIndicatorStore();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);

    const timer = setTimeout(() => setInitialLoad(false), 1500);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(timer);
    };
  }, []);

  const handleModalPublish = (data) => {
    console.log("Publish data:", data);
  };

  const handleInspect = (item) => {
    console.log("Inspecting:", item);
    setMenuOpenId(null);
  };

  const ListItem = ({ item, index, type }) => (
    <div
      className="group bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-lg p-3 hover:bg-zinc-900 transition-all duration-200 border-1 border-zinc-700 hover:border-zinc-600 relative"
      style={
        initialLoad
          ? {
              animationDelay: `${index * 200}ms`,
              animation: "fadeInUp 1s ease-out forwards",
            }
          : {}
      }
    >
      <div className="flex justify-between items-start">
        <div className="flex-1 pr-3">
          <div className="font-medium text-white mb-1 text-sm">{item.name}</div>
          {item.description && (
            <div className="text-xs text-gray-400 line-clamp-2">{item.description}</div>
          )}
        </div>

        <div className="relative" ref={menuOpenId === item.id ? menuRef : null}>
          <button
            onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
            className="p-1.5 rounded-full hover:bg-zinc-600 transition-colors"
          >
            <BsThreeDotsVertical className="text-gray-300" size={14} />
          </button>

          {menuOpenId === item.id && (
            <div className="absolute top-0 right-8 w-32 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border-1 border-gray-700 z-20 overflow-hidden">
              <button
                onClick={() => handleInspect(item)}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-yellow-400 hover:bg-gray-800/80 transition-colors"
              >
                <IoSearch size={14} /> Inspect
              </button>
              <button
                onClick={() =>
                  type === "strategy"
                    ? setShowStrategyModal(true)
                    : setShowIndicatorModal(true)
                }
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-blue-400 hover:bg-gray-800/80 transition-colors border-t border-gray-700"
              >
                <FiUpload size={14} /> Publish
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full h-full flex gap-3 overflow-hidden">
      {/* Strategies Card */}
      <div className="flex-1 bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl border-1 border-zinc-700 shadow-xl flex flex-col max-h-[calc(100vh-110px)]">
        <div className="px-4 py-3 border-b border-zinc-700 bg-gradient-to-r from-blue-900/20 to-blue-800/10">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
            <h3 className="text-sm mt-[6px] font-semibold text-blue-200">My Strategies</h3>
            <span className="bg-blue-500/20 text-blue-300 text-xs px-2 py-0.5 rounded-full font-medium">
              {strategies?.length || 0}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div className="space-y-3">
            {strategies && strategies.length > 0 ? (
              strategies.map((strategy, idx) => (
                <ListItem key={strategy.id} item={strategy} index={idx} type="strategy" />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center mb-3">
                  <div className="w-6 h-6 bg-blue-500/20 rounded-full"></div>
                </div>
                <p className="text-gray-500 text-xs">No strategies added yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Indicators Card */}
      <div className="flex-1 bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl border-1 border-zinc-700 shadow-xl flex flex-col max-h-[calc(100vh-110px)]">
        <div className="px-4 py-3 border-b border-zinc-700 bg-gradient-to-r from-purple-900/20 to-purple-800/10">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
            <h3 className="text-sm mt-[6px] font-semibold text-purple-200">My Indicators</h3>
            <span className="bg-purple-500/20 text-purple-300 text-xs px-2 py-0.5 rounded-full font-medium">
              {indicators?.length || 0}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div className="space-y-3">
            {indicators && indicators.length > 0 ? (
              indicators.map((indicator, idx) => (
                <ListItem key={indicator.id} item={indicator} index={idx} type="indicator" />
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="w-12 h-12 bg-purple-500/10 rounded-full flex items-center justify-center mb-3">
                  <div className="w-6 h-6 bg-purple-500/20 rounded-full"></div>
                </div>
                <p className="text-gray-500 text-xs">No indicators added yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <PublishStrategyModal
        isOpen={showStrategyModal}
        onClose={() => setShowStrategyModal(false)}
        onPublish={handleModalPublish}
      />

      <PublishIndicatorModal
        isOpen={showIndicatorModal}
        onClose={() => setShowIndicatorModal(false)}
        onPublish={handleModalPublish}
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
