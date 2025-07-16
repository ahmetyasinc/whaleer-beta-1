"use client";

import { MdOutlinePeopleAlt } from "react-icons/md";
import { FaDice } from "react-icons/fa6";
import { BiBarChartAlt2 } from "react-icons/bi";
import TechnicalStrategies from "./technicalStrategies";
import MyStrategies from "./personalStrategies";
import CommunityStrategy from "./communityStrategies";
import useSiftChooseStrategyStore from "@/store/sift/siftChooseStrategyStore";
import useStrategyStore from '@/store/indicator/strategyStore';

const StrategyButton = ({ onStrategySelect, selectedStrategy }) => {
  const { 
    isModalOpen, 
    activeTab,
    setIsModalOpen,
    setActiveTab,
  } = useSiftChooseStrategyStore();

  // Get all strategies to find the selected one by ID
  const { strategies } = useStrategyStore();
  
  // Find the selected strategy object by ID
  const selectedStrategyObj = strategies.find(s => s.id === selectedStrategy);

  const tabs = [
    { name: "Teknikler", icon: <BiBarChartAlt2 className="text-[19px]" /> },
    { name: "Stratejilerim", icon: <FaDice className="text-[19px]" /> },
    { name: "Topluluk", icon: <MdOutlinePeopleAlt className="text-[18px]" /> },
  ];

  const handleStrategySelect = (strategy) => {
    // Call the parent's onStrategySelect with the strategy ID
    onStrategySelect(strategy.id);
    setIsModalOpen(false);
  };

  const renderContent = () => {
    const props = { 
      onSelect: handleStrategySelect
    };
    
    switch (activeTab) {
      case "Teknikler":
        return <TechnicalStrategies {...props} />;
      case "Stratejilerim":
        return <MyStrategies {...props} />;
      case "Topluluk":
        return <CommunityStrategy {...props} />;
      default:
        return <p className="text-white">İçerik bulunamadı.</p>;
    }
  };

  return (
    <>
      <button
        className="w-full p-[6px] right-1 rounded bg-zinc-800 text-white border-1 border-zinc-500 text-sm"
        onClick={() => setIsModalOpen(true)}
      >
        {selectedStrategyObj ? selectedStrategyObj.name : "Strateji Seçin"}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-gray-900 text-white rounded-md w-[800px] h-[584px] shadow-lg flex flex-col relative">

            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-700 h-16">
              <h2 className="text-lg font-bold">Stratejiler</h2>
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