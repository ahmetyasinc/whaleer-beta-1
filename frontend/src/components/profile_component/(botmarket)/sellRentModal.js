"use client";

import { useEffect, useMemo, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, VersionedMessage, VersionedTransaction } from "@solana/web3.js";

import { toast } from "react-toastify";
import ChooseBotModal from "../(showcase)/(explore)/chooseBotModal";
import { useSiwsStore } from "@/store/auth/siwsStore";
import useSiwsAuth from "@/hooks/useSiwsAuth";
import { createListingIntent, confirmPayment } from "@/api/payments";
import { patchBotListing } from "@/api/bots";
import { useTranslation } from "react-i18next";
import { FiCheckCircle, FiCpu, FiAlertTriangle, FiDownload, FiLink } from "react-icons/fi";

// Ağ Ayarları
const SOLANA_RPC_URL = "https://api.mainnet-beta.solana.com";
const DEFAULT_PAYOUT_SOL = "AkmufZViBgt9mwuLPhFM8qyS1SjWNbMRBK8FySHajvUA";

// Phantom Icon Component
const PhantomIcon = ({ className }) => (
  <img className="w-[110px] mt-[1px]" src="/PhantomLogoWhite.svg" alt="Phantom" />
);

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
  const { isPhantomInstalled, readyState, connectWalletAndSignIn, authLoading } = useSiwsAuth();

  // Phantom durumu
  const phantomInstalled = isPhantomInstalled || readyState === "Installed";
  const walletConnected = walletLinked && publicKey;

  // Sadece Solana aktif
  const activeChain = useMemo(() => {
    if (walletConnected) return 'solana';
    return null;
  }, [walletConnected]);

  // --- FORM STATE'LERİ ---
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
      setWalletAddress(selectedBot?.revenue_wallet ?? "");
      setDescription((selectedBot?.listing_description ?? selectedBot?.description ?? "").toString());
    } else {
      setSellChecked(false);
      setRentChecked(false);
      setSellPrice("");
      setRentPrice("");
      if (activeChain === 'solana' && publicKey) {
        setWalletAddress(publicKey.toBase58());
      } else {
        setWalletAddress("");
      }
      setDescription((selectedBot?.listing_description ?? selectedBot?.description ?? "").toString());
    }
  }, [selectedBot, activeChain, publicKey]);

  const isNewListing = useMemo(() => {
    if (!selectedBot) return true;
    return !Boolean(selectedBot?.for_sale) && !Boolean(selectedBot?.for_rent);
  }, [selectedBot]);

  const hasAnyChoice = sellChecked || rentChecked;

  const priceValid =
    (!sellChecked || (sellPrice !== "" && Number(sellPrice) >= 0)) &&
    (!rentChecked || (rentPrice !== "" && Number(rentPrice) >= 0));

  const walletValid = useMemo(() => {
    if (!walletAddress || walletAddress.length < 20) return false;
    return true;
  }, [walletAddress]);

  const { diffPayload, hasDiff } = useMemo(() => {
    if (!selectedBot) return { diffPayload: {}, hasDiff: false };
    const payload = {};

    if (activeChain) payload.revenue_chain = activeChain;

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

    const descTrim = (description ?? "").trim();
    const prevDesc = (selectedBot?.listing_description ?? "") + "";
    if (descTrim !== prevDesc) {
      payload.listing_description = descTrim.length ? descTrim : null;
    }

    const diff = Object.keys(payload).length > 0;
    return { diffPayload: payload, hasDiff: diff };
  }, [selectedBot, sellChecked, rentChecked, sellPrice, rentPrice, walletAddress, description, activeChain]);

  const canSubmit =
    !!selectedBot &&
    hasAnyChoice &&
    priceValid &&
    walletValid &&
    !loading &&
    !payLoading &&
    (!isNewListing || disclaimerAccepted) &&
    (isNewListing || hasDiff) &&
    walletConnected;

  if (!open) return null;

  function resetForm() {
    setSellChecked(false);
    setRentChecked(false);
    setSellPrice("");
    setRentPrice("");
    setDescription("");
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
      const intent = await createListingIntent(selectedBot.id, activeChain, {});
      if (!intent?.intent_id) throw new Error(t("errors.invalidIntent"));

      const msgBytes = b64ToUint8Array(intent.message_b64);
      const message = VersionedMessage.deserialize(msgBytes);
      const tx = new VersionedTransaction(message);

      toast.update(toastId, { render: t("toasts.signInWallet"), isLoading: true });
      const connection = new Connection(SOLANA_RPC_URL, "confirmed");
      const signature = await sendTransaction(tx, connection, { skipPreflight: false });

      toast.update(toastId, { render: t("toasts.confirmOnchain"), isLoading: true });
      const confirmationResult = await confirmPayment(intent.intent_id, signature, "solana");

      if (!confirmationResult?.ok) throw new Error(t("errors.paymentNotConfirmed"));

      toast.update(toastId, { render: t("toasts.paymentConfirmed"), type: "success", isLoading: false, autoClose: 1500 });
      setShowSuccessAnim(true);
      await new Promise((r) => setTimeout(r, 900));
      setShowSuccessAnim(false);

      return { paid: true };
    } catch (e) {
      console.error(e);
      throw new Error(e?.message || t("toasts.operationFailed"));
    } finally {
      setPayLoading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    if (!selectedBot) { toast.error(t("errors.selectBot")); return; }
    if (!hasAnyChoice) { toast.error(t("errors.chooseOne")); return; }
    if (!priceValid) { toast.error(t("errors.invalidPrices")); return; }
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
      <div className="fixed inset-0 z-[99] flex justify-center items-start bg-black/80 backdrop-blur-sm py-[60px]">
        <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white rounded-2xl shadow-2xl shadow-black/50 p-8 w-[95vw] max-w-2xl relative border border-zinc-700/50 max-h-[calc(100vh-120px)] overflow-y-auto">

          {/* Close Button */}
          <button
            onClick={() => { resetForm(); onClose?.(); }}
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-zinc-800 hover:bg-red-900/50 border border-zinc-700 hover:border-red-500/50 flex items-center justify-center text-zinc-400 hover:text-red-400 transition-all duration-200 group"
          >
            <span className="text-xl font-bold group-hover:rotate-90 transition-transform duration-200">×</span>
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              {isNewListing ? t("titles.create") : t("titles.update")}
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Botunuzu markette satışa veya kiralamaya sunun
            </p>
          </div>

          {/* Wallet Status Badge */}
          <div className="flex justify-center mb-6">
            {walletConnected ? (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-medium bg-emerald-900/30 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></span>
                <PhantomIcon className="w-4 h-4 mr-2" />
                Solana Network Bağlı
              </span>
            ) : !phantomInstalled ? (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-medium bg-red-900/30 text-red-300 border border-red-500/40">
                <FiAlertTriangle className="w-4 h-4 mr-2" />
                Phantom Yüklü Değil
              </span>
            ) : (
              <span className="inline-flex items-center px-4 py-2 rounded-full text-xs font-medium bg-amber-900/30 text-amber-300 border border-amber-500/40">
                <FiAlertTriangle className="w-4 h-4 mr-2" />
                Cüzdan Bağlı Değil
              </span>
            )}
          </div>

          {/* Phantom Not Installed Warning */}
          {!phantomInstalled && (
            <div className="mb-6 rounded-2xl border-2 border-dashed border-red-500/50 bg-gradient-to-br from-red-950/40 to-red-900/20 p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                  <FiDownload className="w-8 h-8 text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-300 mb-1">Phantom Cüzdan Gerekli</h3>
                  <p className="text-sm text-red-200/70">Bot ilanı oluşturmak için Phantom cüzdanınızı yüklemeniz gerekmektedir.</p>
                </div>
                <a
                  href="https://phantom.app/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <PhantomIcon className="w-5 h-5" />
                  indir
                </a>
              </div>
            </div>
          )}

          {/* Wallet Not Connected Warning */}
          {phantomInstalled && !walletConnected && (
            <div className="mb-6 rounded-2xl border-2 border-dashed border-amber-500/50 bg-gradient-to-br from-amber-950/40 to-amber-900/20 p-6">
              <div className="flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <FiLink className="w-8 h-8 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-amber-300 mb-1">Cüzdan Bağlantısı Gerekli</h3>
                  <p className="text-sm text-amber-200/70">Bot ilanı oluşturmak için Phantom cüzdanınızı bağlamanız gerekmektedir.</p>
                </div>
                <button
                  onClick={connectWalletAndSignIn}
                  disabled={authLoading}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <FiLink className="w-5 h-5" />
                  {authLoading ? "Bağlanıyor..." : "Cüzdanı Bağla"}
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 flex items-center gap-2">
              <FiAlertTriangle className="shrink-0" />{error}
            </div>
          )}

          {/* Main Form - Only show when wallet is connected */}
          {walletConnected && (
            <>
              {/* Bot Selection */}
              <div className="mb-6">
                <label className="block text-base font-semibold mb-3 text-zinc-200">{t("labels.chooseBot")}</label>
                <div className="flex gap-3">
                  <div className="flex-1">
                    {selectedBot ? (
                      <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 flex items-center justify-between hover:border-zinc-600 transition-colors">
                        <div>
                          <div className="font-semibold text-white">{selectedBot.name}</div>
                          <div className="text-sm mt-0.5">
                            {(() => {
                              const pnl = calcPnlPct(selectedBot.initial_usd_value, selectedBot.current_usd_value);
                              if (pnl === null) return <span className="text-gray-400">{t("labels.noPnlData")}</span>;
                              return <span className={pnl > 0 ? "text-emerald-400" : pnl < 0 ? "text-rose-400" : "text-gray-400"}>{pnl.toFixed(2)}%</span>;
                            })()}
                          </div>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isCurrentlyListed ? "bg-amber-400 shadow-lg shadow-amber-400/50" : "bg-zinc-500"}`} title={isCurrentlyListed ? "Listed" : "Not Listed"} />
                      </div>
                    ) : (
                      <div className="bg-zinc-800/40 border border-dashed border-zinc-700 rounded-xl p-4 text-zinc-500 text-center">{t("labels.noBotSelected")}</div>
                    )}
                  </div>
                  <button
                    onClick={() => setChooseBotModalOpen(true)}
                    className="px-5 h-[60px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    {t("buttons.select")}
                  </button>
                </div>
              </div>

              {/* Sell / Rent Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* SELL SECTION */}
                <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-800 hover:border-cyan-500/30 transition-colors">
                  <label className="flex items-center gap-3 cursor-pointer group mb-3">
                    <input type="checkbox" checked={sellChecked} onChange={() => setSellChecked(!sellChecked)} className="w-5 h-5 rounded border-zinc-600 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0 bg-zinc-900" />
                    <span className="text-base font-semibold group-hover:text-cyan-400 transition-colors">{t("labels.wantSell")}</span>
                  </label>
                  {sellChecked && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-top-2">
                      <div className="relative">
                        <input type="number" min={0} placeholder={t("placeholders.sellPrice")} className="w-full p-3 rounded-lg bg-zinc-900/80 border border-zinc-700 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 text-sm placeholder-zinc-500 pr-16" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-medium">USD</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* RENT SECTION */}
                <div className="bg-zinc-800/30 rounded-xl p-4 border border-zinc-800 hover:border-emerald-500/30 transition-colors">
                  <label className="flex items-center gap-3 cursor-pointer group mb-3">
                    <input type="checkbox" checked={rentChecked} onChange={() => setRentChecked(!rentChecked)} className="w-5 h-5 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 bg-zinc-900" />
                    <span className="text-base font-semibold group-hover:text-emerald-400 transition-colors">{t("labels.wantRent")}</span>
                  </label>
                  {rentChecked && (
                    <div className="flex flex-col gap-3 animate-in slide-in-from-top-2">
                      <div className="relative">
                        <input type="number" min={0} placeholder={t("placeholders.rentPrice")} className="w-full p-3 rounded-lg bg-zinc-900/80 border border-zinc-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 text-sm placeholder-zinc-500 pr-24" value={rentPrice} onChange={(e) => setRentPrice(e.target.value)} />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-medium">USD / Gün</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Wallet Address */}
              <div className="mb-6">
                <label className="block text-base font-semibold mb-2 text-zinc-200">
                  {t("labels.revenueWallet")}
                  {activeChain === 'solana' && <span className="text-emerald-400 text-xs ml-2 font-normal">(Otomatik dolduruldu)</span>}
                  <span className="text-red-400 ml-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Solana Adresi"
                    className="w-full p-3 pl-10 rounded-xl bg-zinc-800/60 border border-zinc-700 transition-all duration-200 text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 font-mono"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                  />
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                    <FiCheckCircle />
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-2 ml-1">
                  İlan ücreti Phantom ile ödenecek. Gelirler bu Solana adresine gönderilecektir.
                </p>
              </div>

              {/* Description */}
              <div className="mb-6">
                <label className="block text-base font-semibold mb-2 text-zinc-200">{t("labels.description")}</label>
                <textarea
                  className="w-full h-32 bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 text-sm resize-none placeholder-zinc-500 focus:border-zinc-500 focus:outline-none focus:ring-1 focus:ring-zinc-500/30"
                  placeholder={t("placeholders.description")}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={1000}
                />
                <div className="text-xs text-zinc-500 mt-2 flex justify-between">
                  <span>{t("hints.detailedAttracts")}</span>
                  <span>{description.length}/1000</span>
                </div>
              </div>

              {/* Fee Banner */}
              {isNewListing && (
                <div className="mb-6 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 to-blue-950/40 p-4">
                  <div className="font-semibold text-cyan-300 flex items-center gap-2">
                    <FiCpu className="w-4 h-4" />
                    {t("banners.feeTitle")}
                  </div>
                  <div className="text-zinc-400 text-xs mt-2">
                    <span className="font-bold text-white">1 USD</span> tutarında SOL/USDC (Solana) ödeme yapacaksınız.
                  </div>
                  <label className="mt-4 flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={disclaimerAccepted} onChange={() => setDisclaimerAccepted(v => !v)} className="rounded bg-zinc-800 border-zinc-600 text-cyan-500 focus:ring-cyan-500" />
                    <span className="text-zinc-300 text-sm select-none">{t("banners.feeConfirm")}</span>
                  </label>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col md:flex-row gap-3">
                <button
                  className="flex-1 font-semibold py-4 rounded-xl text-base transition-all duration-200 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-cyan-500/30"
                  disabled={!canSubmit}
                  onClick={handleSubmit}
                >
                  <span className="flex items-center justify-center gap-2">
                    {(loading || payLoading) ? (
                      <span className="animate-pulse">İşleniyor...</span>
                    ) : (
                      isNewListing ? t("buttons.create") : t("buttons.update")
                    )}
                  </span>
                </button>
                {isCurrentlyListed && (
                  <button
                    className="md:w-[200px] bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-zinc-100 font-semibold py-4 rounded-xl transition-colors disabled:opacity-50"
                    onClick={handleUnlist}
                    disabled={loading || payLoading}
                  >
                    {t("buttons.remove")}
                  </button>
                )}
              </div>
            </>
          )}

          {/* Success Animation Overlay */}
          {showSuccessAnim && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center rounded-2xl z-50">
              <div className="flex flex-col items-center animate-in zoom-in duration-300">
                <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center mb-4">
                  <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <div className="text-emerald-400 font-bold text-2xl">Başarılı!</div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ChooseBotModal open={chooseBotModalOpen} onClose={() => setChooseBotModalOpen(false)} onSelectBot={handleSelectBot} />
    </>
  );
}