"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FiNavigation } from "react-icons/fi";
import { AiOutlineStar } from "react-icons/ai"; // Favorilerim ikonu
import { MdOutlinePeopleAlt } from "react-icons/md"; // Topluluk ikonu
import { BsPerson } from "react-icons/bs"; // Kişisel ikonu
import { BiBarChartAlt2 } from "react-icons/bi"; // Teknikler ikonu
import TechnicalIndicators from "../(modal_tabs)/technicalIndicator"; //bulsana dosyayı amına kodumun next.oe 
import PersonalIndicators from "../(modal_tabs)/personalIndicator";
import CommunityIndicators from "../(modal_tabs)/communityIndicator";
import FavoriteIndicators from "../(modal_tabs)/favIndicator";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

const IndicatorsButton = ({ locale }) => {
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
    { id: 2, name: t("Personal"), icon: <BsPerson className="text-[18px]" /> },
    { id: 3, name: t("Community"), icon: <MdOutlinePeopleAlt className="text-[18px]" /> },
    { id: 4, name: t("Favorites"), icon: <AiOutlineStar className="text-[18px]" /> },
  ];

  // İçeriği dinamik olarak getir
  const renderContent = () => {
    switch (activeTab) {
      case 1:
        return <TechnicalIndicators locale={locale} addFavorite={addFavorite} favorites={favorites} closeModal={() => setIsModalOpen(false)} />;
      case 2:
        return <PersonalIndicators closeModal={() => setIsModalOpen(false)} />;
      case 3:
        return <CommunityIndicators locale={locale} closeModal={() => setIsModalOpen(false)} />;
      case 4:
        return <FavoriteIndicators favorites={favorites} addFavorite={addFavorite} closeModal={() => setIsModalOpen(false)} />; default:
        return <p className="text-zinc-500 p-6">{t("NotFound")}</p>;
    }
  };

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
      <div className="bg-zinc-950 text-zinc-200 rounded-md w-[800px] h-[584px] shadow-lg flex flex-col relative border border-zinc-800">

        {/* Modal Başlık Kısmı */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 h-16 bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-100">{t("indicators")}</h2>
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
                  ? "bg-gradient-to-r from-[hsl(180,81%,19%)] to-[hsl(215,22%,56%)] text-white px-4 rounded-3xl py-2 shadow-sm"
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
        className="flex items-center justify-center w-[130px] h-[40px] rounded-md transition duration-100 bg-transparent border border-gray-700 hover:border-gray-500 text-zinc-200"
        onClick={() => setIsModalOpen(true)}
      >
        <FiNavigation className="mr-2 text-[19px]" /> {t("indicators")}
      </button>

      {isModalOpen && createPortal(modalContent, document.body)}
    </>
  );
};

export default IndicatorsButton;