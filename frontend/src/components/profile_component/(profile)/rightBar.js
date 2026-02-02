"use client";

import { FaChartBar, FaHistory, FaRecycle, FaBolt, FaTrash } from "react-icons/fa";
import { IoStatsChart, IoTrendingUp, IoTrendingDown } from "react-icons/io5";
import { HiOutlineChartBar } from "react-icons/hi";
import { BsRobot, BsLightningCharge } from "react-icons/bs";
import { MdMultilineChart } from "react-icons/md"; import useIndicatorStore from "@/store/indicator/indicatorStore";
import useStrategyStore from "@/store/indicator/strategyStore";
import { useMemo } from "react";
import { useProfileStore } from "@/store/profile/profileStore";
import { useAccountDataStore } from "@/store/profile/accountDataStore";
import { useTranslation } from "react-i18next";
import RecycleBinModal from "./recycleBinModal";
import { useRef } from "react";

/* ------------------ Tarih yardımcıları (local) ------------------ */
function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}
function startOfWeekMonday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}
function startOfMonth() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

/* ------------------ Local time parser ------------------ */
function toDateLocal(v) {
  if (v == null) return new Date(NaN);
  if (v instanceof Date) return v;

  if (typeof v === "number" || (typeof v === "string" && /^\d+$/.test(v.trim()))) {
    const n = Number(v);
    if (n < 1e11) return new Date(n * 1000);
    if (n < 1e14) return new Date(n);
    return new Date(Math.floor(n / 1000));
  }

  if (typeof v === "string") {
    let s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/.test(s)) {
      s = s.replace(" ", "T");
    }
    const m = s.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d+))?)?$/
    );
    if (m) {
      const [_, Y, M, D, h, mi, sec = "0", frac = "0"] = m;
      return new Date(
        Number(Y), Number(M) - 1, Number(D),
        Number(h), Number(mi), Number(sec),
        Number(frac.slice(0, 3))
      );
    }
    return new Date(s);
  }
  return new Date(NaN);
}

/* ------------------ Snapshots normalize ------------------ */
function normalizeSnapshots(raw) {
  const pts = (raw || []).map((p) => {
    const ts = p && (p.timestamp ?? p.x);
    const val = p && (p.usd_value ?? p.y);
    const x = toDateLocal(ts);
    const y = Number(val ?? 0);
    return { x, y, _raw: p };
  });
  return pts
    .filter((p) => p.x instanceof Date && !isNaN(p.x.getTime()))
    .sort((a, b) => a.x.getTime() - b.x.getTime());
}

/* ----------- Trades içinde tarih alanını akıllı bul ----------- */
const DATE_KEYS = [
  "created_at", "createdAt", "timestamp", "time", "ts",
  "executed_at", "executedAt", "filled_at", "filledAt",
  "order_time", "orderTime", "date"
];

function pickNested(obj, key) {
  if (!obj || typeof obj !== "object") return undefined;
  if (key in obj) return obj[key];
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (v && typeof v === "object") {
      const found = pickNested(v, key);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

function getTradeDateRaw(trade) {
  for (const k of DATE_KEYS) {
    const raw = pickNested(trade, k);
    if (raw != null) return { key: k, raw };
  }
  return { key: null, raw: null };
}

function toDateSmartFromTrade(trade) {
  const { key, raw } = getTradeDateRaw(trade);
  const parsed = toDateLocal(raw);
  return { date: parsed, key, raw };
}

/* ------------- Performans hesaplayıcı ------------- */
function computePerformanceForRange({ label, apiId, snapshots, trades, rangeStart, rangeEnd }) {
  const pts = normalizeSnapshots(snapshots);
  const inRange = pts.filter((p) => p.x >= rangeStart && p.x <= rangeEnd);
  const firstPoint = inRange[0];
  const lastPoint = inRange[inRange.length - 1];

  let pct = null;
  if (firstPoint && lastPoint) {
    const start = Number(firstPoint.y || 0);
    const end = Number(lastPoint.y || 0);
    pct = start !== 0 ? ((end - start) / Math.abs(start)) * 100 : null;
  }

  const filteredTrades = [];
  (trades || []).forEach((t) => {
    const { date } = toDateSmartFromTrade(t);
    if (!(date instanceof Date) || isNaN(date.getTime())) return;
    if (date < rangeStart || date > rangeEnd) return;
    filteredTrades.push(t);
  });

  return { value: pct, trades: filteredTrades.length };
}

export default function RightBar() {
  const { t } = useTranslation("rightBar");
  const recycleBinRef = useRef(null);

  const { strategies } = useStrategyStore();
  const { indicators } = useIndicatorStore();

  const activeApiId = useProfileStore((s) => s.activeApiId);
  const botsByApiId = useAccountDataStore((s) => s.botsByApiId);
  const snapshotsByApiId = useAccountDataStore((s) => s.snapshotsByApiId);
  const tradesByApiId = useAccountDataStore((s) => s.tradesByApiId);

  /* ---- Tüm API'lerdeki botlar ---- */
  const allBots = useMemo(() => {
    if (!botsByApiId) return [];
    return Object.values(botsByApiId).flat();
  }, [botsByApiId]);

  const botCount = allBots.length;
  const activeBotCount = allBots.filter((b) => b && b.active === true).length;

  const indicatorsCount = Array.isArray(indicators) ? indicators.length : 0;
  const strategiesCount = Array.isArray(strategies) ? strategies.length : 0;

  /* ---- Aktif API'ye ait veriler ---- */
  const activeSnapshots = useMemo(
    () => (snapshotsByApiId && snapshotsByApiId[activeApiId]) || [],
    [snapshotsByApiId, activeApiId]
  );
  const activeTrades = useMemo(
    () => (tradesByApiId && tradesByApiId[activeApiId]) || [],
    [tradesByApiId, activeApiId]
  );

  /* ---- Performans (aktif API) ---- */
  const now = new Date();

  const daily = useMemo(
    () =>
      computePerformanceForRange({
        label: "DAILY",
        apiId: activeApiId,
        snapshots: activeSnapshots,
        trades: activeTrades,
        rangeStart: startOfToday(),
        rangeEnd: now,
      }),
    [activeSnapshots, activeTrades, activeApiId]
  );

  const weekly = useMemo(
    () =>
      computePerformanceForRange({
        label: "WEEKLY",
        apiId: activeApiId,
        snapshots: activeSnapshots,
        trades: activeTrades,
        rangeStart: startOfWeekMonday(),
        rangeEnd: now,
      }),
    [activeSnapshots, activeTrades, activeApiId]
  );

  const monthly = useMemo(
    () =>
      computePerformanceForRange({
        label: "MONTHLY",
        apiId: activeApiId,
        snapshots: activeSnapshots,
        trades: activeTrades,
        rangeStart: startOfMonth(),
        rangeEnd: now,
      }),
    [activeSnapshots, activeTrades, activeApiId]
  );

  const performance = { daily, weekly, monthly };

  const stats = [
    {
      title: t("stats.numberOfIndicators"),
      value: indicatorsCount,
      icon: MdMultilineChart,
      color: "cyan"
    },
    {
      title: t("stats.numberOfStrategies"),
      value: strategiesCount,
      icon: HiOutlineChartBar,
      color: "purple"
    },
    {
      title: t("stats.numberOfTotalBots"),
      value: botCount,
      icon: BsRobot,
      color: "blue"
    },
    {
      title: t("stats.totalActiveBots"),
      value: activeBotCount,
      icon: BsLightningCharge,
      color: "emerald"
    },
  ];

  const getColorClasses = (color) => {
    const colors = {
      cyan: {
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/20",
        text: "text-cyan-400",
        glow: "shadow-[0_0_15px_rgba(34,211,238,0.15)]",
        indicator: "bg-cyan-400"
      },
      purple: {
        bg: "bg-purple-500/10",
        border: "border-purple-500/20",
        text: "text-purple-400",
        glow: "shadow-[0_0_15px_rgba(168,85,247,0.15)]",
        indicator: "bg-purple-400"
      },
      blue: {
        bg: "bg-blue-500/10",
        border: "border-blue-500/20",
        text: "text-blue-400",
        glow: "shadow-[0_0_15px_rgba(59,130,246,0.15)]",
        indicator: "bg-blue-400"
      },
      emerald: {
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/20",
        text: "text-emerald-400",
        glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
        indicator: "bg-emerald-400"
      }
    };
    return colors[color] || colors.cyan;
  };

  return (
    <div className="w-[260px] h-full bg-zinc-950 backdrop-blur-sm text-white shrink-0 flex flex-col overflow-hidden border-l border-zinc-800">
      <RecycleBinModal ref={recycleBinRef} />

      <div className="flex flex-col h-full p-2 gap-3 overflow-hidden">

        {/* --- BÖLÜM 1: Genel İstatistikler --- */}
        <div className="space-y-2 shrink-0">
          <div className="flex items-center gap-2 px-1">
            <IoStatsChart className="text-cyan-400 text-sm" />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">{t("sections.statistics") || "Statistics"}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {stats.map((stat, index) => {
              const colors = getColorClasses(stat.color);
              const Icon = stat.icon;
              return (
                <div
                  key={stat.title}
                  className={`group relative bg-zinc-900/60 backdrop-blur-sm rounded-lg border ${colors.border} hover:${colors.bg} transition-all duration-100 p-2 cursor-default ${colors.glow}`}
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: "fadeInUpRightBar 0.6s ease-out forwards",
                  }}
                >
                  {/* Glow effect on hover */}
                  <div className={`absolute inset-0 rounded-lg ${colors.bg} opacity-0 group-hover:opacity-100 transition-opacity duration-100`}></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-1">
                      <Icon className={`text-lg ${colors.text}`} />
                      <div className={`w-1.5 h-1.5 rounded-full ${colors.indicator} shadow-[0_0_6px_currentColor]`}></div>
                    </div>
                    <p className="text-lg font-bold text-zinc-100 mb-0 leading-none">
                      {stat.value}
                    </p>
                    <h4 className="text-[9px] font-medium text-zinc-500 leading-tight mt-1">
                      {stat.title}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent shrink-0"></div>

        {/* --- BÖLÜM 2: Performans (Flexible but compact) --- */}
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex items-center gap-2 px-1 mb-2 shrink-0">
            <IoTrendingUp className="text-cyan-400 text-sm" />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">{t("sections.performance") || "Performance"}</span>
          </div>

          <div className="flex flex-col flex-1 gap-2 min-h-0">
            {["daily", "weekly", "monthly"].map((period, index) => {
              const perf = performance[period] || { value: null, trades: 0 };
              const val = perf.value;
              const trades = perf.trades || 0;

              const isPositive = val !== null && val >= 0;
              const isNegative = val !== null && val < 0;

              return (
                <div
                  key={period}
                  // Removed min-h-[60px] to let it shrink more if needed, default padding kept but could reduce if needed.
                  // Used flex-1 so they share space equally, but if content is small, they won't force huge height if container is small.
                  className="flex-1 group relative bg-zinc-900/60 backdrop-blur-sm rounded-lg border border-zinc-800/50 hover:border-cyan-500/30 transition-all duration-100 p-2 flex flex-col justify-center"
                  style={{
                    animationDelay: `${(index + 4) * 100}ms`,
                    animation: "fadeInUpRightBar 0.6s ease-out forwards",
                  }}
                >
                  {/* Subtle glow on hover */}
                  <div className="absolute inset-0 rounded-lg bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-100"></div>

                  <div className="relative z-10 w-full">
                    <div className="flex items-center justify-between mb-0.5">
                      <h4 className="text-xs font-medium text-zinc-400 capitalize flex items-center gap-2">
                        <div className={`w-1 h-3 rounded-full ${period === 'daily' ? 'bg-cyan-400' :
                          period === 'weekly' ? 'bg-blue-400' : 'bg-purple-400'
                          } shadow-[0_0_6px_currentColor]`}></div>
                        {t(`performance.labels.${period}`)}
                      </h4>
                      <span className="text-[10px] text-zinc-600 bg-zinc-800/50 px-1.5 py-0.5 rounded">
                        {t("performance.trades", { count: trades })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {val !== null && (
                        isPositive ? (
                          <IoTrendingUp className="text-emerald-400 text-base" />
                        ) : (
                          <IoTrendingDown className="text-red-400 text-base" />
                        )
                      )}
                      <p className={`text-lg font-bold tracking-tight ${val === null
                        ? "text-zinc-500"
                        : isPositive
                          ? "text-emerald-400"
                          : "text-red-400"
                        }`}>
                        {val === null
                          ? "–"
                          : `${val >= 0 ? "+" : ""}${val.toFixed(2)}%`}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- Top Buttons (Moved to Bottom) --- */}
        <div className="shrink-0 mt-auto pt-1 mx-2 border-t border-zinc-800/50">
          <button
            className="w-full flex flex-row gap-4 items-center justify-center px-6 py-1.5 rounded-lg bg-zinc-900/60 border border-zinc-800 hover:bg-rose-500/10 hover:border-rose-500/30 hover:text-rose-400 transition-all group"
            onClick={() => recycleBinRef.current?.openModal()}
          >
            <FaTrash className="text-zinc-400 text-[12px] group-hover:text-rose-400" />
            <span className="text-[11px] font-medium text-zinc-500 group-hover:text-rose-300/80 leading-none text-center">
              {t("buttons.recycleBin")}
            </span>
          </button>
        </div>

      </div>

      <style jsx>{`
        @keyframes fadeInUpRightBar {
          from {
            opacity: 0;
            transform: translateX(20px);
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
