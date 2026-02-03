"use client";

import { useEffect, useState } from "react";
import { IoIosStarOutline, IoMdSearch, IoMdStar } from "react-icons/io";
import useStrategyStore from "@/store/indicator/strategyStore";
import api from "@/api/axios";
import { useTranslation } from "react-i18next";


const TechnicalStrategies = ({ onSelect }) => {
  const { t } = useTranslation("backtestTechnicalStrategies");

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
        const response = await api.get("/all-strategies/");
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
  }, [tecnic.length, setTecnicStrategies, setPersonalStrategies, setCommunityStrategies]);

  return (
    <div className="text-zinc-200">
      {/* Arama Çubuğu */}
      <div className="bg-zinc-900 flex items-center border-b border-zinc-800 mb-2">
        <input
          type="text"
          placeholder={t("searchPlaceholder")}
          className="w-full px-3 py-2 bg-zinc-900 text-zinc-200 focus:outline-none placeholder:text-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label={t("searchPlaceholder")}
        />
        <IoMdSearch className="text-zinc-500 text-[20px] mr-2" />
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2 w-full mt-2 max-h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
        {tecnic
          .filter((strategy) =>
            strategy.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((strategy) => (
            <div
              key={strategy.id}
              className="bg-zinc-950 hover:bg-zinc-900 pl-1 pr-2 flex items-center justify-between w-full h-[40px]"
            >
              {/* Sol */}
              <div className="flex items-center">
                <div className="bg-transparent p-2 rounded-md">
                  {favorites.some((fav) => fav.id === strategy.id) ? (
                    <IoMdStar className="text-lg text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                  ) : (
                    <IoIosStarOutline className="text-lg text-zinc-600" />
                  )}
                </div>
                <span className="text-[14px] text-zinc-300">{strategy.name}</span>
              </div>

              {/* Sağ */}
              <div className="flex gap-2">
                <button
                  onClick={() => onSelect(strategy)}
                  className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 rounded-md py-[1px] h-[26px] mr-3 hover:bg-blue-600 hover:text-white hover:border-blue-500 text-xs transition-all shadow-sm"
                  aria-label={t("choose")}
                  title={t("choose")}
                >
                  {t("choose")}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default TechnicalStrategies;
