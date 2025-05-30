"use client";

import { useState } from "react";
import { FiNavigation } from "react-icons/fi";
import { AiOutlineStar } from "react-icons/ai"; // Favorilerim ikonu
import { MdOutlinePeopleAlt } from "react-icons/md"; // Topluluk ikonu
import { BsPerson } from "react-icons/bs"; // Kişisel ikonu
import { BiBarChartAlt2 } from "react-icons/bi"; // Teknikler ikonu
import TechnicalIndicators from "../(modal_tabs)/technicalIndicator"; //bulsana dosyayı amına kodumun next.oe 
import PersonalIndicators from "../(modal_tabs)/personalIndicator";
import CommunityIndicators from "../(modal_tabs)/communityIndicator";
import FavoriteIndicators from "../(modal_tabs)/favIndicator";


const IndicatorsButton = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Teknikler");
  const [favorites, setFavorites] = useState([]);

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
    { name: "Teknikler", icon: <BiBarChartAlt2 className="text-[18px]" /> },
    { name: "Kişisel", icon: <BsPerson className="text-[18px]" /> },
    { name: "Topluluk", icon: <MdOutlinePeopleAlt className="text-[18px]" /> },
    { name: "Favorilerim", icon: <AiOutlineStar className="text-[18px]" /> },
  ];

  // İçeriği dinamik olarak getir
  const renderContent = () => {
    switch (activeTab) {
      case "Teknikler":
            return <TechnicalIndicators addFavorite={addFavorite} favorites={favorites} />;
      case "Kişisel":
        return <PersonalIndicators />;
      case "Topluluk":
        return <CommunityIndicators />;
      case "Favorilerim":
        return <FavoriteIndicators favorites={favorites} addFavorite={addFavorite} />;
      default:
        return <p className="text-white">Sayfa bulunamadı.</p>;
    }
  };
// from-[rgb(42,158,48)] to-[hsl(300,100%,54%)]
  return (
    <>
      {/* Buton */}
      <button
        className="flex items-center justify-center w-[130px] h-[40px] rounded-md transition-all duration-200 bg-gray-950 hover:bg-gray-900 text-white"
        onClick={() => setIsModalOpen(true)}
      >
        <FiNavigation className="mr-2 text-[19px]" /> Göstergeler
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 ">
          <div className="bg-gray-900 text-white rounded-md w-[800px] h-[584px] shadow-lg flex flex-col relative">
            
            {/* Modal Başlık Kısmı */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 h-16">
              <h2 className="text-lg font-bold">Göstergeler</h2>
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
                      activeTab === tab.name ? "bg-gradient-to-r from-[hsl(180,81%,19%)] to-[hsl(215,22%,56%)] text-white px-4 rounded-3xl py-2 hover:bg-[rgba(15,19,73,0.76)]" : "hover:bg-gray-700"
                    }`}
                    onClick={() => setActiveTab(tab.name)}
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

export default IndicatorsButton;
