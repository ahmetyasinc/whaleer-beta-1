// src/app/services/contract/withdraw.js
"use client";

import {
  Contract,
  TransactionBuilder,
  Networks,
  nativeToScVal,
  rpc,
} from "@stellar/stellar-sdk";
import { kit } from "@/lib/stellar-kit";

const { Server, Api, assembleTransaction } = rpc;

// ENV
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
const VAULT_CONTRACT_ID = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID;

/**
 * Vault kontratından withdraw işlemi yapar.
 *
 * @param {Object} params
 * @param {string|number} params.botId
 * @param {string|number} params.userId
 * @param {string|number} params.amountUsdc  - Kullanıcının girdiği USDC miktarı
 * @param {string} params.publicKey          - Kullanıcı Stellar public key
 */
export async function withdrawFromVault({
  botId,
  userId,
  amountUsdc,
  publicKey,
}) {
  console.group("🚀 Withdraw Process Started");
  console.log("Input Params:", { botId, userId, amountUsdc, publicKey });

  try {
    // --- 1. Validasyonlar ---
    const numericAmount = Number(amountUsdc);
    if (!numericAmount || isNaN(numericAmount) || numericAmount <= 0) {
      throw new Error("Geçersiz çekim miktarı");
    }
    if (!publicKey) throw new Error("Stellar cüzdanı bağlı değil.");
    if (!RPC_URL) throw new Error("RPC URL tanımlı değil.");
    if (!VAULT_CONTRACT_ID)
      throw new Error("VAULT Contract ID tanımlı değil.");

    console.log("✅ Validasyonlar başarılı.");

    // --- 2. USDC -> XLM Dönüşümü ---
    console.log("💱 Kur bilgisi alınıyor (CoinGecko)...");
    const amountXlm = await convertUsdcToXlm(numericAmount);

    // 7 decimal stroop hesaplama
    const amountXlmStroops = Math.floor(amountXlm * 1e7);

    console.log(
      `💰 Kur Dönüşümü: ${amountUsdc} USDC ≈ ${amountXlm.toFixed(4)} XLM`
    );
    console.log(
      `💎 Contract'a gidecek ham değer (Stroops): ${amountXlmStroops}`
    );

    // --- 3. Soroban Server ---
    const server = new Server(RPC_URL, {
      allowHttp: RPC_URL.startsWith("http://"),
    });

    // --- 4. Hesap Bilgisi (sourceAccount) ---
    console.log("🔍 Kullanıcı hesabı çekiliyor:", publicKey);
    const sourceAccount = await server.getAccount(publicKey);

    // --- 5. Contract Hazırlığı ---
    const contract = new Contract(VAULT_CONTRACT_ID);

    const botIdScVal = nativeToScVal(BigInt(botId), { type: "u64" });
    const userScVal = nativeToScVal(BigInt(userId), { type: "u64" });
    const amountBigInt = BigInt(amountXlmStroops);
    const amountScVal = nativeToScVal(amountBigInt, { type: "i128" });

    console.log("📝 Contract argümanları (XDR) hazırlandı.");

    // 🔹 Burada deposit yerine withdraw çağırıyoruz
    const op = contract.call("withdraw", botIdScVal, userScVal, amountScVal);

    // --- 6. Tx Build & Simulate ---
    console.log("🛠 Transaction oluşturuluyor (Pre-Simulate)...");
    let tx = new TransactionBuilder(sourceAccount, {
      fee: "100", // base fee (stroops)
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    console.log("⏳ Simülasyon başlatılıyor...");
    const sim = await server.simulateTransaction(tx);

    console.log("🔬 Simülasyon Sonucu (Raw):", sim);

    if (Api.isSimulationError(sim)) {
      console.error("❌ Simülasyon Hatası Detayı:", sim);
      console.error("❌ Hata Eventleri:", sim.events);
      throw new Error(`Contract simulate hatası: ${sim.error || "Bilinmiyor"}`);
    }

    console.log("✅ Simülasyon BAŞARILI. Maliyet (Cost) hesaplanıyor...");

    // --- 7. Assemble (Resource & Auth) ---
    const assembledBuilder = assembleTransaction(tx, sim);
    tx = assembledBuilder.build();
    console.log("📦 Transaction monte edildi (Assembled).");

    // --- 8. İmzalama (Wallet Kit) ---
    const txXdr = tx.toXDR();
    console.log("✍ Cüzdan imzası bekleniyor...");

    const signResult = await kit.signTransaction(txXdr, {
      networkPassphrase: NETWORK_PASSPHRASE,
      address: publicKey,
    });

    const signedXdr =
      signResult?.signedTxXdr || signResult?.signedXdr || signResult;

    if (!signedXdr || typeof signedXdr !== "string") {
      console.error("❌ İmza başarısız veya iptal edildi:", signResult);
      throw new Error("Cüzdan işlemi imzalayamadı.");
    }

    console.log("✅ İmza alındı.");

    const signedTx = TransactionBuilder.fromXDR(
      signedXdr,
      NETWORK_PASSPHRASE
    );

    // --- 9. Gönderim ---
    console.log("🚀 Transaction ağa gönderiliyor (withdraw)...");
    const sendResp = await server.sendTransaction(signedTx);

    if (sendResp.status === "ERROR" || sendResp.errorResult) {
      console.error("❌ Send Transaction Hatası:", sendResp);
      throw new Error("Withdraw transaction gönderimi başarısız oldu.");
    }

    console.log("✅ Gönderildi! Hash:", sendResp.hash);

    const txStatus =
      sendResp.status === "ERROR" || sendResp.errorResult
        ? "FAILED"
        : sendResp.status || "SENT";

    console.log("🎉 Withdraw işlemi gönderildi! Local status:", txStatus);
    console.groupEnd();

    return {
      hash: sendResp.hash,
      status: txStatus,
    };
  } catch (error) {
    console.error("🚨 withdrawFromVault CATCH:", error);
    console.groupEnd();
    throw error;
  }
}

/**
 * USDC -> XLM dönüşümü (CoinGecko üzerinden)
 * amountUsdc: number
 * return: number (XLM miktarı)
 */
async function convertUsdcToXlm(amountUsdc) {
  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=usd";

    const res = await fetch(url);
    if (!res.ok) throw new Error("Kur bilgisi alınamadı.");

    const data = await res.json();
    const xlmUsd = Number(data?.stellar?.usd);
    const usdcUsd = Number(data?.["usd-coin"]?.usd ?? 1);

    if (!xlmUsd) throw new Error("Geçersiz XLM fiyatı.");

    const rate = usdcUsd / xlmUsd;
    console.log(`💱 Kur Oranı: 1 USDC = ${rate.toFixed(4)} XLM`);

    return amountUsdc * rate;
  } catch (e) {
    console.error("Kur çevirme hatası:", e);
    throw e;
  }
}
