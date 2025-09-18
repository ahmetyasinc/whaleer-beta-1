// src/components/profile_component/(showcase)/(explore)/chooseBotModal.js
"use client";

import { useState, useEffect, useMemo } from "react";
import { useBotStore } from "@/store/bot/botStore";
import { useTranslation } from "react-i18next";

function formatUSD(n, locale = "en-US") {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "-";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(Number(n));
}

function getPnlPct(initial, current) {
  const i = Number(initial ?? 0);
  const c = Number(current ?? 0);
  if (!(i > 0)) return null;
  return ((c - i) / i) * 100;
}

// ❗ Gizlenecek acquisition_type'lar
const EXCLUDED_ACQ = new Set(["RENTED", "PURCHASED"]);
const isExcludedAcquisition = (v) => v && EXCLUDED_ACQ.has(String(v).toUpperCase());

export default function ChooseBotModal({ open, onClose, onSelectBot }) {
  const { t, i18n } = useTranslation("chooseBotModal");
  const locale = i18n.language || "en-US";

  const { bots = [], loadBots } = useBotStore();
  const [tab, setTab] = useState("new"); // 'new' | 'update'
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open) loadBots?.();
  }, [open, loadBots]);

  const newListBots = useMemo(
    () =>
      (bots || [])
        // ⛔ acquisition_type filtresi eklendi
        .filter((b) => !isExcludedAcquisition(b?.acquisition_type))
        .filter((b) => !Boolean(b?.for_sale) && !Boolean(b?.for_rent))
        .filter((b) =>
          search ? (b?.name || "").toLowerCase().includes(search.toLowerCase()) : true
        ),
    [bots, search]
  );

  const updateListBots = useMemo(
    () =>
      (bots || [])
        // ⛔ acquisition_type filtresi eklendi
        .filter((b) => !isExcludedAcquisition(b?.acquisition_type))
        .filter((b) => Boolean(b?.for_sale) || Boolean(b?.for_rent))
        .filter((b) =>
          search ? (b?.name || "").toLowerCase().includes(search.toLowerCase()) : true
        ),
    [bots, search]
  );

  if (!open) return null;

  const list = tab === "new" ? newListBots : updateListBots;

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4">
      <div className="w-[95vw] max-w-2xl bg-zinc-900 text-white rounded-xl border border-zinc-800 shadow-2xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              className={`px-3 py-1.5 rounded-lg text-sm ${tab === "new" ? "bg-cyan-500 text-black" : "bg-zinc-800"}`}
              onClick={() => setTab("new")}
              type="button"
              title={t("tabs.new")}
              aria-label={t("tabs.new")}
            >
              {t("tabs.new")}
            </button>
            <button
              className={`px-3 py-1.5 rounded-lg text-sm ${tab === "update" ? "bg-cyan-500 text-black" : "bg-zinc-800"}`}
              onClick={() => setTab("update")}
              type="button"
              title={t("tabs.update")}
              aria-label={t("tabs.update")}
            >
              {t("tabs.update")}
            </button>
          </div>
          <button
            onClick={onClose}
            className="text-2xl px-2 hover:text-red-400"
            type="button"
            title={t("aria.close")}
            aria-label={t("aria.close")}
          >
            ×
          </button>
        </div>

        <div className="p-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("search.placeholder")}
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm outline-none focus:border-cyan-500"
            aria-label={t("search.aria")}
          />
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-4 pt-0">
          {list.length === 0 ? (
            <div className="text-gray-400 text-sm p-6 text-center">{t("list.empty")}</div>
          ) : (
            <ul className="space-y-2">
              {list.map((b) => {
                const initial = Number(b?.initial_usd_value ?? 0);
                const current = Number(b?.current_usd_value ?? 0);
                const pnlPct = getPnlPct(initial, current);

                const pnlClass =
                  pnlPct === null
                    ? "text-gray-400 bg-gray-400/10 border-gray-600/40"
                    : pnlPct > 0
                    ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/30"
                    : pnlPct < 0
                    ? "text-rose-300 bg-rose-500/10 border-rose-500/30"
                    : "text-gray-300 bg-gray-500/10 border-gray-500/30";

                const isListed = Boolean(b?.for_sale) || Boolean(b?.for_rent);
                const saleBadge = b?.for_sale ? (
                  <span className="px-2 py-0.5 text-[11px] rounded border border-amber-500/30 bg-amber-500/10 text-amber-200">
                    {t("badges.forSale", { price: formatUSD(b?.sell_price, locale) })}
                  </span>
                ) : null;

                const rentBadge = b?.for_rent ? (
                  <span className="px-2 py-0.5 text-[11px] rounded border border-sky-500/30 bg-sky-500/10 text-sky-200">
                    {t("badges.forRentPerDay", { price: formatUSD(b?.rent_price, locale) })}
                  </span>
                ) : null;

                return (
                  <li
                    key={b.id}
                    className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/70 hover:border-cyan-500/50 transition flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="font-medium truncate">{b.name}</div>

                      <div className="mt-1 text-xs text-gray-400 flex flex-wrap items-center gap-2">
                        {/* P&L */}
                        <span className="whitespace-nowrap">
                          {formatUSD(initial, locale)} <span className="text-gray-500">→</span> {formatUSD(current, locale)}
                        </span>
                        <span className={`px-2 py-0.5 rounded border ${pnlClass}`}>
                          {pnlPct === null ? t("list.noPnl") : `${pnlPct.toFixed(2)}%`}
                        </span>

                        {/* Listing badges */}
                        {saleBadge}
                        {rentBadge}
                      </div>
                    </div>

                    <button
                      onClick={() => {console.log("Selected in ChooseBotModal:", b, Object.keys(b));
                        onSelectBot?.(b);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500 text-black text-sm hover:bg-cyan-400 shrink-0"
                      type="button"
                      title={isListed ? t("actions.selectUpdate") : t("actions.selectNew")}
                      aria-label={t("actions.select")}
                    >
                      {t("actions.select")}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
