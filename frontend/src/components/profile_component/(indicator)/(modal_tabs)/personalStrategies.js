"use client";

import { useState } from "react";
import axios from "axios";
import { IoMdAdd, IoIosStarOutline, IoMdStar } from "react-icons/io";
import { HiOutlineTrash } from "react-icons/hi";
import AddStrategyButton from "./add_strategy_button";
import { SiRobinhood } from "react-icons/si";
import useStrategyStore from "@/store/indicator/strategyStore";
import useCodePanelStore from "@/store/indicator/strategyCodePanelStore";
import useStrategyDataStore from "@/store/indicator/strategyDataStore"; // ✅ store
import { RiErrorWarningFill } from "react-icons/ri";

axios.defaults.withCredentials = true;

const PersonalStrategies = () => {
  const [strategyName, setStrategyName] = useState("");
  const [strategyCode, setStrategyCode] = useState("");
  const [editingStrategy, setEditingStrategy] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState(null);

  const { favorites, toggleFavorite, setPersonalStrategies, strategies } =
    useStrategyStore();
  const { openPanel, closePanelIfMatches } = useCodePanelStore();
  const { strategyData } = useStrategyDataStore(); // ✅ error kontrolü için

  const handleToggleFavorite = async (strategy) => {
    const isAlreadyFavorite = favorites.some((fav) => fav.id === strategy.id);
    toggleFavorite(strategy);

    try {
      if (isAlreadyFavorite) {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL}/api/strategy-remove-favourite/`,
          { data: { strategy_id: strategy.id } }
        );
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/strategy-add-favorite/`,
          { strategy_id: strategy.id }
        );
      }
    } catch (error) {
      console.error("Favori işlemi sırasında hata oluştu:", error);
    }
  };

  const handleDeleteClick = (strategy) => {
    setSelectedStrategy(strategy);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    const { strategies, setPersonalStrategies } =
      useStrategyStore.getState();

    if (!selectedStrategy) return;

    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/delete-strategy/${selectedStrategy.id}/`,
        { withCredentials: true }
      );

      setPersonalStrategies(
        strategies.filter((ind) => ind.id !== selectedStrategy.id)
      );
      closePanelIfMatches(selectedStrategy.id);
      resetDeleteModal();
    } catch (error) {
      console.error("Silme işlemi sırasında hata oluştu:", error);
    }
  };

  const resetDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedStrategy(null);
  };

  return (
    <div className="text-white pt-2 flex flex-col items-center w-full">
      <div className="w-full max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {strategies.length === 0 ? (
          <></>
        ) : (
          strategies.map((strategy) => {
            // ✅ strategyData içinden son subItem'ı bul
            const subItems = strategyData?.[strategy.id]?.subItems;
            const lastSub =
              subItems && Object.values(subItems)[Object.values(subItems).length - 1];
            const hasError = lastSub?.result?.status === "error";
            const errorMessage = lastSub?.result?.message || "Derleme Hatası !";

            return (
              <div
                key={strategy.id}
                className="bg-gray-900 hover:bg-gray-800 flex items-center justify-between w-full h-[40px] mb-2"
              >
                <div className="flex items-center pl-2">
                  <button
                    className="bg-transparent p-2 rounded-md hover:bg-gray-800"
                    onClick={() => handleToggleFavorite(strategy)}
                  >
                    {favorites.some((fav) => fav.id === strategy.id) ? (
                      <IoMdStar className="text-lg text-yellow-500" />
                    ) : (
                      <IoIosStarOutline className="text-lg text-gray-600" />
                    )}
                  </button>
                  <span className="text-[15px]">{strategy.name}</span>

                  {/* ✅ sadece hata varsa göster */}
                  {hasError && (
                    <div className="group relative p-2 rounded-full z-50">
                      <RiErrorWarningFill className="text-red-600" />
                      <div className="bg-[#cc4242] p-1 rounded-sm group-hover:flex hidden absolute top-1/2 -translate-y-1/2 -right-2 translate-x-full">
                        <span className="whitespace-nowrap text-sm">
                          {errorMessage}
                        </span>
                        <div className="bg-inherit rotate-45 p-1 absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2"></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <AddStrategyButton strategyId={strategy.id} />
                  <button
                    className="bg-transparent p-2 rounded-md hover:bg-gray-800"
                    onClick={() => {
                      setStrategyName(strategy.name);
                      setStrategyCode(strategy.code);
                      setEditingStrategy(strategy);
                      openPanel(strategy.name, strategy.code, strategy);
                    }}
                  >
                    <SiRobinhood className="text-blue-400 hover:text-blue-700 text-lg cursor-pointer" />
                  </button>
                  <button
                    className="bg-transparent pr-4 pl-2 rounded-md hover:bg-gray-800"
                    onClick={() => handleDeleteClick(strategy)}
                  >
                    <HiOutlineTrash className="text-red-700 hover:text-red-900 text-[19.5px] cursor-pointer" />
                  </button>
                </div>

                {showDeleteModal && (
                  <div className="fixed inset-0 flex items-center justify-center bg-black/10">
                    <div className="bg-gray-900 text-white rounded-md w-[400px] p-6 shadow-lg relative">
                      <h2 className="text-lg font-bold mb-4">Silme Onayı</h2>
                      <p>
                        {selectedStrategy?.name} stratejisini silmek
                        istediğinize emin misiniz?
                      </p>
                      <div className="flex justify-end mt-4 gap-2">
                        <button
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                          onClick={resetDeleteModal}
                        >
                          Hayır
                        </button>
                        <button
                          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded"
                          onClick={confirmDelete}
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <button
        className="mt-1 p-3 bg-green-500 hover:bg-green-600 text-white rounded-sm flex items-center justify-center h-3 w-16"
        onClick={() => {
          setEditingStrategy(null);
          setStrategyName("");
          setStrategyCode("");
          openPanel();
        }}
      >
        <IoMdAdd className="text-lg" />
      </button>
    </div>
  );
};

export default PersonalStrategies;
