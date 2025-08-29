"use client";

import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import ModalFrame from "./ModalFrame";
import ErrorBar from "./ui/ErrorBar";
import InfoRow from "./ui/InfoRow";
import SkeletonLines from "./ui/SkeletonLines";
import { toast } from "react-toastify";
import { createPurchaseIntent, confirmPayment } from "@/api/payments"; // tek tip intent
import { acquireBot } from "@/api/bots";
import { useRouter } from "next/navigation";

const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const RPC_URL = "https://api.mainnet-beta.solana.com";

function b64ToUint8Array(b64) {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

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
  } catch (_) {}
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
  } catch (_) {}
  return null;
}

export default function RentModal({ botId, onClose, minDays = 1 }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const [days, setDays] = useState(minDays);
  const [submitting, setSubmitting] = useState(false);

  const [solUsdt, setSolUsdt] = useState(null);
  const priceTimerRef = useRef(null);
  const abortRef = useRef(null);

  const { publicKey, sendTransaction, connected } = useWallet();

  // ✅ başarı animasyonu için state
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);
  const router = useRouter();

  // Checkout summary (rent)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await axios.get(
          `${API}/api/bots/${botId}/checkout-summary`,
          { params: { action: "rent" }, withCredentials: true }
        );
        const data = res?.data;
        if (typeof data === "string") throw new Error("Non-JSON response received from server.");
        if (data?.detail) throw new Error(data.detail);
        if (alive) setSummary(data);
      } catch (e) {
        if (alive) setError(e?.response?.data?.detail || "Failed to preparation.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [botId]);

  // SOL/USDT periyodik fiyat
  useEffect(() => {
    abortRef.current = new AbortController();
    const load = async () => {
      try {
        const p = await fetchSolUsdtPrice(abortRef.current.signal);
        setSolUsdt(p);
      } catch (_) {}
    };
    load();
    priceTimerRef.current = setInterval(load, 30000);
    return () => {
      if (priceTimerRef.current) clearInterval(priceTimerRef.current);
      abortRef.current?.abort();
    };
  }, []);

  const dailyUsd = summary?.price ? Number(summary.price) : null;
  const totalUsd = (dailyUsd && days) ? dailyUsd * Math.max(minDays, days) : null;
  const totalSol = (totalUsd && solUsdt) ? (totalUsd / solUsdt) : null;

  async function handleContinue() {
    setError(null);

    if (!connected || !publicKey) {
      setError("Please connect your wallet.");
      return;
    }
    if (!summary?.revenue_wallet || !(dailyUsd > 0) || !(days >= minDays)) {
      setError("Invalid checkout data.");
      return;
    }

    const price_usd = Number(totalUsd);
    const toastId = toast.loading("Preparing payment...");
    setSubmitting(true);

    try {
      // 1) Tek tip intent (purchase) — toplam kiralama tutarı
      const intent = await createPurchaseIntent({
        bot_id: botId,
        seller_wallet: summary.revenue_wallet,
        price_usd
      });
      if (!intent?.message_b64 || !intent?.intent_id) throw new Error("Invalid intent from server.");

      // 2) Cüzdan işlemi
      const msgBytes = b64ToUint8Array(intent.message_b64);
      const message = VersionedMessage.deserialize(msgBytes);
      const tx = new VersionedTransaction(message);

      toast.update(toastId, { render: "Sign the transaction in your wallet...", isLoading: true });
      const connection = new Connection(RPC_URL, "confirmed");
      const signature = await sendTransaction(tx, connection, { skipPreflight: false });

      // 3) Sunucu onayı
      toast.update(toastId, { render: "Confirming on-chain payment...", isLoading: true });
      const confirmation = await confirmPayment(intent.intent_id, signature);
      if (!confirmation?.ok) throw new Error("Payment could not be confirmed.");

      // 4) Lisansı/kopyayı oluştur (rent)
      toast.update(toastId, { render: "Activating your rental...", isLoading: true });
      await acquireBot(botId, {
        action: "rent",
        price_paid: price_usd,
        tx: signature,
        rent_duration_days: Number(days)
      });

      // ✅ Başarılı → animasyonu aç
      setShowSuccessAnim(true);
      toast.dismiss(toastId);

      // kısa bir bekleme → modalı kapat → profile/bot’a yönlendir
      setTimeout(() => {
        setShowSuccessAnim(false);
        onClose?.();
        router.push("/profile/bot");
      }, 1200);

    } catch (e) {
      console.error(e);
      toast.update(toastId, { render: e?.response?.data?.detail || e?.message || "Operation failed.", type: "error", isLoading: false, autoClose: 3000 });
      setError(e?.response?.data?.detail || e?.message || "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalFrame title="Confirm Rental" onClose={onClose}>
      {loading && <SkeletonLines />}
      {!loading && error && <ErrorBar message={error} />}
      {!loading && !error && summary && (
        <div className="space-y-4 relative">
          <InfoRow label="Action" value="Rent" />
          <InfoRow label="Bot Name" value={summary.bot_name} />
          <InfoRow label="Owner" value={summary.owner_username} />

          <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
            <div className="text-xs text-gray-300 mb-2">Rental Duration (days)</div>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min={minDays}
                value={days}
                onChange={(e) => setDays(Math.max(minDays, Number(e.target.value)))}
                className="w-24 px-2 py-2 rounded-md bg-gray-800 text-white border border-gray-700 focus:outline-none"
              />
              <span className="text-xs text-gray-400">(min {minDays} day)</span>
            </div>
          </div>

          <InfoRow label="Daily Price (USD)" value={dailyUsd !== null ? `${dailyUsd.toFixed(2)} $` : "-"} />
          <InfoRow label="Total Price (USD)" value={totalUsd !== null ? `${totalUsd.toFixed(2)} $` : "-"} />
          {totalSol !== null && <InfoRow label="Approx. Total (SOL)" value={`${totalSol.toFixed(4)} SOL`} />}
          <InfoRow label="Revenue Wallet" value={summary.revenue_wallet} mono />

          <div className="mt-6 flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-100 hover:bg-gray-600" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-60"
              onClick={handleContinue}
              disabled={submitting}
            >
              {submitting ? "Processing..." : "Continue"}
            </button>
          </div>

          {/* ✅ Başarılı animasyon */}
          {showSuccessAnim && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl">
              <div className="flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-400 animate-scale-in">
                <svg className="w-12 h-12 text-emerald-400 animate-draw-check" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 6L9 17L4 12" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <style jsx>{`
                @keyframes scale-in { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                .animate-scale-in { animation: scale-in 0.25s ease-out; }
                @keyframes draw-check { 0% { stroke-dasharray: 0 100; } 100% { stroke-dasharray: 100 0; } }
                .animate-draw-check { stroke-dasharray: 100 0; animation: draw-check 0.5s ease-out forwards; }
              `}</style>
            </div>
          )}
        </div>
      )}
    </ModalFrame>
  );
}
