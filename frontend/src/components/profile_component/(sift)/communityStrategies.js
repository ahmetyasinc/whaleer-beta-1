"use client";

import { useState } from "react";
import { IoIosStarOutline, IoMdSearch, IoMdStar } from "react-icons/io";
import useStrategyStore from "@/store/indicator/strategyStore";


const CommunityStrategies = ({ onSelect }) => {
  const { favorites, community } = useStrategyStore();
  const [searchTerm, setSearchTerm] = useState("");

  // sadece allow_scanning true olanları alıyoruz
  const filtered = (community || [])
    .filter((s) => {
      const allowScanning =
        s?.release?.permissions?.allow_scanning ??
        s?.approved_release?.permissions?.allow_scanning ??
        false;
      return allowScanning === true;
    })
    .filter((strategy) =>
      (strategy.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

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
        {filtered.map((strategy) => (
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
                onClick={() => onSelect(strategy)}
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

export default CommunityStrategies;
