"use client";

import { useState, useCallback } from "react";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import usePanelStore from "@/store/indicator/panelStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import axios from "axios";

import { TbTriangleFilled } from "react-icons/tb";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

axios.defaults.withCredentials = true;

const RunButton = ({ indicatorId, onBeforeRun}) => {
    const { toggleIndicator } = useIndicatorStore();
    const { addSyncedPanel, end } = usePanelStore();
    const { selectedCrypto, selectedPeriod } = useCryptoStore();
    const { insertOrReplaceLastSubIndicatorData } = useIndicatorDataStore();
    const [isLoading, setIsLoading] = useState(false);

    const fetchIndicatorData = useCallback(async () => {
        try {
            if (!selectedCrypto?.binance_symbol || !selectedPeriod || !indicatorId) {
                console.warn("Eksik veri ile API çağrısı engellendi.");
                return;
            }

            const response = await axios.post("http://localhost:8000/api/run-indicator/", {
              indicator_id: indicatorId,
              binance_symbol: selectedCrypto.binance_symbol,
              interval: selectedPeriod,
              end: end,
            });

            console.log("== RESPONSE ==")
            console.log(response)

            const { indicator_result = [], indicator_name = "", prints = [], inputs = [] } = response.data || {};
            insertOrReplaceLastSubIndicatorData(indicatorId, indicator_name, indicator_result, prints, inputs, addSyncedPanel);
        } catch (error) {
            console.error("Indicator verisi çekilirken hata oluştu:", error);
        }
    }, [indicatorId, selectedCrypto, selectedPeriod, end, insertOrReplaceLastSubIndicatorData]);

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
