import { IoMdClose } from "react-icons/io";
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

export default function ExamineBot({ isOpen, onClose, botId }) {
  const { t, i18n } = useTranslation("examineBot");
  const locale = i18n.language || "en-GB";

  const [view, setView] = useState("trades");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const [tzOffsetMin, setTzOffsetMin] = useState(0);

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

  if (!isOpen || !bot) return null;

  const LevelBadge = ({ level }) => {
    const lv = String(level || "").toLowerCase();
    const cls =
      lv === "error"
        ? "bg-red-600 text-white"
        : lv === "warning"
          ? "bg-amber-600 text-white"
          : "bg-zinc-600 text-white";
    return <span className={`text-[10px] px-2 py-0.5 rounded ${cls}`}>{lv.toUpperCase()}</span>;
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
      <div className="bg-zinc-900 w-[1100px] h-[85vh] rounded-xl shadow-2xl overflow-hidden relative flex border border-zinc-800">
        {/* Left: Header + Tabs + Chart + Table */}
        <div className="flex flex-col w-[75%] border-r border-zinc-800">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-zinc-800 flex-shrink-0 pl-4 bg-zinc-900/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaRobot className="text-blue-500" />
              {bot.bot_name}
            </h2>

            <div className="flex items-center gap-4">
              {/* Profit Box */}
              <div
                className={`pl-2 flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${bot.bot_profit >= 0
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
              >
                {bot.bot_profit >= 0 ? (
                  <MdTrendingUp className="text-emerald-400 text-lg" />
                ) : (
                  <MdTrendingDown className="text-red-400 text-lg" />
                )}
                <span className="tracking-wider">
                  {t("header.totalProfit")}: {formatUSD(bot.bot_profit)} $
                </span>
              </div>

              {/* Value Box */}
              <div className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm">
                <span className="tracking-wider">
                  {t("header.totalValue")}: {formatUSD(bot.bot_current_value)} $
                </span>
              </div>
            </div>

            <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors text-2xl ml-4 p-1 hover:bg-zinc-800 rounded-lg">
              <IoMdClose />
            </button>
          </div>

          {/* 🔹 Tabs: Trades / Logs */}
          <div className="px-4 pt-3 pb-2 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
            <div className="inline-flex bg-zinc-950/50 rounded-lg p-1 border border-zinc-800">
              <button
                onClick={() => setView("trades")}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition ${view === "trades" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  }`}
              >
                <FaExchangeAlt className="text-xs" />
                {t("tabs.trades")}
                <span className="ml-1 text-[10px] text-zinc-500">({trades.length})</span>
              </button>
              <button
                onClick={() => setView("logs")}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition ${view === "logs" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                  }`}
              >
                <MdNotes className="text-base" />
                {t("tabs.logs")}
                <span className="ml-1 text-[10px] text-zinc-500">({logs.length})</span>
              </button>
            </div>
          </div>

          {/* Chart */}
          <div className="p-4 border-b border-zinc-800 bg-zinc-900/20">
            <h3 className="text-sm font-semibold text-zinc-400 mb-2 flex items-center gap-2">
              <FaChartLine /> {t("charts.pnlTitle")}
            </h3>
            <PnLChart
              data={bot.pnl_data.map((item) => ({
                time: toUnixSecUTC(item.date), // UTC saniye
                value: item.pnl,
              }))}
            />
          </div>

          {/* Table / List */}
          <div className="overflow-y-auto px-4 py-2 flex-1 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
            {view === "trades" ? (
              trades.length === 0 ? (
                <p className="text-sm text-center text-zinc-500 py-10">{t("trades.empty")}</p>
              ) : (
                <table className="w-full text-sm text-left text-white border-collapse">
                  <thead className="text-xs border-b pl-2 border-zinc-800 text-zinc-500 uppercase sticky top-0 bg-zinc-900 z-10">
                    <tr>
                      <th className="py-2">{t("trades.columns.hash")}</th>
                      <th className="py-2">{t("trades.columns.date")}</th>
                      <th className="py-2">{t("trades.columns.symbol")}</th>
                      <th className="py-2">{t("trades.columns.price")}</th>
                      <th className="py-2">{t("trades.columns.side")}</th>
                      <th className="py-2">{t("trades.columns.type")}</th>
                      <th className="py-2">{t("trades.columns.position")}</th>
                      <th className="py-2">{t("trades.columns.leverage")}</th>
                      <th className="py-2">{t("trades.columns.quantity")}</th>
                      <th className="py-2">{t("trades.columns.amount")}</th>
                      <th className="py-2">{t("trades.columns.fee")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTrades.map((trade, index) => (
                      <tr key={index} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition group">
                        <td className="py-2 pr-2 text-zinc-600 group-hover:text-zinc-400">{index + 1}</td>
                        <td className="py-2 pl-2 text-zinc-300">{formatDate(trade.date)}</td>
                        <td className="font-semibold text-zinc-200">{trade.symbol}</td>
                        <td className="font-mono text-zinc-300">$ {formatUSD(trade.price)}</td>
                        <td className={`font-bold ${trade.side === "buy" ? "text-emerald-500" : "text-red-500"}`}>
                          {String(trade.side || "").toUpperCase()}
                        </td>
                        <td className="text-zinc-400">{String(trade.trade_type || "").toUpperCase()}</td>
                        <td className="text-zinc-400">{trade.position_side || "-"}</td>
                        <td className="text-zinc-400">{trade.leverage > 0 ? `${trade.leverage}x` : "-"}</td>
                        <td className="text-zinc-400 font-mono">{trade.amount}</td>
                        <td className="text-zinc-300 font-mono">$ {formatUSD((trade.amount || 0) * (trade.price || 0))}</td>
                        <td className="text-red-400 text-xs">{trade.fee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : logs.length === 0 ? (
              <p className="text-sm text-center text-zinc-500 py-10">{t("logs.empty")}</p>
            ) : (
              <table className="w-full text-sm text-left text-white border-collapse">
                <thead className="text-xs border-b pl-2 border-zinc-800 text-zinc-500 uppercase sticky top-0 bg-zinc-900 z-10">
                  <tr>
                    <th className="py-2">{t("logs.columns.date")}</th>
                    <th className="py-2">{t("logs.columns.level")}</th>
                    <th className="py-2">{t("logs.columns.symbol")}</th>
                    <th className="py-2">{t("logs.columns.message")}</th>
                    <th className="text-right py-2">{t("logs.columns.usdValue")}</th>
                    <th className="text-center py-2">{t("logs.columns.details")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedLogs.map((lg) => {
                    const usdVal =
                      lg?.details?.usd_value ??
                      lg?.details?.usdValue ??
                      (lg?.details?.amount && lg?.details?.price
                        ? Number(lg.details.amount) * Number(lg.details.price)
                        : null);

                    const isOpen = expandedLogId === lg.id;
                    return (
                      <tr key={lg.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/50 transition">
                        <td className="py-2 pl-2 text-zinc-400 font-mono text-xs">{formatDate(lg.created_at)}</td>
                        <td className="py-2"><LevelBadge level={lg.level} /></td>
                        <td className="py-2 text-zinc-300">{lg.symbol || "-"}</td>
                        <td className="py-2 text-zinc-200">{lg.message}</td>
                        <td className="py-2 text-right font-mono text-zinc-300">{usdVal != null ? `$ ${formatUSD(usdVal)}` : "-"}</td>
                        <td className="py-2 text-center">
                          <button
                            onClick={() => setExpandedLogId(isOpen ? null : lg.id)}
                            className="text-[10px] uppercase font-bold tracking-wide px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                          >
                            {isOpen ? t("logs.hideDetails") : t("logs.showDetails")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            {/* Detay paneli */}
            {view === "logs" && expandedLogId != null && (
              <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-950/50 p-4 animate-in fade-in slide-in-from-top-2">
                {(() => {
                  const lg = sortedLogs.find((x) => x.id === expandedLogId);
                  if (!lg) return null;
                  const action = lg?.details?.action || {};
                  return (
                    <div className="space-y-3">
                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider">{t("logs.detailTitle")}</div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                          <div className="text-xs text-zinc-500 mb-1">{t("logs.fields.side")}</div>
                          <div className={`font-bold ${action.side === 'buy' ? 'text-green-400' : action.side === 'sell' ? 'text-red-400' : 'text-zinc-300'}`}>{(action.side || "-").toUpperCase()}</div>
                        </div>
                        <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                          <div className="text-xs text-zinc-500 mb-1">{t("logs.fields.tradeType")}</div>
                          <div className="font-mono text-zinc-300">{(action.trade_type || "-").toUpperCase()}</div>
                        </div>
                        <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                          <div className="text-xs text-zinc-500 mb-1">{t("logs.fields.orderType")}</div>
                          <div className="font-mono text-zinc-300">{(action.order_type || "-").toUpperCase()}</div>
                        </div>
                        <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                          <div className="text-xs text-zinc-500 mb-1">{t("logs.fields.status")}</div>
                          <div className="font-mono text-zinc-300">{(action.status || "-").toUpperCase()}</div>
                        </div>
                        <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                          <div className="text-xs text-zinc-500 mb-1">{t("logs.fields.stopLoss")}</div>
                          <div className="font-mono text-zinc-300">{action.stop_loss ?? "-"}</div>
                        </div>
                        <div className="bg-zinc-900/50 p-2 rounded border border-zinc-800">
                          <div className="text-xs text-zinc-500 mb-1">{t("logs.fields.takeProfit")}</div>
                          <div className="font-mono text-zinc-300">{action.take_profit ?? "-"}</div>
                        </div>
                      </div>

                      <div className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-2">{t("logs.detailRaw")}</div>
                      <pre className="text-[10px] leading-4 bg-black/60 p-3 rounded-lg border border-zinc-800 text-zinc-400 overflow-x-auto font-mono">
                        {JSON.stringify(lg.details ?? {}, null, 2)}
                      </pre>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Open Positions + Spot Holdings */}
        <div className="w-[25%] flex flex-col bg-zinc-950/30 h-full p-4 overflow-y-auto space-y-6 border-l border-zinc-800 backdrop-blur-sm">
          {/* Open Positions */}
          <div>
            <h3 className="text-sm font-bold text-zinc-400 mb-3 border-b border-zinc-800 pb-2 flex items-center gap-2 uppercase tracking-wide">
              <FaChartLine className="text-purple-500" /> {t("positions.title")}
            </h3>
            {bot.open_positions.length === 0 ? (
              <p className="text-xs text-center text-zinc-600 italic py-4">{t("positions.empty")}</p>
            ) : (
              bot.open_positions.map((pos, i) => {
                return (
                  <div key={i} className={`mb-3 py-3 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition shadow-sm group`}>
                    <div className="flex items-center flex-wrap gap-1 text-sm font-bold text-zinc-200">
                      {pos.symbol}
                      {pos.leverage > 0 && (
                        <span className="text-[10px] font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">
                          {pos.leverage}x
                        </span>
                      )}
                      {pos.position_side && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${String(pos.position_side).toLowerCase() === "long"
                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                            : String(pos.position_side).toLowerCase() === "short"
                              ? "bg-red-500/10 text-red-500 border-red-500/20"
                              : "bg-zinc-800 text-zinc-400 border-zinc-700"
                            }`}
                        >
                          {String(pos.position_side).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-zinc-500">
                        {t("positions.amount")}: <span className="text-zinc-300 font-mono">{Number(pos.amount).toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-zinc-800/50 flex justify-between items-center">
                      <span className="text-xs text-zinc-500">{t("positions.profit")}</span>
                      <span
                        className={`text-sm font-mono font-bold ${pos.profit > 0 ? "text-emerald-400" : pos.profit < 0 ? "text-red-400" : "text-zinc-400"
                          }`}
                      >
                        {Number(pos.profit).toFixed(3)} $
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Spot Holdings */}
          <div>
            <h3 className="text-sm font-bold text-zinc-400 mb-3 border-b border-zinc-800 pb-2 flex items-center gap-2 uppercase tracking-wide">
              <FaCoins className="text-amber-500" /> {t("holdings.title")}
            </h3>
            {bot.holdings.length === 0 ? (
              <p className="text-xs text-center text-zinc-600 italic py-4">{t("holdings.empty")}</p>
            ) : (
              bot.holdings.map((h, i) => {
                return (
                  <div key={i} className={`mb-3 py-3 px-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition shadow-sm`}>
                    <div className="text-sm font-bold text-zinc-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      {h.symbol}
                    </div>

                    <div className="flex justify-between items-center mt-2">
                      <div className="text-xs text-zinc-500">
                        {t("holdings.amount")}: <span className="text-zinc-300 font-mono">{Number(h.amount).toFixed(4)}</span>
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-zinc-800/50 flex justify-between items-center">
                      <span className="text-xs text-zinc-500">{t("holdings.profit")}</span>
                      <span
                        className={`text-sm font-mono font-bold ${h.profit > 0 ? "text-emerald-400" : h.profit < 0 ? "text-red-400" : "text-zinc-400"
                          }`}
                      >
                        {Number(h.profit).toFixed(3)} $
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
