"use client";
import { useState, useCallback } from "react";
import usePanelStore from "@/store/indicator/panelStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import useStrategyDataStore from "@/store/indicator/strategyDataStore";
import axios from "axios";

import { IoDownloadOutline } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai";
import { useTranslation } from "react-i18next";

axios.defaults.withCredentials = true;

// GÜNCELLEME: closeModal prop'u eklendi
const AddStrategyButton = ({ strategyId, closeModal }) => {
  const { end } = usePanelStore();
  const { selectedCrypto, selectedPeriod } = useCryptoStore();
  const { insertStrategyData } = useStrategyDataStore();
  const [isLoading, setIsLoading] = useState(false);

  const { t } = useTranslation("addStrategyButton"); // ✅ yeni namespace

  const fetchStrategyData = useCallback(async () => {
    try {
      if (!selectedCrypto?.binance_symbol || !selectedPeriod || !strategyId) {
        console.warn(t("warnings.missingData"));
        return;
      }

      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/run-strategy/`,
        {
          strategy_id: strategyId,
          binance_symbol: selectedCrypto.binance_symbol,
          interval: selectedPeriod,
          end: end,
        }
      );

      const {
        strategy_result = {},
        strategy_name = "",
        strategy_graph = [],
        prints = [],
        inputs = [],
      } = response.data || {};

      const status = strategy_result?.status || "success";
      const message = strategy_result?.message || "";

      insertStrategyData(
        strategyId,
        strategy_name,
        strategy_result,
        strategy_graph,
        prints,
        inputs,
        { status, message }
      );
    } catch (error) {
      console.error(t("errors.fetch"), error);

      insertStrategyData(
        strategyId,
        t("errors.title"),
        {},
        [],
        [],
        [],
        { status: "error", message: error.message }
      );
    }
  }, [strategyId, selectedCrypto, selectedPeriod, end, insertStrategyData, t]);

  const handleClick = async () => {
    setIsLoading(true);
    await fetchStrategyData();
    setTimeout(() => {
      setIsLoading(false);
      // YENİ: Başarıyla yüklendikten sonra modalı kapat
      if (closeModal) {
        closeModal(); 
      }
    }, 200);
  };

  return (
    <button
      onClick={handleClick}
      className="p-1 rounded transition-all"
      title={t("buttons.add")}
    >
      {isLoading ? (
        <AiOutlineLoading3Quarters className="animate-spin text-yellow-400 text-lg" />
      ) : (
        <IoDownloadOutline className="text-green-300 hover:text-emerald-500 text-lg" />
      )}
    </button>
  );
};

export default AddStrategyButton;