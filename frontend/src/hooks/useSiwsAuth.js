// src/hooks/useSiwsAuth.js
"use client";
import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { getNonce, verifySIWS } from "@/api/auth";
import { useSiwsStore } from "@/store/auth/siwsStore";

// Yardımcı: Kullanıcı reddi mi?
function isUserRejected(err) {
  if (!err) return false;
  // Wallet adapter/Phantom farklı mesajlar döndürebilir:
  const msg = String(err.message || err.toString() || "").toLowerCase();
  return (
    err.code === 4001 ||                      // yaygın "userRejectedRequest" kodu
    err.name === "WalletSignMessageError" ||  // adapter error türü
    msg.includes("user rejected") ||
    msg.includes("rejected the request")
  );
}

export default function useSiwsAuth() {
  const { publicKey, connected, connect, signMessage } = useWallet();
  const setAuthLoading = useSiwsStore((s) => s.setAuthLoading);
  const setWallet = useSiwsStore((s) => s.setWallet);

  const connectWalletAndSignIn = useCallback(async () => {
    setAuthLoading(true);
    try {
      // 1) Gerekirse cüzdan bağla
      try {
        if (!connected) await connect();
      } catch (err) {
        if (isUserRejected(err)) return; // sessizce çık
        throw err; // gerçek hata ise yükselt
      }

      const pkBase58 = publicKey?.toBase58();
      if (!pkBase58) throw new Error("Wallet not ready");

      // 2) nonce
      const { nonce } = await getNonce(pkBase58);

      // 3) mesajı imzala
      let sigBytes;
      try {
        const message = new TextEncoder().encode(`Whaleer wants you to sign in.\nNonce: ${nonce}`);
        sigBytes = await signMessage(message);
      } catch (err) {
        if (isUserRejected(err)) return; // kullanıcı reddetti → sessiz çık
        throw err; // başka hata
      }

      // 4) verify → cookie set
      const data = await verifySIWS({
        publicKey: pkBase58,
        signature: bs58.encode(sigBytes),
        nonce,
      });

      if (data?.wallet) setWallet(data.wallet);
    } finally {
      setAuthLoading(false);
    }
  }, [connected, connect, publicKey, signMessage, setWallet, setAuthLoading]);

  return { connectWalletAndSignIn };
}
