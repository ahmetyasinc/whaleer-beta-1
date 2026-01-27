"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { AiOutlineStar } from "react-icons/ai"; // Favorilerim ikonu
import { MdOutlinePeopleAlt } from "react-icons/md"; // Topluluk ikonu
import { FaDice } from "react-icons/fa6";
import { BiBarChartAlt2 } from "react-icons/bi"; // Teknikler ikonu
import TechnicalStrategies from "../(modal_tabs)/technicalStrategies";
import MyStrategies from "../(modal_tabs)/personalStrategies";
import CommunityStrategy from "../(modal_tabs)/communityStrategy";
import FavStrategies from "../(modal_tabs)/favStrategies";
import { FaChessBishop } from "react-icons/fa";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

const StrategyButton = forwardRef(({ locale, shortcutTitle }, ref) => {
  const { t } = useTranslation("indicator");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(1);
  const [favorites, setFavorites] = useState([]);

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  //Favorite ekleme fonksiyonu (state)
  const addFavorite = (indicator) => {
    setFavorites((prevFavorites) => {
      const isAlreadyFavorite = prevFavorites.some((fav) => fav.id === indicator.id);
      if (isAlreadyFavorite) {
        return prevFavorites.filter((fav) => fav.id !== indicator.id); // Favorilerden kaldır
      } else {
        return [...prevFavorites, indicator]; // Favorilere ekle
      }
    });
  };


  const tabs = [
    { id: 1, name: t("Techniques"), icon: <BiBarChartAlt2 className="text-[18px]" /> },
    { id: 2, name: t("Personal"), icon: <FaDice className="text-[18px]" /> },
    { id: 3, name: t("Community"), icon: <MdOutlinePeopleAlt className="text-[18px]" /> },
    { id: 4, name: t("Favorites"), icon: <AiOutlineStar className="text-[18px]" /> },
  ];

  // İçeriği dinamik olarak getir
  const renderContent = () => {
    switch (activeTab) {
      case 1:
        return <TechnicalStrategies locale={locale} closeModal={() => setIsModalOpen(false)} />;
      case 2:
        return <MyStrategies closeModal={() => setIsModalOpen(false)} />;
      case 3:
        return <CommunityStrategy locale={locale} closeModal={() => setIsModalOpen(false)} />;
      case 4:
        return <FavStrategies favorites={favorites} addFavorite={addFavorite} closeModal={() => setIsModalOpen(false)} />;
      default:
        return <p className="text-zinc-500 p-6">Not Found.</p>;
    }
  };

  // Expose openModal to parent via ref
  useImperativeHandle(ref, () => ({
    openModal: () => setIsModalOpen(true)
  }));

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
      <div className="bg-zinc-950 text-zinc-200 rounded-md w-[800px] h-[584px] shadow-lg flex flex-col relative border border-zinc-800">

        {/* Modal Başlık Kısmı */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 h-16 bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-100">{t("strategies")}</h2>
          <button
            className="text-zinc-500 hover:text-white text-3xl transition-colors"
            onClick={() => setIsModalOpen(false)}
          >
            &times;
          </button>
        </div>

        <div className="flex flex-grow">
          {/* Sol Panel (Butonlar) */}
          <div className="w-[200px] bg-zinc-900 pt-3 flex flex-col gap-2 border-r border-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                className={`flex items-center gap-2 py-2 px-4 text-left transition-all ${activeTab === tab.id
                  ? "bg-gradient-to-r from-[#4c2164] to-[#44197e] text-white px-4 rounded-3xl py-2 shadow-sm"
                  : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </div>

          {/* Sağ Panel */}
          <div className="flex-1 flex flex-col bg-zinc-950">
            {/* İçerik */}
            <div className="flex-grow scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="flex items-center justify-center w-[130px] h-[40px] rounded-md bg-transparent border border-gray-700 hover:border-gray-500 transition duration-100 text-zinc-200"
        onClick={() => setIsModalOpen(true)}
        title={shortcutTitle}
      >
        <FaChessBishop className="mr-2 text-[19px]" /> {t("strategies")}
      </button>

      {isModalOpen && createPortal(modalContent, document.body)}
    </>
  );
});

export default StrategyButton;