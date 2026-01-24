"use client";

import { FaChartBar, FaHistory, FaRecycle, FaBolt } from "react-icons/fa";
import { IoStatsChart, IoTrendingUp, IoTrendingDown } from "react-icons/io5";
import { HiOutlineChartBar } from "react-icons/hi";
import { BsRobot, BsLightningCharge } from "react-icons/bs";
import { MdMultilineChart } from "react-icons/md"; import useIndicatorStore from "@/store/indicator/indicatorStore";
import useStrategyStore from "@/store/indicator/strategyStore";
import { useMemo } from "react";
import { useProfileStore } from "@/store/profile/profileStore";
import { useAccountDataStore } from "@/store/profile/accountDataStore";
import { useTranslation } from "react-i18next";

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

      <div className="flex flex-col h-full p-2 gap-4 overflow-hidden items-stretch">

        {/* --- BÖLÜM 1: Genel İstatistikler --- */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1 mb-1">
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
                    <p className="text-xl font-bold text-zinc-100 mb-0">
                      {stat.value}
                    </p>
                    <h4 className="text-[10px] font-medium text-zinc-500 leading-tight">
                      {stat.title}
                    </h4>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mt-2 bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent"></div>

        {/* --- BÖLÜM 2: Performans --- */}
        <div className="space-y-2 flex-1">
          <div className="flex items-center gap-2 px-1 mb-1">
            <IoTrendingUp className="text-cyan-400 text-sm" />
            <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest">{t("sections.performance") || "Performance"}</span>
          </div>

          <div className="space-y-1.5">
            {["daily", "weekly", "monthly"].map((period, index) => {
              const perf = performance[period] || { value: null, trades: 0 };
              const val = perf.value;
              const trades = perf.trades || 0;

              const isPositive = val !== null && val >= 0;
              const isNegative = val !== null && val < 0;

              return (
                <div
                  key={period}
                  className="group relative bg-zinc-900/60 backdrop-blur-sm rounded-lg border border-zinc-800/50 hover:border-cyan-500/30 transition-all duration-100 p-2"
                  style={{
                    animationDelay: `${(index + 4) * 100}ms`,
                    animation: "fadeInUpRightBar 0.6s ease-out forwards",
                  }}
                >
                  {/* Subtle glow on hover */}
                  <div className="absolute inset-0 rounded-lg bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-100"></div>

                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-2">
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
                          <IoTrendingUp className="text-emerald-400 text-lg" />
                        ) : (
                          <IoTrendingDown className="text-red-400 text-lg" />
                        )
                      )}
                      <p className={`text-xl font-bold tracking-tight ${val === null
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
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(113, 113, 122, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(113, 113, 122, 0.5);
        }
      `}</style>
    </div>
  );
}
