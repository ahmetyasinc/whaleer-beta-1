"use client";

import { useState, useEffect } from "react";
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

const StrategyButton = ({locale}) => {
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
    {id: 1, name: t("Techniques"), icon: <BiBarChartAlt2 className="text-[18px]" /> },
    {id: 2, name: t("Personal"), icon: <FaDice className="text-[18px]" /> },
    {id: 3, name: t("Community"), icon: <MdOutlinePeopleAlt className="text-[18px]" /> },
    {id: 4, name: t("Favorites"), icon: <AiOutlineStar className="text-[18px]" /> },
  ];

  // İçeriği dinamik olarak getir
  const renderContent = () => {
    switch (activeTab) {
      case 1:
        return <TechnicalStrategies locale={locale} />;
      case 2:
        return <MyStrategies />;
      case 3:
        return <CommunityStrategy locale={locale}/>;
      case 4:
        return <FavStrategies  favorites={favorites} addFavorite={addFavorite} />;
      default:
        return <p className="text-white">Not Found.</p>;
    }
  };

  return (
    <>
      {/* Buton */}
      <button
        className="flex items-center justify-center w-[130px] h-[40px] rounded-md bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200"
        onClick={() => setIsModalOpen(true)}
      >
        <FaChessBishop className="mr-2 text-[19px]" /> {t("strategies")}
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 ">
          <div className="bg-gray-900 text-white rounded-md w-[800px] h-[584px] shadow-lg flex flex-col relative">

            {/* Modal Başlık Kısmı */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 h-16">
              <h2 className="text-lg font-bold">{t("strategies")}</h2>
              <button
                className="text-gray-400 hover:text-white text-3xl"
                onClick={() => setIsModalOpen(false)}
              >
                &times;
              </button>
            </div>

            <div className="flex flex-grow">
              {/* Sol Panel (Butonlar) */}
              <div className="w-[200px] bg-gray-800 pt-3 flex flex-col gap-2 border-r border-gray-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.name}
                    className={`flex items-center gap-2 py-2 px-4 text-left transition-all ${
                      activeTab === tab.id ? "bg-gradient-to-r from-[#4c2164] to-[#44197e] text-white px-4 rounded-3xl py-2 hover:bg-[rgba(15,19,73,0.76)]" : "hover:bg-gray-700"
                    }`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.icon} {tab.name}
                  </button>
                ))}
              </div>

              {/* Sağ Panel */}
              <div className="flex-1 flex flex-col">
                {/* İçerik */}
                <div className="flex-grow">{renderContent()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StrategyButton;
