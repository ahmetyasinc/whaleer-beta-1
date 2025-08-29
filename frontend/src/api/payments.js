// src/api/payments.js
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

// Listing intent (ör: 1 USD platform fee)
export async function createListingIntent(botId) {
  const { data } = await axios.post(
    `${API}/payments/intent/listing`,
    { bot_id: botId },
    { withCredentials: true }
  );
  // { intent_id, reference, amount_usd, amount_sol, amount_lamports, expires_at, message_b64 }
  return data;
}

export async function createPurchaseIntent({ bot_id, seller_wallet, price_usd }) {
  const { data } = await axios.post(
    `${API}/payments/intent/purchase`,
    { bot_id, seller_wallet, price_usd },
    { withCredentials: true }
  );
  return data; // { intent_id, message_b64, ... }
}

// Ödeme onayı
export async function confirmPayment(intentId, signature) {
  const { data } = await axios.post(
    `${API}/payments/confirm`,
    { intent_id: intentId, signature },
    { withCredentials: true }
  );
  return data; // { ok: true }
}
