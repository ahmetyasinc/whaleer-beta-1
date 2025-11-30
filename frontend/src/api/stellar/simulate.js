// src/api/stellar/simulate.js
import axios from "axios";

axios.defaults.withCredentials = true;

/**
 * Tüm botlar için bir günlük sahte kâr/zarar verisi üretmesini
 * backend'den ister. (Test amaçlı)
 */
export const simulateDailyBotResults = async () => {
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/stellar/simulate-daily-results`
    );
    return res.data;
  } catch (error) {
    console.error("Simulate daily bot results API hatası:", error);
    throw error;
  }
};
