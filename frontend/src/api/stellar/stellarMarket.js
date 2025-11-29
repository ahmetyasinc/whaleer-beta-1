import axios from "axios";

const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

/**
 * 1. Sipariş Oluştur (Backend'e niyet bildirir)
 * Dönen order_id'yi kontrata göndereceğiz.
 */
export async function createStellarOrder({ bot_id, purchase_type, rent_days, price_amount, seller_address }) {
  const { data } = await axios.post(
    `${API}/stellar/market/create-order`,
    {
      bot_id,
      purchase_type, // "BUY" veya "RENT"
      rent_days,
      price_amount,  // XLM Miktarı (Örn: 10.5)
      seller_address
    },
    { withCredentials: true }
  );
  return data; 
  // Dönüş: { order_id, contract_id, token_id, amount_stroop }
}

/**
 * 3. Siparişi Onayla (Backend'e TX Hash gönderir)
 */
export async function confirmStellarOrder({ order_id, tx_hash }) {
  const { data } = await axios.post(
    `${API}/stellar/market/confirm-order`,
    {
      order_id,
      tx_hash
    },
    { withCredentials: true }
  );
  return data;
  // Dönüş: { status: "confirmed", new_bot_id: ... }
}