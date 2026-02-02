"use client";
import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { createPortal } from "react-dom";
import { HiOutlineChartBar } from "react-icons/hi"; // Stratejiler
import { FaHistory, FaRobot, FaTrashRestore, FaClock } from "react-icons/fa"; // Backtests, Botlar
import { useTranslation, Trans } from "react-i18next";
import { MdOutlineCandlestickChart } from "react-icons/md";
import useRecycleBinStore from "@/store/profile/recycleBinStore";

const RecycleBinModal = forwardRef((props, ref) => {
    const { t } = useTranslation("recycleBinModal");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState(1);

    // Confirmation Modal State
    const [itemToRestore, setItemToRestore] = useState(null);

    // Store
    const { deletedItems, fetchDeletedItems, isLoading, restoreItem } = useRecycleBinStore();

    // Fetch data when modal opens
    useEffect(() => {
        if (isModalOpen) {
            fetchDeletedItems();
        }
    }, [isModalOpen]);

    const handleRestoreClick = (item) => {
        setItemToRestore(item);
    };

    const confirmRestore = () => {
        if (itemToRestore) {
            restoreItem(itemToRestore.id);
            setItemToRestore(null);
        }
    };

    // Tabs configuration
    const tabs = [
        { id: 1, name: t("tabs.indicators"), type: "Indicator", icon: <MdOutlineCandlestickChart className="text-[18px]" /> },
        { id: 2, name: t("tabs.strategies"), type: "Strategy", icon: <HiOutlineChartBar className="text-[18px]" /> },
        { id: 3, name: t("tabs.backtests"), type: "Backtest", icon: <FaHistory className="text-[18px]" /> },
        { id: 4, name: t("tabs.bots"), type: "Bot", icon: <FaRobot className="text-[18px]" /> },
    ];

    const renderContent = () => {
        const currentTab = tabs.find(t => t.id === activeTab);
        if (!currentTab) return <p className="text-zinc-500 p-6">Not Found</p>;

        const filteredData = deletedItems.filter(item => item.type === currentTab.type);

        // Sorting: Days left descending (highest to lowest)
        const sortedData = [...filteredData].sort((a, b) => b.daysLeft - a.daysLeft);

        if (isLoading) {
            return <div className="p-6 text-zinc-500 text-sm">{t("loading")}</div>;
        }

        if (sortedData.length === 0) {
            return <div className="p-6 text-zinc-500 text-sm">{t("noItems", { type: currentTab.name })}</div>;
        }

        return (
            <div className="grid gap-1 grid-cols-1">
                {sortedData.map((item) => (
                    <div key={item.id} className="bg-transparent px-4 py-2 rounded-sm flex items-center justify-between hover:bg-zinc-900/40 transition-colors duration-0">
                        <div>
                            <h4 className="text-zinc-200 font-medium">{item.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-zinc-500 mt-1">
                                <FaClock className="text-zinc-600" />
                                <span className="flex items-center gap-1">
                                    <Trans
                                        t={t}
                                        i18nKey="deletion"
                                        values={{ count: item.daysLeft }}
                                        components={{ 1: <span className="text-rose-400 font-medium" /> }}
                                    >
                                        Permanent deletion in <span className="text-rose-400 font-medium px-1">{item.daysLeft} days</span>
                                    </Trans>
                                </span>
                            </div>
                        </div>
                        <button onClick={() => handleRestoreClick(item)} className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition-colors border border-zinc-700">
                            <FaTrashRestore />
                            {t("restore")}
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    useImperativeHandle(ref, () => ({
        openModal: () => setIsModalOpen(true),
        closeModal: () => setIsModalOpen(false)
    }));

    if (!isModalOpen) return null;

    return createPortal(
        <div className="fixed inset-0 flex items-center justify-center bg-black/60 z-50 backdrop-blur-sm">
            <div className="bg-zinc-950 text-zinc-200 rounded-xl w-[800px] h-[600px] shadow-2xl flex flex-col relative border border-zinc-800 overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 h-16 shrink-0">
                    <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                        {t("title")}
                    </h2>
                    <button
                        className="text-zinc-500 hover:text-white text-2xl transition-colors w-8 h-8 flex items-center justify-center rounded-full hover:bg-zinc-800"
                        onClick={() => setIsModalOpen(false)}
                    >
                        &times;
                    </button>
                </div>

                <div className="flex flex-1 min-h-0">
                    {/* Sidebar */}
                    <div className="w-[220px] bg-zinc-900/30 border-r border-zinc-800 flex flex-col p-3 gap-1 overflow-y-auto">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                    ? "bg-zinc-800 text-gray-400 shadow-sm border border-zinc-700"
                                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent"
                                    }`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.icon}
                                {tab.name}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 bg-zinc-950 overflow-y-auto custom-scrollbar">
                        {renderContent()}
                    </div>
                </div>

                {/* Confirmation Modal */}
                {itemToRestore && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-[2px] p-4">
                        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-sm w-full shadow-2xl transform transition-all scale-100 opacity-100">
                            <h3 className="text-lg font-semibold text-white mb-2">{t("confirmModal.title")}</h3>
                            <p className="text-zinc-400 text-sm mb-6">
                                <Trans
                                    t={t}
                                    i18nKey="confirmModal.message"
                                    values={{ item: itemToRestore.title }}
                                    components={{ 1: <strong className="text-zinc-200" /> }}
                                />
                            </p>
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => setItemToRestore(null)}
                                    className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors"
                                >
                                    {t("confirmModal.cancel")}
                                </button>
                                <button
                                    onClick={confirmRestore}
                                    className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-lg shadow-blue-500/20 transition-all"
                                >
                                    {t("confirmModal.confirm")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(113, 113, 122, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(113, 113, 122, 0.5);
        }
      `}</style>
        </div>,
        document.body
    );
});

export default RecycleBinModal;
