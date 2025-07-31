"use client";

import { useEffect, useState } from "react";
import { IoIosStarOutline, IoMdSearch, IoMdStar } from "react-icons/io";
import useStrategyStore from "@/store/indicator/strategyStore";
import axios from "axios";

axios.defaults.withCredentials = true;

const TechnicalStrategies = ({ onSelect }) => {
  const {
    favorites,
    setTecnicStrategies,
    setPersonalStrategies,
    setCommunityStrategies,
    tecnic,
  } = useStrategyStore();

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (tecnic.length > 0) return;

    const fetchStrategies = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/all-strategies/`);
        const tecnic_strategies = response.data.tecnic_strategies || [];
        setTecnicStrategies(tecnic_strategies);

        const personal_strategies = response.data.personal_strategies || [];
        setPersonalStrategies(personal_strategies);

        const public_strategies = response.data.public_strategies || [];
        setCommunityStrategies(public_strategies);
      } catch (error) {
        console.error("Veri çekme hatası:", error);
      }
    };

    fetchStrategies();
  }, [tecnic.length, setTecnicStrategies]);

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

      {/* Liste */}
      <div className="flex flex-col gap-2 w-full mt-2 max-h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {tecnic
          .filter((strategy) =>
            strategy.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((strategy) => (
            <div
              key={strategy.id}
              className="bg-gray-900 hover:bg-gray-800 pl-1 pr-2 flex items-center justify-between w-full h-[40px]"
            >
              {/* Sol */}
              <div className="flex items-center">
                <div className="bg-transparent p-2 rounded-md hover:bg-gray-800">
                  {favorites.some((fav) => fav.id === strategy.id) ? (
                    <IoMdStar className="text-lg text-yellow-500" />
                  ) : (
                    <IoIosStarOutline className="text-lg text-gray-600" />
                  )}
                </div>
                <span className="text-[14px]">{strategy.name}</span>
              </div>

              {/* Sağ */}
              <div className="flex gap-2">
                <button
                  onClick={() => onSelect(strategy)} // 👈 Strateji seçimini tetikleyen yer
                  className="bg-blue-600 px-2 rounded-md py-[1px] h-[26px] mr-3 hover:bg-blue-800 text-white text-xs"
                >
                  Choose
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default TechnicalStrategies;
