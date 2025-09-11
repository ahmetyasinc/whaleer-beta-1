"use client";
import { useState, useCallback } from "react";
import usePanelStore from "@/store/indicator/panelStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import axios from "axios";
import { IoDownloadOutline } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useTranslation } from "react-i18next";

axios.defaults.withCredentials = true;

const AddIndicatorButton = ({ indicatorId }) => {
  const { t } = useTranslation("indicator");

  const { addSyncedPanel, end } = usePanelStore();
  const { selectedCrypto, selectedPeriod } = useCryptoStore();
  const { insertIndicatorData } = useIndicatorDataStore();
  const [isLoading, setIsLoading] = useState(false);

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
        indicator_name = [],
        prints = [],
        inputs = [],
      } = response.data || {};

      insertIndicatorData(
        indicatorId,
        indicator_name,
        indicator_result,
        prints,
        inputs,
        addSyncedPanel
      );
    } catch (error) {
      console.error("Indicator verisi çekilirken hata oluştu:", error);
    }
  }, [indicatorId, selectedCrypto, selectedPeriod, end, insertIndicatorData, addSyncedPanel]);

  const handleClick = async () => {
    setIsLoading(true);
    await fetchIndicatorData();
    setTimeout(() => setIsLoading(false), 200);
  };

  return (
    <button
      onClick={handleClick}
      className="p-1 rounded transition-all"
      title={t("tooltips.add", { defaultValue: "Ekle" })}
      aria-label={t("tooltips.add", { defaultValue: "Ekle" })}
    >
      {isLoading ? (
        <AiOutlineLoading3Quarters className="animate-spin text-yellow-400 text-lg" />
      ) : (
        <IoDownloadOutline className="text-green-300 hover:text-emerald-500 text-lg" />
      )}
    </button>
  );
};

export default AddIndicatorButton;
