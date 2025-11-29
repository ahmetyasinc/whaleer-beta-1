"use client";
import { useState } from "react";
import { kit } from "@/lib/stellar-kit";
import { useSiwsStore } from "@/store/auth/siwsStore";
import { getNonce, verifyStellar } from "@/api/auth";
import { toast } from "react-toastify";
import { Keypair } from "@stellar/stellar-sdk";

export default function useStellarAuth() {
  // Freighter / Stellar Wallets Kit'in mesaj imza formatı için prefix
  const SIGN_MESSAGE_PREFIX = "Stellar Signed Message:\n";

  const [loading, setLoading] = useState(false);
  const {
    stellarAddress,
    setStellarAddress,
    disconnectStellar: disconnectStore,
  } = useSiwsStore();

  const connectStellar = async () => {
    setLoading(true);
    try {
      await kit.openModal({
        onWalletSelected: async (option) => {
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();
            console.log("✅ 1. Adres:", address);

            const nonceRes = await getNonce(address);
            if (!nonceRes?.nonce) throw new Error("Nonce alınamadı.");

            // Satır sonu karakteri olmayan TEMİZ mesaj
            const messageToSign = `Whaleer wants you to sign in. Nonce: ${nonceRes.nonce}`;
            console.log("📝 2. Mesaj:", messageToSign);

            // İmzala
            const signResult = await kit.signMessage(messageToSign);

            let signature = "";
            if (typeof signResult === "string") signature = signResult;
            else if (signResult?.signature) signature = signResult.signature;
            else if (signResult?.signedMessage) signature = signResult.signedMessage;

            if (!signature) throw new Error("İmza verisi boş.");
            console.log("🔐 3. İmza (Base64):", signature);

            // --- FRONTEND DOĞRULAMA TESTİ (Opsiyonel) ---
            try {
              const kp = Keypair.fromPublicKey(address);
              const sigBytes = Buffer.from(signature, "base64");

              // Freighter / Stellar Wallets Kit şuna benzer bir format imzalıyor:
              // SHA256("Stellar Signed Message:\n" + message)
              const payload = SIGN_MESSAGE_PREFIX + messageToSign;
              const payloadBytes = new TextEncoder().encode(payload);
              const hashBuffer = await crypto.subtle.digest(
                "SHA-256",
                payloadBytes
              );
              const hashBytes = Buffer.from(hashBuffer);

              const valid = kp.verify(hashBytes, sigBytes);
              console.log(
                `🧪 Test (Prefix + SHA256): ${
                  valid ? "BAŞARILI ✅" : "BAŞARISIZ ❌"
                }`
              );
              if (!valid) {
                console.warn(
                  "🚨 Frontend doğrulama başarısız. Backend de muhtemelen reddedecek."
                );
              }
            } catch (e) {
              console.warn("⚠️ Frontend test hatası:", e);
            }
            // ------------------------------------------------

            const verifyRes = await verifyStellar({
              publicKey: address,
              signature: signature,
              nonce: nonceRes.nonce,
              message: messageToSign,
            });

            if (verifyRes?.wallet) {
              setStellarAddress(verifyRes.wallet.address);
              toast.success("Stellar cüzdanı bağlandı!");
            }
          } catch (err) {
            console.error("Auth Error:", err);
            const msg = err.response?.data?.detail || err.message;
            toast.error(`Giriş hatası: ${msg}`);
            disconnectStore();
          }
        },
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const disconnectStellar = async () => {
    disconnectStore();
  };

  return { connectStellar, disconnectStellar, stellarAddress, isStellarLoading: loading };
}