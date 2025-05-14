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

const RunButton = ({ strategyId, onBeforeRun }) => {
    const { toggleStrategy } = useStrategyStore();
    const { addSyncedPanel, end } = usePanelStore();
    const { selectedCrypto, selectedPeriod } = useCryptoStore();
    const { insertOrReplaceLastSubStrategyData } = useStrategyDataStore();
    const [isLoading, setIsLoading] = useState(false);


    const fetchStrategyData = useCallback(async () => {
        try {
            if (!selectedCrypto?.binance_symbol || !selectedPeriod || !strategyId) {
                console.warn("Eksik veri ile API çağrısı engellendi.");
                return;
            }

            const response = await axios.post("http://localhost:8000/api/run-strategy/", {
                strategy_id: strategyId,
                binance_symbol: selectedCrypto.binance_symbol,
                interval: selectedPeriod,
                end: end,
            });

            console.log("== RESPONSE ==")
            console.log(response.data)

            const { strategy_result = [], strategy_name = [], strategy_graph = [], prints = [], inputs = [] } = response.data || {};
            insertOrReplaceLastSubStrategyData(strategyId, strategy_name, strategy_result, strategy_graph, prints, inputs);
            //addSyncedPanel(strategyId);
        } catch (error) {
            console.error("Strategy verisi çekilirken hata oluştu:", error);
        }
    }, [strategyId, selectedCrypto, selectedPeriod, end, insertOrReplaceLastSubStrategyData]);

    const handleClick = async () => {
        setIsLoading(true);
        
        if (onBeforeRun) {
          await onBeforeRun(); // ✅ önce kaydet
        }

        await fetchStrategyData();
        
        toggleStrategy(strategyId);
        
        setTimeout(() => {
            setIsLoading(false);
        }, 250); // hafif geçiş için süre verdik
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

export default RunButton;
