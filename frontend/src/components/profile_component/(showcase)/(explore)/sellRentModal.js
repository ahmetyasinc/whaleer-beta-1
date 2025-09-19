// src/components/profile_component/(showcase)/(explore)/sellRentModal.js
"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedMessage, VersionedTransaction } from "@solana/web3.js";
import { toast } from "react-toastify";
import ChooseBotModal from "./chooseBotModal";
import { useSiwsStore } from "@/store/auth/siwsStore";
import { createListingIntent, confirmPayment } from "@/api/payments";
import { patchBotListing } from "@/api/bots";
import { useTranslation } from "react-i18next";

const RPC_URL = "https://api.mainnet-beta.solana.com";
const DEFAULT_PAYOUT = "AkmufZViBgt9mwuLPhFM8qyS1SjWNbMRBK8FySHajvUA";

// Base64 → Uint8Array (tarayıcı uyumlu)
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

  const [sellChecked, setSellChecked] = useState(false);
  const [rentChecked, setRentChecked] = useState(false);
  const [sellPrice, setSellPrice] = useState("");
  const [rentPrice, setRentPrice] = useState("");
  const [description, setDescription] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  const [chooseBotModalOpen, setChooseBotModalOpen] = useState(false);
  const [selectedBot, setSelectedBot] = useState(null);

  const [loading, setLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState(null);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showSuccessAnim, setShowSuccessAnim] = useState(false);

  const { walletLinked } = useSiwsStore();
  const { publicKey, sendTransaction } = useWallet();

  // Modal kapandığında temizle
  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  // Bot seçimi değişince formu doldur
  useEffect(() => {
    if (!selectedBot) return;
    console.log("Selected bot:", selectedBot);
    const isListed = Boolean(selectedBot?.for_sale) || Boolean(selectedBot?.for_rent);

    if (isListed) {
      setSellChecked(Boolean(selectedBot?.for_sale));
      setRentChecked(Boolean(selectedBot?.for_rent));
      setSellPrice(selectedBot?.sell_price ?? "");
      setRentPrice(selectedBot?.rent_price ?? "");
      setWalletAddress(selectedBot?.revenue_wallet ?? "");
      setDescription((selectedBot?.listing_description ?? selectedBot?.description ?? "").toString());
    } else {
      setSellChecked(false);
      setRentChecked(false);
      setSellPrice("");
      setRentPrice("");
      setWalletAddress("");
      setDescription((selectedBot?.listing_description ?? selectedBot?.description ?? "").toString());
    }
  }, [selectedBot]);

  const isNewListing = useMemo(() => {
    if (!selectedBot) return true;
    return !Boolean(selectedBot?.for_sale) && !Boolean(selectedBot?.for_rent);
  }, [selectedBot]);

  const hasAnyChoice = sellChecked || rentChecked;
  const priceValid =
    (!sellChecked || (sellPrice !== "" && Number(sellPrice) >= 0)) &&
    (!rentChecked || (rentPrice !== "" && Number(rentPrice) >= 0));

  // Basit adres kontrolü; dilersen Solana base58 doğrulaması da ekleyebiliriz
  const walletValid = walletAddress && walletAddress.length > 20;

  // Diff payload (update için)
  const { diffPayload, hasDiff } = useMemo(() => {
    if (!selectedBot) return { diffPayload: {}, hasDiff: false };

    const payload = {};
    const initForSale = Boolean(selectedBot?.for_sale);
    const initForRent = Boolean(selectedBot?.for_rent);

    if (initForSale !== sellChecked) payload.for_sale = sellChecked;
    if (initForRent !== rentChecked) payload.for_rent = rentChecked;

    if (sellChecked) {
      const val = sellPrice === "" ? null : Number(sellPrice);
      if (val !== selectedBot?.sell_price) payload.sell_price = val;
    }
    if (rentChecked) {
      const val = rentPrice === "" ? null : Number(rentPrice);
      if (val !== selectedBot?.rent_price) payload.rent_price = val;
    }

    if (walletAddress && walletAddress !== selectedBot?.revenue_wallet) {
      payload.revenue_wallet = walletAddress;
    }

    // ➕ İlan açıklaması (listing_description): textarea → trim; boş ise null
    const descTrim = (description ?? "").trim();
    const prevDesc = (selectedBot?.listing_description ?? "") + "";
    if (descTrim !== prevDesc) {
      payload.listing_description = descTrim.length ? descTrim : null;
    }

    const diff = Object.keys(payload).length > 0;
    return { diffPayload: payload, hasDiff: diff };
  }, [selectedBot, sellChecked, rentChecked, sellPrice, rentPrice, walletAddress, description]);

  const canSubmit =
    !!selectedBot &&
    hasAnyChoice &&
    priceValid &&
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
    setDescription("");
    setWalletAddress("");
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

  // Yeni listelemelerde 1 USD ücret ödeme
  async function payListingFeeIfNeeded() {
    if (!isNewListing) return { paid: false };

    if (!walletLinked) throw new Error(t("errors.connectWalletFirst"));
    if (!publicKey) throw new Error(t("errors.walletNotReady"));

    setPayLoading(true);
    const toastId = toast.loading(t("toasts.preparingPayment"));
    try {
      const intent = await createListingIntent(selectedBot.id);
      if (!intent?.message_b64 || !intent?.intent_id) {
        throw new Error(t("errors.invalidIntent"));
      }

      const msgBytes = b64ToUint8Array(intent.message_b64);
      const message = VersionedMessage.deserialize(msgBytes);
      const tx = new VersionedTransaction(message);

      toast.update(toastId, { render: t("toasts.signInWallet"), isLoading: true });
      const connection = new Connection(RPC_URL, "confirmed");
      const signature = await sendTransaction(tx, connection, { skipPreflight: false });

      toast.update(toastId, { render: t("toasts.confirmOnchain"), isLoading: true });
      const confirmation = await confirmPayment(intent.intent_id, signature);
      if (!confirmation?.ok) {
        throw new Error(t("errors.paymentNotConfirmed"));
      }

      toast.update(toastId, { render: t("toasts.paymentConfirmed"), type: "success", isLoading: false, autoClose: 1500 });
      setShowSuccessAnim(true);
      await new Promise((r) => setTimeout(r, 900));
      setShowSuccessAnim(false);

      return { paid: true };
    } finally {
      setPayLoading(false);
    }
  }

  async function handleSubmit() {
    setError(null);

    if (!selectedBot) {
      toast.error(t("errors.selectBot"));
      setError(t("errors.selectBot"));
      return;
    }
    if (!hasAnyChoice) {
      toast.error(t("errors.chooseOne"));
      setError(t("errors.chooseOne"));
      return;
    }
    if (!priceValid) {
      toast.error(t("errors.invalidPrices"));
      setError(t("errors.invalidPrices"));
      return;
    }
    if (!walletValid) {
      toast.error(t("errors.invalidWallet"));
      setError(t("errors.invalidWallet"));
      return;
    }
    if (isNewListing && !disclaimerAccepted) {
      toast.error(t("errors.acceptDisclaimer"));
      setError(t("errors.acceptDisclaimer"));
      return;
    }
    if (!isNewListing && !hasDiff) {
      toast.info(t("toasts.noChanges"));
      return;
    }

    setLoading(true);
    const toastId = toast.loading(isNewListing ? t("toasts.creating") : t("toasts.updating"));
    try {
      if (isNewListing) {
        await payListingFeeIfNeeded();
      }

      await patchBotListing(selectedBot.id, diffPayload);

      toast.update(toastId, {
        render: isNewListing ? t("toasts.createSuccess") : t("toasts.updateSuccess"),
        type: "success",
        isLoading: false,
        autoClose: 1800
      });

      resetForm();
      onClose?.();
    } catch (e) {
      console.error(e);
      toast.update(toastId, {
        render: e?.message || t("toasts.operationFailed"),
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
      setError(e?.message || t("toasts.operationFailed"));
    } finally {
      setLoading(false);
    }
  }

  // ✅ UNLIST: Zaten listelenmiş botu listeden kaldır
  async function handleUnlist() {
    if (!selectedBot) return;

    const isListed = Boolean(selectedBot?.for_sale) || Boolean(selectedBot?.for_rent);
    if (!isListed) return;

    const sure = confirm(t("confirm.remove"));
    if (!sure) return;

    setLoading(true);
    const toastId = toast.loading(t("toasts.removing"));
    try {
      const payload = {
        for_sale: false,
        for_rent: false,
        revenue_wallet: DEFAULT_PAYOUT,
        listing_description: null,
      };
      await patchBotListing(selectedBot.id, payload);

      toast.update(toastId, {
        render: t("toasts.removeSuccess"),
        type: "success",
        isLoading: false,
        autoClose: 1600
      });

      resetForm();
      onClose?.();
    } catch (e) {
      console.error(e);
      toast.update(toastId, {
        render: e?.message || t("toasts.removeFailed"),
        type: "error",
        isLoading: false,
        autoClose: 3000
      });
    } finally {
      setLoading(false);
    }
  }

  const isCurrentlyListed = Boolean(selectedBot?.for_sale) || Boolean(selectedBot?.for_rent);

  return (
    <>
      <div className="fixed inset-0 z-[99] flex justify-center items-start bg-black/70 py-[60px]">
        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white rounded-xl shadow-2xl p-8 w-[95vw] max-w-2xl relative border border-zinc-800 max-h-[calc(100vh-120px)] overflow-y-auto">
          {/* Close */}
          <button
            onClick={() => {
              resetForm();
              onClose?.();
            }}
            className="absolute top-6 right-6 text-2xl font-bold hover:text-red-400 transition-colors duration-200 w-8 h-8 flex items-center justify-center hover:bg-red-500/10 rounded-full"
            aria-label={t("aria.close")}
            title={t("aria.close")}
          >
            ×
          </button>

          <h2 className="text-xl font-bold mb-6 text-center bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            {isNewListing ? t("titles.create") : t("titles.update")}
          </h2>

          {/* Error bar */}
          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

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
                          const pnlClass = pnl > 0 ? "text-emerald-400" : pnl < 0 ? "text-rose-400" : "text-gray-400";
                          return <span className={pnlClass}>{pnl.toFixed(2)}%</span>;
                        })()}
                      </div>
                    </div>
                    <div
                      className={`w-3 h-3 rounded-full ${isCurrentlyListed ? "bg-amber-400" : "bg-gray-400"}`}
                      title={isCurrentlyListed ? t("labels.listed") : t("labels.notListed")}
                    />
                  </div>
                ) : (
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-3 text-gray-400 text-center">
                    {t("labels.noBotSelected")}
                  </div>
                )}
              </div>
              <button
                onClick={() => setChooseBotModalOpen(true)}
                className="px-4 h-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-purple-400/25"
                type="button"
                title={t("buttons.select")}
              >
                {t("buttons.select")}
              </button>
            </div>
          </div>

          {/* Sell / Rent */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Sell */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" checked={sellChecked} onChange={() => setSellChecked(!sellChecked)} className="sr-only" />
                  <div
                    className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 ${
                      sellChecked ? "bg-cyan-400 border-cyan-400" : "border-gray-600 hover:border-cyan-400"
                    }`}
                  >
                    {sellChecked && (
                      <svg className="w-3 h-3 text-black absolute top-0.5 left-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-base font-medium group-hover:text-cyan-400 transition-colors">{t("labels.wantSell")}</span>
              </label>

              {sellChecked && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      placeholder={t("placeholders.sellPrice")}
                      className="w-full p-2.5 rounded-lg bg-zinc-800/50 border border-gray-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400 pr-16"
                      value={sellPrice}
                      onChange={(e) => setSellPrice(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{t("units.usd")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Rent */}
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input type="checkbox" checked={rentChecked} onChange={() => setRentChecked(!rentChecked)} className="sr-only" />
                  <div
                    className={`w-5 h-5 rounded-lg border-2 transition-all duration-200 ${
                      rentChecked ? "bg-emerald-400 border-emerald-400" : "border-gray-600 hover:border-emerald-400"
                    }`}
                  >
                    {rentChecked && (
                      <svg className="w-3 h-3 text-black absolute top-0.5 left-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-base font-medium group-hover:text-emerald-400 transition-colors">{t("labels.wantRent")}</span>
              </label>

              {rentChecked && (
                <div className="animate-in slide-in-from-top-2 duration-300">
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      placeholder={t("placeholders.rentPrice")}
                      className="w-full p-2.5 rounded-lg bg-zinc-800/50 border border-gray-700 hover:border-emerald-400 focus:border-emerald-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400 pr-24"
                      value={rentPrice}
                      onChange={(e) => setRentPrice(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{t("units.usdPerDay")}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{t("hints.dailyPayment")}</div>
                </div>
              )}
            </div>
          </div>

          {/* Wallet Address */}
          <p className="text-xs text-gray-400">
              {t("hints.info")}
          </p>
          <div className="mb-6 mt-3">
            <label className="block text-base font-medium mb-2 text-gray-300">
              {t("labels.revenueWallet")} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder={t("placeholders.wallet")}
              className="w-full p-2.5 rounded-lg bg-zinc-800/50 border border-gray-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none transition-all duration-200 text-sm placeholder-gray-400"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              {t("hints.walletWarning")}
            </p>
          </div>

          {/* Description (opsiyonel) */}
          <div className="mb-6">
            <label className="block text-base font-medium mb-2 text-gray-300">{t("labels.description")}</label>
            <textarea
              className="w-full min-h=[160px] max-h-[200px] bg-stone-900 border border-gray-700 rounded-md p-3 text-sm resize-none placeholder-gray-400"
              placeholder={t("placeholders.description")}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
            <div className="text-xs text-gray-400 mt-1.5 flex justify-between">
              <span>{t("hints.detailedAttracts")}</span>
              <span>{description.length}/1000</span>
            </div>
          </div>

          {/* New listing fee banner */}
          {isNewListing && (
            <div className="mb-6 rounded-lg border border-cyan-500/30 bg-cyan-500/10 p-3 text-sm">
              <div className="font-semibold text-cyan-300">{t("banners.feeTitle")}</div>
              <div className="text-gray-200">
                {t("banners.feeBody")}
              </div>
              <label className="mt-3 flex items-start gap-2">
                <input
                  type="checkbox"
                  checked={disclaimerAccepted}
                  onChange={() => setDisclaimerAccepted((v) => !v)}
                  className="mt-[2px]"
                />
                <span className="text-gray-300">
                  {t("banners.feeConfirm")}
                </span>
              </label>
            </div>
          )}

          {/* Footer actions */}
          <div className="flex flex-col md:flex-row gap-3">
            <button
              className="flex-1 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 text-black font-semibold py-3 rounded-xl text-base transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] shadow-lg hover:shadow-cyan-400/25 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!canSubmit}
              onClick={handleSubmit}
              type="button"
              title={isNewListing ? t("buttons.createTitle") : t("buttons.updateTitle")}
              aria-label={isNewListing ? t("buttons.createTitle") : t("buttons.updateTitle")}
            >
              <span className="flex items-center justify-center gap-2">
                {(loading || payLoading) ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    {isNewListing
                      ? (payLoading ? t("buttons.processingPayment") : t("buttons.creating"))
                      : t("buttons.updating")}
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    {isNewListing ? t("buttons.create") : t("buttons.update")}
                  </>
                )}
              </span>
            </button>

            {/* ✅ Unlist butonu sadece listelenmişse görünür */}
            {isCurrentlyListed && (
              <button
                className="md:w-[220px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 font-semibold py-3 rounded-xl text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleUnlist}
                disabled={loading || payLoading}
                type="button"
                title={t("buttons.removeTitle")}
                aria-label={t("buttons.removeTitle")}
              >
                {t("buttons.remove")}
              </button>
            )}
          </div>

          {/* T&C note */}
          <p className="text-[12px] text-gray-400 mt-3">
            {t("hints.terms")}
          </p>

          {/* Success animation overlay */}
          {showSuccessAnim && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-xl" aria-live="polite">
              <div className="flex items-center justify-center w-24 h-24 rounded-full bg-emerald-500/20 border border-emerald-400 animate-scale-in">
                <svg className="w-12 h-12 text-emerald-400 animate-draw-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
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
      </div>

      {/* Bot Selection Modal */}
      <ChooseBotModal
        open={chooseBotModalOpen}
        onClose={() => setChooseBotModalOpen(false)}
        onSelectBot={handleSelectBot}
      />
    </>
  );
}
