"use client";

import { MdOutlinePeopleAlt } from "react-icons/md";
import { FaDice } from "react-icons/fa6";
import { BiBarChartAlt2 } from "react-icons/bi";
import TechnicalStrategies from "./technicalStrategies";
import MyStrategies from "./personalStrategies";
import CommunityStrategy from "./communityStrategies";
import useBotChooseStrategyStore from "@/store/bot/botChooseStrategyStore";

const StrategyButton = () => {
  const { 
    selectedStrategy, 
    isModalOpen, 
    activeTab,
    setIsModalOpen,
    setActiveTab,
    selectStrategyAndCloseModal
  } = useBotChooseStrategyStore();

  setActiveTab("Technicals");

  const tabs = [
    { name: "Technicals", icon: <BiBarChartAlt2 className="text-[19px]" /> },
    { name: "My Strategies", icon: <FaDice className="text-[19px]" /> },
    { name: "Community", icon: <MdOutlinePeopleAlt className="text-[18px]" /> },
  ];

  const renderContent = () => {
    const props = { 
      onSelect: (strategy) => {
        selectStrategyAndCloseModal(strategy);
      }
    };
    
    switch (activeTab) {
      case "Technicals":
        return <TechnicalStrategies {...props} />;
      case "My Strategies":
        return <MyStrategies {...props} />;
      case "Community":
        return <CommunityStrategy {...props} />;
      default:
        return <p className="text-white">No content found.</p>;
    }
  };

  return (
    <>
      <button
        className="bg-gray-800 w-[120px] px-4 py-[10px] rounded text-sm text-white truncate"
        onClick={() => setIsModalOpen(true)}
      >
        {selectedStrategy ? selectedStrategy.name : "Select Strategy"}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 text-white rounded-md w-[800px] h-[584px] shadow-lg flex flex-col relative">

            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 h-16">
              <h2 className="text-lg font-bold">Strategies</h2>
              <button
                className="text-gray-400 hover:text-white text-3xl"
                onClick={() => setIsModalOpen(false)}
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
                  >
                    {tab.icon} {tab.name}
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
