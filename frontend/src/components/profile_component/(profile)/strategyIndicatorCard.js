'use client'

import { useState, useRef, useEffect } from "react";
import useIndicatorStore from "@/store/indicator/indicatorStore"; // Doğru yolu import için ayarlayın
import useStrategyStore from "@/store/indicator/strategyStore"; // Doğru yolu import için ayarlayın
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoSearch } from "react-icons/io5";
import { FiUpload } from "react-icons/fi";
import { PublishModal } from './publishModal';
import React from 'react';

export default function StrategyIndicatorCard({item}) {
  const [activeTab, setActiveTab] = useState("strategies");
  const [menuOpenId, setMenuOpenId] = useState(null);
  const menuRef = useRef(null);
  const [showPublishModal, setShowPublishModal] = useState(false);

  const handleModalPublish = (data) => {
    console.log("Yayınla verisi:", data);
    // Backend'e gönder veya zustand'a kaydet
  };
  
  // Strategy store'dan verileri çekme
  const {
    strategies,          // Kişisel stratejiler
    community: communityStrategies,  // Topluluk stratejileri
    tecnic: tecnicStrategies,        // Teknik stratejiler
  } = useStrategyStore();
  
  // Indicator store'dan verileri çekme
  const {
    indicators,          // Kişisel indikatörler
    community: communityIndicators,  // Topluluk indikatörleri 
    tecnic: tecnicIndicators,        // Teknik indikatörler
  } = useIndicatorStore();

  // Menü dışında bir yere tıklandığında menüyü kapat
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpenId(null);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Aktif olan sekmeye göre görüntülenecek verileri seçme
  const getActiveItems = () => {
    if (activeTab === "strategies") {
      return strategies || [];
    } else {
      return indicators || [];
    }
  };

  // Yayınlama işlemini gerçekleştirecek fonksiyon
  const handlePublish = (item) => {
    // Yayınlama işlemini burada gerçekleştirin
    console.log(`${activeTab === "strategies" ? "Strateji" : "İndikatör"} yayınlandı:`, item);
    setMenuOpenId(null);
  };

  // İnceleme işlemini gerçekleştirecek fonksiyon
  const handleInspect = (item) => {
    // İnceleme işlemini burada gerçekleştirin
    console.log(`${activeTab === "strategies" ? "Strateji" : "İndikatör"} inceleniyor:`, item);
    setMenuOpenId(null);
  };

  return (
    <div className="w-1/3 h-full flex flex-col overflow-auto px-2">
      <div className="bg-zinc-900 rounded-md shadow-md text-white w-full flex flex-col h-full">
        {/* Başlık */}
        <div className="sticky top-0 z-10 bg-zinc-900 px-6 pt-6 pb-3">
          <h2 className="text-xl font-bold mb-2">Strateji ve İndikatörlerim</h2>
  
          {/* Butonlar alt alta */}
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("strategies")}
              className={`w-1/2 text-sm px-2 py-1 rounded ${
                activeTab === "strategies" ? "bg-zinc-700" : "bg-zinc-800"
              }`}
            >
              Stratejilerim
            </button>
            <button
              onClick={() => setActiveTab("indicators")}
              className={`w-1/2 text-sm px-2 py-1 rounded ${
                activeTab === "indicators" ? "bg-zinc-700" : "bg-zinc-800"
              }`}
            >
              İndikatörlerim
            </button>
          </div>
        </div>
  
        {/* İçerik */}
        <div className="space-y-3 px-6 pb-6 overflow-y-auto flex-1">
          {getActiveItems().length > 0 ? (
            getActiveItems().map((item) => (
              <div
                key={item.id}
                className="bg-zinc-800 rounded-md px-4 py-3 hover:bg-zinc-700 transition flex justify-between items-center relative"
              >
                <div className="flex-1">
                  <div className="font-medium">{item.name}</div>
                  {item.description && (
                    <div className="text-sm text-gray-400">{item.description}</div>
                  )}
                </div>
                
                {/* Üç nokta menü butonu */}
                <div className="relative" ref={menuOpenId === item.id ? menuRef : null}>
                  <button
                    onClick={() => setMenuOpenId(menuOpenId === item.id ? null : item.id)}
                    className="p-1.5 rounded-full hover:bg-zinc-600"
                  >
                    <BsThreeDotsVertical className="text-gray-300" size={16} />
                  </button>

                  {/* Açılır menü */}
                  {menuOpenId === item.id && (
                    <div className="absolute top-0 right-8 w-32 bg-gray-900 rounded shadow-md z-10">
                      <button
                        onClick={() => handleInspect(item)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-yellow-400 hover:bg-gray-800"
                      >
                        <IoSearch size={16} /> İncele
                      </button>
                      <button
                        onClick={() => setShowPublishModal(true)}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-800"
                      >
                        <FiUpload size={16} /> Yayınla
                      </button>

                      <PublishModal
                        isOpen={showPublishModal}
                        onClose={() => setShowPublishModal(false)}
                        onPublish={handleModalPublish}
                      />

                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-6 text-gray-500">
              {activeTab === "strategies" ? "Henüz strateji eklenmemiş." : "Henüz indikatör eklenmemiş."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}