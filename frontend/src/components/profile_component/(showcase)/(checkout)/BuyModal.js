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
import { createPurchaseIntent, confirmPayment } from "@/api/payments";
import { acquireBot } from "@/api/bots";
import { useRouter } from "next/navigation";

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
    const r1 = await axios.get(
      "https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT",
      { withCredentials: false, signal }
    );
    const p1 = parseFloat(r1?.data?.price);
    if (!Number.isNaN(p1)) return p1;
  } catch (_) {}
  try {
    const r2 = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      { params: { ids: "solana", vs_currencies: "usd" }, withCredentials: false, signal }
    );
    const p2 = parseFloat(r2?.data?.solana?.usd);
    if (!Number.isNaN(p2)) return p2;
  } catch (_) {}
  return null;
}

export default function BuyModal({ botId, onClose }) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [solUsdt, setSolUsdt] = useState(null);
  const priceTimerRef = useRef(null);
  const abortRef = useRef(null);

  const { publicKey, sendTransaction, connected } = useWallet();
  const router = useRouter();

  // ✅ animasyon için state
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  // Checkout summary (buy)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true); setError(null);
        const res = await axios.get(
          `${API}/api/bots/${botId}/checkout-summary`,
          { params: { action: "buy" }, withCredentials: true }
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

  const usd = summary?.price ? Number(summary.price) : null;
  const sol = (usd && solUsdt) ? (usd / solUsdt) : null;

  async function handleContinue() {
    setError(null);

    if (!connected || !publicKey) {
      setError("Please connect your wallet.");
      return;
    }
    if (!summary?.revenue_wallet || !(usd > 0)) {
      setError("Invalid checkout data.");
      return;
    }

    const toastId = toast.loading("Preparing payment...");
    setSubmitting(true);
    try {
      // 1) Intent
      const intent = await createPurchaseIntent({
        bot_id: botId,
        seller_wallet: summary.revenue_wallet,
        price_usd: Number(usd)
      });
      if (!intent?.message_b64 || !intent?.intent_id) throw new Error("Invalid intent from server.");

      // 2) Wallet işlemi
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

      // 4) Lisansı/kopyayı oluştur
      toast.update(toastId, { render: "Activating your license...", isLoading: true });
      await acquireBot(botId, {
        action: "buy",
        price_paid: Number(usd),
        tx: signature
      });

      // ✅ Başarılı → animasyonu aç
      setShowSuccessAnim(true);
      toast.dismiss(toastId);

      // 1 saniye sonra modalı kapat + yönlendir
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
    <ModalFrame title="Confirm Purchase" onClose={onClose}>
      {loading && <SkeletonLines />}
      {!loading && error && <ErrorBar message={error} />}
      {!loading && !error && summary && (
        <div className="space-y-4 relative">
          <InfoRow label="Action" value="Buy" />
          <InfoRow label="Bot Name" value={summary.bot_name} />
          <InfoRow label="Seller Name" value={summary.owner_username} />
          <InfoRow label="Price (USD)" value={usd !== null ? `${usd.toFixed(2)} $` : "-"} />
          {sol !== null && <InfoRow label="Approx. Price (SOL)" value={`${sol.toFixed(4)} SOL`} />}
          <InfoRow label="Revenue Wallet" value={summary.revenue_wallet} mono />

          <div className="mt-6 flex gap-2">
            <button className="px-4 py-2 rounded-lg bg-gray-700 text-gray-100 hover:bg-gray-600" onClick={onClose}>
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 disabled:opacity-60"
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
