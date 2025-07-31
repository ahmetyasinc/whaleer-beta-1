"use client";

import { useEffect, useState } from "react";
import { IoIosCode, IoIosStarOutline, IoMdSearch, IoMdStar } from "react-icons/io";
import AddStrategyButton from "./add_strategy_button";
import useStrategyStore from "@/store/indicator/strategyStore";
import CodeModal from "./CodeModal";
import axios from "axios";

axios.defaults.withCredentials = true;

const CommunityStrategies = () => {
  const { favorites, toggleFavorite, community } = useStrategyStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleToggleFavorite = async (strategy) => {
    const isAlreadyFavorite = favorites.some((fav) => fav.id === strategy.id);
    toggleFavorite(strategy);

    try {
      if (isAlreadyFavorite) {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/strategy-remove-favourite/`, {
          data: { strategy_id: strategy.id }
        });
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/strategy-add-favorite/`, {
          strategy_id: strategy.id
        });
      }
    } catch (error) {
      console.error("Favori işlemi sırasında hata oluştu:", error);
    }
  };

  const openCodeModal = (strategy) => {
    setSelectedIndicator(strategy); // 'strategy' yerine 'indicator' olarak gönderiyoruz
    setIsModalOpen(true);
  };

  return (
    <div className="text-white">
      {/* Arama Çubuğu */}
      <div className="bg-gray-800 flex items-center border-b border-gray-800 mb-2">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-3 py-2 bg-gray-800 text-white focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <IoMdSearch className="text-gray-400 text-[20px] mr-2" />
      </div>

      {/* Strateji Listesi */}
      <div className="flex flex-col gap-2 w-full mt-2 max-h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {community
          .filter((strategy) =>
            strategy.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((strategy) => (
            <div
              key={strategy.id}
              className="bg-gray-900 hover:bg-gray-800 pl-1 pr-2 flex items-center justify-between w-full h-[40px]"
            >
              {/* Sol kısım */}
              <div className="flex items-center">
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
                <span className="text-[14px]">{strategy.name}</span>
              </div>

              {/* Sağ kısım */}
              <div className="flex gap-2">
                <AddStrategyButton strategyId={strategy.id} />
                <button
                  className="bg-transparent p-2 rounded-md hover:bg-gray-800"
                  onClick={() => openCodeModal(strategy)}
                >
                  <IoIosCode className="text-[hsl(305,57%,44%)] hover:text-[#eb48dd] text-2xl cursor-pointer" />
                </button>
              </div>
            </div>
          ))}
      </div>

      {/* Kod Modalı */}
      <CodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        indicator={selectedIndicator}
      />
    </div>
  );
};

export default CommunityStrategies;
