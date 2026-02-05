"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import api from "@/api/axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import ModalFrame from "./ModalFrame";
import ErrorBar from "./ui/ErrorBar";
import InfoRow from "./ui/InfoRow";
import SkeletonLines from "./ui/SkeletonLines";
import { toast } from "react-toastify";
import { createPurchaseIntent, confirmPayment } from "@/api/payments";
import { acquireBot } from "@/api/bots";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
// --- EKLENENLER ---
import { useSiwsStore } from "@/store/auth/siwsStore";
// -------------------

const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const RPC_URL = "https://api.mainnet-beta.solana.com";



// Base64 → Uint8Array
function b64ToUint8Array(b64) {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

// Harici fiyat (credentials kapalı)
async function fetchSolUsdtPrice(signal) {
  try {
    const r1 = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
      { signal }
    );
    if (r1.ok) {
      const j = await r1.json();
      const p = parseFloat(j.price);
      if (!Number.isNaN(p)) return p;
    }
  } catch (_) { }
  try {
    const r2 = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { signal }
    );
    if (r2.ok) {
      const j = await r2.json();
      const p = parseFloat(j?.solana?.usd);
      if (!Number.isNaN(p)) return p;
    }
  } catch (_) { }
  return null;
}




export default function BuyModal({ botId, onClose }) {
  const { t } = useTranslation("buyModal");

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [solUsdt, setSolUsdt] = useState(null);
  const [xlmUsdt, setXlmUsdt] = useState(null);
  const priceTimerRef = useRef(null);
  const abortRef = useRef(null);

  // --- CÜZDANLAR ---
  const { publicKey, sendTransaction, connected } = useWallet();          // Solana
  const { walletLinked } = useSiwsStore();                                 // Phantom SIWS bağlı mı?
  // -----------------

  const router = useRouter();

  // ✅ animasyon için state
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  // Sadece Solana
  const activeChain = useMemo(() => {
    if (walletLinked && publicKey && connected) return "solana";
    return null;
  }, [walletLinked, publicKey, connected]);
  // -------------------------------------------------------------

  // Checkout summary (buy)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(
          `/bots/${botId}/checkout-summary`,
          { params: { action: "buy" } }
        );
        const data = res?.data;
        if (typeof data === "string") throw new Error(t("errors.nonJson"));
        if (data?.detail) throw new Error(data.detail);
        if (alive) setSummary(data);
      } catch (e) {
        if (alive) setError(e?.response?.data?.detail || t("errors.prepareFailed"));
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [botId, t]);

  // SOL/USDT periyodik fiyat
  useEffect(() => {
    abortRef.current = new AbortController();

    const load = async () => {
      try {
        const [solPrice] = await Promise.all([
          fetchSolUsdtPrice(abortRef.current.signal),
        ]);
        setSolUsdt(solPrice);
      } catch (_) { }
    };

    load();
    priceTimerRef.current = setInterval(load, 30000);

    return () => {
      if (priceTimerRef.current) clearInterval(priceTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const usd = summary?.price ? Number(summary.price) : null;
  const sol = usd && solUsdt ? usd / solUsdt : null;


  async function handleContinue() {
    setError(null);

    // HİÇ CÜZDAN YOK
    if (!activeChain) {
      setError(t("errors.connectWallet"));
      return;
    }

    // zincire göre extra kontrol
    if (activeChain === "solana") {
      if (!walletLinked || !publicKey || !connected) {
        setError(t("errors.connectWallet"));
        return;
      }
    }

    if (!summary?.revenue_wallet || !(usd > 0)) {
      setError(t("errors.invalidCheckout"));
      return;
    }

    const toastId = toast.loading(t("toasts.preparing"));
    setSubmitting(true);
    try {
      // === MEVCUT SOLANA AKIŞI ===
      const intent = await createPurchaseIntent({
        bot_id: botId,
        seller_wallet: summary.revenue_wallet,
        price_usd: Number(usd),
        chain: activeChain
      });

      if (!intent?.intent_id) throw new Error(t("errors.invalidIntent"));
      if (!intent.message_b64) throw new Error(t("errors.invalidIntent"));

      const msgBytes = b64ToUint8Array(intent.message_b64);
      const message = VersionedMessage.deserialize(msgBytes);
      const tx = new VersionedTransaction(message);

      toast.update(toastId, { render: t("toasts.signWallet"), isLoading: true });
      const connection = new Connection(RPC_URL, "confirmed");
      const signature = await sendTransaction(tx, connection, { skipPreflight: false });

      toast.update(toastId, { render: t("toasts.confirmOnchain"), isLoading: true });
      const confirmation = await confirmPayment(intent.intent_id, signature);

      if (!confirmation?.ok) throw new Error(t("errors.notConfirmed"));

      await acquireBot(botId, {
        action: "buy",
        price_paid: Number(usd),
        tx: confirmation.tx_hash || confirmation.signature || "ok"
      });

      // ------------------------------------

      // ✅ Başarılı → animasyonu aç (Ortak)
      setShowSuccessAnim(true);
      toast.dismiss(toastId);

      setTimeout(() => {
        setShowSuccessAnim(false);
        onClose?.();
        router.push("/profile/bot");
      }, 1200);
    } catch (e) {
      console.error(e);
      toast.update(toastId, {
        render: e?.response?.data?.detail || e?.message || t("errors.operationFailed"),
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
      setError(e?.response?.data?.detail || e?.message || t("errors.operationFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalFrame title={t("title")} onClose={onClose}>
      {loading && <SkeletonLines />}
      {!loading && error && <ErrorBar message={error} />}
      {!loading && !error && summary && (
        <div className="space-y-4 relative">
          <div className="flex justify-center mb-2">
            {activeChain === "solana" ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-200 border border-green-500/40">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                Solana Network
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-200 border border-red-500/40">
                Wallet Not Connected
              </span>
            )}
          </div>
          {/* --------------------------------------------------- */}

          <InfoRow label={t("rows.action")} value={t("actionNames.buy")} />
          <InfoRow label={t("rows.botName")} value={summary.bot_name} />
          <InfoRow label={t("rows.sellerName")} value={summary.owner_username} />
          <InfoRow label={t("rows.priceUsd")} value={usd !== null ? `${usd.toFixed(2)} $` : "-"} />
          {activeChain === "solana" && sol !== null && (<InfoRow label={t("rows.approxSol")} value={`${sol.toFixed(4)} SOL`} />)}
          <InfoRow label={t("rows.revenueWallet")} value={summary.revenue_wallet} mono />

          <div className="mt-6 flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-gray-700 text-gray-100 hover:bg-gray-600"
              onClick={onClose}
              type="button"
            >
              {t("buttons.cancel")}
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-60"
              onClick={handleContinue}
              disabled={submitting || !activeChain}
              type="button"
            >
              {submitting ? t("buttons.processing") : t("buttons.continue")}
            </button>
          </div>

          {/* ✅ Başarılı animasyon */}
          {showSuccessAnim && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
              <div className="flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-400 animate-scale-in">
                <svg
                  className="w-12 h-12 text-emerald-400 animate-draw-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                >
                  <path
                    d="M20 6L9 17L4 12"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <style jsx>{`
                @keyframes scale-in {
                  0% {
                    transform: scale(0.9);
                    opacity: 0;
                  }
                  100% {
                    transform: scale(1);
                    opacity: 1;
                  }
                }
                .animate-scale-in {
                  animation: scale-in 0.25s ease-out;
                }
                @keyframes draw-check {
                  0% {
                    stroke-dasharray: 0 100;
                  }
                  100% {
                    stroke-dasharray: 100 0;
                  }
                }
                .animate-draw-check {
                  stroke-dasharray: 100 0;
                  animation: draw-check 0.5s ease-out forwards;
                }
              `}</style>
            </div>
          )}
        </div>
      )}
    </ModalFrame>
  );
}
