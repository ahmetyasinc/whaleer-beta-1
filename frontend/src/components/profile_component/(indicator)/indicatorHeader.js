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
import i18n from "@/i18n";
import { useEffect } from "react";


const IndicatorHeader = ({locale}) => {
  const [selectedOption, setSelectedOption] = useState("Periyot");
  const [selectedCrypto, setSelectedCrypto] = useState("");
  const { isMagnetMode, toggleMagnetMode } = useMagnetStore();
  const { isRulerMode, toggleRulerMode } = useRulerStore();

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);


  return (
    <div className="w-full bg-black shadow-md flex justify-between items-center py-3 fixed top-0 left-0 right-0 z-50 h-[61px] pl-16">
      
      {/* Butonlar ve Dropdown Grubu */}
      <div className="flex gap-2 items-center w-full">

      {/* Kripto Seçim Butonu */}
      <CryptoSelectButton locale={locale} selectedCrypto={selectedCrypto} setSelectedCrypto={setSelectedCrypto} />
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

      {/* Periyot Seçimi */}
      <PeriodDropdown locale={locale} selectedOption={selectedOption} setSelectedOption={setSelectedOption} />
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

      {/* Göstergeler Butonu */}
      <IndicatorsModalButton locale={locale} />
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

      {/* Stratejilerim Butonu */}
      <StrategyButton locale={locale}/>
      <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

      {/* Magnet Butonu */}
      <button
        onClick={toggleMagnetMode}
        className={`mr-[2px] flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 text-[22px] 
          ${isMagnetMode ? "scale-95 border bg-black " : "bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200"}`}
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
          ${isRulerMode ? "bg-gray-950 border-2 border-cyan-700 text-white" : "bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200"} text-[23px]`}
      >
        <LuRuler />
      </button>

      {/* Ayarlar Butonu */}
      <button className="ml-auto mr-2 flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 bg-gray-950 hover:bg-gray-900 text-[24px]">
        <IoMdSettings className="text-white hover:text-blue-950"/>
      </button>
    </div>
  </div>

  );
};

export default IndicatorHeader;
