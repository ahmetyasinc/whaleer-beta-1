"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
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
import { useTranslation } from "react-i18next";
import { processStellarPurchase } from "@/services/stellar/stellarPurchaseService";

// --- EKLENENLER ---
import { useSiwsStore } from "@/store/auth/siwsStore";
import useStellarAuth from "@/hooks/useStellarAuth";
import { Horizon } from "@stellar/stellar-sdk";
import { kit } from "@/lib/stellar-kit";
// -------------------

const API = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
const RPC_URL = "https://api.mainnet-beta.solana.com";

// Stellar ağ sabitleri (SellRentModal ile aynı tutuyoruz)
const STELLAR_HORIZON_URL = "https://horizon-testnet.stellar.org";
const STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

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

async function fetchXlmUsdtPrice(signal) {
  try {
    const r1 = await axios.get(
      "https://api.binance.com/api/v3/ticker/price?symbol=XLMUSDT",
      { withCredentials: false, signal }
    );
    const p1 = parseFloat(r1?.data?.price);
    if (!Number.isNaN(p1)) return p1;
  } catch (_) {}

  try {
    const r2 = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price",
      { params: { ids: "stellar", vs_currencies: "usd" }, withCredentials: false, signal }
    );
    const p2 = parseFloat(r2?.data?.stellar?.usd);
    if (!Number.isNaN(p2)) return p2;
  } catch (_) {}

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
  const { stellarAddress } = useStellarAuth();                             // Stellar (Freighter)
  // -----------------

  const router = useRouter();

  // ✅ animasyon için state
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  // --- AKTİF ZİNCİR SEÇİM MANTIĞI (SellRentModal ile uyumlu) ---
  const isBothConnected = Boolean(walletLinked && publicKey && stellarAddress);

  const [manualChainChoice, setManualChainChoice] = useState(null);

  const activeChain = useMemo(() => {
    // 1) İki cüzdan da bağlı ve kullanıcı seçim yaptıysa onu kullan
    if (isBothConnected && manualChainChoice) return manualChainChoice;

    // 2) İki cüzdan bağlı, seçim yoksa (ilk açılış) default Stellar
    if (isBothConnected) return "stellar";

    // 3) Tek cüzdan bağlıysa onu kullan
    if (stellarAddress) return "stellar";
    if (walletLinked && publicKey && connected) return "solana";

    return null;
  }, [isBothConnected, manualChainChoice, stellarAddress, walletLinked, publicKey, connected]);

  // Modal her açıldığında seçim reset olsun
  useEffect(() => {
    if (!isBothConnected) {
      setManualChainChoice(null);
    } else if (!manualChainChoice) {
      setManualChainChoice("stellar");
    }
  }, [isBothConnected, manualChainChoice]);
  // -------------------------------------------------------------

  // Checkout summary (buy)
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await axios.get(
          `${API}/api/bots/${botId}/checkout-summary`,
          { params: { action: "buy" }, withCredentials: true }
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
        const [solPrice, xlmPrice] = await Promise.all([
          fetchSolUsdtPrice(abortRef.current.signal),
          fetchXlmUsdtPrice(abortRef.current.signal),
        ]);
        setSolUsdt(solPrice);
        setXlmUsdt(xlmPrice);
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
  const sol = usd && solUsdt ? usd / solUsdt : null;
  const xlm = usd && xlmUsdt ? usd / xlmUsdt : null;


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
    } else if (activeChain === "stellar") {
      if (!stellarAddress) {
        setError("Please connect your Stellar wallet (Freighter).");
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
        // --- BURAYI DEĞİŞTİRİYORUZ ---

        if (activeChain === "stellar") {
          // === YENİ STELLAR AKIŞI (SOROBAN) ===
          toast.update(toastId, { render: "Processing Stellar/Soroban transaction...", isLoading: true });
        
          // xlm değişkeni component içinde zaten hesaplanmıştı (fiyat)
          if (!xlm) throw new Error("XLM Price not calculated");
        
          await processStellarPurchase({
            botId: botId,
            sellerAddress: summary.revenue_wallet,
            userAddress: stellarAddress,
            purchaseType: "BUY",
            rentDays: 0,
            priceXlm: xlm // Hesaplanan anlık XLM tutarı
          });
        
          // Backend onayı zaten servis içinde yapıldı
          toast.update(toastId, { render: t("toasts.paymentConfirmed"), type: "success", isLoading: false, autoClose: 1500 });
        
        } else {
          // === MEVCUT SOLANA AKIŞI (AYNEN KALIYOR) ===
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

          // Solana için acquireBot çağrısı burada kalabilir veya backend zaten hallediyor mu kontrol et.
          // Senin yeni backend yapında confirm-order zaten botu veriyor. 
          // Ancak Solana tarafı eski API kullanıyorsa bu satır kalmalı:
          await acquireBot(botId, {
             action: "buy",
             price_paid: Number(usd),
             tx: confirmation.tx_hash || confirmation.signature || "ok"
          });
        }
      
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
          {/* --- AĞ SEÇİMİ / GÖSTERİMİ (SellRentModal tarzı) --- */}
          <div className="flex justify-center mb-2">
            {isBothConnected ? (
              <div className="flex items-center bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 shadow-inner">
                <button
                  type="button"
                  onClick={() => setManualChainChoice("stellar")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    activeChain === "stellar"
                      ? "bg-purple-900/50 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)] border border-purple-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-zinc-800"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activeChain === "stellar" ? "bg-purple-400 animate-pulse" : "bg-gray-600"
                    }`}
                  />
                  Stellar
                </button>
                <button
                  type="button"
                  onClick={() => setManualChainChoice("solana")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 ${
                    activeChain === "solana"
                      ? "bg-green-900/50 text-green-200 shadow-[0_0_10px_rgba(34,197,94,0.3)] border border-green-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-zinc-800"
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      activeChain === "solana" ? "bg-green-400 animate-pulse" : "bg-gray-600"
                    }`}
                  />
                  Solana
                </button>
              </div>
            ) : (
              <>
                {activeChain === "stellar" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-200 border border-purple-500/40">
                    <span className="w-2 h-2 rounded-full bg-purple-400 mr-2" />
                    Stellar Network
                  </span>
                )}
                {activeChain === "solana" && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-200 border border-green-500/40">
                    <span className="w-2 h-2 rounded-full bg-green-400 mr-2" />
                    Solana Network
                  </span>
                )}
                {!activeChain && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-900/30 text-red-200 border border-red-500/40">
                    Wallet Not Connected
                  </span>
                )}
              </>
            )}
          </div>
          {/* --------------------------------------------------- */}

          <InfoRow label={t("rows.action")} value={t("actionNames.buy")} />
          <InfoRow label={t("rows.botName")} value={summary.bot_name} />
          <InfoRow label={t("rows.sellerName")} value={summary.owner_username} />
          <InfoRow label={t("rows.priceUsd")} value={usd !== null ? `${usd.toFixed(2)} $` : "-"}/>
          {activeChain === "solana" && sol !== null && (<InfoRow label={t("rows.approxSol")} value={`${sol.toFixed(4)} SOL`}/>)}
          {activeChain === "stellar" && xlm !== null && (<InfoRow label={t("rows.approxXlm")} value={`${xlm.toFixed(2)} XLM`} /> )}
          <InfoRow  label={t("rows.revenueWallet")}  value={summary.revenue_wallet}  mono/>

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
