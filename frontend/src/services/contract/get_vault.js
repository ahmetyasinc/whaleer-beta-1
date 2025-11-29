// src/app/services/contract/get_vault.js
"use client";

import {
  Contract,
  TransactionBuilder,
  Networks,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";

const { Server, Api } = rpc;

// ENV
const RPC_URL = process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;
const VAULT_CONTRACT_ID = process.env.NEXT_PUBLIC_VAULT_CONTRACT_ID;

export async function getVault({ botId, userId, publicKey }) {
  console.group("🔍 getVault Process Started");
  console.log("Input Params:", { botId, userId, publicKey });

  try {
    // --- 1. Validasyonlar ---
    if (!RPC_URL) throw new Error("RPC URL tanımlı değil.");
    if (!VAULT_CONTRACT_ID)
      throw new Error("VAULT Contract ID tanımlı değil.");
    if (!publicKey) throw new Error("Stellar cüzdanı bağlı değil.");

    // --- 2. RPC Server ---
    const server = new Server(RPC_URL, {
      allowHttp: RPC_URL.startsWith("http://"),
    });

    // --- 3. Source Account ---
    console.log("🔍 getVault için source account yükleniyor:", publicKey);
    const sourceAccount = await server.getAccount(publicKey);

    // --- 4. Contract & Argümanlar ---
    const contract = new Contract(VAULT_CONTRACT_ID);

    const botIdScVal = nativeToScVal(BigInt(botId), { type: "u64" });
    const userIdScVal = nativeToScVal(BigInt(userId), { type: "u64" });

    const op = contract.call("get_vault", botIdScVal, userIdScVal);

    // --- 5. Tx Build ---
    console.log("🛠 get_vault transaction build ediliyor...");
    const tx = new TransactionBuilder(sourceAccount, {
      fee: "100",
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(op)
      .setTimeout(30)
      .build();

    // --- 6. Simulate (read-only) ---
    console.log("⏳ get_vault simülasyonu başlatılıyor...");
    const sim = await server.simulateTransaction(tx);

    console.log("🔬 Simülasyon Sonucu (Raw):", sim);

    if (Api.isSimulationError(sim)) {
      console.error("❌ get_vault Simülasyon Hatası:", sim);
      throw new Error(
        `get_vault simulate hatası: ${sim.error || "Bilinmiyor"}`
      );
    }

    if (!sim.result || !sim.result.retval) {
      console.error("❌ get_vault sonucu boş:", sim);
      throw new Error("get_vault sonucu alınamadı (retval yok).");
    }

    // --- 7. Sonucu decode et ---
    const vaultScVal = sim.result.retval;
    const vaultNative = scValToNative(vaultScVal);

    // 1) BigInt → number (stroops)
    const rawBalance = Number(vaultNative.balance); // 195645236

    // 2) Stroops → XLM
    const balanceXlm = rawBalance / 1e7;

    // 3) XLM → USDC çevir
    const balanceUsdc = await convertXlmToUsdc(balanceXlm);

    const normalizedVault = {
      ...vaultNative,
      profit_share_bps: Number(vaultNative.profit_share_bps),
      platform_cut_bps: Number(vaultNative.platform_cut_bps),

      // Hem ham değerleri koruyoruz hem USDC yolluyoruz
      balance_raw: rawBalance,
      balance_xlm: balanceXlm,
      balance_usdc: Number(balanceUsdc.toFixed(6)), // final değer
    };
    console.log("✅ getVault Sonucu (Normalized):", normalizedVault);
    return normalizedVault;

  } catch (error) {
    console.error("🚨 getVault CATCH:", error);
    console.groupEnd();
    throw error;
  }
}

async function convertXlmToUsdc(amountXlm) {
  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=stellar,usd-coin&vs_currencies=usd";

    const res = await fetch(url);
    if (!res.ok) throw new Error("Kur bilgisi alınamadı.");

    const data = await res.json();
    const xlmUsd = Number(data?.stellar?.usd);     // 1 XLM kaç USD
    const usdcUsd = Number(data?.["usd-coin"]?.usd ?? 1); // Genelde 1

    if (!xlmUsd) throw new Error("Geçersiz XLM fiyatı.");

    const rate = xlmUsd / usdcUsd;  
    // Bu aslında 1 XLM = ? USDC anlamına gelir.

    console.log(`💱 Kur Oranı: 1 XLM = ${rate.toFixed(4)} USDC`);

    return amountXlm * rate;
  } catch (e) {
    console.error("XLM → USDC dönüşüm hatası:", e);
    throw e;
  }
}

