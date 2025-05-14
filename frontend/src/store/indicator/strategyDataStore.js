import { create } from "zustand";
import axios from 'axios';
import useCryptoStore from "./cryptoPinStore";
import usePanelStore from "./panelStore";

const useStrategyDataStore = create((set, get) => ({
    strategyData: {}, // Her indikatörün verisini burada saklayacağız

    insertStrategyData: (strategyId, strategy_name, strategy_result, strategy_graph, prints, inputs = {}) => {
       const state = get();
        
       const existingStrategy = state.strategyData[strategyId];
       const existingSubItems = existingStrategy?.subItems || {};
       const newSubId = Object.keys(existingSubItems).length + 1;
     
       set({
        strategyData: {
           ...state.strategyData,
           [strategyId]: {
             name: strategy_name,
             subItems: {
               ...existingSubItems,
               [newSubId]: {
                 inputs,
                 strategy_result,
                 strategy_graph,
                 prints
               }
             }
           }
         }
       });
    },

    insertOrReplaceLastSubStrategyData: (strategyId, strategy_name, strategy_result, strategy_graph, prints, inputs = {}) => {
      const state = get();
      const currentData = state.strategyData[strategyId];
    
      if (!currentData) {
        // İlk kez ekleniyor
        set({
          strategyData: {
            ...state.strategyData,
            [strategyId]: {
              name: strategy_name,
              subItems: {
                1: { inputs, strategy_result, strategy_graph, prints },
              },
            },
          },
        });
      } else {
        const subItems = currentData.subItems || {};
        const existingSubIds = Object.keys(subItems).map(Number);
        const maxSubId = existingSubIds.length > 0 ? Math.max(...existingSubIds) : 1;
    
        set({
          strategyData: {
            ...state.strategyData,
            [strategyId]: {
              name: strategy_name,
              subItems: {
                ...subItems,
                [maxSubId]: {
                  inputs,
                  strategy_result,
                  strategy_graph,
                  prints,
                },
              },
            },
          },
        });
      }
    },

    removeSubStrategy: (strategyId, subId) => {
        const state = get();
        const existing = state.strategyData[strategyId];
        const subItems = existing?.subItems;
      
        if (!existing || !subItems?.[subId]) return;
      
        const newSubItems = { ...subItems };
        delete newSubItems[subId];
      
        const newStrategyData = { ...state.strategyData };
      
        if (Object.keys(newSubItems).length === 0) {
          // Tüm sub'lar silinmişse indikatörü de kaldır
          delete newStrategyData[strategyId];
        } else {
          newStrategyData[strategyId] = {
            ...existing,
            subItems: newSubItems,
          };
        }
      
        set({ strategyData: newStrategyData });
    }, 

    updateInputs: async (strategyId, subId, updatedInputs) => {
        const state = get();
      
        const currentInputs =
          state.strategyData?.[strategyId]?.subItems?.[subId]?.inputs?.inputs || [];
    
        
        const mergedInputs = currentInputs.map((input) => {
          const updatedValue = updatedInputs[input.name];
          return {
            ...input,
            default: updatedValue ?? input.default,
          };
        });
    
        const response = await get().runCalculation(strategyId, updatedInputs);
        const { strategy_result, strategy_graph, prints } = response;
      
        const existingSubItems = state.strategyData[strategyId].subItems;
      
        set({
            strategyData: {
                ...state.strategyData,
                [strategyId]: {
                    ...state.strategyData[strategyId],
                    subItems: {
                        ...existingSubItems,
                        [subId]: {
                            inputs: { inputs: mergedInputs }, // dizi olarak güncellendi
                            strategy_result,
                            strategy_graph,
                            prints,
                        },
                    },
                },
            },
        });
    },


    runCalculation: async (strategyId, inputs) => {
        try {
            const { selectedCrypto, selectedPeriod } = useCryptoStore.getState();
            const { end } = usePanelStore.getState();
            
            if (!selectedCrypto?.binance_symbol || !selectedPeriod) {
                console.warn("runCalculation için gerekli bilgiler eksik.");
                return { result: [], prints: [] };
            }
          
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/run-updated-strategy/`, {
                strategy_id: strategyId,
                inputs: inputs,
                binance_symbol: selectedCrypto.binance_symbol,
                interval: selectedPeriod,
                end: end,
            });

            console.log("== RESPONSE ==")
            console.log(response)
            
            return {
                strategy_result: response.data.strategy_result,
                strategy_graph: response.data.strategy_graph,
                prints: response.data.prints,
            };
        } catch (error) {
            console.error('Strategy hesaplama hatası:', error);
            return { strategy_result: [], strategy_graph: [], prints: [] };
        }
    },
        
}));

export default useStrategyDataStore;
