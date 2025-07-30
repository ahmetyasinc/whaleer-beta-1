"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { IoMdAdd, IoIosStarOutline, IoMdStar } from "react-icons/io";
import { HiOutlineTrash } from "react-icons/hi";
import AddIndicatorButton from "./add_indicator_button";
import { SiRobinhood } from "react-icons/si";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import useCodePanelStore from "@/store/indicator/indicatorCodePanelStore";
import { RiErrorWarningFill } from "react-icons/ri";

axios.defaults.withCredentials = true;

const PersonalIndicators = () => {
  const [indicatorName, setIndicatorName] = useState("");
  const [indicatorCode, setIndicatorCode] = useState("");
  const [editingIndicator, setEditingIndicator] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const { favorites, toggleFavorite, setPersonalIndicators, indicators } = useIndicatorStore();
  const { openPanel, closePanelIfMatches } = useCodePanelStore(); // Yeni eklenen store hook'u

  const handleToggleFavorite = async (indicator) => {
      const isAlreadyFavorite = favorites.some((fav) => fav.id === indicator.id);
      toggleFavorite(indicator);

      try {
          if (isAlreadyFavorite) {
              await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/indicator-remove-favourite/`, {
                  data: { indicator_id: indicator.id }
              });                
          } else {
              await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/indicator-add-favorite/`, {
                  indicator_id: indicator.id
              });
          }
      } catch (error) {
          console.error("Favori işlemi sırasında hata oluştu:", error);
      }
  };

  const handleDeleteClick = (indicator) => {
    setSelectedIndicator(indicator);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const { indicators, setPersonalIndicators } = useIndicatorStore.getState();
  
    if (!selectedIndicator) return;
  
    try {
      // API'ye DELETE isteği gönder
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/delete-indicator/${selectedIndicator.id}/`, {
        withCredentials: true, // Cookie bilgisini dahil etmek için
      });
  
      // Eğer API başarılı olursa store'dan da kaldır
      setPersonalIndicators(indicators.filter((ind) => ind.id !== selectedIndicator.id));
      closePanelIfMatches(selectedIndicator.id)
      resetDeleteModal();
    } catch (error) {
      console.error("Silme işlemi sırasında hata oluştu:", error);
    }
  };

  const resetModal = () => {
    setIndicatorName("");
    setIndicatorCode("");
    setIsModalOpen(false);
  };

  const resetDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedIndicator(null);
  };

  return (
    <div className="text-white pt-2 flex flex-col items-center w-full">
      <div className="w-full max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {indicators.length === 0 ? (
          <></>
        ) : (
          indicators.map((indicator) => (
            <div key={indicator.id} className="bg-gray-900 hover:bg-gray-800 flex items-center justify-between w-full h-[40px] mb-2">
              <div className="flex items-center pl-2">
                <button className="bg-transparent p-2 rounded-md hover:bg-gray-800" onClick={() => handleToggleFavorite(indicator)}>
                  {favorites.some((fav) => fav.id === indicator.id) ? (
                    <IoMdStar className="text-lg text-yellow-500" />
                  ) : (
                    <IoIosStarOutline className="text-lg text-gray-600" />
                  )}
                </button>
                <span className="text-[15px]">{indicator.name}</span>

                <div className="group relative p-2 rounded-full">
                     <RiErrorWarningFill className="text-red-600"/>
                  <div className="bg-[#cc4242] p-1 rounded-sm group-hover:flex hidden absolute top-1/2 -translate-y-1/2 -right-2 translate-x-full">
                    <span className="whitespace-nowrap text-sm">Derleme Hatası !</span>
                    <div
                      className="bg-inherit rotate-45 p-1 absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2"
                    ></div>
                  </div>
                </div>


              </div>
              <div className="flex items-center gap-2">
                <AddIndicatorButton indicatorId={indicator.id} />
                <button className="bg-transparent p-2 rounded-md hover:bg-gray-800" onClick={() => {
                  setIndicatorName(indicator.name);
                  setIndicatorCode(indicator.code);
                  setEditingIndicator(indicator);
                  openPanel(indicator.name, indicator.code, indicator); // Paneli açıyoruz
                }}>
                  <SiRobinhood className="text-blue-400 hover:text-blue-700 text-lg cursor-pointer" />
                </button>
                <button
                    className="bg-transparent pr-4 pl-2 rounded-md hover:bg-gray-800"
                    onClick={() => handleDeleteClick(indicator)}
                >
                    <HiOutlineTrash className="text-red-700 hover:text-red-900 text-[19.5px] cursor-pointer"/>
                </button>

                {showDeleteModal && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black/10">
                    <div className="bg-gray-900 text-white rounded-md w-[400px] p-6 shadow-lg relative">
                      <h2 className="text-lg font-bold mb-4">Silme Onayı</h2>
                      <p>{selectedIndicator?.name} indikatörünü silmek istediğinize emin misiniz?</p>
                      <div className="flex justify-end mt-4 gap-2">
                        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={resetDeleteModal}>Hayır</button>
                        <button className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded" onClick={confirmDelete}>Sil</button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <button className="mt-1 p-3 bg-green-500 hover:bg-green-600 text-white rounded-sm flex items-center justify-center h-3 w-16" onClick={() => {
        setEditingIndicator(null);
        setIndicatorName("");
        setIndicatorCode("");
        openPanel(); // Paneli açıyoruz
      }}>
        <IoMdAdd className="text-lg" />
      </button>     



    </div>
  );
};

export default PersonalIndicators;

