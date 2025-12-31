"use client";

import { useEffect, useState } from "react";
import { IoIosCode, IoIosStarOutline, IoMdSearch, IoMdStar } from "react-icons/io";
import AddStrategyButton from "./add_strategy_button";
import useStrategyStore from "@/store/indicator/strategyStore";
import CodeModal from "./CodeModal";
import axios from "axios";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

axios.defaults.withCredentials = true;

// GÜNCELLEME: closeModal prop'u eklendi
const TechnicalStrategies = ({ locale, closeModal }) => {
  const { t } = useTranslation("indicator");
  const {
    favorites,
    toggleFavorite,
    setTecnicStrategies,
    setPersonalStrategies,
    setCommunityStrategies,
    tecnic
  } = useStrategyStore();
  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIndicator, setSelectedIndicator] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (tecnic.length > 0) return;

    const fetchStrategies = async () => {
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/all-strategies/`);
        const tecnic_strategies = response.data.tecnic_strategies || [];
        const personal_strategies = response.data.personal_strategies || [];
        const public_strategies = response.data.public_strategies || [];

        setTecnicStrategies(tecnic_strategies);
        setPersonalStrategies(personal_strategies);
        setCommunityStrategies(public_strategies);
      } catch (error) {
        console.error("Veri çekme hatası:", error);
      }
    };

    fetchStrategies();
  }, [tecnic.length]);

  const handleToggleFavorite = async (strategy) => {
    const isAlreadyFavorite = favorites.some((fav) => fav.id === strategy.id);
    toggleFavorite(strategy);

    try {
      if (isAlreadyFavorite) {
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/strategy-remove-favourite/`, {
          data: { strategy_id: strategy.id }
        });
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/strategy-add-favorite/`, {
          strategy_id: strategy.id
        });
      }
    } catch (error) {
      console.error("Favori işlemi sırasında hata oluştu:", error);
    }
  };

  const openCodeModal = (strategy) => {
    setSelectedIndicator(strategy);
    setIsModalOpen(true);
  };

  return (
    <div className="text-zinc-200">
      <div className="bg-zinc-900 flex items-center border-b border-zinc-800 mb-2">
        <input
          type="text"
          placeholder={t("search")}
          className="w-full px-3 py-2 bg-zinc-900 text-zinc-200 focus:outline-none placeholder:text-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <IoMdSearch className="text-zinc-500 text-[20px] mr-2" />
      </div>

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
              <div className="flex items-center">
                <button
                  className="bg-transparent p-2 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
                  onClick={() => handleToggleFavorite(strategy)}
                >
                  {favorites.some((fav) => fav.id === strategy.id) ? (
                    <IoMdStar className="text-lg text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                  ) : (
                    <IoIosStarOutline className="text-lg" />
                  )}
                </button>
                <span className="text-[14px] text-zinc-300">{strategy.name}</span>
              </div>

              <div className="flex gap-2">
                {/* GÜNCELLEME: closeModal prop'u AddStrategyButton'a aktarılıyor */}
                <AddStrategyButton strategyId={strategy.id} closeModal={closeModal} />
                <button
                  className="bg-transparent p-2 rounded-md transition-colors"
                  onClick={() => openCodeModal(strategy)}
                >
                  <IoIosCode className="text-fuchsia-700 hover:text-fuchsia-500 text-2xl cursor-pointer" />
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

export default TechnicalStrategies;