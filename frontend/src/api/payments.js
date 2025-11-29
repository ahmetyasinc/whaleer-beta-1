// src/api/payments.js
import axios from "axios";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

// Listing intent (1 USD platform fee)
// GÜNCELLEME: 'chain' parametresi eklendi (varsayılan 'solana')
export async function createListingIntent(botId, chain = "solana", extra = {}) {
  const payload = {
    bot_id: botId,
    chain,
  };

  // Stellar için, XDR build edebilmek adına adresi de gönderiyoruz
  if (chain === "stellar" && extra.stellarAddress) {
    payload.stellar_address = extra.stellarAddress;
  }
  console.log("createListingIntent payload:", payload);
  const { data } = await axios.post(
    `${API}/payments/intent/listing`,
    payload,
    { withCredentials: true }
  );

  // Solana için message_b64, Stellar için xdr dönecek
  return data;
}

export async function createPurchaseIntent({ bot_id, seller_wallet, price_usd, chain = 'solana' }) {
  const { data } = await axios.post(
    `${API}/payments/intent/purchase`,
    { bot_id, seller_wallet, price_usd, chain },
    { withCredentials: true }
  );
  return data;
}

// Ödeme onayı
export async function confirmPayment(intentId, signature, chain) {
  const { data } = await axios.post(
    `${API}/payments/confirm`,
    {
      intent_id: intentId,
      signature,
      chain, // <--- yeni alan
    },
    { withCredentials: true }
  );
  return data;
}