"use client";

import api from "@/api/axios";
import { useMemo, useState, useEffect } from "react";
import { BsPerson } from "react-icons/bs";
import { IoIosStarOutline, IoMdStar } from "react-icons/io";
import { TbChartCandle } from "react-icons/tb";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import useStrategyStore from "@/store/indicator/strategyStore";

/**
 * FullScreenChooseIndicator - Modal for selecting indicators or strategies
 * @param {Object} props
 * @param {boolean} props.isOpen - Modal open state
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onSelect - Selection handler
 * @param {Array} props.existingPanelIds - Already added panel IDs
 * @param {"indicator"|"strategy"} props.type - Type of items to show (default: "indicator")
 */
const FullScreenChooseIndicator = ({ isOpen, onClose, onSelect, existingPanelIds = [], type = "indicator" }) => {
    // Get personal indicators from store
    const { indicators, setPersonalIndicators, favorites: indicatorFavorites } = useIndicatorStore();
    // Get personal strategies from store
    const { strategies, setPersonalStrategies, favorites: strategyFavorites } = useStrategyStore();

    // Active tab state - for switching between indicators and strategies
    const [activeTab, setActiveTab] = useState(type);

    // Version selection state
    const [selectedByGroup, setSelectedByGroup] = useState({});

    // Get favorites based on active tab
    const favorites = activeTab === "strategy" ? (strategyFavorites || []) : (indicatorFavorites || []);

    // Group items by parent (works for both indicators and strategies)
    const groups = useMemo(() => {
        const items = activeTab === "strategy" ? (strategies || []) : (indicators || []);
        const parentKey = activeTab === "strategy" ? "parent_strategy_id" : "parent_indicator_id";

        const map = new Map();
        for (const item of items) {
            if (!item) continue;
            const groupId = item[parentKey] || item.id;
            if (!map.has(groupId)) map.set(groupId, []);
            map.get(groupId).push(item);
        }
        for (const [g, list] of map.entries()) {
            list.sort((a, b) => (a.version || 1) - (b.version || 1));
            map.set(g, list);
        }
        return map;
    }, [indicators, strategies, activeTab]);

    const ensureSelected = (groupId, versions) => {
        const current = selectedByGroup[groupId];
        if (current && versions.some(v => v.id === current)) return current;
        const last = versions[versions.length - 1];
        setSelectedByGroup((s) => ({ ...s, [groupId]: last.id }));
        return last.id;
    };

    // Update activeTab when type prop changes
    useEffect(() => {
        setActiveTab(type);
    }, [type]);

    // Fetch data if missing from store (lazy load)
    useEffect(() => {
        const fetchData = async () => {
            // Fetch Indicators if needed
            if (activeTab === "indicator" && (!indicators || indicators.length === 0)) {
                try {
                    const response = await api.get("/all-indicators/");
                    const personal = response.data.personal_indicators || [];
                    setPersonalIndicators(personal);
                } catch (err) {
                    console.error("Failed to fetch indicators", err);
                }
            }
            // Fetch Strategies if needed
            else if (activeTab === "strategy" && (!strategies || strategies.length === 0)) {
                try {
                    const response = await api.get("/all-strategies/");
                    const personal = response.data.personal_strategies || [];
                    setPersonalStrategies(personal);
                } catch (err) {
                    console.error("Failed to fetch strategies", err);
                }
            }
        };

        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab]);

    if (!isOpen) return null;

    const title = "Gösterge Seç";
    const emptyMessage = activeTab === "strategy"
        ? "Kişisel strateji bulunamadı."
        : "Kişisel indikatör bulunamadı.";

    return (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-[60] backdrop-blur-sm">
            <div className="bg-zinc-950 text-zinc-200 rounded-md w-[800px] h-[584px] shadow-lg flex flex-col relative border border-zinc-800">

                {/* Modal Başlık Kısmı */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 h-16 bg-zinc-900/50">
                    <h2 className="text-lg font-bold text-zinc-100">{title}</h2>
                    <button
                        className="text-zinc-500 hover:text-white text-3xl transition-colors"
                        onClick={onClose}
                    >
                        &times;
                    </button>
                </div>

                <div className="flex flex-grow">
                    {/* Sol Panel (Kişisel İndikatörler ve Stratejiler) */}
                    <div className="w-[200px] bg-zinc-900 pt-3 flex flex-col gap-2 border-r border-zinc-800">
                        {/* Kişisel İndikatörler Butonu */}
                        <button
                            className={`flex items-center gap-2 py-2 px-4 text-left transition-all rounded-3xl shadow-sm ${activeTab === "indicator"
                                ? "bg-gradient-to-r from-[hsl(180,81%,19%)] to-[hsl(215,22%,56%)] text-white"
                                : "bg-zinc-900 text-zinc-400"
                                }`}
                            onClick={() => setActiveTab("indicator")}
                        >
                            <BsPerson className="text-[18px]" /> İndikatörler
                        </button>

                        {/* Kişisel Stratejiler Butonu */}
                        <button
                            className={`flex items-center gap-2 py-2 px-4 text-left transition-all rounded-3xl shadow-sm ${activeTab === "strategy"
                                ? "bg-gradient-to-r from-[hsl(280,81%,25%)] to-[hsl(320,50%,45%)] text-white"
                                : "bg-zinc-900 text-zinc-400"
                                }`}
                            onClick={() => setActiveTab("strategy")}
                        >
                            <TbChartCandle className="text-[18px]" /> Stratejiler
                        </button>
                    </div>

                    {/* Sağ Panel */}
                    <div className="flex-1 flex flex-col bg-zinc-950">
                        {/* İçerik */}
                        <div className="flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900 pt-2">
                            {groups.size === 0 ? (
                                <p className="text-zinc-500 text-center py-8">{emptyMessage}</p>
                            ) : (
                                Array.from(groups.entries()).map(([groupId, versions]) => {
                                    const selectedId = ensureSelected(groupId, versions);
                                    const selected = versions.find(v => v.id === selectedId) || versions[versions.length - 1];
                                    const isAlreadyAdded = existingPanelIds.includes(selected.id);

                                    return (
                                        <div
                                            key={`${activeTab}-${groupId}`}
                                            className="bg-zinc-950 hover:bg-zinc-900 flex items-center justify-between w-full h-[40px] mb-2"
                                        >
                                            <div className="flex items-center pl-2 gap-2">
                                                <button
                                                    className="bg-transparent cursor-default p-2 rounded-md text-zinc-400 transition-colors"
                                                >
                                                    {favorites.some((fav) => fav.id === selected.id) ? (
                                                        <IoMdStar className="text-lg text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                                                    ) : (
                                                        <IoIosStarOutline className="text-lg" />
                                                    )}
                                                </button>

                                                <span className="text-[15px] text-zinc-300">{selected.name}</span>

                                                {versions.length > 1 && (
                                                    <select
                                                        className="ml-2 bg-zinc-900 text-zinc-300 text-sm px-2 py-1 rounded border border-zinc-700 focus:outline-none"
                                                        value={selectedId}
                                                        onChange={(e) =>
                                                            setSelectedByGroup((s) => ({ ...s, [groupId]: Number(e.target.value) }))
                                                        }
                                                    >
                                                        {versions.map(v => (
                                                            <option key={v.id} value={v.id}>{`v${v.version}`}</option>
                                                        ))}
                                                    </select>
                                                )}

                                                {isAlreadyAdded && (
                                                    <span className="text-xs text-zinc-500 ml-2">Zaten eklendi</span>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-2 pr-4">
                                                <button
                                                    className={`px-2 py-0.5 rounded-md text-[12px] font-medium transition-all ${isAlreadyAdded
                                                        ? 'bg-zinc-700 text-zinc-500 cursor-not-allowed'
                                                        : activeTab === "strategy"
                                                            ? 'bg-purple-800 hover:bg-purple-600 text-white'
                                                            : 'bg-emerald-800 hover:bg-emerald-600 text-white'
                                                        }`}
                                                    onClick={() => !isAlreadyAdded && onSelect(selected, activeTab)}
                                                    disabled={isAlreadyAdded}
                                                >
                                                    {isAlreadyAdded ? 'Eklendi' : 'Seç'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FullScreenChooseIndicator;
