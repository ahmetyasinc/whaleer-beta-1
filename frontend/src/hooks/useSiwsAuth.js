// src/hooks/useSiwsAuth.js
"use client";
import { useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { getNonce, verifySIWS } from "@/api/auth";
import { useSiwsStore } from "@/store/auth/siwsStore";
import usePhantomAvailability from "@/hooks/usePhantomAvailability";

function isUserRejected(err) {
  if (!err) return false;
  const msg = String(err.message || err.toString() || "").toLowerCase();
  return (
    err.code === 4001 ||
    err.name === "WalletSignMessageError" ||
    msg.includes("user rejected") ||
    msg.includes("rejected the request")
  );
}
function isWalletNotSelected(err) {
  if (!err) return false;
  const name = String(err.name || "").toLowerCase();
  const msg = String(err.message || err.toString() || "").toLowerCase();
  return (
    name.includes("walletnotselectederror") ||
    msg.includes("wallet not selected") ||
    msg.includes("no wallet found") ||
    msg.includes("no wallet") ||
    msg.includes("provider not found")
  );
}

export default function useSiwsAuth() {
  const { publicKey, connected, connect, signMessage, select, wallets, wallet } = useWallet();
  const { isPhantomInstalled, readyState } = usePhantomAvailability();
  const setAuthLoading = useSiwsStore((s) => s.setAuthLoading);
  const setWallet = useSiwsStore((s) => s.setWallet);

  // → Edge fix: Phantom’u bulup seçiyoruz
  const selectPhantomIfNeeded = () => {
    // adapter ismi genelde "Phantom"
    const phantom = wallets.find(
      (w) => w?.adapter?.name?.toLowerCase?.().includes("phantom")
    );
    if (phantom && (!wallet || wallet.adapter.name !== phantom.adapter.name)) {
      select(phantom.adapter.name);
    }
  };

  const connectWalletAndSignIn = useCallback(async () => {
    setAuthLoading(true);
    try {
      // 0) Phantom yoksa kurulum sayfasına yönlendir
      if (!isPhantomInstalled && readyState !== "Installed") {
        if (typeof window !== "undefined") {
          window.open("https://phantom.app/download", "_blank", "noopener,noreferrer");
        }
        return;
      }

      // 1) Edge’de kritik: önce Phantom’u seç, sonra connect
      selectPhantomIfNeeded();

      try {
        if (!connected) await connect(); // user gesture context içinde
      } catch (err) {
        if (isUserRejected(err) || isWalletNotSelected(err)) return;
        throw err;
      }

      const pkBase58 = publicKey?.toBase58();
      if (!pkBase58) return;

      // 2) nonce + sign
      const { nonce } = await getNonce(pkBase58);
      let sigBytes;
      try {
        const message = new TextEncoder().encode(`Whaleer wants you to sign in.\nNonce: ${nonce}`);
        sigBytes = await signMessage(message);
      } catch (err) {
        if (isUserRejected(err) || isWalletNotSelected(err)) return;
        throw err;
      }

      // 3) verify → cookie set
      const data = await verifySIWS({
        publicKey: pkBase58,
        signature: bs58.encode(sigBytes),
        nonce,
      });

      if (data?.wallet) setWallet(data.wallet);
    } finally {
      setAuthLoading(false);
    }
  }, [connected, connect, publicKey, signMessage, setWallet, setAuthLoading, isPhantomInstalled, readyState, wallets, wallet, select]);

  return { connectWalletAndSignIn, isPhantomInstalled, readyState };
}
