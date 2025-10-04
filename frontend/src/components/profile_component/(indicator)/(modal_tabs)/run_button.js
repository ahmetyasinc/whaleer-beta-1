"use client";

import { forwardRef, useState, useCallback } from "react";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import usePanelStore from "@/store/indicator/panelStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import axios from "axios";
import { useTranslation } from "react-i18next";
import { TbTriangleFilled } from "react-icons/tb";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

axios.defaults.withCredentials = true;

const RunButton = forwardRef(({ indicatorId, onBeforeRun }, ref) => {
  const { toggleIndicator } = useIndicatorStore();
  const { addSyncedPanel, end } = usePanelStore();
  const { selectedCrypto, selectedPeriod } = useCryptoStore();
  const { insertOrReplaceLastSubIndicatorData } = useIndicatorDataStore();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation("indicatorEditor");

  const fetchIndicatorData = useCallback(async () => {
    try {
      if (!selectedCrypto?.binance_symbol || !selectedPeriod || !indicatorId) {
        console.warn("Eksik veri ile API çağrısı engellendi.");
        return;
      }
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/run-indicator/`,
        {
          indicator_id: indicatorId,
          binance_symbol: selectedCrypto.binance_symbol,
          interval: selectedPeriod,
          end: end,
        }
      );
      const {
        indicator_result = [],
        indicator_name = "",
        prints = [],
        inputs = [],
        status = "success",
        message = "",
      } = response.data || {};

      insertOrReplaceLastSubIndicatorData(
        indicatorId,
        indicator_name,
        indicator_result,
        prints,
        inputs,
        addSyncedPanel,
        { status, message }
      );
    } catch (error) {
      console.error("Indicator verisi çekilirken hata oluştu:", error);
      insertOrReplaceLastSubIndicatorData(
        indicatorId,
        "Hata",
        [],
        [],
        [],
        addSyncedPanel,
        { status: "error", message: error.message }
      );
    }
  }, [
    indicatorId,
    selectedCrypto,
    selectedPeriod,
    end,
    insertOrReplaceLastSubIndicatorData,
  ]);

  const handleClick = async () => {
    setIsLoading(true);

    if (onBeforeRun) {
      await onBeforeRun(); // ✅ önce kaydet
    }

    await fetchIndicatorData();

    toggleIndicator(indicatorId);

    setTimeout(() => {
      setIsLoading(false);
    }, 250);
  };

  return (
    <button
      ref={ref} // 🔑 forwardRef ile dışarıdan erişilebilir
      className="absolute top-1 right-16 gap-1 px-[9px] py-[5px] mr-4 rounded font-medium transition-all"
            title={t("buttons.run") + " (F5)"}
      onClick={handleClick}
    >
      {isLoading ? (
        <AiOutlineLoading3Quarters className="animate-spin text-yellow-400 text-[18px]" />
      ) : (
        <TbTriangleFilled className="text-[18px] text-[rgb(39,192,65)] hover:text-[#44ff54] transform rotate-90" />
      )}
    </button>
  );
});

RunButton.displayName = "RunButton"; // forwardRef için zorunlu

export default RunButton;
