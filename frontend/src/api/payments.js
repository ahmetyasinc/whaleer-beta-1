// src/api/payments.js
import api from "@/api/axios";

const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, "");

// Listing intent (1 USD platform fee)
// GÜNCELLEME: 'chain' parametresi eklendi (varsayılan 'solana')
export async function createListingIntent(botId, chain = "solana", extra = {}) {
  const payload = {
    bot_id: botId,
    chain,
  };

  // Stellar için, XDR build edebilmek adına adresi de gönderiyoruz
  console.log("createListingIntent payload:", payload);
  const { data } = await api.post(
    "/payments/intent/listing",
    payload
  );

  // Solana için message_b64, Stellar için xdr dönecek
  return data;
}

export async function createPurchaseIntent({ bot_id, seller_wallet, price_usd, chain = 'solana' }) {
  const { data } = await api.post(
    "/payments/intent/purchase",
    { bot_id, seller_wallet, price_usd, chain }
  );
  return data;
}

// Ödeme onayı
export async function confirmPayment(intentId, signature, chain) {
  const { data } = await api.post(
    "/payments/confirm",
    {
      intent_id: intentId,
      signature,
      chain, // <--- yeni alan
    }
  );
  return data;
}