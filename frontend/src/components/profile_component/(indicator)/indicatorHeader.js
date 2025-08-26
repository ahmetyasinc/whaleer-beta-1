"use client";

import { useState, useEffect } from "react";
import { IoMdSettings, IoMdRefresh } from "react-icons/io";
import { LuRuler } from "react-icons/lu";
import { BiSolidMagnet } from "react-icons/bi";
import CryptoSelectButton from "./(header_element)/cryptoSelectButton";
import PeriodDropdown from "./(header_element)/periodDropdown";
import IndicatorsModalButton from "./(header_element)/indcModalButton";
import StrategyButton from "./(header_element)/strategyModalButton";
import useMagnetStore from "@/store/indicator/magnetStore";
import useRulerStore from "@/store/indicator/rulerStore";
import useCodePanelStore from "@/store/indicator/indicatorCodePanelStore";
import useStrategyCodePanelStore from "@/store/indicator/strategyCodePanelStore";
import usePanelStore from "@/store/indicator/panelStore"; // ← EKLENDİ
import i18n from "@/i18n";

const IndicatorHeader = ({ locale }) => {
  const { openPanel: openIndicatorPanel } = useCodePanelStore();
  const { openPanel: openStrategyPanel } = useStrategyCodePanelStore();

  const [selectedOption, setSelectedOption] = useState("Periyot");
  const [selectedCrypto, setSelectedCrypto] = useState("");

  const { isMagnetMode, toggleMagnetMode } = useMagnetStore();
  const { isRulerMode, toggleRulerMode } = useRulerStore();

  const { setEnd } = usePanelStore(); // ← EKLENDİ
  const [isRefreshing, setIsRefreshing] = useState(false); // ← YÜKLEME DURUMU

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  // Refresh handler: end’i güncelle → StockChart yeniden fetch edecek
  const handleRefresh = () => {
    if (isRefreshing) return; // Çift tıklamaya karşı koruma
    setIsRefreshing(true);
    const iso = new Date().toISOString().slice(0, 19);
    setEnd(iso);

    // 1 sn'lik “yükleniyor” animasyonu
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  };

  return (
    <div className="w-full bg-black shadow-md flex justify-between items-center py-3 fixed top-0 left-0 right-0 z-50 h-[61px] pl-16">
      {/* Butonlar ve Dropdown Grubu */}
      <div className="flex gap-2 items-center w-full">
        {/* Kripto Seçim Butonu */}
        <CryptoSelectButton
          locale={locale}
          selectedCrypto={selectedCrypto}
          setSelectedCrypto={setSelectedCrypto}
        />
        <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

        {/* Periyot Seçimi */}
        <PeriodDropdown
          locale={locale}
          selectedOption={selectedOption}
          setSelectedOption={setSelectedOption}
        />
        <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

        {/* Göstergeler Butonu + Hızlı Ekle */}
        <div className="flex items-center gap-1">
          <IndicatorsModalButton locale={locale} />
          <button
            onClick={() => openIndicatorPanel()}
            className="flex items-center justify-center w-[40px] h-[40px] rounded-md bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200 text-xl"
            aria-label="Yeni indikatör ekle"
            title="Yeni indikatör ekle"
          >
            +
          </button>
        </div>
        <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

        {/* Stratejilerim Butonu + Hızlı Ekle */}
        <div className="flex items-center gap-1">
          <StrategyButton locale={locale} />
          <button
            onClick={() => openStrategyPanel()}
            className="flex items-center justify-center w-[40px] h-[40px] rounded-md bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200 text-xl"
            aria-label="Yeni strateji ekle"
            title="Yeni strateji ekle"
          >
            +
          </button>
        </div>
        <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

        {/* Magnet Butonu */}
        <button
          onClick={toggleMagnetMode}
          className={`mr-[2px] flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 text-[22px] 
            ${isMagnetMode ? "scale-95 border bg-black " : "bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200"}`}
          aria-label="Mıknatıs modu"
          title="Mıknatıs modu"
        >
          <BiSolidMagnet
            className={`transition-all duration-150 ${isMagnetMode ? "text-blue-300 text-[20px]" : "text-white"}`}
          />
        </button>
        <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

        {/* Cetvel Butonu */}
        <button
          onClick={toggleRulerMode}
          className={`flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 
            ${isRulerMode ? "bg-gray-950 border-2 border-cyan-700 text-white" : "bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200"} text-[23px]`}
          aria-label="Cetvel"
          title="Cetvel"
        >
          <LuRuler />
        </button>

        <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

        {/* Refresh Butonu */}
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={`mr-2 flex items-center justify-center w-[50px] h-[40px] rounded-md border transition duration-100 text-gray-200 text-[22px]
            ${isRefreshing
              ? "bg-gray-900 border-gray-700 opacity-80 cursor-not-allowed"
              : "bg-black border-gray-800 hover:border-gray-600"}`}
          aria-label="Refresh"
          title={isRefreshing ? "Loading..." : "Refresh"}
        >
          <IoMdRefresh
            className={`text-white ${isRefreshing ? "animate-spin" : ""}`}
            aria-hidden="true"
          />
        </button>

        {/* Sağ tarafa yaslı grup (Refresh + Settings) */}
        <div className="ml-auto flex items-center">
          {/* Ayarlar Butonu */}
          <button
            className="mr-2 flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 bg-gray-950 hover:bg-gray-900 text-[24px]"
            aria-label="Ayarlar"
            title="Ayarlar"
          >
            <IoMdSettings className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IndicatorHeader;
