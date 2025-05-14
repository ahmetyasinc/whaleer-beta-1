"use client";
import { useState } from "react";

import { useCallback } from "react";
import usePanelStore from "@/store/indicator/panelStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import useStrategyDataStore from "@/store/indicator/strategyDataStore";
import axios from "axios";

import { IoDownloadOutline } from "react-icons/io5";
import { AiOutlineLoading3Quarters } from "react-icons/ai"; // yüklenme animasyonu için

axios.defaults.withCredentials = true;

const AddStrategyButton = ({ strategyId }) => {
    const { end } = usePanelStore();
    const { selectedCrypto, selectedPeriod } = useCryptoStore();
    const { insertStrategyData } = useStrategyDataStore();
    const [isLoading, setIsLoading] = useState(false);

    const fetchStrategyData = useCallback(async () => {
        try {
            if (!selectedCrypto?.binance_symbol || !selectedPeriod || !strategyId) {
                console.warn("Eksik veri ile API çağrısı engellendi.");
                return;
            }
            console.log(strategyId,selectedCrypto.binance_symbol,selectedPeriod,end)

            const response = await axios.post("http://localhost:8000/api/run-strategy/", {
                strategy_id: strategyId,
                binance_symbol: selectedCrypto.binance_symbol,
                interval: selectedPeriod,
                end: end,
            });

            console.log("== RESPONSE ==")
            console.log(response.data)

            const { strategy_result = [], strategy_name = [], strategy_graph = [], prints = [], inputs = [] } = response.data || {};

            insertStrategyData(strategyId, strategy_name, strategy_result, strategy_graph, prints, inputs);
        } catch (error) {
            console.error("Strategy verisi çekilirken hata oluştu:", error);
        }
    }, [strategyId, selectedCrypto, selectedPeriod, end, insertStrategyData]);

    const handleClick = async () => {
        setIsLoading(true);
        await fetchStrategyData();
        
        setTimeout(() => {
            setIsLoading(false);
        }, 200);
    };

    return (
        <button
            onClick={handleClick}
            className="p-1 rounded transition-all"
            title={"Ekle"}
        >
            {isLoading ? (
                <AiOutlineLoading3Quarters className="animate-spin text-yellow-400 text-lg" />
            ) : (
                <IoDownloadOutline className="text-green-300 text-lg" />
            )}
        </button>
    );
};

export default AddStrategyButton;
