"use client";

import { FaChartBar, FaHistory, FaRecycle, FaBolt } from "react-icons/fa";
import useIndicatorStore from "@/store/indicator/indicatorStore";
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
  const day = d.getDay(); // 0=Pazar, 1=Pazartesi
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
    if (n < 1e11) return new Date(n * 1000); // saniye
    if (n < 1e14) return new Date(n);        // ms
    return new Date(Math.floor(n / 1000));   // mikro/nano → ms'e indir
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

/* ------------- Performans ve debug log hesaplayıcı ------------- */
function computePerformanceForRange({ label, apiId, snapshots, trades, rangeStart, rangeEnd }) {
  const fmt = (d) =>
    d instanceof Date && !isNaN(d.getTime())
      ? d.toLocaleString() // local görünsün
      : String(d);

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
  const excluded = [];

  (trades || []).forEach((t) => {
    const { date, key, raw } = toDateSmartFromTrade(t);

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      excluded.push({ reason: "invalid_date", key, raw, parsed: String(date) });
      return;
    }
    if (date < rangeStart) {
      excluded.push({ reason: "before_range", key, raw, parsed: fmt(date) });
      return;
    }
    if (date > rangeEnd) {
      excluded.push({ reason: "after_range", key, raw, parsed: fmt(date) });
      return;
    }
    filteredTrades.push({ ...t, _parsedAt: date, _dateKey: key });
  });

  try {
    const sample = (trades || []).slice(0, 3).map((t, i) => {
      const keys = Object.keys(t || {});
      const { key, raw, date } = toDateSmartFromTrade(t);
      return {
        i,
        keys: keys.slice(0, 15).join(","),
        chosenKey: key,
        rawValue: raw,
        parsedLocal: fmt(date),
      };
    });
    console.groupEnd();
  } catch (err) {
    console.warn("[RightBar] Debug log error:", err);
  }

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

  /* ---- Tüm API’lerdeki botlar ---- */
  const allBots = useMemo(() => {
    if (!botsByApiId) return [];
    return Object.values(botsByApiId).flat();
  }, [botsByApiId]);

  const botCount = allBots.length;
  const activeBotCount = allBots.filter((b) => b && b.active === true).length;

  const indicatorsCount = Array.isArray(indicators) ? indicators.length : 0;
  const strategiesCount = Array.isArray(strategies) ? strategies.length : 0;

  /* ---- Aktif API’ye ait veriler ---- */
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
    { title: t("stats.numberOfIndicators"), value: indicatorsCount },
    { title: t("stats.numberOfStrategies"), value: strategiesCount },
    { title: t("stats.numberOfTotalBots"), value: botCount },
    { title: t("stats.totalActiveBots"), value: activeBotCount },
  ];

  return (
    <div className="w-[260px] h-[calc(100vh-60px)] bg-black text-white shrink-0 flex flex-col">
      {/* Üst Aksiyon Butonları */}
      <div className="p-3 border-b border-neutral-800">
        <div className="grid grid-cols-1 gap-[10px]">
          <button className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-pink-700 hover:from-pink-700 hover:to-orange-500 duration-200 text-white px-3 py-2 rounded-lg text-xs font-medium hover:shadow-lg transition">
            <FaBolt className="text-[16px]" /> {t("buttons.quickActions")}
          </button>
          <button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-blue-800 hover:from-blue-700 hover:to-indigo-500 duration-200 text-white px-3 py-2 rounded-lg text-xs font-medium hover:shadow-lg transition">
            <FaChartBar className="text-[16px]" /> {t("buttons.publishedIndicators")}
          </button>
          <button className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-emerald-700 hover:to-green-600 duration-200 text-white px-3 py-2 rounded-lg text-xs font-medium hover:shadow-lg transition">
            <FaRecycle className="text-[16px]" /> {t("buttons.recycleBin")}
          </button>
          <button className="flex items-center gap-2 bg-gradient-to-r from-fuchsia-600 to-rose-700 hover:from-rose-700 hover:to-fuchsia-600 duration-200 text-white px-3 py-2 rounded-lg text-xs font-medium hover:shadow-lg transition">
            <FaHistory className="text-[16px]" /> {t("buttons.purchaseHistory")}
          </button>
        </div>
      </div>

      {/* İçerik */}
      <div className="flex-1 overflow-y-auto p-3">
        {/* Genel İstatistikler (Tüm API'ler) */}
        <div className="space-y-3 mb-5">
          {stats.map((stat, index) => (
            <div
              key={stat.title}
              className="bg-gradient-to-r pt-4 from-gray-950 to-zinc-900 rounded-lg h-16 shadow-md hover:shadow-lg border border-neutral-700 transition-all duration-300 flex flex-col justify-center px-4"
              style={{ animationDelay: `${index * 200}ms`, animation: "fadeInUpRightBar 1s ease-out forwards" }}
            >
              <h4 className="text-xs font-medium text-zinc-400 mb-1">{stat.title}</h4>
              <p className="text-lg font-semibold text-white">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Performans (Aktif API) */}
        <div className="space-y-3">
          {["daily", "weekly", "monthly"].map((period, index) => {
            const perf = performance[period] || { value: null, trades: 0 };
            const val = perf.value;
            const trades = perf.trades || 0;

            const colorClass =
              val === null ? "text-zinc-300" : val >= 0 ? "text-emerald-400" : "text-red-400";

            return (
              <div
                key={period}
                className="bg-gradient-to-r from-gray-950 to-zinc-900 rounded-lg h-20 shadow-md hover:shadow-lg border border-neutral-700 transition-all duration-300 flex flex-col justify-center px-4"
                style={{ animationDelay: `${index * 200}ms`, animation: "fadeInUpRightBar 1s ease-out forwards" }}
              >
                <h4 className="text-xs font-medium text-zinc-400 capitalize mb-1">
                  {t(`performance.labels.${period}`)}
                </h4>
                <div className="flex justify-between items-center">
                  <p className={`text-lg font-bold ${colorClass}`}>
                    {val === null ? "–" : `${val >= 0 ? "+" : "-"}${Math.abs(val).toFixed(2)}%`}
                  </p>
                  <span className="text-xs mb-3 text-zinc-400">
                    {t("performance.trades", { count: trades })}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUpRightBar {
          from { opacity: 0; transform: translateX(40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
