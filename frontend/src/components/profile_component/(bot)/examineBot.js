import { IoMdClose, IoMdRefresh } from "react-icons/io";
import PnLChart from "./pnlCharts";
import useBotExamineStore from "@/store/bot/botExamineStore";
import { MdTrendingUp, MdTrendingDown, MdNotes } from "react-icons/md";
import { FaCoins, FaChartLine, FaExchangeAlt } from "react-icons/fa";
import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { FaRobot } from "react-icons/fa6";

/* ================= Timezone helpers ================= */
// cookie oku
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const m = document.cookie.split("; ").find((row) => row.startsWith(name + "="));
  return m ? decodeURIComponent(m.split("=")[1]) : null;
}

// "GMT+3", "GMT-4", "GMT+5:30" → dakikaya çevir
function parseGmtToMinutes(tzStr) {
  const m = /^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec((tzStr || "").trim());
  if (!m) return 0;
  const sign = m[1] === "-" ? -1 : 1;
  const h = parseInt(m[2] || "0", 10);
  const mins = parseInt(m[3] || "0", 10);
  return sign * (h * 60 + mins);
}

// cookie → ofset (dakika)
function readTimezoneOffsetMinutesFromCookie() {
  try {
    const raw = getCookie("wh_settings");
    if (!raw) return 0;
    const obj = JSON.parse(raw);
    return parseGmtToMinutes(obj?.timezone || "GMT+0");
  } catch {
    return 0;
  }
}

// "2025-09-12 03:45:25.593889" / "2025-09-12T03:45:25Z" / number → ms (UTC varsay)
function toUnixMsUTC(ts) {
  if (typeof ts === "number") return ts > 1e12 ? ts : ts * 1000;
  if (typeof ts !== "string") return 0;
  let s = ts.trim();
  if (s.includes(" ") && !s.includes("T")) s = s.replace(" ", "T");
  if (!/Z$|[+-]\d\d:\d\d$/.test(s)) s += "Z";
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : 0;
}

// UTC ms + ofset dk → Date (zoned)
function msToZonedDate(msUTC, offsetMinutes) {
  return new Date(msUTC + (offsetMinutes || 0) * 60 * 1000);
}
/* ==================================================== */

export default function ExamineBot({ isOpen, onClose, botId, initialBotName }) {
  const { t, i18n } = useTranslation("examineBot");
  const locale = i18n.language || "en-GB";

  const [view, setView] = useState("trades");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [tzOffsetMin, setTzOffsetMin] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    fetchAndStoreBotAnalysis(botId);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // mount'ta cookie'den TZ ofsetini al
  useEffect(() => {
    setTzOffsetMin(readTimezoneOffsetMinutesFromCookie());
  }, []);

  // item.date -> UNIX saniye (UTC) çevir. Z/offset yoksa Z ekle.
  const toUnixSecUTC = (ts) => {
    const ms = toUnixMsUTC(ts);
    return Math.floor(ms / 1000);
  };

  const bot = useBotExamineStore((s) => s.getBot(botId));
  const fetchAndStoreBotAnalysis = useBotExamineStore((s) => s.fetchAndStoreBotAnalysis);

  const trades = bot?.trades || [];
  const logs = bot?.logs || [];

  // Sıralamayı da UTC yorumu ile yap
  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => toUnixMsUTC(b.date) - toUnixMsUTC(a.date)),
    [trades]
  );

  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => toUnixMsUTC(b.created_at) - toUnixMsUTC(a.created_at)),
    [logs]
  );

  if (!isOpen) return null;

  const LevelBadge = ({ level }) => {
    const lv = String(level || "").toLowerCase();
    const cls =
      lv === "error"
        ? "bg-red-600 text-white"
        : lv === "warning"
          ? "bg-amber-600 text-white"
          : "bg-zinc-600 text-white";
    return <span className={`text-[10px] px-2 py-0.5 rounded ${cls}`}>{t(`values.${lv}`, { defaultValue: lv.toUpperCase() })}</span>;
  };

  // Cookie TZ’ye göre tarih formatı
  const formatDate = (dateString) => {
    const msUTC = toUnixMsUTC(dateString);                // geleni UTC varsayarak ms
    const zoned = msToZonedDate(msUTC, tzOffsetMin);      // cookie ofsetini uygula
    // Hile: zoned Date'i "UTC" timeZone'unda yazdır → istenen ofsete göre görüntü
    return zoned.toLocaleString(locale, {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  };

  const formatUSD = (n) => {
    const num = Number(n ?? 0);
    if (!Number.isFinite(num)) return "-";
    return num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[9999]">
      {/* Modal Container */}
      <div className="relative w-[98vw] h-[95vh] flex flex-col bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* --- HEADER --- */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-semibold text-white tracking-wide flex items-center gap-2">
                <FaRobot className="text-blue-500" />
                {bot?.bot_name || initialBotName || "Loading..."}
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">{t("header.description")}</p>
            </div>

            {/* Stats Pills */}
            {bot ? (
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${bot.bot_profit >= 0
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                  {bot.bot_profit >= 0 ? <MdTrendingUp className="text-base" /> : <MdTrendingDown className="text-base" />}
                  <span>{t("header.totalProfit")}: <span className="font-mono">{formatUSD(bot.bot_profit)} $</span></span>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <span>{t("header.totalValue")}: <span className="font-mono">{formatUSD(bot.bot_current_value)} $</span></span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-32 bg-zinc-800 rounded-full"></div>
                <div className="h-8 w-32 bg-zinc-800 rounded-full"></div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
              title={t("header.refresh")}
              disabled={isRefreshing}
            >
              <IoMdRefresh size={20} className={isRefreshing ? "animate-spin" : ""} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <IoMdClose size={20} />
            </button>
          </div>
        </div>

        {/* --- BODY (2-Column Split) --- */}
        {!bot ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-zinc-400 text-sm animate-pulse">Loading bot data...</span>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">

            {/* LEFT COLUMN (75%) */}
            <div className="flex flex-col w-[75%] bg-zinc-950/30">

              {/* Chart Section */}
              <div className="flex-[1.5] border-b border-zinc-800 min-h-0 flex flex-col relative">
                <div className="px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/30 flex items-center gap-2">
                  <FaChartLine className="text-indigo-500" />
                  <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide">{t("charts.pnlTitle")}</span>
                </div>
                <div className="flex-1 p-4 relative">
                  <div className="absolute inset-0 pb-4 px-2">
                    <PnLChart
                      data={bot.pnl_data.map((item) => ({
                        time: toUnixSecUTC(item.date),
                        value: item.pnl,
                      }))}
                    />
                  </div>
                </div>
              </div>

              {/* Assets Section (Bottom Part: Split) */}
              <div className="flex-1 grid grid-cols-2 divide-x divide-zinc-800 min-h-0 bg-zinc-900/20">
                {/* Positions */}
                <div className="flex flex-col min-h-0">
                  <div className="px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/30 flex items-center justify-between sticky top-0">
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                      <FaChartLine className="text-purple-500" /> {t("positions.title")}
                    </span>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{bot.open_positions.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700 font-mono">
                    {bot.open_positions.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                        <span className="text-xs italic">{t("positions.empty")}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {bot.open_positions.map((pos, i) => (
                          <div key={i} className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 hover:border-zinc-700 transition group relative overflow-hidden">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <div className="text-sm font-bold text-zinc-200">{pos.symbol}</div>
                                <div className="text-[10px] text-zinc-500 uppercase">
                                  {t(`values.${(pos.marginType || 'isolated').toLowerCase()}`, { defaultValue: pos.marginType || 'Isolated' })} · {pos.leverage}x
                                </div>
                              </div>
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase border ${String(pos.position_side).toLowerCase() === 'long'
                                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                : 'bg-red-500/10 text-red-500 border-red-500/20'
                                }`}>
                                {t(`values.${String(pos.position_side).toLowerCase()}`, { defaultValue: pos.position_side })}
                              </span>
                            </div>
                            <div className="flex justify-between items-end border-t border-zinc-800/50 pt-2 mt-1 text-xs">
                              <div>
                                <div className="text-[10px] text-zinc-500">{t("positions.amount")}</div>
                                <div className="text-zinc-300">$ {Number(pos.totalValue).toFixed(2)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-zinc-500">{t("positions.profit")}</div>
                                <div className={`font-bold ${Number(pos.profit) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {Number(pos.profit).toFixed(2)} $
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Holdings */}
                <div className="flex flex-col min-h-0">
                  <div className="px-4 py-2 border-b border-zinc-800/50 bg-zinc-900/30 flex items-center justify-between sticky top-0">
                    <span className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                      <FaCoins className="text-amber-500" /> {t("holdings.title")}
                    </span>
                    <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{bot.holdings.length}</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-zinc-700 font-mono">
                    {bot.holdings.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-600 opacity-50">
                        <span className="text-xs italic">{t("holdings.empty")}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {bot.holdings.map((h, i) => (
                          <div key={i} className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-3 hover:border-amber-500/20 transition group">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_4px_rgba(245,158,11,0.5)]"></div>
                              <div className="text-sm font-bold text-zinc-200">{h.symbol}</div>
                            </div>
                            <div className="flex justify-between items-end text-xs">
                              <div>
                                <div className="text-[10px] text-zinc-500">{t("holdings.amount")}</div>
                                <div className="text-zinc-300">{Number(h.amount).toFixed(4)}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-[10px] text-zinc-500">{t("holdings.value")}</div>
                                <div className="text-zinc-200 font-medium">$ {(Number(h.amount) * Number(h.price || 0)).toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN (25%) - Trades & Logs */}
            <div className="w-[25%] flex flex-col bg-zinc-900/80 backdrop-blur-sm min-h-0 border-l border-zinc-800">

              {/* Tabs - Styled like BotModal Form Header */}
              <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
                <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800">
                  {['trades', 'logs'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setView(tab)}
                      className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${view === tab
                        ? "bg-zinc-800 text-white shadow-sm"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                        }`}
                    >
                      {tab === 'trades' ? <FaExchangeAlt /> : <MdNotes className="text-sm" />}
                      {t(`tabs.${tab}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Content List */}
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
                {view === "trades" ? (
                  trades.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                      <FaExchangeAlt className="text-2xl" />
                      <span className="text-xs">{t("trades.empty")}</span>
                    </div>
                  ) : (
                    <table className="w-full text-xs text-left text-white border-none">
                      <thead className="text-[10px] text-zinc-500 uppercase bg-zinc-900/95 sticky top-0 backdrop-blur-sm z-10 border-b border-zinc-800">
                        <tr>
                          <th className="py-2 pl-4 font-medium">{t("trades.columns.symbol")}</th>
                          <th className="py-2 text-right font-medium">{t("trades.columns.price")}</th>
                          <th className="py-2 text-center font-medium">{t("trades.columns.side")}</th>
                          <th className="py-2 pr-4 text-right font-medium">{t("trades.columns.amount")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/40">
                        {sortedTrades.map((trade, idx) => (
                          <tr key={idx} className="hover:bg-zinc-800/40 transition group cursor-default">
                            <td className="py-2.5 pl-4">
                              <div className="font-bold text-zinc-300">{trade.symbol}</div>
                              <div className="text-[10px] text-zinc-600 font-mono">{formatDate(trade.date).split(" ")[1]}</div>
                            </td>
                            <td className="py-2.5 text-right font-mono text-zinc-400">
                              ${formatUSD(trade.price)}
                            </td>
                            <td className="py-2.5 text-center">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${trade.side === "buy"
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-red-500/10 text-red-500 border-red-500/20"
                                }`}>
                                {t(`values.${String(trade.side).toLowerCase()}`, { defaultValue: trade.side?.toUpperCase() })}
                              </span>
                            </td>
                            <td className="py-2.5 pr-4 text-right font-mono text-zinc-300">
                              {trade.amount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
                ) : (
                  logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                      <MdNotes className="text-2xl" />
                      <span className="text-xs">{t("logs.empty")}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col divide-y divide-zinc-800/40">
                      {sortedLogs.map((lg) => {
                        const isOpen = expandedLogId === lg.id;
                        return (
                          <div key={lg.id} className="group transition-colors">
                            <div
                              onClick={() => setExpandedLogId(isOpen ? null : lg.id)}
                              className={`p-3 pl-4 cursor-pointer hover:bg-zinc-800/40 transition ${isOpen ? 'bg-zinc-800/40' : ''}`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <LevelBadge level={lg.level} />
                                <span className="text-[10px] text-zinc-500 font-mono">{formatDate(lg.created_at)}</span>
                              </div>
                              <div className="text-xs text-zinc-300 line-clamp-2 leading-relaxed">
                                {lg.message}
                              </div>
                            </div>
                            {isOpen && (
                              <div className="bg-black/40 p-3 pl-4 text-[10px] font-mono border-y border-zinc-800/50 animate-in slide-in-from-top-1">
                                <div className="flex flex-col gap-2">
                                  {lg.details && (
                                    <pre className="overflow-x-auto text-zinc-400 whitespace-pre-wrap break-all custom-scrollbar">
                                      {JSON.stringify(lg.details, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                )}
              </div>
            </div>

          </div>
        )}</div>
    </div>,
    document.body
  );
}
