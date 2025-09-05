import { IoMdClose } from "react-icons/io";
import PnLChart from "./pnlCharts";
import useBotExamineStore from "@/store/bot/botExamineStore";
import { MdTrendingUp, MdTrendingDown, MdNotes } from "react-icons/md";
import { FaCoins, FaChartLine, FaExchangeAlt } from "react-icons/fa";
import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";

export default function ExamineBot({ isOpen, onClose, botId }) {
  // 1) Tüm hook'lar koşulsuz, en üstte
  const { t, i18n } = useTranslation("examineBot");
  const locale = i18n.language || "en-GB";
  const [view, setView] = useState("trades");       // yeni hook
  const [expandedLogId, setExpandedLogId] = useState(null);

  const bot = useBotExamineStore((s) => s.getBot(botId));

  const trades = bot?.trades || [];
  const logs = bot?.logs || [];

  const sortedTrades = useMemo(
    () => [...trades].sort((a, b) => new Date(b.date) - new Date(a.date)),
    [trades]
  );
  const sortedLogs = useMemo(
    () => [...logs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
    [logs]
  );

  // 2) Guard return her zaman hook'lardan sonra
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

  const formatDate = (dateString) => {
    const options = { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" };
    return new Date(dateString).toLocaleString(locale, options);
  };
  const formatUSD = (n) => {
    const num = Number(n ?? 0);
    if (!Number.isFinite(num)) return "-";
    return num.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-zinc-900 w-[1100px] h-[85vh] rounded-xl shadow-lg overflow-hidden relative flex">
        {/* Left: Header + Tabs + Chart + Table */}
        <div className="flex flex-col w-[75%] border-r border-zinc-700">
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b border-zinc-700 flex-shrink-0 pl-4">
            <h2 className="text-lg font-bold text-white">{bot.bot_name}</h2>

            <div className="flex items-center gap-4">
              {/* Profit Box */}
              <div
                className={`pl-2 flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                  bot.bot_profit >= 0
                    ? "bg-gradient-to-br from-green-500/20 to-green-700/30 text-green-300 border border-green-500/40"
                    : "bg-gradient-to-br from-red-500/20 to-red-700/30 text-red-300 border border-red-500/40"
                }`}
              >
                {bot.bot_profit >= 0 ? (
                  <MdTrendingUp className="text-green-400 text-lg" />
                ) : (
                  <MdTrendingDown className="text-red-400 text-lg" />
                )}
                <span className="tracking-wider">
                  {t("header.totalProfit")}: {formatUSD(bot.bot_profit)} $
                </span>
              </div>

              {/* Value Box */}
              <div className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-gray-800 text-indigo-300 border border-indigo-400 shadow-sm">
                <span className="tracking-wider">
                  {t("header.totalValue")}: {formatUSD(bot.bot_current_value)} $
                </span>
              </div>
            </div>

            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl ml-4">
              <IoMdClose />
            </button>
          </div>

          {/* 🔹 Tabs: Trades / Logs */}
          <div className="px-4 pt-3 pb-2 border-b border-zinc-700 flex items-center justify-between">
            <div className="inline-flex bg-zinc-800 rounded-lg p-1">
              <button
                onClick={() => setView("trades")}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition ${
                  view === "trades" ? "bg-zinc-700 text-white" : "text-zinc-300 hover:text-white"
                }`}
              >
                <FaExchangeAlt className="text-xs" />
                {t("tabs.trades")}
                <span className="ml-1 text-[10px] text-zinc-400">({trades.length})</span>
              </button>
              <button
                onClick={() => setView("logs")}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-md transition ${
                  view === "logs" ? "bg-zinc-700 text-white" : "text-zinc-300 hover:text-white"
                }`}
              >
                <MdNotes className="text-base" />
                {t("tabs.logs")}
                <span className="ml-1 text-[10px] text-zinc-400">({logs.length})</span>
              </button>
            </div>
          </div>

          {/* Chart (her iki sekmede de dursun istersen burayı kaldırma) */}
          <div className="p-4 border-b border-zinc-700">
            <h3 className="text-sm font-semibold text-white mb-2">{t("charts.pnlTitle")}</h3>
            <PnLChart
              data={bot.pnl_data.map((item) => ({
                time: Math.floor(new Date(item.date).getTime() / 1000),
                value: item.pnl,
              }))}
            />
          </div>

          {/* Table / List */}
          <div className="overflow-y-auto px-4 py-2 flex-1">
            {view === "trades" ? (
              trades.length === 0 ? (
                <p className="text-sm text-center text-zinc-500 py-10">{t("trades.empty")}</p>
              ) : (
                <table className="w-full text-sm text-left text-white border-collapse">
                  <thead className="text-xs border-b pl-2 border-zinc-700 text-zinc-400 uppercase sticky top-0 bg-zinc-900 z-10">
                    <tr>
                      <th>{t("trades.columns.hash")}</th>
                      <th>{t("trades.columns.date")}</th>
                      <th>{t("trades.columns.symbol")}</th>
                      <th>{t("trades.columns.price")}</th>
                      <th>{t("trades.columns.side")}</th>
                      <th>{t("trades.columns.type")}</th>
                      <th>{t("trades.columns.position")}</th>
                      <th>{t("trades.columns.leverage")}</th>
                      <th>{t("trades.columns.quantity")}</th>
                      <th>{t("trades.columns.amount")}</th>
                      <th>{t("trades.columns.fee")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedTrades.map((trade, index) => (
                      <tr key={index} className="border-b border-zinc-800 hover:bg-zinc-800 transition">
                        <td className="py-2 pr-2 text-zinc-500">{index + 1}</td>
                        <td className="py-2 pl-2">{formatDate(trade.date)}</td>
                        <td>{trade.symbol}</td>
                        <td>$ {formatUSD(trade.price)}</td>
                        <td className={trade.side === "buy" ? "text-green-500" : "text-red-500"}>
                          {String(trade.side || "").toUpperCase()}
                        </td>
                        <td className="text-zinc-300">{String(trade.trade_type || "").toUpperCase()}</td>
                        <td className="text-zinc-300">{trade.position_side || "-"}</td>
                        <td className="text-zinc-300">{trade.leverage > 0 ? `${trade.leverage}x` : "-"}</td>
                        <td className="text-zinc-300">{(trade.amount)}</td>
                        <td className="text-zinc-300">$ {formatUSD((trade.amount || 0) * (trade.price || 0))}</td>
                        <td className="text-zinc-300">{trade.fee}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )
            ) : logs.length === 0 ? (
              <p className="text-sm text-center text-zinc-500 py-10">{t("logs.empty")}</p>
            ) : (
              <table className="w-full text-sm text-left text-white border-collapse">
                <thead className="text-xs border-b pl-2 border-zinc-700 text-zinc-400 uppercase sticky top-0 bg-zinc-900 z-10">
                  <tr>
                    <th>{t("logs.columns.id")}</th>
                    <th>{t("logs.columns.date")}</th>
                    <th>{t("logs.columns.level")}</th>
                    <th>{t("logs.columns.symbol")}</th>
                    <th>{t("logs.columns.message")}</th>
                    <th className="text-right">{t("logs.columns.usdValue")}</th>
                    <th className="text-center">{t("logs.columns.details")}</th>
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
                      <tr key={lg.id} className="border-b border-zinc-800">
                        <td className="py-2 pr-2 text-zinc-500">{lg.id}</td>
                        <td className="py-2 pl-2">{formatDate(lg.created_at)}</td>
                        <td className="py-2"><LevelBadge level={lg.level} /></td>
                        <td className="py-2">{lg.symbol || "-"}</td>
                        <td className="py-2 text-zinc-200">{lg.message}</td>
                        <td className="py-2 text-right">{usdVal != null ? `$ ${formatUSD(usdVal)}` : "-"}</td>
                        <td className="py-2 text-center">
                          <button
                            onClick={() => setExpandedLogId(isOpen ? null : lg.id)}
                            className="text-xs px-2 py-1 rounded border border-zinc-600 text-zinc-200 hover:bg-zinc-800"
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

            {/* Detay paneli: tabloda seçilen log için ayrı bir kutu (sticky altta değil, listede altında açılır) */}
            {view === "logs" && expandedLogId != null && (
              <div className="mt-3 rounded-lg border border-zinc-700 bg-zinc-950 p-3">
                {(() => {
                  const lg = sortedLogs.find((x) => x.id === expandedLogId);
                  if (!lg) return null;
                  const action = lg?.details?.action || {};
                  return (
                    <div className="space-y-2">
                      <div className="text-xs text-zinc-400">{t("logs.detailTitle")}</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-zinc-400">{t("logs.fields.side")}</div>
                          <div className="font-mono">{(action.side || "-").toUpperCase()}</div>
                        </div>
                        <div>
                          <div className="text-zinc-400">{t("logs.fields.tradeType")}</div>
                          <div className="font-mono">{(action.trade_type || "-").toUpperCase()}</div>
                        </div>
                        <div>
                          <div className="text-zinc-400">{t("logs.fields.orderType")}</div>
                          <div className="font-mono">{(action.order_type || "-").toUpperCase()}</div>
                        </div>
                        <div>
                          <div className="text-zinc-400">{t("logs.fields.status")}</div>
                          <div className="font-mono">{(action.status || "-").toUpperCase()}</div>
                        </div>
                        <div>
                          <div className="text-zinc-400">{t("logs.fields.stopLoss")}</div>
                          <div className="font-mono">{action.stop_loss ?? "-"}</div>
                        </div>
                        <div>
                          <div className="text-zinc-400">{t("logs.fields.takeProfit")}</div>
                          <div className="font-mono">{action.take_profit ?? "-"}</div>
                        </div>
                      </div>

                      <div className="text-xs text-zinc-400 mt-3">{t("logs.detailRaw")}</div>
                      <pre className="text-[11px] leading-5 bg-black/40 p-3 rounded border border-zinc-800 overflow-x-auto">
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
        <div className="w-[25%] flex flex-col bg-zinc-900 h-full p-4 overflow-y-auto space-y-6">
          {/* Open Positions */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 border-b border-zinc-600 pb-2 flex items-center gap-2">
              <FaChartLine className="text-white" /> {t("positions.title")}
            </h3>
            {bot.open_positions.length === 0 ? (
              <p className="text-sm text-center text-zinc-500 py-4">{t("positions.empty")}</p>
            ) : (
              bot.open_positions.map((pos, i) => {
                const profitColor = "from-zinc-900 border border-gray-700";
                return (
                  <div key={i} className={`mb-3 py-3 px-4 rounded-lg bg-gradient-to-tr to-gray-950 ${profitColor} shadow-inner`}>
                    <div className="flex items-center flex-wrap gap-1 text-sm font-bold text-neutral-200">
                      {bot.pos.symbol}
                      {bot.pos.leverage > 0 && (
                        <span className="mb-1 inline-block text-xs font-semibold bg-gradient-to-r from-orange-700 to-yellow-600 text-neutral-950 px-2 py-0.5 mx-2 rounded shadow-sm">
                          {pos.leverage}x
                        </span>
                      )}
                      {bot.pos.position_side && (
                        <span
                          className={`mb-1 inline-block text-xs font-semibold px-2 py-0.5 rounded shadow-sm ${
                            String(pos.position_side).toLowerCase() === "long"
                              ? "bg-green-600 text-white"
                              : String(pos.position_side).toLowerCase() === "short"
                              ? "bg-red-600 text-white"
                              : "bg-zinc-600 text-white"
                          }`}
                        >
                          {String(pos.position_side).toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-zinc-300">
                      {t("positions.amount")}: {Number(bot.pos.amount).toFixed(6)}
                    </div>

                    <div
                      className={`text-xs font-semibold ${
                        bot.pos.profit > 0 ? "text-green-400" : bot.pos.profit < 0 ? "text-red-400" : "text-zinc-300"
                      }`}
                    >
                      {t("positions.profit")}: {Number(bot.pos.profit).toFixed(3)} $
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Spot Holdings */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2 border-b border-zinc-600 pb-2 flex items-center gap-2">
              <FaCoins className="text-white" /> {t("holdings.title")}
            </h3>
            {bot.holdings.length === 0 ? (
              <p className="text-sm text-center text-zinc-500 py-4">{t("holdings.empty")}</p>
            ) : (
              bot.holdings.map((h, i) => {
                const profitColor = "from-zinc-900 border border-gray-700";
                return (
                  <div key={i} className={`mb-3 py-3 px-4 rounded-lg bg-gradient-to-tr to-gray-950 ${profitColor} shadow-inner`}>
                    <div className="text-sm font-bold text-neutral-200">{h.symbol}</div>
                    <div className="text-xs text-zinc-300">
                      {t("holdings.amount")}: {Number(h.amount).toFixed(6)}
                    </div>
                    <div
                      className={`text-xs font-semibold ${
                        h.profit > 0 ? "text-green-400" : h.profit < 0 ? "text-red-400" : "text-zinc-300"
                      }`}
                    >
                      {t("holdings.profit")}: {Number(h.profit).toFixed(3)} $
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
