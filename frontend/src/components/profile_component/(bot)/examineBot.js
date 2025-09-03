import { IoMdClose } from "react-icons/io";
import { useTranslation } from "react-i18next";
import PnLChart from "./pnlCharts";
import useBotExamineStore from "@/store/bot/botExamineStore";
import { MdTrendingUp, MdTrendingDown } from "react-icons/md";
import { FaCoins, FaChartLine } from "react-icons/fa";

export default function ExamineBot({
  isOpen,
  onClose,
  botId,
}) {
  const { t, i18n } = useTranslation("examineBot");
  const locale = i18n.language || "en-GB";

  const bot = useBotExamineStore((state) => state.getBot(botId));

  if (!isOpen || !bot) return null;

  const {
    bot_name,
    trades = [],
    open_positions = [],
    holdings = [],
    pnl_data = [],
    bot_profit = 0,
    bot_current_value = 0,
  } = bot;

  const formatDate = (dateString) => {
    const options = { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" };
    return new Date(dateString).toLocaleString(locale, options);
  };

  const sortedTrades = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-zinc-900 w-[1100px] h-[85vh] rounded-xl shadow-lg overflow-hidden relative flex">
        {/* Left: Trade History */}
        <div className="flex flex-col w-[75%] border-r border-zinc-700">
          <div className="flex justify-between items-center p-4 border-b border-zinc-700 flex-shrink-0 pl-4">
            <h2 className="text-lg font-bold text-white">{bot_name}</h2>
            <div className="flex items-center gap-4">
              {/* Profit Box */}
              <div
                className={`pl-2 flex items-center gap-2 text-sm font-bold px-4 py-2 rounded-lg shadow-lg transition-all duration-300 ${
                  bot_profit >= 0
                    ? "bg-gradient-to-br from-green-500/20 to-green-700/30 text-green-300 border border-green-500/40"
                    : "bg-gradient-to-br from-red-500/20 to-red-700/30 text-red-300 border border-red-500/40"
                }`}
              >
                {bot_profit >= 0 ? (
                  <MdTrendingUp className="text-green-400 text-lg" />
                ) : (
                  <MdTrendingDown className="text-red-400 text-lg" />
                )}
                <span className="tracking-wider">
                  {t("header.totalProfit")}: {bot_profit.toFixed(2)} $
                </span>
              </div>
              {/* Value Box */}
              <div className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg bg-gray-800 text-indigo-300 border border-indigo-400 shadow-sm">
                <span className="tracking-wider">
                  {t("header.totalValue")}: {bot_current_value.toFixed(2)} $
                </span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl ml-4">
              <IoMdClose />
            </button>
          </div>

          <div className="p-4 border-t border-zinc-700">
            <h3 className="text-sm font-semibold text-white mb-2">
              {t("charts.pnlTitle")}
            </h3>
            <PnLChart
              data={pnl_data.map((item) => ({
                time: Math.floor(new Date(item.date).getTime() / 1000),
                value: item.pnl,
              }))}
            />
          </div>

          <div className="overflow-y-auto px-4 py-2 flex-1">
            {trades.length === 0 ? (
              <p className="text-sm text-center text-zinc-500 py-10">
                {t("trades.empty")}
              </p>
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
                      <td>${trade.price}</td>
                      <td className={trade.side === "buy" ? "text-green-500" : "text-red-500"}>
                        {String(trade.side || "").toUpperCase()}
                      </td>
                      <td className="text-zinc-300">
                        {String(trade.trade_type || "").toUpperCase()}
                      </td>
                      <td className="text-zinc-300">
                        {trade.position_side || "-"}
                      </td>
                      <td className="text-zinc-300">
                        {trade.leverage > 0 ? `${trade.leverage}x` : "-"}
                      </td>
                      <td className="text-zinc-300">$ {trade.amount}</td>
                      <td className="text-zinc-300">$ {(trade.amount * trade.price).toFixed(2)}</td>
                      <td className="text-zinc-300">{trade.fee}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
            {open_positions.length === 0 ? (
              <p className="text-sm text-center text-zinc-500 py-4">
                {t("positions.empty")}
              </p>
            ) : (
              open_positions.map((pos, i) => {
                const profitColor = "from-zinc-900 border border-gray-700";
                return (
                  <div
                    key={i}
                    className={`mb-3 py-3 px-4 rounded-lg bg-gradient-to-tr to-gray-950 ${profitColor} shadow-inner`}
                  >
                    <div className="flex items-center flex-wrap gap-1 text-sm font-bold text-neutral-200">
                      {pos.symbol}
                      {/* Leverage badge */}
                      {pos.leverage > 0 && (
                        <span className="mb-1 inline-block text-xs font-semibold bg-gradient-to-r from-orange-700 to-yellow-600 text-neutral-950 px-2 py-0.5 mx-2 rounded shadow-sm">
                          {pos.leverage}x
                        </span>
                      )}
                      {/* Position side badge */}
                      {pos.position_side && (
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
                      {t("positions.amount")}: {Number(pos.amount).toFixed(6)}
                    </div>

                    <div
                      className={`text-xs font-semibold ${
                        pos.profit > 0
                          ? "text-green-400"
                          : pos.profit < 0
                          ? "text-red-400"
                          : "text-zinc-300"
                      }`}
                    >
                      {t("positions.profit")}: {Number(pos.profit).toFixed(3)} $
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
            {holdings.length === 0 ? (
              <p className="text-sm text-center text-zinc-500 py-4">
                {t("holdings.empty")}
              </p>
            ) : (
              holdings.map((h, i) => {
                const profitColor = "from-zinc-900 border border-gray-700";
                return (
                  <div
                    key={i}
                    className={`mb-3 py-3 px-4 rounded-lg bg-gradient-to-tr to-gray-950 ${profitColor} shadow-inner`}
                  >
                    <div className="text-sm font-bold text-neutral-200">
                      {h.symbol}
                    </div>
                    <div className="text-xs text-zinc-300">
                      {t("holdings.amount")}: {Number(h.amount).toFixed(6)}
                    </div>

                    <div
                      className={`text-xs font-semibold ${
                        h.profit > 0
                          ? "text-green-400"
                          : h.profit < 0
                          ? "text-red-400"
                          : "text-zinc-300"
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
