"use client";

import { useState, useCallback } from "react";
import useStrategyStore from "@/store/indicator/strategyStore";
import usePanelStore from "@/store/indicator/panelStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import useStrategyDataStore from "@/store/indicator/strategyDataStore";
import axios from "axios";

import { TbTriangleFilled } from "react-icons/tb";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

axios.defaults.withCredentials = true;

const RunButtonStr = ({ strategyId, onBeforeRun }) => {
  const { toggleStrategy } = useStrategyStore();
  const { addSyncedPanel, end } = usePanelStore();
  const { selectedCrypto, selectedPeriod } = useCryptoStore();
  const { insertOrReplaceLastSubStrategyData, strategyData } = useStrategyDataStore();
  const [isLoading, setIsLoading] = useState(false);

const fetchStrategyData = useCallback(async () => {
  try {
    if (!selectedCrypto?.binance_symbol || !selectedPeriod || !strategyId) {
      console.warn("Eksik veri ile API çağrısı engellendi.");
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

    const status = strategy_result.status || "success";
    const message = strategy_result.message || "";

    insertOrReplaceLastSubStrategyData(
      strategyId,
      strategy_name,
      strategy_result,
      strategy_graph,
      prints,
      inputs,
      { status, message }
    );

    const updated = useStrategyDataStore.getState().strategyData[strategyId];

  } catch (error) {
    console.error("Strategy verisi çekilirken hata oluştu:", error);

    insertOrReplaceLastSubStrategyData(
      strategyId,
      "Hata",
      [],
      [],
      [],
      [],
      { status: "error", message: error.message }
    );
  }
}, [strategyId, selectedCrypto, selectedPeriod, end, insertOrReplaceLastSubStrategyData]);


  const handleClick = async () => {
    setIsLoading(true);

    if (onBeforeRun) {
      await onBeforeRun();
    }

    await fetchStrategyData();

    toggleStrategy(strategyId);

    setTimeout(() => {
      setIsLoading(false);
    }, 250);
  };

  return (
    <button
      className="absolute top-1 right-16 gap-1 px-[9px] py-[5px] mr-4 rounded font-medium transition-all"
      title="Çalıştır"
      onClick={handleClick}
    >
      {isLoading ? (
        <AiOutlineLoading3Quarters className="animate-spin text-yellow-400 text-[18px]" />
      ) : (
        <TbTriangleFilled className="text-[18px] text-[rgb(39,192,65)] hover:text-[#44ff54] transform rotate-90" />
      )}
    </button>
  );
};

export default RunButtonStr;
