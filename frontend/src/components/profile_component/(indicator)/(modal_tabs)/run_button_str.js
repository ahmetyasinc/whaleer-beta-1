"use client";

import { forwardRef, useState, useCallback, useRef, useEffect } from "react";
import useStrategyStore from "@/store/indicator/strategyStore";
import usePanelStore from "@/store/indicator/panelStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import useStrategyDataStore from "@/store/indicator/strategyDataStore";
import api from "@/api/axios";
import { useTranslation } from "react-i18next";


import { TbTriangleFilled } from "react-icons/tb";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

// axios.defaults.withCredentials = true;

const RunButtonStr = forwardRef(({ strategyId, onBeforeRun, className }, ref) => {
  const { toggleStrategy } = useStrategyStore();
  const { addSyncedPanel, end } = usePanelStore();
  const { selectedCrypto, selectedPeriod } = useCryptoStore();
  const { insertOrReplaceLastSubStrategyData } = useStrategyDataStore();
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation("strategyCodePanel");


  // 🔑 ID'yi ref içinde tutarak her zaman en güncel ID'ye erişilmesini sağla (stale closure önlemi)
  const strategyIdRef = useRef(strategyId);
  useEffect(() => {
    strategyIdRef.current = strategyId;
  }, [strategyId]);

  const fetchStrategyData = useCallback(async () => {
    const currentId = strategyIdRef.current;
    try {
      if (!selectedCrypto?.binance_symbol || !selectedPeriod || !currentId) {
        console.warn("Eksik veri ile API çağrısı engellendi.");
        return;
      }

      const response = await api.post(
        "/run-strategy/",
        {
          strategy_id: currentId,
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
        currentId,
        strategy_name,
        strategy_result,
        strategy_graph,
        prints,
        inputs,
        { status, message }
      );
    } catch (error) {
      console.error("Strategy verisi çekilirken hata oluştu:", error);

      insertOrReplaceLastSubStrategyData(
        currentId,
        "Hata",
        [],
        [],
        [],
        [],
        { status: "error", message: error.message }
      );
    }
  }, [selectedCrypto, selectedPeriod, end, insertOrReplaceLastSubStrategyData]);

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
      ref={ref} // 🔑 forwardRef ile dışarıdan tetiklenebilir
      className={className !== undefined ? className : "absolute top-1 right-16 gap-1 px-[9px] py-[5px] mr-4 rounded font-medium transition-all"}
      title={`${t("buttons.run")} (F5)`}
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

RunButtonStr.displayName = "RunButtonStr"; // forwardRef için gerekli

export default RunButtonStr;
