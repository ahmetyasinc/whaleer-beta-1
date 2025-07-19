"use client";

import { useState } from "react";
import { IoMdSettings } from "react-icons/io";
import { LuRuler } from "react-icons/lu";
import { BiSolidMagnet } from "react-icons/bi";
import CryptoSelectButton from "./(header_element)/cryptoSelectButton"; // Kripto seçim butonu
import PeriodDropdown from "./(header_element)/periodDropdown"; // Periyot dropdown
import IndicatorsModalButton from "./(header_element)/indcModalButton"; // Göstergeler butonu
import StrategyButton from "./(header_element)/strategyModalButton"; // Stratejilerim butonu
import useMagnetStore from "@/store/indicator/magnetStore";
import useRulerStore from "@/store/indicator/rulerStore"; // Cetvel store'u import et
import usePanelStore from "@/store/indicator/panelStore"; // panelStore'u kullanacağız



const IndicatorHeader = () => {
  const [selectedOption, setSelectedOption] = useState("Periyot");
  const [activeButton, setActiveButton] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const { isMagnetMode, toggleMagnetMode } = useMagnetStore();
  const { isRulerMode, toggleRulerMode } = useRulerStore();
  //const { isChatBoxVisible, toggleChatBoxVisibility } = usePanelStore();

 /* const isActiveB = () => {
    setActiveButton(prev => !prev); // aktiflik durumunu değiştir
    // Diğer chat box aç/kapat işlemlerin varsa buraya ekleyebilirsin
  };*/

  return (
    <div className="w-full bg-black shadow-md flex justify-between items-center py-3 fixed top-0 left-0 right-0 z-50 h-[61px] pl-16">
      
      {/* Butonlar ve Dropdown Grubu */}
      <div className="flex gap-2 items-center w-full">

      {/* Kripto Seçim Butonu */}
      <CryptoSelectButton selectedCrypto={selectedCrypto} setSelectedCrypto={setSelectedCrypto} />
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

      {/* Periyot Seçimi */}
      <PeriodDropdown selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

      {/* Göstergeler Butonu */}
      <IndicatorsModalButton />
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

      {/* Stratejilerim Butonu */}
      <StrategyButton />
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

      {/* Magnet Butonu */}
      <button
        onClick={toggleMagnetMode}
        className={`mr-[2px] flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 text-[22px] 
          ${isMagnetMode ? "scale-95 border bg-black " : "text-white bg-gray-950 hover:bg-gray-900"}`}
      >
        <BiSolidMagnet 
          className={`transition-all duration-150 
            ${isMagnetMode ? "text-blue-300 text-[20px]" : "text-white"}`} 
        />
      </button>
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

      {/* Cetvel Butonu */}
      <button 
        onClick={toggleRulerMode}
        className={`flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 
          ${isRulerMode ? "bg-blue-500 text-white" : "bg-gray-950 hover:bg-gray-900 text-white"} text-[23px]`}
      >
        <LuRuler />
      </button>

      {/*<div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>
      <button 
        onClick={() => {
          toggleChatBoxVisibility();
          isActiveB();
        }}
        className={`flex items-center justify-center w-[140px] h-[40px] rounded-md transition-all duration-100 text-white 
           ${activeButton ? 'scale-95 border' : 'bg-gray-950 hover:bg-gray-900'} 
          `}
      >
        <GiSpermWhale className="mr-[14px] text-[22px]" />
        whaleerAI
      </button>
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>*/}

      {/* Ayarlar Butonu */}
      <button className="ml-auto mr-2 flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 bg-gray-950 hover:bg-gray-900 text-[24px]">
        <IoMdSettings className="text-white hover:text-blue-950"/>
      </button>
    </div>
  </div>

  );
};

export default IndicatorHeader;
