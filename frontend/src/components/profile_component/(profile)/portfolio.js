"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useProfileStore } from "@/store/profile/profileStore";
import { useAccountDataStore } from "@/store/profile/accountDataStore";
import { useTranslation } from "react-i18next";
import { GiTwoCoins } from "react-icons/gi";
import { TbAlignBoxLeftStretch } from "react-icons/tb";
import { FaLongArrowAltRight } from "react-icons/fa";
import { useRouter } from "next/navigation";


// ---- Timezone helpers (cookie: wh_settings.timezone = "GMT+3" vb.) ----
const pad = (n) => String(n).padStart(2, '0');

function getCookie(name) {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.split('; ').find((row) => row.startsWith(name + '='));
  return m ? decodeURIComponent(m.split('=')[1]) : null;
}

function parseGmtToMinutes(tzStr) {
  const m = /^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec((tzStr || '').trim());
  if (!m) return 0; // GMT+0 fallback
  const sign = m[1] === '-' ? -1 : 1;
  const h = parseInt(m[2] || '0', 10);
  const mins = parseInt(m[3] || '0', 10);
  return sign * (h * 60 + mins);
}

function readTimezoneOffsetMinutesFromCookie() {
  try {
    const raw = getCookie('wh_settings');
    if (!raw) return 0;
    const obj = JSON.parse(raw);
    return parseGmtToMinutes(obj?.timezone || 'GMT+0');
  } catch {
    return 0;
  }
}

// Her türlü girişi güvenle UTC epoch saniyeye çevirir
function parseToUtcSeconds(value) {
  if (value == null) return null;

  if (typeof value === 'number') {
    if (value > 1e12) return Math.floor(value / 1000); // ms→s
    return Math.floor(value); // s
  }

  if (typeof value === 'string') {
    if (/^\d+$/.test(value)) {
      const num = Number(value);
      return num > 1e12 ? Math.floor(num / 1000) : Math.floor(num);
    }
    const hasTz = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(value);
    const iso = hasTz ? value : `${value.replace(' ', 'T')}Z`; // timezone yoksa UTC varsay
    const ms = Date.parse(iso);
    if (!Number.isNaN(ms)) return Math.floor(ms / 1000);
  }

  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// UTC saniye + ofset → Date (UTC getter'larıyla okunacak)
function timeToZonedDate(utcSeconds, offsetMinutes) {
  const msUTC = (utcSeconds || 0) * 1000;
  return new Date(msUTC + (offsetMinutes || 0) * 60 * 1000);
}


export default function Portfolio() {
  const { t, i18n } = useTranslation("portfolio");
  const [activeTab, setActiveTab] = useState("portfolio");

  const activeApiId = useProfileStore((s) => s.activeApiId);
  const portfolioMap = useAccountDataStore((s) => s.portfolioByApiId);
  const tradesMap = useAccountDataStore((s) => s.tradesByApiId);

  const router = useRouter();

  const handleNavigate = () => {
    router.push("/profile/apiconnect");
  };

  const portfolio = useMemo(
    () => portfolioMap?.[activeApiId] || [],
    [portfolioMap, activeApiId]
  );
  const transactions = useMemo(
    () => tradesMap?.[activeApiId] || [],
    [tradesMap, activeApiId]
  );
  const orderedTransactions = useMemo(
    () => (Array.isArray(transactions) ? [...transactions].reverse() : []),
    [transactions]
  );
  const [tzOffsetMin, setTzOffsetMin] = useState(0);
  useEffect(() => {
    setTzOffsetMin(readTimezoneOffsetMinutesFromCookie());
  }, []);


  // ---- Format helpers (locale-aware) ----
  const locale = i18n.language || "en";

  const formatCurrency = useCallback(
    (amount) =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
      }).format(Number(amount || 0)),
    [locale]
  );

  const formatDate = useCallback(
    (date) => {
      const sec = parseToUtcSeconds(date);
      if (sec == null) return '—';
      const d = timeToZonedDate(sec, tzOffsetMin);
      const Y = d.getUTCFullYear();
      const M = String(d.getUTCMonth() + 1).padStart(2, '0');
      const D = String(d.getUTCDate()).padStart(2, '0');
      // Sadece tarih: DD.MM.YYYY
      return `${D}.${M}.${Y}`;
    },
    [tzOffsetMin]
  );

  const formatTime = useCallback(
    (date) => {
      const sec = parseToUtcSeconds(date);
      if (sec == null) return '—';
      const d = timeToZonedDate(sec, tzOffsetMin);
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      // Saat: HH:mm
      return `${h}:${m}`;
    },
    [tzOffsetMin]
  );


  const getTransactionLabel = (direction, type) => {
    const dir = String(direction || "").toLowerCase();
    const ttype = String(type || "").toLowerCase();
    const isOpen =
      (ttype === "long" && dir === "buy") ||
      (ttype === "short" && dir === "sell") ||
      (!["long", "short"].includes(ttype) && dir === "buy");

    return isOpen ? (
      <span className="text-green-400 font-semibold">
        {t("transactions.open")}
      </span>
    ) : (
      <span className="text-red-400 font-semibold">
        {t("transactions.close")}
      </span>
    );
  };

  const getTransactionTypeColor = (type) => {
    switch (String(type).toLowerCase()) {
      case "long":
        return "bg-green-700/40 text-green-300";
      case "short":
        return "bg-red-700/40 text-red-300";
      case "spot":
        return "bg-orange-700/70 text-orange-300";
      case "futures":
        return "bg-purple-700/40 text-purple-300";
      default:
        return "bg-gray-700/30 text-gray-300";
    }
  };

//bg-gradient-to-br from-gray-950 to-zinc-900
  
return (
    // DEĞİŞİKLİK BURADA:
    // min-h-[400px]: İçerik az olsa bile kart en az 400px boyunda olur.
    // max-h-[600px]: İçerik çok olsa bile kart 600px'i geçmez.
    // Bu sınıra ulaşıldığında içerideki overflow-y-auto devreye girer ve scroll oluşur.
    <div className="bg-gradient-to-br from-zinc-950/90 via-stone-800/40 to-zinc-950/90 rounded-xl shadow-lg border border-zinc-700 overflow-hidden text-white w-full flex flex-col h-[calc(100vh-108px)]">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-800 to-purple-800 px-4 py-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">
            {activeTab === "portfolio"
              ? t("header.portfolio")
              : t("header.transactions")}
          </h2>
          <div className="flex bg-black/30 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "portfolio"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {t("tabs.portfolio")}
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === "transactions"
                  ? "bg-white text-blue-700 shadow-sm"
                  : "text-white hover:bg-white/10"
              }`}
            >
              {t("tabs.transactions")}
            </button>
          </div>
        </div>
      </div>

      {/* Content - Scroll Alanı */}
      {/* flex-1: Header'dan kalan tüm alanı kaplar. */}
      {/* overflow-hidden: Dışa taşmayı engeller. */}
      <div className="flex-1 overflow-hidden">
        {/* h-full: Ebeveyninin boyunu alır. */}
        {/* overflow-y-auto: İçerik sığmazsa scroll bar çıkarır. */}
        <div className="h-full overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-transparent">
          {activeTab === "portfolio" ? (
            <div className="space-y-4">
              {portfolio.length > 0 ? (
                <>
                  {/* Sticky Header (Tablo Başlıkları) */}
                  <div className="grid grid-cols-7 gap-2 text-xs sm:text-sm font-semibold text-gray-400 py-2 sticky top-0 bg-gray-900/95 backdrop-blur z-10 px-2 rounded">
                    <div className="text-left">
                      {t("portfolio.columns.crypto")}
                    </div>
                    <div className="text-right">
                      {t("portfolio.columns.leverage")}
                    </div>
                    <div className="text-right">
                      {t("portfolio.columns.side")}
                    </div>
                    <div className="text-right">
                      {t("portfolio.columns.cost")}
                    </div>
                    <div className="text-right">
                      {t("portfolio.columns.amount")}
                    </div>
                    <div className="text-right">
                      {t("portfolio.columns.profitLoss")}
                    </div>
                    <div className="text-right">
                      {t("portfolio.columns.margin")}
                    </div>
                  </div>

                  {portfolio.map((item, index) => {
                    const profitLossPercent = item.cost
                      ? (item.profitLoss / item.cost) * 100
                      : 0;

                    return (
                      <div
                        key={`${item.symbol}-${index}`}
                        className="grid grid-cols-7 gap-2 items-center py-3 rounded-lg px-2 bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:bg-zinc-900 hover:border-blue-500/70 transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10"
                        style={{
                          animationDelay: `${index * 200}ms`,
                          animation: "fadeInUp 1s ease-out forwards",
                        }}
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm flex-shrink-0">
                            {item.symbol.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-white text-sm sm:text-base truncate">
                              {item.symbol.toUpperCase()}
                            </div>
                            <div className="text-xs text-gray-400 truncate hidden sm:block">
                              {item.name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          {item.leverage ? `${item.leverage}x` : "-"}
                        </div>
                        <div className="text-right">
                          {item.position_side
                            ? item.position_side.toUpperCase()
                            : "-"}
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-white text-sm sm:text-base">
                            {Number(item.cost || 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-semibold text-white text-sm sm:text-base">
                            {Number(item.amount || 0).toFixed(8)}
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-semibold text-sm sm:text-base ${
                              (item.profitLoss || 0) >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {formatCurrency(item.profitLoss)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-semibold text-sm sm:text-base ${
                              profitLossPercent >= 0
                                ? "text-green-400"
                                : "text-red-400"
                            }`}
                          >
                            {profitLossPercent >= 0 ? "+" : ""}
                            {profitLossPercent.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-2">
                  <GiTwoCoins className="text-[70px] text-gray-500 my-2" />
                  <p>{t("portfolio.empty")}</p>
                  <button
                    onClick={handleNavigate}
                    className="py-2 mt-10 px-3 bg-gradient-to-r from-violet-600 to-cyan-600 text-zinc-300 rounded-xl shadow-lg shadow-blue-600/30 hover:from-blue-500/70 hover:to-purple-500/70 hover:shadow-blue-500/30 transition-all hover:scale-[1.005] duration-100 flex items-center gap-2"
                  >
                    <FaLongArrowAltRight className="text-lg" />
                    {t('portfolio.addApi')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.length > 0 ? (
                <>
                  <div className="grid grid-cols-6 gap-3 text-xs sm:text-sm font-semibold text-gray-300 py-2 sticky top-0 bg-slate-900/95 backdrop-blur z-10 px-2 rounded">
                    <div>{t("transactions.columns.crypto")}</div>
                    <div className="text-center">
                      {t("transactions.columns.type")}
                    </div>
                    <div className="text-center">
                      {t("transactions.columns.direction")}
                    </div>
                    <div className="text-center">
                      {t("transactions.columns.datetime")}
                    </div>
                    <div className="text-center">
                      {t("transactions.columns.price")}
                    </div>
                    <div className="text-right">
                      {t("transactions.columns.amount")}
                    </div>
                  </div>

                  {orderedTransactions.map((transaction, index) => (
                    <div
                      key={`${transaction.symbol}-${transaction.date}-${index}`}
                      className="grid grid-cols-6 gap-3 items-center py-3 bg-gradient-to-r from-slate-800/50 to-slate-900/50 hover:bg-zinc-900 rounded-lg px-2 hover:border-blue-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10"
                      style={{
                        animationDelay: `${index * 200}ms`,
                        animation: "fadeInUp 1s ease-out forwards",
                      }}
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-r from-sky-700 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                          {transaction.symbol.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-white text-sm sm:text-base truncate">
                          {transaction.symbol.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-center">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getTransactionTypeColor(
                            transaction.type
                          )}`}
                        >
                          {String(transaction.type).toUpperCase()}
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="text-sm sm:text-base font-medium text-white">
                          {getTransactionLabel(
                            transaction.direction,
                            String(transaction.type).toUpperCase()
                          )}
                        </span>
                      </div>

                      <div className="text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xs sm:text-sm text-gray-400">
                            {formatDate(transaction.date)}
                          </span>
                          <span className="text-xs sm:text-sm text-gray-400">
                            {formatTime(transaction.date)}
                          </span>
                        </div>
                      </div>

                      <div className="text-center">
                        <span className="font-semibold text-white text-sm sm:text-base">
                          {formatCurrency(
                            Number(transaction.price || 0).toFixed(4)
                          )}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-semibold text-white text-sm sm:text-base">
                          {Number(transaction.amount || 0).toFixed(8)}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-12 text-gray-500 flex flex-col items-center gap-2">
                  <TbAlignBoxLeftStretch className="text-[70px] text-gray-500 my-2" />
                  <p>{t("transactions.empty")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateX(-40px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
