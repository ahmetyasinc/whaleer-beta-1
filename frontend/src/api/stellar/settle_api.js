// src/api/stellar/settle_api.js
import axios from "axios";

axios.defaults.withCredentials = true;

/**
 * Kullanıcının tüm botları için
 * kâr komisyonu tahsil etme isteği yollar.
 */
export const settleAllProfits = async () => {
  try {
    const res = await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/stellar/settle-all-profits`
    );
    return res.data;
  } catch (error) {
    console.error("Settle all profits API hatası:", error);
    throw error;
  }
};
