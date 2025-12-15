"use client";

import { IoMdStar } from "react-icons/io";
import AddIndicatorButton from "./add_indicator_button";
import useIndicatorStore from "@/store/indicator/indicatorStore"; // Zustand Store'u import et

// GÜNCELLEME: closeModal prop'u eklendi
const FavoriteIndicators = ({ closeModal }) => {
    const { favorites, toggleFavorite } = useIndicatorStore(); // Zustand'dan state çek

    return (
        <div className="text-zinc-200 mt-2">
            {favorites.length === 0 ? (
                <p className="text-zinc-500 ml-52 mt-8">Henüz favori eklenmedi.</p>
            ) : (
                <div className="max-h-[470px] overflow-y-auto space-y-2 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
                    {favorites.map((indicator) => (
                        <div
                            key={indicator.id}
                            className="bg-zinc-950 hover:bg-zinc-900 pl-2 pr-2 flex items-center justify-between w-full h-[40px] p-2"
                        >
                            {/* Kartın sol kısmı */}
                            <div className="flex items-center">
                                <button
                                    className="bg-transparent p-2 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
                                    onClick={() => toggleFavorite(indicator)}
                                >
                                    <IoMdStar className="text-lg text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                                </button>
                                <span className="text-[15px] text-zinc-300">{indicator.name}</span>
                            </div>

                            {/* Kartın sağ kısmı */}
                            <div className="flex gap-2">
                                {/* Göster/Gizle Butonu */}
                                {/* GÜNCELLEME: closeModal prop'u AddIndicatorButton'a aktarılıyor */}
                                <AddIndicatorButton indicatorId={indicator.id} closeModal={closeModal} />
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FavoriteIndicators;