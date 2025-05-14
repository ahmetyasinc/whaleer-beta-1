"use client";

import { useEffect, useState } from "react";
import { IoIosCode, IoIosStarOutline, IoMdSearch, IoMdStar } from "react-icons/io";
import AddStrategyButton from "./add_strategy_button";
import useStrategyStore from "@/store/indicator/strategyStore"; // Zustand Store'u import et
import CodeModal from "./CodeModal";
import axios from "axios";

axios.defaults.withCredentials = true; // Tüm axios isteklerinde cookie'yi göndermeyi etkinleştir

const TechnicalStrategies = () => {
    const { favorites, toggleFavorite, setTecnicStrategies, setPersonalStrategies, setCommunityStrategies, tecnic } = useStrategyStore();
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStrategy, setSelectedStrategy] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);    

    // API'den veri çekme fonksiyonu
    useEffect(() => {
        if (tecnic.length > 0) return; // Eğer daha önce veri çekildiyse tekrar çekme

        const fetchStrategies = async () => {
            try {
                const response = await axios.get("http://localhost:8000/api/all-strategies/");
                console.log(response.data)
                
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

    // Favori ekleme/kaldırma fonksiyonu
    const handleToggleFavorite = async (strategy) => {
        const isAlreadyFavorite = favorites.some((fav) => fav.id === strategy.id);
        toggleFavorite(strategy);
        
        try {
            if (isAlreadyFavorite) {
                await axios.delete("http://localhost:8000/api/strategy-remove-favourite/", {
                    data: { strategy_id: strategy.id }
                });                
            } else {
                await axios.post("http://localhost:8000/api/strategy-add-favorite/", {
                    strategy_id: strategy.id
                });
            }
        } catch (error) {
            console.error("Favori işlemi sırasında hata oluştu:", error);
        }
    };

    // Kod Modalını Açma Fonksiyonu
    const openCodeModal = (strategy) => {
        setSelectedStrategy(strategy);
        setIsModalOpen(true);
    };


    return (
        <div className="text-white">
            {/* Arama Çubuğu */}
            <div className="bg-gray-800 flex items-center border-b border-gray-800 mb-2">
                <input
                    type="text"
                    placeholder="Ara..."
                    className="w-full px-3 py-2 bg-gray-800 text-white focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <IoMdSearch className="text-gray-400 text-[20px] mr-2" />
            </div>

            {/* İndikatör Listesi */}
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
                            {/* Kartın sol kısmı */}
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

                            {/* Kartın sağ kısmı */}
                            <div className="flex gap-2">
                                {/* Göster/Gizle Butonu */}
                                <AddStrategyButton strategyId={strategy.id} />

                                {/* Kod Butonu */}
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
            <CodeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} strategy={selectedStrategy} />
        </div>
    );
};

export default TechnicalStrategies;