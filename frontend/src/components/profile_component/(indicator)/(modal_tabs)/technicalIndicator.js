"use client";

import { useEffect, useState } from "react";
import { IoIosCode, IoIosStarOutline, IoMdSearch, IoMdStar } from "react-icons/io";
import AddIndicatorButton from "./add_indicator_button";
import useIndicatorStore from "@/store/indicator/indicatorStore"; // Zustand Store'u import et
import CodeModal from "./CodeModal";
import axios from "axios";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";

axios.defaults.withCredentials = true; // Tüm axios isteklerinde cookie'yi göndermeyi etkinleştir

// GÜNCELLEME: closeModal prop'u eklendi
const TechnicalIndicators = ({ locale, closeModal }) => {
    const { t } = useTranslation("indicator");

    const { favorites, toggleFavorite, setTecnicIndicators, setPersonalIndicators, setCommunityIndicators, tecnic } = useIndicatorStore();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedIndicator, setSelectedIndicator] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (locale && i18n.language !== locale) {
            i18n.changeLanguage(locale);
        }
    }, [locale]);


    // API'den veri çekme fonksiyonu
    useEffect(() => {
        if (tecnic.length > 0) return; // Eğer daha önce veri çekildiyse tekrar çekme

        const fetchIndicators = async () => {
            try {
                const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/all-indicators/`);

                const tecnic_indicators = response.data.tecnic_indicators || [];
                setTecnicIndicators(tecnic_indicators);

                const personal_indicators = response.data.personal_indicators || [];
                setPersonalIndicators(personal_indicators);

                const public_indicators = response.data.public_indicators || [];
                setCommunityIndicators(public_indicators);

            } catch (error) {
                console.error("Veri çekme hatası:", error);
            }
        };

        fetchIndicators();
    }, [tecnic.length, setTecnicIndicators]);

    // Favori ekleme/kaldırma fonksiyonu
    const handleToggleFavorite = async (indicator) => {
        const isAlreadyFavorite = favorites.some((fav) => fav.id === indicator.id);
        toggleFavorite(indicator);

        try {
            if (isAlreadyFavorite) {
                await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/indicator-remove-favourite/`, {
                    data: { indicator_id: indicator.id }
                });
            } else {
                await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/indicator-add-favorite/`, {
                    indicator_id: indicator.id
                });
            }
        } catch (error) {
            console.error("Favori işlemi sırasında hata oluştu:", error);
        }
    };

    // Kod Modalını Açma Fonksiyonu
    const openCodeModal = (indicator) => {
        setSelectedIndicator(indicator);
        setIsModalOpen(true);
    };


    return (
        <div className="text-zinc-200">
            {/* Arama Çubuğu */}
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

            {/* İndikatör Listesi */}
            <div className="flex flex-col gap-2 w-full mt-2 max-h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                {tecnic
                    .filter((indicator) =>
                        indicator.name.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((indicator) => (
                        <div
                            key={indicator.id}
                            className="bg-zinc-950 hover:bg-zinc-900 pl-1 pr-2 flex items-center justify-between w-full h-[40px]"
                        >
                            {/* Kartın sol kısmı */}
                            <div className="flex items-center">
                                <button
                                    className="bg-transparent p-2 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
                                    onClick={() => handleToggleFavorite(indicator)}
                                >
                                    {favorites.some((fav) => fav.id === indicator.id) ? (
                                        <IoMdStar className="text-lg text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                                    ) : (
                                        <IoIosStarOutline className="text-lg" />
                                    )}
                                </button>
                                <span className="text-[14px] text-zinc-300">{indicator.name}</span>
                            </div>

                            {/* Kartın sağ kısmı */}
                            <div className="flex gap-2">
                                {/* Göster/Gizle Butonu */}
                                {/* GÜNCELLEME: closeModal prop'u AddIndicatorButton'a aktarılıyor */}
                                <AddIndicatorButton indicatorId={indicator.id} closeModal={closeModal} />

                                {/* Kod Butonu */}
                                <button
                                    className="bg-transparent p-2 rounded-md transition-colors"
                                    onClick={() => openCodeModal(indicator)}
                                >
                                    <IoIosCode className="text-fuchsia-700 hover:text-fuchsia-500 text-2xl cursor-pointer" />
                                </button>
                            </div>
                        </div>
                    ))}
            </div>

            {/* Kod Modalı */}
            <CodeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} indicator={selectedIndicator} />
        </div>
    );
};

export default TechnicalIndicators;