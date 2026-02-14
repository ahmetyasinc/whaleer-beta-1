"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { useProfileStore } from "@/store/profile/profileStore";
import { useAccountDataStore } from "@/store/profile/accountDataStore";
import { useTranslation } from "react-i18next";
import { GiTwoCoins } from "react-icons/gi";
import { TbAlignBoxLeftStretch } from "react-icons/tb";
import { FaLongArrowAltRight } from "react-icons/fa";
import { useRouter } from "next/navigation";
import Loader from "@/components/loader";


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
  const isHydrated = useAccountDataStore((s) => s.isHydrated);

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
    <div className="relative bg-zinc-950/90 backdrop-blur-sm border border-zinc-700 rounded-xl shadow-lg flex flex-col w-full h-[calc(100vh-108px)] overflow-hidden group hover:border-blue-900/80 transition-all duration-200">

      {/* Glow effects */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 blur-3xl rounded-full pointer-events-none"></div>

      {/* Header */}
      <div className="pb-3 pt-4 px-5 border-b border-zinc-800/50 relative z-10 flex-shrink-0">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-zinc-100 text-sm font-bold uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-4 bg-cyan-500 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.5)]"></span>
            {activeTab === "portfolio"
              ? t("header.portfolio")
              : t("header.transactions")}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("portfolio")}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all duration-100 ${activeTab === "portfolio"
                ? "bg-blue-950/30 border-blue-500/50 text-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.2)]"
                : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
                }`}
            >
              {t("tabs.portfolio")}
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide border transition-all duration-100 ${activeTab === "transactions"
                ? "bg-purple-950/30 border-purple-500/50 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.2)]"
                : "bg-zinc-900 border-zinc-700 text-zinc-500 hover:text-zinc-300 hover:border-zinc-600"
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
      <div className="flex-1 overflow-hidden relative z-10">
        {/* h-full: Ebeveyninin boyunu alır. */}
        {/* overflow-y-auto: İçerik sığmazsa scroll bar çıkarır. */}
        <div className="h-full overflow-y-auto px-4 py-4 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
          {!isHydrated ? (
            <div className="flex h-full items-center justify-center">
              <Loader />
            </div>
          ) : activeTab === "portfolio" ? (
            <div className="space-y-3">
              {portfolio.length > 0 ? (
                <>
                  {/* Sticky Header (Tablo Başlıkları) */}
                  <div className="grid grid-cols-7 gap-2 text-[10px] uppercase tracking-wider font-bold text-zinc-500 py-2 sticky top-0 bg-zinc-900/95 backdrop-blur z-20 px-3 rounded-lg mb-2 border-b border-zinc-800/50">
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
                        className="grid grid-cols-7 gap-2 items-center py-3 px-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-blue-500/30 transition-all duration-100 hover:shadow-[0_0_15px_-5px_rgba(59,130,246,0.15)] group/item"
                        style={{
                          animationDelay: `${index * 50}ms`,
                          animation: "fadeInUp 0.5s ease-out forwards",
                        }}
                      >
                        <div className="flex items-center space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 text-xs font-bold border border-zinc-700 group-hover/item:border-blue-500/50 group-hover/item:text-blue-400 params-transition">
                            {item.symbol.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-zinc-200 text-sm truncate group-hover/item:text-blue-300 transition-colors">
                              {item.symbol.toUpperCase()}
                            </div>
                            <div className="text-[10px] text-zinc-500 truncate hidden sm:block uppercase tracking-wide">
                              {item.name}
                            </div>
                          </div>
                        </div>

                        <div className="text-right text-xs font-medium text-zinc-400">
                          {item.leverage ? <span className="text-orange-400">{item.leverage}x</span> : "-"}
                        </div>
                        <div className="text-right text-xs font-medium">
                          {item.position_side
                            ? <span className={item.position_side.toLowerCase() === 'long' ? 'text-green-400' : 'text-red-400'}>{item.position_side.toUpperCase()}</span>
                            : "-"}
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-zinc-300 text-xs">
                            {Number(item.cost || 0).toFixed(2)}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-mono text-zinc-300 text-xs">
                            {Number(item.amount || 0).toFixed(8)}
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold text-xs ${(item.profitLoss || 0) >= 0
                              ? "text-emerald-400"
                              : "text-red-400"
                              }`}
                          >
                            {formatCurrency(item.profitLoss)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span
                            className={`font-mono font-bold text-xs ${profitLossPercent >= 0
                              ? "text-emerald-400"
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
                <div className="text-center py-20 text-zinc-600 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
                    <GiTwoCoins className="text-4xl text-zinc-700" />
                  </div>
                  <p className="text-sm uppercase tracking-wider font-medium">{t("portfolio.empty")}</p>
                  <button
                    onClick={handleNavigate}
                    className="group flex items-center gap-2 px-6 py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg transition-all duration-100 hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)]"
                  >
                    <span className="text-xs font-bold uppercase tracking-wide">{t('portfolio.addApi')}</span>
                    <FaLongArrowAltRight className="transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.length > 0 ? (
                <>
                  <div className="grid grid-cols-6 gap-3 text-[10px] uppercase tracking-wider font-bold text-zinc-500 py-2 sticky top-0 bg-zinc-900/95 backdrop-blur z-20 px-3 rounded-lg mb-2 border-b border-zinc-800/50">
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
                      className="grid grid-cols-6 gap-3 items-center py-3 px-3 rounded-lg bg-zinc-900/30 border border-zinc-800/50 hover:bg-zinc-800/50 hover:border-purple-500/30 transition-all duration-100 hover:shadow-[0_0_15px_-5px_rgba(168,85,247,0.15)] group/item"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: "fadeInUp 0.5s ease-out forwards",
                      }}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 text-xs font-bold border border-zinc-700 group-hover/item:border-purple-500/50 group-hover/item:text-purple-400 params-transition">
                          {transaction.symbol.substring(0, 2).toUpperCase()}
                        </div>
                        <span className="font-bold text-zinc-200 text-sm truncate group-hover/item:text-purple-300 transition-colors">
                          {transaction.symbol.toUpperCase()}
                        </span>
                      </div>

                      <div className="text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${String(transaction.type).toLowerCase() === 'long'
                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                            : String(transaction.type).toLowerCase() === 'short'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                            }`}
                        >
                          {String(transaction.type).toUpperCase()}
                        </span>
                      </div>

                      <div className="text-center">
                        <span className="text-xs font-medium text-zinc-300">
                          {getTransactionLabel(
                            transaction.direction,
                            String(transaction.type).toUpperCase()
                          )}
                        </span>
                      </div>

                      <div className="text-center">
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-[10px] text-zinc-400 font-mono">
                            {formatDate(transaction.date)}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {formatTime(transaction.date)}
                          </span>
                        </div>
                      </div>

                      <div className="text-center">
                        <span className="font-mono text-zinc-300 text-xs">
                          {formatCurrency(
                            Number(transaction.price || 0).toFixed(4)
                          )}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-zinc-300 text-xs">
                          {Number(transaction.amount || 0).toFixed(8)}
                        </span>
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="text-center py-20 text-zinc-600 flex flex-col items-center gap-4">
                  <div className="w-20 h-20 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
                    <TbAlignBoxLeftStretch className="text-4xl text-zinc-700" />
                  </div>
                  <p className="text-sm uppercase tracking-wider font-medium">{t("transactions.empty")}</p>
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
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
