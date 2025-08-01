import { create } from 'zustand';
import axios from 'axios';
import useCryptoStore from "./cryptoPinStore";
import usePanelStore from "./panelStore";

const useIndicatorDataStore = create((set, get) => ({
  indicatorData: {}, // { [indicatorId]: { [subId]: { inputs, result, prints } } }
  
  // Elle veri ekle (input olmadan sadece result/prints ile)
  insertIndicatorData: (indicatorId, indicator_name, result, prints, inputs = {}, addSyncedPanel) => {
    const state = get();
    const existingIndicator = state.indicatorData[indicatorId];
    const existingSubItems = existingIndicator?.subItems || {};
    const newSubId = Object.keys(existingSubItems).length + 1;
    if (addSyncedPanel) addSyncedPanel(indicatorId, newSubId);
    set({
      indicatorData: {
        ...state.indicatorData,
        [indicatorId]: {
          name: indicator_name,
          subItems: {
            ...existingSubItems,
            [newSubId]: {
              inputs,
              result,
              prints
            }
          }
        }
      }
    });
  },
  
  insertOrReplaceLastSubIndicatorData: (indicatorId, indicator_name, result, prints, inputs = {}, addSyncedPanel) => {
    const state = get();
    const currentData = state.indicatorData[indicatorId];
    const existingSubItems = currentData?.subItems || {};
    const newSubId = Object.keys(existingSubItems).length + 1;
    if (addSyncedPanel) addSyncedPanel(indicatorId, newSubId);

    if (!currentData) {
      set({
        indicatorData: {
          ...state.indicatorData,
          [indicatorId]: {
            name: indicator_name,
            subItems: {
              1: { inputs, result, prints },
            },
          },
        },
      });
    } else {
      const subItems = currentData.subItems || {};
      const existingSubIds = Object.keys(subItems).map(Number);
      const maxSubId = existingSubIds.length > 0 ? Math.max(...existingSubIds) : 1;
      if (addSyncedPanel) addSyncedPanel(indicatorId, maxSubId);

      set({
        indicatorData: {
          ...state.indicatorData,
          [indicatorId]: {
            name: indicator_name,
            subItems: {
              ...subItems,
              [maxSubId]: {
                inputs,
                result,
                prints,
              },
            },
          },
        },
      });
    }
  },

  removeSubIndicator: (indicatorId, subId) => {
    const state = get();
    const existing = state.indicatorData[indicatorId];
    const subItems = existing?.subItems;
  
    if (!existing || !subItems?.[subId]) return;
  
    const newSubItems = { ...subItems };
    delete newSubItems[subId];
  
    const newIndicatorData = { ...state.indicatorData };
  
    if (Object.keys(newSubItems).length === 0) {
      // Tüm sub'lar silinmişse indikatörü de kaldır
      delete newIndicatorData[indicatorId];
    } else {
      newIndicatorData[indicatorId] = {
        ...existing,
        subItems: newSubItems,
      };
    }
  
    set({ indicatorData: newIndicatorData });
  },  


  // Input güncelle ve yeniden hesapla
  updateInputs: async (indicatorId, subId, updatedInputs) => {
    const state = get();
  
    const currentInputs =
      state.indicatorData?.[indicatorId]?.subItems?.[subId]?.inputs?.inputs || [];

    
    const mergedInputs = currentInputs.map((input) => {
      const updatedValue = updatedInputs[input.name];
      return {
        ...input,
        default: updatedValue ?? input.default,
      };
    });

    const response = await get().runCalculation(indicatorId, updatedInputs);
    const { result, prints } = response;
  
    const existingSubItems = state.indicatorData[indicatorId].subItems;
  
    set({
        indicatorData: {
          ...state.indicatorData,
          [indicatorId]: {
            ...state.indicatorData[indicatorId],
            subItems: {
              ...existingSubItems,
              [subId]: {
                inputs: { inputs: mergedInputs }, // dizi olarak güncellendi
                result,
                prints,
              },
            },
          },
        },
      });
  },

  // Hesaplama API'si
  runCalculation: async (indicatorId, inputs) => {
    try {
      const { selectedCrypto, selectedPeriod } = useCryptoStore.getState();
      const { end } = usePanelStore.getState();
  
      if (!selectedCrypto?.binance_symbol || !selectedPeriod) {
        console.warn("runCalculation için gerekli bilgiler eksik.");
        return { result: [], prints: [] };
      }
  
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/run-updated-indicator/`, {
        indicator_id: indicatorId,
        inputs: inputs,
        binance_symbol: selectedCrypto.binance_symbol,
        interval: selectedPeriod,
        end: end,
      });

      console.log("== İndicator ==")
      console.log("== RESPONSE ==")
      console.log(response)
  
      return {
        result: response.data.indicator_result,
        prints: response.data.prints,
      };
    } catch (error) {
      console.error('Indicator hesaplama hatası:', error);
      return { result: [], prints: [] };
    }
  },

}));

export default useIndicatorDataStore;
/*

import { create } from 'zustand';
import axios from 'axios';
import useCryptoStore from "./cryptoPinStore";
import usePanelStore from "./panelStore";

const useIndicatorDataStore = create((set, get) => ({
  indicatorData: {}, 
  // { [indicatorId]: { name, subItems: { [subId]: { inputs, result, prints } } } }

  // Elle veri ekle (input olmadan sadece result/prints ile)
  insertIndicatorData: (
    indicatorId, 
    indicator_name, 
    result, 
    prints, 
    inputs = {}, 
    addSyncedPanel,
    meta = {} // ✅ yeni
  ) => {
    const state = get();
    const existingIndicator = state.indicatorData[indicatorId];
    const existingSubItems = existingIndicator?.subItems || {};
    const newSubId = Object.keys(existingSubItems).length + 1;

    if (addSyncedPanel) addSyncedPanel(indicatorId, newSubId);

    set({
      indicatorData: {
        ...state.indicatorData,
        [indicatorId]: {
          name: indicator_name,
          subItems: {
            ...existingSubItems,
            [newSubId]: {
              inputs,
              result: {
                data: result,
                status: meta.status || "success",
                message: meta.message || ""
              },
              prints
            }
          }
        }
      }
    });
  },

  insertOrReplaceLastSubIndicatorData: (
    indicatorId, 
    indicator_name, 
    result, 
    prints, 
    inputs = {}, 
    addSyncedPanel,
    meta = {} // ✅ yeni
  ) => {
    const state = get();
    const currentData = state.indicatorData[indicatorId];
    const existingSubItems = currentData?.subItems || {};
    const newSubId = Object.keys(existingSubItems).length + 1;

    if (!currentData) {
      if (addSyncedPanel) addSyncedPanel(indicatorId, 1);
      set({
        indicatorData: {
          ...state.indicatorData,
          [indicatorId]: {
            name: indicator_name,
            subItems: {
              1: { 
                inputs,
                result: {
                  data: result,
                  status: meta.status || "success",
                  message: meta.message || ""
                },
                prints,
              },
            },
          },
        },
      });
    } else {
      const subItems = currentData.subItems || {};
      const existingSubIds = Object.keys(subItems).map(Number);
      const maxSubId = existingSubIds.length > 0 ? Math.max(...existingSubIds) : 1;

      if (addSyncedPanel) addSyncedPanel(indicatorId, maxSubId);

      set({
        indicatorData: {
          ...state.indicatorData,
          [indicatorId]: {
            name: indicator_name,
            subItems: {
              ...subItems,
              [maxSubId]: {
                inputs,
                result: {
                  data: result,
                  status: meta.status || "success",
                  message: meta.message || ""
                },
                prints,
              },
            },
          },
        },
      });
    }
  },

  removeSubIndicator: (indicatorId, subId) => {
    const state = get();
    const existing = state.indicatorData[indicatorId];
    const subItems = existing?.subItems;

    if (!existing || !subItems?.[subId]) return;

    const newSubItems = { ...subItems };
    delete newSubItems[subId];

    const newIndicatorData = { ...state.indicatorData };

    if (Object.keys(newSubItems).length === 0) {
      delete newIndicatorData[indicatorId];
    } else {
      newIndicatorData[indicatorId] = {
        ...existing,
        subItems: newSubItems,
      };
    }

    set({ indicatorData: newIndicatorData });
  },

  // Input güncelle ve yeniden hesapla
  updateInputs: async (indicatorId, subId, updatedInputs) => {
    const state = get();

    const currentInputs =
      state.indicatorData?.[indicatorId]?.subItems?.[subId]?.inputs?.inputs || [];

    const mergedInputs = currentInputs.map((input) => {
      const updatedValue = updatedInputs[input.name];
      return {
        ...input,
        default: updatedValue ?? input.default,
      };
    });

    const response = await get().runCalculation(indicatorId, updatedInputs);
    const { result, prints, status = "success", message = "" } = response;

    const existingSubItems = state.indicatorData[indicatorId].subItems;

    set({
      indicatorData: {
        ...state.indicatorData,
        [indicatorId]: {
          ...state.indicatorData[indicatorId],
          subItems: {
            ...existingSubItems,
            [subId]: {
              inputs: { inputs: mergedInputs },
              result: {
                data: result,
                status,
                message
              },
              prints,
            },
          },
        },
      },
    });
  },

  // Hesaplama API'si
  runCalculation: async (indicatorId, inputs) => {
    try {
      const { selectedCrypto, selectedPeriod } = useCryptoStore.getState();
      const { end } = usePanelStore.getState();

      if (!selectedCrypto?.binance_symbol || !selectedPeriod) {
        console.warn("runCalculation için gerekli bilgiler eksik.");
        return { result: [], prints: [], status: "error", message: "Eksik bilgi" };
      }

      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/run-updated-indicator/`, {
        indicator_id: indicatorId,
        inputs: inputs,
        binance_symbol: selectedCrypto.binance_symbol,
        interval: selectedPeriod,
        end: end,
      });

      return {
        result: response.data.indicator_result,
        prints: response.data.prints,
        status: response.data.status || "success",
        message: response.data.message || ""
      };
    } catch (error) {
      console.error('Indicator hesaplama hatası:', error);
      return { result: [], prints: [], status: "error", message: error.message };
    }
  },
}));

export default useIndicatorDataStore;
*/