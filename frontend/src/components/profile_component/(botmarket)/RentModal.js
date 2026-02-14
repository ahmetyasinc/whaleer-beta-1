"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import api from "@/api/axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedMessage, VersionedTransaction } from "@solana/web3.js";
// --- STELLAR REMOVED ---
// -----------------------
import ModalFrame from "./ModalFrame";
import ErrorBar from "../(showcase)/(checkout)/ErrorBar";
import InfoRow from "../(showcase)/(checkout)/InfoRow";
import SkeletonLines from "../(showcase)/(checkout)/SkeletonLines";
import { toast } from "react-toastify";
import { createPurchaseIntent, confirmPayment } from "@/api/payments"; // tek tip intent
import { acquireBot } from "@/api/bots";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useSiwsStore } from "@/store/auth/siwsStore";



const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

// Ağ ayarları
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";

// Base64 → Uint8Array
function b64ToUint8Array(b64) {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

// SOL/USDT
async function fetchSolUsdtPrice(signal) {
  try {
    const r1 = await fetch(
      "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
      { credentials: "omit", cache: "no-store", signal }
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
      { credentials: "omit", cache: "no-store", signal }
    );
    if (r2.ok) {
      const j = await r2.json();
      const p = parseFloat(j?.solana?.usd);
      if (!Number.isNaN(p)) return p;
    }
  } catch (_) { }
  return null;
}



export default function RentModal({ botId, onClose, minDays = 1 }) {
  const { t } = useTranslation("botMarketRentModal");

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const [days, setDays] = useState(minDays);
  const [submitting, setSubmitting] = useState(false);

  const [solUsdt, setSolUsdt] = useState(null);
  const [xlmUsdt, setXlmUsdt] = useState(null);
  const priceTimerRef = useRef(null);
  const abortRef = useRef(null);

  // --- CÜZDANLAR ---
  const { walletLinked } = useSiwsStore(); // Solana (Phantom) SIWS bağlı mı?
  const { publicKey, sendTransaction, connected } = useWallet(); // Solana
  // -----------------

  // ✅ başarı animasyonu için state
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const router = useRouter();

  // Sadece Solana
  const activeChain = useMemo(() => {
    if (walletLinked && publicKey && connected) return "solana";
    return null;
  }, [walletLinked, publicKey, connected]);

  // Checkout summary (rent)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.get(
          `/bots/${botId}/checkout-summary`,
          { params: { action: "rent" } }
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
    return () => {
      alive = false;
    };
  }, [botId, t]);

  // SOL & XLM fiyatı
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

  const dailyUsd = summary?.price ? Number(summary.price) : null;
  const totalUsd = dailyUsd && days ? dailyUsd * Math.max(minDays, days) : null;
  const totalSol = totalUsd && solUsdt ? totalUsd / solUsdt : null;

  async function handleContinue() {
    setError(null);

    // Hiç aktif chain yoksa
    if (!activeChain) {
      setError(t("errors.connectWallet"));
      return;
    }

    // Chain’e göre bağlantı kontrolleri
    if (activeChain === "solana") {
      if (!walletLinked || !publicKey || !connected) {
        setError(t("errors.connectWallet"));
        return;
      }
    }

    if (!summary?.revenue_wallet || !(dailyUsd > 0) || !(days >= minDays)) {
      setError(t("errors.invalidCheckout"));
      return;
    }

    const price_usd = Number(totalUsd);
    const toastId = toast.loading(t("toasts.preparing"));
    setSubmitting(true);

    try {

      const intent = await createPurchaseIntent({
        bot_id: botId,
        seller_wallet: summary.revenue_wallet,
        price_usd,
        chain: activeChain,
      })
      // SOLANA
      const msgBytes = b64ToUint8Array(intent.message_b64);
      const message = VersionedMessage.deserialize(msgBytes);
      const tx = new VersionedTransaction(message);

      toast.update(toastId, { render: t("toasts.signWallet"), isLoading: true });
      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      const signature = await sendTransaction(tx, connection, {
        skipPreflight: false,
      });

      toast.update(toastId, { render: t("toasts.confirmOnchain"), isLoading: true });
      const confirmation = await confirmPayment(intent.intent_id, signature);
      toast.update(toastId, { render: t("toasts.activatingRental"), isLoading: true });
      await acquireBot(botId, {
        action: "rent",
        price_paid: price_usd,
        tx: confirmation.tx_hash || confirmation.signature || "ok",
        rent_duration_days: Number(days),
      });

      if (!confirmation?.ok) throw new Error(t("errors.notConfirmed"));

      // ✅ Başarılı → animasyon
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
        render:
          e?.response?.data?.detail ||
          e?.message ||
          t("errors.operationFailed"),
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
      setError(
        e?.response?.data?.detail ||
        e?.message ||
        t("errors.operationFailed")
      );
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
          {/* Ağ seçimi / rozet */}
          <div className="flex justify-center mb-2">
            {activeChain === "solana" ? (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-200 border border-green-500/40">
                <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                {t('network.solana')}
              </span>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-200 border border-red-500/40">
                {t('network.notConnected')}
              </span>
            )}
          </div>

          <InfoRow label={t("rows.action")} value={t("actionNames.rent")} />
          <InfoRow label={t("rows.botName")} value={summary.bot_name} />
          <InfoRow label={t("rows.owner")} value={summary.owner_username} />

          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-300 mb-2">
              {t("rows.durationTitle")}
            </div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={minDays}
                value={days}
                onChange={(e) =>
                  setDays(Math.max(minDays, Number(e.target.value)))
                }
                className="w-24 px-2 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:outline-none"
              />
              <span className="text-xs text-gray-400">
                {t("rows.minDaysHint", { minDays })}
              </span>
            </div>
          </div>

          <InfoRow
            label={t("rows.dailyUsd")}
            value={
              dailyUsd !== null ? `${dailyUsd.toFixed(2)} $` : "-"
            }
          />
          <InfoRow
            label={t("rows.totalUsd")}
            value={
              totalUsd !== null ? `${totalUsd.toFixed(2)} $` : "-"
            }
          />

          {activeChain === "solana" && totalSol !== null && (
            <InfoRow
              label={t("rows.totalSol")}
              value={`${totalSol.toFixed(4)} SOL`}
            />
          )}



          <InfoRow
            label={t("rows.revenueWallet")}
            value={summary.revenue_wallet}
            mono
          />

          <div className="mt-6 flex gap-2">
            <button
              className="px-4 py-2 rounded-lg bg-gray-700 text-gray-100 hover:bg-gray-600"
              onClick={onClose}
              type="button"
            >
              {t("buttons.cancel")}
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-60"
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
