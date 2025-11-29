"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedMessage, VersionedTransaction } from "@solana/web3.js";
// --- STELLAR ---
import { Horizon, TransactionBuilder } from "@stellar/stellar-sdk";
import { kit } from "@/lib/stellar-kit";
import useStellarAuth from "@/hooks/useStellarAuth";
// ---------------

import { toast } from "react-toastify";
import ChooseBotModal from "./chooseBotModal";
import { useSiwsStore } from "@/store/auth/siwsStore";
import { createListingIntent, confirmPayment } from "@/api/payments";
import { patchBotListing } from "@/api/bots";
import { useTranslation } from "react-i18next";
import { FiCheckCircle, FiCpu, FiPercent } from "react-icons/fi"; 

// Ağ Ayarları
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
const STELLAR_HORIZON_URL = "https://horizon-testnet.stellar.org";
const STELLAR_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";

const DEFAULT_PAYOUT_SOL = "AkmufZViBgt9mwuLPhFM8qyS1SjWNbMRBK8FySHajvUA";

// Helperlar
function b64ToUint8Array(b64) {
  const binStr = atob(b64);
  const len = binStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
  return bytes;
}

function calcPnlPct(initial, current) {
  const i = Number(initial ?? 0);
  const c = Number(current ?? 0);
  if (!(i > 0)) return null;
  return ((c - i) / i) * 100;
}

export default function SellRentModal({ open, onClose }) {
  const { t } = useTranslation('sellRentModal');

  // --- CÜZDAN DURUMLARI ---
  const { walletLinked } = useSiwsStore(); 
  const { publicKey, sendTransaction } = useWallet(); 
  const { stellarAddress } = useStellarAuth(); 

  // İkisi birden bağlı mı kontrolü
  const isBothConnected = Boolean(walletLinked && publicKey && stellarAddress);

  // Manuel seçim için state
  const [manualChainChoice, setManualChainChoice] = useState(null);

  // Aktif Zinciri Belirle
  const activeChain = useMemo(() => {
    if (isBothConnected && manualChainChoice) return manualChainChoice;
    if (isBothConnected) return 'stellar';
    if (stellarAddress) return 'stellar';
    if (walletLinked && publicKey) return 'solana';
    return null;
  }, [stellarAddress, walletLinked, publicKey, isBothConnected, manualChainChoice]);

  // Modal her açıldığında seçim resetleme
  useEffect(() => {
    if (open && isBothConnected && !manualChainChoice) {
      setManualChainChoice('stellar');
    }
  }, [open, isBothConnected]);

  // --- FORM STATE'LERİ ---
  const [sellChecked, setSellChecked] = useState(false);
  const [rentChecked, setRentChecked] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  
  // YENİ: Profit Sharing State'leri
  const [sellProfitShareEnabled, setSellProfitShareEnabled] = useState(false);
  const [sellProfitShareRate, setSellProfitShareRate] = useState("");

  const [rentProfitShareEnabled, setRentProfitShareEnabled] = useState(false);
  const [rentProfitShareRate, setRentProfitShareRate] = useState("");

  const [description, setDescription] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  const [chooseBotModalOpen, setChooseBotModalOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);

  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  // Otomatik Form Doldurma
  useEffect(() => {
    if (!selectedBot) return;

    const isListed = Boolean(selectedBot?.for_sale) || Boolean(selectedBot?.for_rent);

    if (isListed) {
      setSellChecked(Boolean(selectedBot?.for_sale));
      setRentChecked(Boolean(selectedBot?.for_rent));

      setSellPrice(selectedBot?.sell_price ?? "");
      setRentPrice(selectedBot?.rent_price ?? "");

      // ⭐ Sadece ilk load'da doldurulmalı ⭐
      if (!sellProfitShareRate && !rentProfitShareRate) {
        const soldRate = selectedBot?.sold_profit_share_rate ?? 0;
        const rentRate = selectedBot?.rent_profit_share_rate ?? 0;

        setSellProfitShareEnabled(soldRate > 0);
        setSellProfitShareRate(soldRate ? String(soldRate) : "");

        setRentProfitShareEnabled(rentRate > 0);
        setRentProfitShareRate(rentRate ? String(rentRate) : "");
      }

      setWalletAddress(selectedBot?.revenue_wallet ?? "");
      setDescription((selectedBot?.listing_description ?? selectedBot?.description ?? "").toString());
    }
    else {
      // Yeni listeleme - Varsayılanları sıfırla
      setSellChecked(false);
      setRentChecked(false);
      setSellPrice("");
      setRentPrice("");
      setSellProfitShareEnabled(false);
      setSellProfitShareRate("");
      setRentProfitShareEnabled(false);
      setRentProfitShareRate("");

      // Akıllı Cüzdan Doldurma
      if (activeChain === 'stellar' && stellarAddress) {
        setWalletAddress(stellarAddress);
      } else if (activeChain === 'solana' && publicKey) {
        setWalletAddress(publicKey.toBase58());
      } else {
        setWalletAddress("");
      }

      setDescription((selectedBot?.listing_description ?? selectedBot?.description ?? "").toString());
    }
  }, [selectedBot, activeChain, stellarAddress, publicKey]);

  const isNewListing = useMemo(() => {
    if (!selectedBot) return true;
    return !Boolean(selectedBot?.for_sale) && !Boolean(selectedBot?.for_rent);
  }, [selectedBot]);

  const hasAnyChoice = sellChecked || rentChecked;
  
  const priceValid =
    (!sellChecked || (sellPrice !== "" && Number(sellPrice) >= 0)) &&
    (!rentChecked || (rentPrice !== "" && Number(rentPrice) >= 0));

  // YENİ: Profit Share Validasyonu (0-100 arası)
  const profitShareValid = 
    (!sellChecked || !sellProfitShareEnabled || (Number(sellProfitShareRate) > 0 && Number(sellProfitShareRate) <= 100)) &&
    (!rentChecked || !rentProfitShareEnabled || (Number(rentProfitShareRate) > 0 && Number(rentProfitShareRate) <= 100));

  const walletValid = useMemo(() => {
    if (!walletAddress || walletAddress.length < 20) return false;
    if (activeChain === 'stellar') {
      return walletAddress.startsWith('G') && walletAddress.length === 56;
    }
    return true; 
  }, [walletAddress, activeChain]);

  // Payload Hazırlama
  const { diffPayload, hasDiff } = useMemo(() => {
    if (!selectedBot) return { diffPayload: {}, hasDiff: false };
    const payload={};
  
    if (activeChain) payload.revenue_chain = activeChain;
  
    const initForSale = Boolean(selectedBot?.for_sale);
    const initForRent = Boolean(selectedBot?.for_rent);
  
    if (initForSale !== sellChecked) payload.for_sale = sellChecked;
    if (initForRent !== rentChecked) payload.for_rent = rentChecked;
  
    // --- Fiyatlar ---
    if (sellChecked) {
      const val = sellPrice === "" ? null : Number(sellPrice);
      if (val !== selectedBot?.sell_price) payload.sell_price = val;
    }
    if (rentChecked) {
      const val = rentPrice === "" ? null : Number(rentPrice);
      if (val !== selectedBot?.rent_price) payload.rent_price = val;
    }
  
    // --- PROFIT SHARE ---
    // Global flag: herhangi birinde profit share açıksa true
    const nextIsProfitShare = (sellChecked && sellProfitShareEnabled) || (rentChecked && rentProfitShareEnabled);
    const initIsProfitShare = Boolean(selectedBot?.is_profit_share);

    if (nextIsProfitShare !== initIsProfitShare) {
        payload.is_profit_share = nextIsProfitShare;
    }

    // Satış oranı
    if (sellChecked) {
      payload.sold_profit_share_rate = sellProfitShareEnabled
        ? Number(sellProfitShareRate || 0)
        : 0;
    }
  
    // Kiralama oranı
    if (rentChecked) {
      payload.rent_profit_share_rate = rentProfitShareEnabled
        ? Number(rentProfitShareRate || 0)
        : 0;
    }
  
    // Cüzdan
    if (walletAddress && walletAddress !== selectedBot?.revenue_wallet) {
      payload.revenue_wallet = walletAddress;
    }
  
    // Açıklama
    const descTrim = (description ?? "").trim();
    const prevDesc = (selectedBot?.listing_description ?? "") + "";
    if (descTrim !== prevDesc) {
      payload.listing_description = descTrim.length ? descTrim : null;
    }
  
    const diff = Object.keys(payload).length > 0;
    return { diffPayload: payload, hasDiff: diff };
  }, [
    selectedBot,
    sellChecked,
    rentChecked,
    sellPrice,
    rentPrice,
    sellProfitShareEnabled,
    sellProfitShareRate,
    rentProfitShareEnabled,
    rentProfitShareRate,
    walletAddress,
    description,
    activeChain,
  ]);


  const canSubmit =
    !!selectedBot &&
    hasAnyChoice &&
    priceValid &&
    profitShareValid &&
    walletValid &&
    !loading &&
    !payLoading &&
    (!isNewListing || disclaimerAccepted) &&
    (isNewListing || hasDiff);

  if (!open) return null;

  function resetForm() {
    setSellChecked(false);
    setRentChecked(false);
    setSellPrice("");
    setRentPrice("");
    
    setSellProfitShareEnabled(false);
    setSellProfitShareRate("");
    setRentProfitShareEnabled(false);
    setRentProfitShareRate("");

    setDescription("");
    setManualChainChoice(null);
    setChooseBotModalOpen(false);
    setSelectedBot(null);
    setLoading(false);
    setPayLoading(false);
    setError(null);
    setDisclaimerAccepted(false);
    setShowSuccessAnim(false);
  }

  const handleSelectBot = (bot) => {
    setSelectedBot(bot);
    setChooseBotModalOpen(false);
  };

  async function payListingFeeIfNeeded() {
    if (!isNewListing) return { paid: false };
    if (!activeChain) throw new Error(t("errors.connectWalletFirst") || "Wallet not connected");
  
    setPayLoading(true);
    const toastId = toast.loading(t("toasts.preparingPayment"));
  
    try {
      const extra = {};
      if (activeChain === "stellar" && stellarAddress) {
        extra.stellarAddress = stellarAddress;
      }
    
      const intent = await createListingIntent(selectedBot.id, activeChain, extra);
    
      if (!intent?.intent_id) throw new Error(t("errors.invalidIntent"));
    
      let confirmationResult;
    
      // STELLAR
      if (activeChain === "stellar") {
        const xdr = intent.xdr || intent.message_b64;
        if (!xdr) throw new Error("Invalid Stellar XDR from backend");
      
        toast.update(toastId, { render: "Signing with Freighter...", isLoading: true });
      
        const { signedTxXdr } = await kit.signTransaction(xdr, {
          networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
          address: stellarAddress,
        });
      
        toast.update(toastId, { render: "Submitting to Stellar...", isLoading: true });
      
        const server = new Horizon.Server(STELLAR_HORIZON_URL);
        const tx = TransactionBuilder.fromXDR(signedTxXdr, STELLAR_NETWORK_PASSPHRASE);
      
        const submitResult = await server.submitTransaction(tx);
        const txHash = submitResult.hash;
      
        toast.update(toastId, { render: t("toasts.confirmOnchain"), isLoading: true });
        confirmationResult = await confirmPayment(intent.intent_id, txHash, "stellar");
      }
      // SOLANA
      else {
        const msgBytes = b64ToUint8Array(intent.message_b64);
        const message = VersionedMessage.deserialize(msgBytes);
        const tx = new VersionedTransaction(message);
      
        toast.update(toastId, { render: t("toasts.signInWallet"), isLoading: true });
        const connection = new Connection(SOLANA_RPC_URL, "confirmed");
        const signature = await sendTransaction(tx, connection, { skipPreflight: false });
      
        toast.update(toastId, { render: t("toasts.confirmOnchain"), isLoading: true });
        confirmationResult = await confirmPayment(intent.intent_id, signature, "solana");
      }
    
      if (!confirmationResult?.ok) throw new Error(t("errors.paymentNotConfirmed"));
    
      toast.update(toastId, { render: t("toasts.paymentConfirmed"), type: "success", isLoading: false, autoClose: 1500 });
      setShowSuccessAnim(true);
      await new Promise((r) => setTimeout(r, 900));
      setShowSuccessAnim(false);
    
      return { paid: true };
    } catch (e) {
      console.error(e);
      let errMsg = e?.message || t("toasts.operationFailed");
      if (e.response?.data?.extras?.result_codes) {
        errMsg = `Stellar Error: ${JSON.stringify(e.response.data.extras.result_codes)}`;
      }
      throw new Error(errMsg);
    } finally {
      setPayLoading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!selectedBot) { toast.error(t("errors.selectBot")); return; }
    if (!hasAnyChoice) { toast.error(t("errors.chooseOne")); return; }
    if (!priceValid) { toast.error(t("errors.invalidPrices")); return; }
    if (!profitShareValid) { toast.error("Invalid profit share rates (0-100%)"); return; }
    if (!walletValid) { toast.error(t("errors.invalidWallet")); return; }
    if (isNewListing && !disclaimerAccepted) { toast.error(t("errors.acceptDisclaimer")); return; }

    setLoading(true);
    const toastId = toast.loading(isNewListing ? t("toasts.creating") : t("toasts.updating"));
    try {
      if (isNewListing) {
        await payListingFeeIfNeeded();
      }
      await patchBotListing(selectedBot.id, diffPayload);
      toast.update(toastId, { render: isNewListing ? t("toasts.createSuccess") : t("toasts.updateSuccess"), type: "success", isLoading: false, autoClose: 1800 });
      resetForm();
      onClose?.();
    } catch (e) {
      console.error(e);
      toast.update(toastId, { render: e?.message || t("toasts.operationFailed"), type: "error", isLoading: false, autoClose: 3000 });
      setError(e?.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnlist() {
    if (!selectedBot) return;
    if (!confirm(t("confirm.remove"))) return;
    setLoading(true);
    const toastId = toast.loading(t("toasts.removing"));
    try {
      await patchBotListing(selectedBot.id, {
        for_sale: false, for_rent: false, revenue_wallet: DEFAULT_PAYOUT_SOL, listing_description: null,
      });
      toast.update(toastId, { render: t("toasts.removeSuccess"), type: "success", isLoading: false, autoClose: 1600 });
      resetForm();
      onClose?.();
    } catch (e) {
      console.error(e);
      toast.update(toastId, { render: e?.message, type: "error", isLoading: false });
    } finally {
      setLoading(false);
    }
  }

  const isCurrentlyListed = Boolean(selectedBot?.for_sale) || Boolean(selectedBot?.for_rent);

  return (
    <>
      <div className="fixed inset-0 z-[99] flex justify-center items-start bg-black/70 py-[60px]">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-xl shadow-2xl p-8 w-[95vw] max-w-2xl relative border border-zinc-800 max-h-[calc(100vh-120px)] overflow-y-auto">
          
          <button onClick={() => { resetForm(); onClose?.(); }} className="absolute top-6 right-6 text-2xl font-bold hover:text-red-400 w-8 h-8">×</button>

          <h2 className="text-xl font-bold mb-4 text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {isNewListing ? t("titles.create") : t("titles.update")}
          </h2>

          {/* Ağ Seçimi */}
          <div className="flex justify-center mb-6">
            {isBothConnected ? (
              <div className="flex items-center bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 shadow-inner">
                <button
                  onClick={() => setManualChainChoice('stellar')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeChain === 'stellar'
                      ? "bg-purple-900/50 text-purple-200 shadow-[0_0_10px_rgba(168,85,247,0.3)] border border-purple-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-zinc-800"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${activeChain === 'stellar' ? 'bg-purple-400 animate-pulse' : 'bg-gray-600'}`} />
                  Stellar
                </button>
                <button
                  onClick={() => setManualChainChoice('solana')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    activeChain === 'solana'
                      ? "bg-green-900/50 text-green-200 shadow-[0_0_10px_rgba(34,197,94,0.3)] border border-green-500/50"
                      : "text-gray-500 hover:text-gray-300 hover:bg-zinc-800"
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${activeChain === 'solana' ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
                  Solana
                </button>
              </div>
            ) : (
              <>
                {activeChain === 'stellar' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-900/30 text-purple-200 border border-purple-500/40">
                    <span className="w-2 h-2 rounded-full bg-purple-400 mr-2"></span> Stellar Network
                  </span>
                )}
                {activeChain === 'solana' && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-900/30 text-green-200 border border-green-500/40">
                    <span className="w-2 h-2 rounded-full bg-green-400 mr-2"></span> Solana Network
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

          {error && <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div>}

          {/* Bot Selection */}
          <div className="mb-6">
            <label className="block text-base font-medium mb-3 text-gray-300">{t("labels.chooseBot")}</label>
            <div className="flex gap-3">
              <div className="flex-1">
                {selectedBot ? (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-white">{selectedBot.name}</div>
                      <div className="text-sm">
                        {(() => {
                          const pnl = calcPnlPct(selectedBot.initial_usd_value, selectedBot.current_usd_value);
                          if (pnl === null) return <span className="text-gray-400">{t("labels.noPnlData")}</span>;
                          return <span className={pnl > 0 ? "text-emerald-400" : pnl < 0 ? "text-rose-400" : "text-gray-400"}>{pnl.toFixed(2)}%</span>;
                        })()}
                      </div>
                    </div>
                    <div className={`w-3 h-3 rounded-full ${isCurrentlyListed ? "bg-amber-400" : "bg-gray-400"}`} title={isCurrentlyListed ? "Listed" : "Not Listed"} />
                  </div>
                ) : (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-gray-400 text-center">{t("labels.noBotSelected")}</div>
                )}
              </div>
              <button onClick={() => setChooseBotModalOpen(true)} className="px-4 h-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg">
                {t("buttons.select")}
              </button>
            </div>
          </div>

          {/* Sell / Rent Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* SELL SECTION */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={sellChecked} onChange={() => setSellChecked(!sellChecked)} className="w-5 h-5 rounded border-gray-600 text-cyan-400 focus:ring-cyan-400 bg-zinc-800" />
                <span className="text-base font-medium group-hover:text-cyan-400 transition-colors">{t("labels.wantSell")}</span>
              </label>
              
              {sellChecked && (
                <div className="flex flex-col gap-3 animate-in slide-in-from-top-2">
                  {/* Fiyat */}
                  <div className="relative">
                    <input type="number" min={0} placeholder={t("placeholders.sellPrice")} className="w-full p-2.5 rounded-lg bg-zinc-800/50 border border-gray-700 focus:border-cyan-400 focus:outline-none text-sm placeholder-gray-400 pr-16" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">USD</span>
                  </div>

                  {/* Sell Profit Share */}
                  <div className="pl-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-cyan-300 transition-colors mb-2">
                      <input type="checkbox" checked={sellProfitShareEnabled} onChange={() => setSellProfitShareEnabled(!sellProfitShareEnabled)} className="rounded bg-zinc-800 border-gray-600 text-cyan-500 focus:ring-cyan-500" />
                      <span>Enable Profit Sharing?</span>
                    </label>
                    
                    {sellProfitShareEnabled && (
                      <div className="relative animate-in slide-in-from-top-1">
                        <input type="number" min={0} max={100} placeholder="Commission %" className="w-full p-2 rounded-lg bg-zinc-900 border border-cyan-900/50 focus:border-cyan-500 focus:outline-none text-sm pr-8 text-cyan-100 placeholder-cyan-900" value={sellProfitShareRate} onChange={(e) => setSellProfitShareRate(e.target.value)} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-cyan-600"><FiPercent /></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RENT SECTION */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input type="checkbox" checked={rentChecked} onChange={() => setRentChecked(!rentChecked)} className="w-5 h-5 rounded border-gray-600 text-emerald-400 focus:ring-emerald-400 bg-zinc-800" />
                <span className="text-base font-medium group-hover:text-emerald-400 transition-colors">{t("labels.wantRent")}</span>
              </label>
              
              {rentChecked && (
                <div className="flex flex-col gap-3 animate-in slide-in-from-top-2">
                  {/* Fiyat */}
                  <div className="relative">
                    <input type="number" min={0} placeholder={t("placeholders.rentPrice")} className="w-full p-2.5 rounded-lg bg-zinc-800/50 border border-gray-700 focus:border-emerald-400 focus:outline-none text-sm placeholder-gray-400 pr-24" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">USD / Day</span>
                  </div>

                  {/* Rent Profit Share */}
                  <div className="pl-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-400 hover:text-emerald-300 transition-colors mb-2">
                      <input type="checkbox" checked={rentProfitShareEnabled} onChange={() => setRentProfitShareEnabled(!rentProfitShareEnabled)} className="rounded bg-zinc-800 border-gray-600 text-emerald-500 focus:ring-emerald-500" />
                      <span>Enable Profit Sharing?</span>
                    </label>
                    
                    {rentProfitShareEnabled && (
                      <div className="relative animate-in slide-in-from-top-1">
                        <input type="number" min={0} max={100} placeholder="Commission %" className="w-full p-2 rounded-lg bg-zinc-900 border border-emerald-900/50 focus:border-emerald-500 focus:outline-none text-sm pr-8 text-emerald-100 placeholder-emerald-900" value={rentProfitShareRate} onChange={(e) => setRentProfitShareRate(e.target.value)} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600"><FiPercent /></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Address */}
          <div className="mb-6 mt-3">
            <label className="block text-base font-medium mb-2 text-gray-300">
              {t("labels.revenueWallet")}
              {activeChain === 'stellar' && <span className="text-purple-400 text-xs ml-2 font-normal">(Auto-filled Stellar)</span>}
              {activeChain === 'solana' && <span className="text-green-400 text-xs ml-2 font-normal">(Auto-filled Solana)</span>}
              <span className="text-red-400 ml-1">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder={activeChain === 'stellar' ? "G... (Stellar Address)" : "Solana Address"}
                className={`w-full p-2.5 pl-10 rounded-lg bg-zinc-800/50 border transition-all duration-200 text-sm focus:outline-none ${
                   activeChain === 'stellar' 
                   ? "border-gray-700 hover:border-purple-400 focus:border-purple-400 font-mono" 
                   : "border-gray-700 hover:border-cyan-400 focus:border-cyan-400 font-mono"
                }`}
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                {activeChain === 'stellar' ? <FiCpu /> : <FiCheckCircle />}
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5 ml-1">
              {activeChain === 'stellar' 
               ? "Listing fee will be paid via Freighter. Revenue will be sent to this Stellar address."
               : "Listing fee will be paid via Phantom. Revenue will be sent to this Solana address."}
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-base font-medium mb-2 text-gray-300">{t("labels.description")}</label>
            <textarea className="w-full h-32 bg-stone-900 border border-gray-700 rounded-md p-3 text-sm resize-none placeholder-gray-400 focus:border-gray-500 focus:outline-none" placeholder={t("placeholders.description")} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
            <div className="text-xs text-gray-400 mt-1 flex justify-between"><span>{t("hints.detailedAttracts")}</span><span>{description.length}/1000</span></div>
          </div>

          {isNewListing && (
            <div className={`mb-6 rounded-lg border p-3 text-sm transition-colors ${
                activeChain === 'stellar' ? "border-purple-500/30 bg-purple-500/10" : "border-cyan-500/30 bg-cyan-500/10"
            }`}>
              <div className={`font-semibold ${activeChain === 'stellar' ? "text-purple-300" : "text-cyan-300"}`}>
                  {t("banners.feeTitle")}
              </div>
              <div className="text-gray-300 text-xs mt-1">
                You will pay <span className="font-bold text-white">1 USD</span> equivalent in 
                {activeChain === 'stellar' ? " XLM/USDC (Stellar)" : " SOL/USDC (Solana)"}.
              </div>
              <label className="mt-3 flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={disclaimerAccepted} onChange={() => setDisclaimerAccepted(v => !v)} className="rounded bg-zinc-800 border-gray-600" />
                <span className="text-gray-300 select-none">{t("banners.feeConfirm")}</span>
              </label>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-3">
            <button
              className={`flex-1 font-semibold py-3 rounded-xl text-base transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99] ${
                 activeChain === 'stellar'
                 ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-purple-500/25"
                 : "bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-cyan-500/25"
              }`}
              disabled={!canSubmit}
              onClick={handleSubmit}
            >
              <span className="flex items-center justify-center gap-2">
                {(loading || payLoading) ? <span className="animate-pulse">Processing...</span> : (isNewListing ? t("buttons.create") : t("buttons.update"))}
              </span>
            </button>
            {isCurrentlyListed && (
              <button className="md:w-[200px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 font-semibold py-3 rounded-xl transition-colors disabled:opacity-50" onClick={handleUnlist} disabled={loading || payLoading}>
                {t("buttons.remove")}
              </button>
            )}
          </div>

          {showSuccessAnim && (
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-50">
               <div className="flex flex-col items-center animate-in zoom-in duration-300">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  <div className="text-emerald-400 font-bold text-xl">Success!</div>
               </div>
            </div>
          )}
        </div>
      </div>
      <ChooseBotModal open={chooseBotModalOpen} onClose={() => setChooseBotModalOpen(false)} onSelectBot={handleSelectBot} />
    </>
  );
}