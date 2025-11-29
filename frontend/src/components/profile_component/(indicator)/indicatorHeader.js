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
import usePanelStore from "@/store/indicator/panelStore";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import SettingsModal from "@/components/profile_component/(indicator)/(modal_tabs)/SettingsModal";

const IndicatorHeader = ({ locale }) => {
  const { t } = useTranslation("strategiesHeader");

  const { openPanel: openIndicatorPanel } = useCodePanelStore();
  const { openPanel: openStrategyPanel } = useStrategyCodePanelStore();

  const [selectedOption, setSelectedOption] = useState(t("period.default"));
  const [selectedCrypto, setSelectedCrypto] = useState("");

  const { isMagnetMode, toggleMagnetMode } = useMagnetStore();
  const { isRulerMode, toggleRulerMode } = useRulerStore();

  const { setEnd } = usePanelStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  const handleRefresh = () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    const iso = new Date().toISOString().slice(0, 19);
    setEnd(iso);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <>
      <div className="w-full bg-black border-b border-zinc-900 shadow-md flex justify-between items-center py-3 fixed top-0 left-0 right-0 z-50 h-[61px] pl-16">
        <div className="flex gap-2 items-center w-full">
          <CryptoSelectButton
            locale={locale}
            selectedCrypto={selectedCrypto}
            setSelectedCrypto={setSelectedCrypto}
          />
          <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

          <PeriodDropdown
            locale={locale}
            selectedOption={selectedOption}
            setSelectedOption={setSelectedOption}
          />
          <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

          <div className="flex items-center gap-1">
            <IndicatorsModalButton locale={locale} />
            <button
              onClick={() => openIndicatorPanel()}
              className="flex items-center justify-center w-[40px] h-[40px] rounded-md bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200 text-xl"
              aria-label={t("buttons.addIndicator")}
              title={t("buttons.addIndicator")}
            >
              +
            </button>
          </div>
          <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

          <div className="flex items-center gap-1">
            <StrategyButton locale={locale} />
            <button
              onClick={() => openStrategyPanel()}
              className="flex items-center justify-center w-[40px] h-[40px] rounded-md bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200 text-xl"
              aria-label={t("buttons.addStrategy")}
              title={t("buttons.addStrategy")}
            >
              +
            </button>
          </div>
          <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

          <button
            onClick={toggleMagnetMode}
            className={`mr-[2px] flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 text-[22px] 
              ${isMagnetMode ? "scale-95 border bg-black " : "bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200"}`}
            aria-label={t("labels.magnetMode")}
            title={t("labels.magnetMode")}
          >
            <BiSolidMagnet
              className={`transition-all duration-150 ${isMagnetMode ? "text-blue-300 text-[20px]" : "text-white"}`}
            />
          </button>
          <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

          <button
            onClick={toggleRulerMode}
            className={`flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 
              ${isRulerMode ? "bg-gray-950 border-2 border-cyan-700 text-white" : "bg-black border border-gray-800 hover:border-gray-600 transition duration-100 text-gray-200"} text-[23px]`}
            aria-label={t("labels.ruler")}
            title={t("labels.ruler")}
          >
            <LuRuler />
          </button>

          <div className="h-[30px] w-[1px] bg-gray-600 mx-2"></div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`mr-2 flex items-center justify-center w-[50px] h-[40px] rounded-md border transition duration-100 text-gray-200 text-[22px]
              ${isRefreshing
                ? "bg-gray-900 border-gray-700 opacity-80 cursor-not-allowed"
                : "bg-black border-gray-800 hover:border-gray-600"}`}
            aria-label={t("buttons.refresh")}
            title={isRefreshing ? t("loading") : t("buttons.refresh")}
          >
            <IoMdRefresh className={`text-white ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          </button>

          <div className="ml-auto flex items-center">
            <button
              onClick={() => setSettingsOpen(true)}
              className="mr-2 flex items-center justify-center w-[50px] h-[40px] rounded-md transition-all duration-200 bg-black border border-gray-800 hover:border-gray-600 text-[21px] "
              aria-label={t("buttons.settings")}
              title={t("buttons.settings")}
            >
              <IoMdSettings className="text-gray-200" />
            </button>
          </div>
        </div>
      </div>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} locale={locale} />
    </>
  );
};

export default IndicatorHeader;
