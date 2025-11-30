'use client';
import { depositToVault } from "@/services/contract/deposit";
import { toast } from "react-toastify";

import { getVault } from "@/services/contract/get_vault";
import { withdrawFromVault } from "@/services/contract/withdraw";

import { useState, useRef, useEffect, useMemo } from 'react';
import useBotExamineStore from "@/store/bot/botExamineStore";
import { useBotStore } from "@/store/bot/botStore";
import { BotModal } from './botModal';
import { FaRegTrashAlt } from 'react-icons/fa';
import { FiEdit3 } from 'react-icons/fi';
import { BsThreeDotsVertical } from 'react-icons/bs';
import { IoSearch } from "react-icons/io5";
import RunBotToggle from './runBotToggle';
import SpinningWheel from './spinningWheel';
import ExamineBot from "./examineBot";
import { FaBan } from "react-icons/fa6";
import DeleteBotConfirmModal from "./deleteBotConfirmModal";
import ShutDownBotModal from "./shutDownBotModal";
import { useTranslation } from "react-i18next";
import useStellarAuth from "@/hooks/useStellarAuth";

/* ---- Type rozet stili ---- */
function getTypeBadgeClasses(type) {
  const t = (type || 'spot').toLowerCase();
  if (t === 'futures') return 'bg-amber-500/15 text-amber-300 border border-amber-700';
  return 'bg-emerald-500/15 text-emerald-300 border border-emerald-700'; // spot
}
function TypeBadge({ type }) {
  const { t: tr } = useTranslation("botCard");
  return (
    <span
      className={`px-2 py-[2px] rounded-full uppercase tracking-wide text-[10px] ${getTypeBadgeClasses(type)} shrink-0`}
      title={tr("typeBadgeTitle", { type: type || 'spot' })}
    >
      {type || 'spot'}
    </span>
  );
}

/* ---- Geri sayım yardımcıları ---- */
function pad2(n) { return String(Math.max(0, n)).padStart(2, '0'); }
function diffParts(ms) {
  const clamped = Math.max(0, ms);
  const d = Math.floor(clamped / (24 * 3600e3));
  const h = Math.floor((clamped % (24 * 3600e3)) / 3600e3);
  const m = Math.floor((clamped % 3600e3) / 60e3);
  const s = Math.floor((clamped % 60e3) / 1e3);
  return { d, h, m, s };
}

function RentedCountdown({ rent_expires_at }) {
  const { t } = useTranslation("botCard");
  const expiry = useMemo(() => rent_expires_at ? new Date(rent_expires_at).getTime() : null, [rent_expires_at]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiry) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiry]);

  const remaining = expiry ? (expiry - now) : 0;
  const expired = !expiry || remaining <= 0;
  const { d, h, m, s } = diffParts(remaining);

  return (
    <>
      <div
        className={[
          "w-full flex items-center justify-between rounded-md px-3 py-2 border",
          expired
            ? "bg-gray-800/60 border-gray-700 text-gray-400"
            : "bg-cyan-500/10 border-cyan-700 text-cyan-200"
        ].join(' ')}
        title={expired ? t("rental.ended") : t("rental.timeLeft")}
      >
        <span className="text-[11px] uppercase tracking-wider">{t("rental.label")}</span>
        <span className="font-mono text-sm">
          {pad2(d)}:{pad2(h)}:{pad2(m)}:{pad2(s)}
        </span>
      </div>
      <div className="h-px w-full bg-gray-700 my-2" />
    </>
  );
}

export const BotCard = ({ bot, column }) => {
  const { t } = useTranslation("botCard");
  const { stellarAddress } = useStellarAuth();
  // === STORE & ACTIONLAR ===
  const removeBot = useBotStore((state) => state.removeBot);
  const shutDownBot = useBotStore((state) => state.shutDownBot);
  const setBotDepositBalance = useBotStore((state) => state.setBotDepositBalance);
  const toggleBotActive = useBotStore((state) => state.toggleBotActive);
  const { fetchAndStoreBotAnalysis } = useBotExamineStore.getState();
  
  // === UI STATE ===
  const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState(null);
  const [isShotDownModalOpen, setShotDownModalOpen] = useState(false);
  
  const [editing, setEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isExamineOpen, setIsExamineOpen] = useState(false);
  const menuRef = useRef(null);

  // Depozito modalları
  const [isDepositModalOpen, setDepositModalOpen] = useState(false);
  const [isWithdrawModalOpen, setWithdrawModalOpen] = useState(false);

  // Depozito miktar state'leri
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");

  // Depozito işlemi loading
  const [depositLoading, setDepositLoading] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false); // şimdilik kullanılmıyor
  
  // === ON-CHAIN VAULT ===
  const [vaultLoading, setVaultLoading] = useState(false);

  const refreshVaultBalance = async () => {
    if (!bot?.id || !bot?.user_id) return;
    if (!stellarAddress) return;

    try {
      setVaultLoading(true);

      const vault = await getVault({
        botId: bot.id,
        userId: bot.user_id,
        publicKey: stellarAddress,
      });

      // i128 -> number (7 decimal varsayıyoruz)
      const rawBalance = Number(vault.balance_usdc);
      console.log("getVault fetched balance:", rawBalance);
      await useBotStore.getState().setBotDepositBalance(bot.id, rawBalance);
    } catch (err) {
      console.error("getVault / refreshVaultBalance error:", err);
      toast.error("Depozito bakiyesi getirilemedi.");
    } finally {
      setVaultLoading(false);
    }
  };

  // === RENTED KONTROL & SAYAÇ ===
  const isRented = bot?.acquisition_type === "RENTED";
  
  // Kira bitişi (ms cinsinden)
  const expiryMs =
    isRented && bot?.rent_expires_at
      ? new Date(bot.rent_expires_at).getTime()
      : null;
  
  // Süresi dolmuş mu?
  const isExpired = isRented && (expiryMs ? Date.now() >= expiryMs : true);
  
  // Saniyelik tick (countdown için)
  const [nowTick, setNowTick] = useState(() => Date.now());
  
  useEffect(() => {
    if (!expiryMs) return;
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [expiryMs]);
  
  // === MENÜ DIŞINA TIKLAMA ===
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // === BLOKAJ (API / VALUE EKSİKSE) ===
  const isBlocked =
    bot?.initial_usd_value == null ||
    bot?.current_usd_value == null ||
    typeof bot?.api === "undefined";
  
  // Toggle için temel disable title (bakiyeye bakmadan önce)
  const disableTitle = isBlocked
    ? t("toggle.blocked")
    : isRented && isExpired
    ? t("toggle.expired")
    : undefined;
  
  // === DEPOZİTO & TOGGLE LOGIC ===
  const isProfitShareMode = !!bot?.profit_share_only;
  const [showDeposit, setShowDeposit] = useState(false);
  
  const balance = bot?.deposit_balance ?? 0;
  
  const canToggle = !isBlocked && !!bot.api;
  const isDepositTooLow = isProfitShareMode && balance < 10;
  const finalToggleDisabled = !canToggle || isDepositTooLow;
  
  const finalDisableTitle = isDepositTooLow
    ? "Depozito bakiyesi 10$ altında olduğu için bot çalıştırılamaz."
    : disableTitle;
  
  const redDisableWrap = finalToggleDisabled
    ? "ring-1 ring-red-700 rounded-md p-1 bg-red-500/10"
    : "";

  // === DEPOZITO PANELI AÇILDIĞINDA ON-CHAIN BAKIYE ÇEK ===
  useEffect(() => {
    if (!showDeposit) return;
    if (!isProfitShareMode) return;
    if (!stellarAddress) return;

    refreshVaultBalance();
  }, [isProfitShareMode, stellarAddress, bot.id, bot.user_id]); //showDeposit

  // === Depozito işlemleri ===
  const handleDepositLoad = () => {
    setDepositModalOpen(true);
  };
  
  const handleDepositWithdraw = () => {
    setWithdrawModalOpen(true);
  };

  const handleConfirmWithdraw = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error("Lütfen geçerli bir miktar girin.");
      return;
    }
  
    if (!bot?.id || !bot?.user_id) {
      toast.error("Bot bilgileri eksik (id / user_id).");
      return;
    }
  
    if (!stellarAddress) {
      toast.error("Lütfen önce Stellar cüzdanınızı bağlayın.");
      return;
    }
  
    try {
      setWithdrawLoading(true);
    
      await withdrawFromVault({
        botId: bot.id,
        userId: bot.user_id,
        amountUsdc: amount,
        publicKey: stellarAddress,
      });
    
      await refreshVaultBalance();   // DB + store güncellemesi
      toast.success("Depozito çekme işlemi gönderildi.");
    
      setWithdrawModalOpen(false);
      setWithdrawAmount("");
    } catch (err) {
      console.error("withdrawFromVault error:", err);
      toast.error(err?.message || "Depozito çekilirken hata oluştu.");
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleConfirmDeposit = async () => {
    const amount = Number(depositAmount);

    if (!amount || isNaN(amount) || amount <= 0) {
      toast.error("Lütfen geçerli bir miktar girin.");
      return;
    }

    if (!bot?.id || !bot?.user_id) {
      toast.error("Bot bilgileri eksik (id / user_id).");
      return;
    }

    if (!stellarAddress) {
      toast.error("Lütfen önce Stellar cüzdanınızı bağlayın.");
      return;
    }

    try {
      setDepositLoading(true);

      await depositToVault({
        botId: bot.id,
        userId: bot.user_id,
        amountUsdc: amount,
        publicKey: stellarAddress,
      });

      setTimeout(() => {
        refreshVaultBalance();
      }, 2000);

      //toast.success("Process initiated: Deposit to vault.");
      setDepositModalOpen(false);
      setDepositAmount("");
    } catch (err) {
      console.error("depositToVault error:", err);
      toast.error(err?.message || "Depozito yatırılırken hata oluştu.");
    } finally {
      setDepositLoading(false);
    }
  };

  /* ==== SOL KART ==== */
  if (column === "left") {
    return (
      <>
        <div className="rounded-r-full px-4 py-4 relative border-2 border-cyan-900 bg-[hsl(227,82%,2%)] text-gray-200">
          <div className="grid grid-cols-3 divide-x divide-gray-700">
    
            {/* SOL: Bot Bilgi Alanı */}
            <div className="pr-4"> 
              {/* Başlık satırı: İsim + Type + Menü */}
              <div className="flex items-center gap-2 border-b border-gray-600 pb-[10px] mb-2">
                <h3 className="text-[18px] font-semibold text-white truncate flex-1">{bot.name}</h3>
                <TypeBadge type={bot.type} />
                <div className="relative shrink-0" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="p-2 rounded hover:bg-gray-700"
                    aria-label={t("menu.moreActions")}
                    title={t("menu.moreActions")}
                  >
                    <BsThreeDotsVertical className="text-gray-300" size={18} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-8 w-40 bg-gray-900 rounded shadow-md z-50">
                      <button
                        onClick={() => { setEditing(true); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-800">
                        <FiEdit3 size={16} /> {t("menu.edit")}
                      </button>
    
                      <button
                        onClick={() => { setSelectedBotId(bot.id); setDeleteModalOpen(true); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800">
                        <FaRegTrashAlt size={16} /> {t("menu.deleteDev")}
                      </button>
    
                      <button
                        onClick={() => {
                          if (isBlocked) return;
                          setIsExamineOpen(true);
                          fetchAndStoreBotAnalysis(bot.id);
                          setMenuOpen(false);
                        }}
                        disabled={isBlocked}
                        aria-disabled={isBlocked}
                        title={isBlocked ? t("examine.disabledTitle") : t("menu.examine")}
                        className={[
                          "flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700",
                          isBlocked ? "text-gray-500 cursor-not-allowed pointer-events-none" : "text-yellow-400"
                        ].join(' ')}
                      >
                        <IoSearch size={16} /> {t("menu.examine")}
                      </button>
    
                      <button
                        onClick={() => { setSelectedBotId(bot.id); setShotDownModalOpen(true); setMenuOpen(false); }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-700"
                        title={t("menu.shutdownTitle")}>
                        <FaBan size={16} /> {t("menu.shutdown")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
    
              <p className="mb-1 text-[14px]"><span className="text-stone-500">{t("fields.api")}</span> {bot.api}</p>
              <p className="mb-1 text-[14px]"><span className="text-stone-500">{t("fields.strategy")}</span> {bot.strategy}</p>
              <p className="mb-1 text-[14px]"><span className="text-stone-500">{t("fields.period")}</span> {bot.period}</p>
              <p className="mb-1 text-[14px]">
                <span className="text-stone-500">{t("fields.days")}</span> {Array.isArray(bot.days) ? bot.days.join(', ') : t("daysUndefined")}
              </p>
              <p className="mb-1 text-[14px]"><span className="text-stone-500">{t("fields.hours")}</span> {bot.startTime} - {bot.endTime}</p>
              <p className="mb-1 text-[14px]">
                <span className="text-stone-500">{t("fields.status")}</span>{' '}
                <span className={bot.isActive ? 'text-green-400' : 'text-[rgb(216,14,14)]'}>
                  {bot.isActive ? t("status.active") : t("status.inactive")}
                </span>
              </p>
            </div>
    
            {/* ORTA: Kripto Paralar ve Depozito */}
            <div className="flex flex-col px-6">
              {isRented && (
                <RentedCountdown rent_expires_at={bot?.rent_expires_at} />
              )}
    
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold bg-gradient-to-r from-violet-900 via-sky-600 to-purple-500 text-transparent bg-clip-text">
                  {t("fields.cryptocurrencies")}
                </h4>
            
                {isProfitShareMode && (
                  <button
                    type="button"
                    onClick={() => setShowDeposit((v) => !v)}
                    className="text-[11px] px-3 py-1 rounded-full border border-cyan-700 bg-[rgb(5,20,35)] hover:bg-[rgb(10,32,52)] text-cyan-200 font-medium transition"
                  >
                    Depozito
                  </button>
                )}
              </div>
              
              <div className="h-44 overflow-y-auto scrollbar-hide space-y-2">
                {showDeposit && (
                  <div className="rounded-xl border border-cyan-900 bg-gradient-to-r from-[rgb(10,18,35)] via-[rgb(8,29,54)] to-[rgb(18,24,48)] px-3 py-3 shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] uppercase tracking-wide text-cyan-300">
                        Deposit
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-200 border border-cyan-700/60">
                        Commission
                      </span>
                    </div>
                
                    {/* Bakiye kutusu */}
                    <div className="mb-3 rounded-lg border border-slate-700 bg-black/40 px-3 py-2 flex items-baseline justify-between">
                      <span className="text-[11px] text-slate-400">
                        Balanace
                        {vaultLoading && (
                          <span className="ml-2 text-[10px] text-cyan-400">
                            (updating…)
                          </span>
                        )}
                      </span>
                      <span className="text-[18px] font-semibold text-white">
                        ${balance.toFixed(2)}
                      </span>
                    </div>
                
                    {/* Yükle / Çek butonları */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleDepositLoad}
                        className="flex-1 text-[13px] font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-700 to-sky-600 hover:from-violet-600 hover:to-sky-500 border border-cyan-400/40 shadow-md shadow-cyan-900/40 transition"
                      >
                        Load
                      </button>

                      <button
                        type="button"
                        onClick={handleDepositWithdraw}
                        className="flex-1 text-[13px] font-medium px-3 py-1.5 rounded-lg bg-transparent border border-slate-600 hover:border-sky-500 text-slate-200 hover:text-white transition"
                      >
                        Çek
                      </button>
                    </div>
                  </div>
                )}
    
                {/* Coin listesi */}
                {bot.cryptos?.length > 0 ? (
                  bot.cryptos.map((coin) => (
                    <div
                      key={coin}
                      className="w-full text-center text-[14px] bg-gradient-to-r from-[rgb(14,20,35)] to-neutral-800 border border-slate-700 px-2 py-1 rounded text-white"
                    >
                      {coin}
                    </div>
                  ))
                ) : (
                  <span className="text-[13px] text-gray-500">{t("coins.none")}</span>
                )}
              </div>
            </div>
    
            {/* SAĞ: Toggle + Spinner */}
            <div className="flex flex-col justify-center items-center relative pl-4">
              <div className="absolute flex items-center gap-3 mb-[148px] mr-[7px] z-10 pointer-events-none">
                <SpinningWheel isActive={bot.isActive} />
              </div>
              <div
                className={[
                  "flex items-center gap-3 z-20 relative",
                  finalToggleDisabled ? "opacity-50 cursor-not-allowed" : "",
                  redDisableWrap
                ].join(' ')}
                title={finalDisableTitle}
                aria-disabled={finalToggleDisabled}
              >
                <RunBotToggle
                  checked={bot.isActive}
                  onChange={!finalToggleDisabled ? () => toggleBotActive(bot.id) : undefined}
                  disabled={finalToggleDisabled}
                />
              </div>
            </div>
          </div>
    
          {editing && <BotModal mode="edit" bot={bot} onClose={() => setEditing(false)} />}
          {isExamineOpen && <ExamineBot isOpen={isExamineOpen} onClose={() => setIsExamineOpen(false)} botId={bot.id} />}
        </div>
    
        <DeleteBotConfirmModal
          isOpen={isDeleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={() => { removeBot(selectedBotId); setSelectedBotId(null); }}
        />
        <ShutDownBotModal
          isOpen={isShotDownModalOpen}
          onClose={() => setShotDownModalOpen(false)}
          onConfirm={() => { shutDownBot({ scope: "bot", id: selectedBotId }); setSelectedBotId(null); }}
        />

        {/* === DEPOSIT MODAL === */}
        {isDepositModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl animate-fadeIn">
              <h2 className="text-xl font-semibold text-white mb-4">Deposit Load</h2>
        
              <div className="mb-4">
                <label className="text-sm text-zinc-400 block mb-1">
                  Load Amount (USDC)
                </label>
        
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Örn: 100"
                  className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
        
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setDepositModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition"
                >
                  Cancel
                </button>
        
                <button
                  onClick={handleConfirmDeposit}
                  disabled={depositLoading}
                  className={`px-4 py-2 rounded-lg bg-gradient-to-r from-violet-700 to-sky-600 border border-cyan-400/40 text-white shadow-md hover:from-violet-600 hover:to-sky-500 transition ${
                    depositLoading ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  {depositLoading ? "Gönderiliyor..." : "Yükle"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* === WITHDRAW MODAL === */}
        {isWithdrawModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl animate-fadeIn">
              <h2 className="text-xl font-semibold text-white mb-4">
                Withdraw Deposit
              </h2>
        
              <div className="mb-4">
                <label className="text-sm text-zinc-400 block mb-1">
                  Withdraw Amount (Max: {balance})
                </label>
        
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (Number(val) > Number(balance)) {
                      val = balance.toString();
                    }
                    setWithdrawAmount(val);
                  }}
                  placeholder="Örn: 50"
                  className={`w-full rounded-lg px-3 py-2 bg-zinc-800 border 
                    ${Number(withdrawAmount) > balance ? "border-red-500" : "border-zinc-700"}
                    text-white focus:outline-none focus:border-cyan-500`}
                />

                {Number(withdrawAmount) > balance && (
                  <p className="text-sm text-red-400 mt-1">
                    Withdraw amount cannot exceed available balance.
                  </p>
                )}
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setWithdrawModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition"
                >
                  İptal
                </button>
              
                <button
                  type="button"
                  onClick={handleConfirmWithdraw}
                  disabled={!withdrawAmount || Number(withdrawAmount) <= 0 || withdrawLoading}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-700 to-sky-600 border border-cyan-400/40 text-white shadow-md hover:from-violet-600 hover:to-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {withdrawLoading ? "Gönderiliyor..." : "Çek"}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  /* ==== SAĞ KART ==== */
  return (
    <>
      <div className="rounded-l-full px-4 py-4 border-2 border-cyan-900 relative bg-[hsl(227,82%,2%)] text-gray-200">
        <div className="grid grid-cols-3 divide-x divide-gray-700">
          
          {/* SOL: Toggle + Spinner */}
          <div className="flex flex-col justify-center items-center relative pr-4">
            <div className="absolute flex items-center gap-3 mb-[148px] ml-[7px] z-10 pointer-events-none scale-x-[-1]">
              <SpinningWheel isActive={bot.isActive} />
            </div>
            <div
              className={[
                "flex items-center gap-3 z-20 relative",
                finalToggleDisabled ? "opacity-50 cursor-not-allowed" : "",
                redDisableWrap,
              ].join(" ")}
              title={finalDisableTitle}
              aria-disabled={finalToggleDisabled}
            >
              <RunBotToggle
                checked={bot.isActive}
                onChange={
                  !finalToggleDisabled ? () => toggleBotActive(bot.id) : undefined
                }
                disabled={finalToggleDisabled}
              />
            </div>
          </div>

          {/* ORTA: Kripto Paralar + Depozito */}
          <div className="flex flex-col px-6">
            {isRented && (
              <RentedCountdown rent_expires_at={bot?.rent_expires_at} />
            )}

            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold bg-gradient-to-r from-violet-900 via-sky-600 to-purple-500 text-transparent bg-clip-text">
                {t("fields.cryptocurrencies")}
              </h4>

              {isProfitShareMode && (
                <button
                  type="button"
                  onClick={() => setShowDeposit((v) => !v)}
                  className="text-[11px] px-3 py-1 rounded-full border border-cyan-700 bg-[rgb(5,20,35)] hover:bg-[rgb(10,32,52)] text-cyan-200 font-medium transition"
                >
                  Deposit
                </button>
              )}
            </div>

            <div className="h-44 overflow-y-auto mr-2 scrollbar-hide space-y-2">
              {showDeposit && (
                <div className="rounded-xl border border-cyan-900 bg-gradient-to-r from-[rgb(10,18,35)] via-[rgb(8,29,54)] to-[rgb(18,24,48)] px-3 py-3 shadow-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-wide text-cyan-300">
                      Deposit
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-900/60 text-cyan-200 border border-cyan-700/60">
                      Commission
                    </span>
                  </div>

                  {/* Bakiye kutusu */}
                  <div className="mb-3 rounded-lg border border-slate-700 bg-black/40 px-3 py-2 flex items-baseline justify-between">
                    <span className="text-[11px] text-slate-400">
                      Balance
                      {vaultLoading && (
                        <span className="ml-2 text-[10px] text-cyan-400">
                          (updating…)
                        </span>
                      )}
                    </span>
                    <span className="text-[18px] font-semibold text-white">
                      ${balance.toFixed(2)}
                    </span>
                  </div>

                  {/* Yükle / Çek butonları */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDepositLoad}
                      className="flex-1 text-[13px] font-medium px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-700 to-sky-600 hover:from-violet-600 hover:to-sky-500 border border-cyan-400/40 shadow-md shadow-cyan-900/40 transition"
                    >
                      Load
                    </button>

                    <button
                      type="button"
                      onClick={handleDepositWithdraw}
                      className="flex-1 text-[13px] font-medium px-3 py-1.5 rounded-lg bg-transparent border border-slate-600 hover:border-sky-500 text-slate-200 hover:text-white transition"
                    >
                      Withdraw
                    </button>
                  </div>
                </div>
              )}

              {/* Coin listesi */}
              {bot.cryptos?.length > 0 ? (
                bot.cryptos.map((coin) => (
                  <div
                    key={coin}
                    className="w-full text-center text-[14px] bg-gradient-to-r from-[rgb(14,20,35)] to-neutral-800 border border-slate-700 px-2 py-1 rounded text-white"
                  >
                    {coin}
                  </div>
                ))
              ) : (
                <span className="text-[13px] text-gray-500">
                  {t("coins.none")}
                </span>
              )}
            </div>
          </div>

          {/* SAĞ: Bilgiler */}
          <div className="pl-4">
            <div className="flex items-center gap-2 border-b border-gray-600 pb-[10px] mb-2">
              <h3 className="text-[18px] font-semibold text-white truncate flex-1">
                {bot.name}
              </h3>
              <TypeBadge type={bot.type} />
              <div className="relative shrink-0" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="p-2 rounded hover:bg-gray-700"
                  aria-label={t("menu.moreActions")}
                  title={t("menu.moreActions")}
                >
                  <BsThreeDotsVertical className="text-gray-300" size={18} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 w-40 bg-gray-900 rounded shadow-md z-50">
                    <button
                      onClick={() => {
                        setEditing(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-blue-400 hover:bg-gray-800"
                    >
                      <FiEdit3 size={16} /> {t("menu.edit")}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedBotId(bot.id);
                        setDeleteModalOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-400 hover:bg-gray-800"
                    >
                      <FaRegTrashAlt size={16} /> {t("menu.deleteDev")}
                    </button>

                    <button
                      onClick={() => {
                        if (isBlocked) return;
                        setIsExamineOpen(true);
                        fetchAndStoreBotAnalysis(bot.id);
                        setMenuOpen(false);
                      }}
                      disabled={isBlocked}
                      aria-disabled={isBlocked}
                      title={
                        isBlocked ? t("examine.disabledTitle") : t("menu.examine")
                      }
                      className={[
                        "flex items-center gap-2 w-full px-4 py-2 text-sm hover:bg-gray-700",
                        isBlocked
                          ? "text-gray-500 cursor-not-allowed pointer-events-none"
                          : "text-yellow-400",
                      ].join(" ")}
                    >
                      <IoSearch size={16} /> {t("menu.examine")}
                    </button>

                    <button
                      onClick={() => {
                        setSelectedBotId(bot.id);
                        setShotDownModalOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-orange-600 hover:bg-gray-700"
                      title={t("menu.shutdownTitle")}
                    >
                      <FaBan size={16} /> {t("menu.shutdown")}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">{t("fields.api")}</span> {bot.api}
            </p>
            <p className="mb-1 text-[14px] flex items-center gap-1 max-w-[180px] overflow-hidden whitespace-nowrap">
              <span className="text-stone-500 shrink-0">
                {t("fields.strategy")}
              </span>
              <span className="truncate">{bot.strategy}</span>
            </p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">{t("fields.period")}</span>{" "}
              {bot.period}
            </p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">{t("fields.days")}</span>{" "}
              {Array.isArray(bot.days)
                ? bot.days.join(", ")
                : t("daysUndefined")}
            </p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">{t("fields.hours")}</span>{" "}
              {bot.startTime} - {bot.endTime}
            </p>
            <p className="mb-1 text-[14px]">
              <span className="text-stone-500">{t("fields.status")}</span>{" "}
              <span
                className={
                  bot.isActive ? "text-green-400" : "text-[rgb(216,14,14)]"
                }
              >
                {bot.isActive ? t("status.active") : t("status.inactive")}
              </span>
            </p>
          </div>
        </div>

        {editing && (
          <BotModal mode="edit" bot={bot} onClose={() => setEditing(false)} />
        )}
        {isExamineOpen && (
          <ExamineBot
            isOpen={isOpen}
            onClose={() => setIsExamineOpen(false)}
            botId={bot.id}
          />
        )}
      </div>

      <DeleteBotConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={() => {
          removeBot(selectedBotId);
          setSelectedBotId(null);
        }}
      />
      <ShutDownBotModal
        isOpen={isShotDownModalOpen}
        onClose={() => setShotDownModalOpen(false)}
        onConfirm={() => {
          shutDownBot({ scope: "bot", id: selectedBotId });
          setSelectedBotId(null);
        }}
      />

      {/* Depozito modalları (sağ kart için de aynı state kullanılıyor) */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl animate-fadeIn">
            <h2 className="text-xl font-semibold text-white mb-4">
              Load Deposit
            </h2>

            <div className="mb-4">
              <label className="text-sm text-zinc-400 block mb-1">
                The Load Amount (USDC)
              </label>

              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Örn: 100"
                className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDepositModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmDeposit}
                disabled={depositLoading}
                className={`px-4 py-2 rounded-lg bg-gradient-to-r from-violet-700 to-sky-600 border border-cyan-400/40 text-white shadow-md hover:from-violet-600 hover:to-sky-500 transition ${
                  depositLoading ? "opacity-60 cursor-not-allowed" : ""
                }`}
              >
                {depositLoading ? "Gönderiliyor..." : "Yükle"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 w-full max-w-md shadow-xl animate-fadeIn">
            <h2 className="text-xl font-semibold text-white mb-4">
              Withdraw Deposit
            </h2>

            <div className="mb-4">
              <label className="text-sm text-zinc-400 block mb-1">
                Withdraw Amount (Max: {balance})
              </label>

              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => {
                  let val = e.target.value;
                  if (Number(val) > Number(balance)) {
                    val = balance.toString();
                  }
                  setWithdrawAmount(val);
                }}
                placeholder="Örn: 50"
                className={`w-full rounded-lg px-3 py-2 bg-zinc-800 border ${
                  Number(withdrawAmount) > balance
                    ? "border-red-500"
                    : "border-zinc-700"
                } text-white focus:outline-none focus:border-cyan-500`}
              />

              {Number(withdrawAmount) > balance && (
                <p className="text-sm text-red-400 mt-1">
                  Withdraw amount cannot exceed available balance.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setWithdrawModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-zinc-700 text-white hover:bg-zinc-600 transition"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  // Şimdilik boş
                }}
                disabled={!withdrawAmount || Number(withdrawAmount) <= 0}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-violet-700 to-sky-600 border border-cyan-400/40 text-white shadow-md hover:from-violet-600 hover:to-sky-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Withdraw
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
