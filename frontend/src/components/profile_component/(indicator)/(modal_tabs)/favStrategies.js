"use client";

import { IoMdStar } from "react-icons/io";
import AddStrategyButton from "./add_strategy_button";
import useStrategyStore from "@/store/indicator/strategyStore"; // Zustand Store'u import et

// GÜNCELLEME: closeModal prop'u eklendi
const FavoriteStrategies = ({ closeModal }) => {
    const { favorites, toggleFavorite } = useStrategyStore(); // Zustand'dan state çek
    
    return (
        <div className="text-white mt-2">
            {favorites.length === 0 ? (
                <p className="text-gray-400 ml-52 mt-8">Henüz favori eklenmedi.</p>
            ) : (
                <div className="max-h-[470px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
                    {favorites.map((strategy) => (
                        <div
                            key={strategy.id}
                            className="bg-gray-900 hover:bg-gray-800 pl-2 pr-2 flex items-center justify-between w-full h-[40px] p-2"
                        >
                            {/* Kartın sol kısmı */}
                            <div className="flex items-center">
                                <button
                                    className="bg-transparent p-2 rounded-md hover:bg-gray-800"
                                    onClick={() => toggleFavorite(strategy)}
                                >
                                    <IoMdStar className="text-lg text-yellow-500" />
                                </button>
                                <span className="text-[15px]">{strategy.name}</span>
                            </div>

                            {/* Kartın sağ kısmı */}
                            <div className="flex gap-2">
                                {/* Göster/Gizle Butonu */}
                                {/* GÜNCELLEME: closeModal prop'u AddStrategyButton'a aktarılıyor */}
                                <AddStrategyButton strategyId={strategy.id} closeModal={closeModal} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FavoriteStrategies;