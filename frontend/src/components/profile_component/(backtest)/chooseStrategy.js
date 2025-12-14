import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { MdOutlinePeopleAlt } from "react-icons/md";
import { FaDice } from "react-icons/fa6";
import { BiBarChartAlt2 } from "react-icons/bi";
import TechnicalStrategies from "./technicalStrategies";
import MyStrategies from "./personalStrategies";
import CommunityStrategy from "./communityStrategies";
import useStrategyStore from "@/store/backtest/backtestStore";
import { useTranslation } from "react-i18next";

const StrategyButton = () => {
  const { t } = useTranslation("backtestStrategyButton");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("Technicals");
  const [mounted, setMounted] = useState(false);

  const { selectedStrategy, setSelectedStrategy } = useStrategyStore();

  useEffect(() => {
    setMounted(true);
  }, []);

  // name alanı state/logic için İngilizce sabit, label ise i18n metni
  const tabs = [
    { name: "Technicals", label: t("tabs.technicals"), icon: <BiBarChartAlt2 className="text-[19px]" /> },
    { name: "My Strategies", label: t("tabs.my"), icon: <FaDice className="text-[19px]" /> },
    { name: "Community", label: t("tabs.community"), icon: <MdOutlinePeopleAlt className="text-[18px]" /> },
  ];

  const renderContent = () => {
    const props = {
      onSelect: (strategy) => {
        setSelectedStrategy(strategy);
        setIsModalOpen(false); // seçtikten sonra kapat
      },
    };

    switch (activeTab) {
      case "Technicals":
        return <TechnicalStrategies {...props} />;
      case "My Strategies":
        return <MyStrategies {...props} />;
      case "Community":
        return <CommunityStrategy {...props} />;
      default:
        return <p className="text-zinc-500 p-6">{t("misc.noContent")}</p>;
    }
  };

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 backdrop-blur-sm">
      <div className="bg-zinc-950 text-zinc-200 rounded-md w-[800px] h-[584px] shadow-lg flex flex-col relative border border-zinc-800">
        <div className="flex justify-between items-center px-6 py-4 border-b border-zinc-800 h-16 bg-zinc-900/50">
          <h2 className="text-lg font-bold text-zinc-100">{t("titles.strategies")}</h2>
          <button
            className="text-zinc-500 hover:text-white text-3xl transition-colors"
            onClick={() => setIsModalOpen(false)}
            aria-label={t("buttons.close")}
            title={t("buttons.close")}
          >
            &times;
          </button>
        </div>

        <div className="flex flex-grow">
          <div className="w-[200px] bg-zinc-900 pt-3 flex flex-col gap-2 border-r border-zinc-800">
            {tabs.map((tab) => (
              <button
                key={tab.name}
                className={`flex items-center gap-2 py-2 px-4 text-left transition-all ${activeTab === tab.name
                    ? "bg-gradient-to-r from-[#4c2164] to-[#44197e] text-white px-4 rounded-3xl py-2 hover:bg-[rgba(15,19,73,0.76)] shadow-sm"
                    : "hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                  }`}
                onClick={() => setActiveTab(tab.name)}
                aria-label={tab.label}
                title={tab.label}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col bg-zinc-950">
            <div className="flex-grow scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">{renderContent()}</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        className="bg-zinc-900 px-4 py-2 rounded hover:bg-zinc-800 transition border border-zinc-700/50 text-zinc-200"
        onClick={() => setIsModalOpen(true)}
        aria-label={t("buttons.chooseStrategy")}
        title={t("buttons.chooseStrategy")}
      >
        {selectedStrategy ? selectedStrategy.name : t("buttons.chooseStrategy")}
      </button>

      {mounted && isModalOpen && createPortal(modalContent, document.body)}
    </>
  );
};

export default StrategyButton;
