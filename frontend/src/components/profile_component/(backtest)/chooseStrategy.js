"use client";

import { useState } from "react";
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

  const { selectedStrategy, setSelectedStrategy } = useStrategyStore();

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
        return <p className="text-white">{t("misc.noContent")}</p>;
    }
  };

  return (
    <>
      <button
        className="bg-gray-800 px-4 py-2 rounded hover:bg-gray-700 transition"
        onClick={() => setIsModalOpen(true)}
        aria-label={t("buttons.chooseStrategy")}
        title={t("buttons.chooseStrategy")}
      >
        {selectedStrategy ? selectedStrategy.name : t("buttons.chooseStrategy")}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 text-white rounded-md w-[800px] h-[584px] shadow-lg flex flex-col relative">
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 h-16">
              <h2 className="text-lg font-bold">{t("titles.strategies")}</h2>
              <button
                className="text-gray-400 hover:text-white text-3xl"
                onClick={() => setIsModalOpen(false)}
                aria-label={t("buttons.close")}
                title={t("buttons.close")}
              >
                &times;
              </button>
            </div>

            <div className="flex flex-grow">
              <div className="w-[200px] bg-gray-800 pt-3 flex flex-col gap-2 border-r border-gray-700">
                {tabs.map((tab) => (
                  <button
                    key={tab.name}
                    className={`flex items-center gap-2 py-2 px-4 text-left transition-all ${
                      activeTab === tab.name
                        ? "bg-gradient-to-r from-[#4c2164] to-[#44197e] text-white px-4 rounded-3xl py-2 hover:bg-[rgba(15,19,73,0.76)]"
                        : "hover:bg-gray-700"
                    }`}
                    onClick={() => setActiveTab(tab.name)}
                    aria-label={tab.label}
                    title={tab.label}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 flex flex-col">
                <div className="flex-grow">{renderContent()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StrategyButton;
