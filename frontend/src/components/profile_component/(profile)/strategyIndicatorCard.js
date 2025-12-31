'use client'

import { useState, useRef, useEffect, useMemo, useLayoutEffect } from "react";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import useStrategyStore from "@/store/indicator/strategyStore";
import { BsThreeDotsVertical } from "react-icons/bs";
import { IoSearch, IoEye, IoCheckmarkCircle, IoCloseCircle } from "react-icons/io5";
import { FiUpload } from "react-icons/fi";
import { PublishStrategyModal } from "./publishStrategyModal";
import { PublishIndicatorModal } from "./publishIndicatorModal";
import { publishStrategy, publishIndicator } from "@/api/strategies";
import CodeModal from "@/components/profile_component/(indicator)/(modal_tabs)/CodeModal";
import React from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";

/* ------------------------ Portal & Menu ------------------------ */
function PositionedMenu({ position, onClose, children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted || !position) return null;

  const style = {
    top: position.top,
    left: position.left,
  };

  return createPortal(
    <>
      {/* Invisible backdrop to catch outside clicks */}
      <div
        className="fixed inset-0 z-[9998]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />
      {/* The actual menu */}
      <div
        className="fixed z-[9999] w-44 bg-zinc-900/95 backdrop-blur-md rounded-lg shadow-2xl border border-zinc-700/50 overflow-hidden"
        style={style}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>,
    document.body
  );
}


/* ------------------------ Toast ------------------------ */
function Toast({ toasts }) {
  const { t } = useTranslation("strategyIndicator");
  return (
    <div className="fixed top-4 right-4 space-y-3 z-[1000]">
      {toasts.map((to) => {
        const title =
          to.title ||
          (to.type === "success"
            ? t("toast.titles.success")
            : to.type === "error"
              ? t("toast.titles.error")
              : t("toast.titles.info"));
        return (
          <div
            key={to.id}
            className={`min-w-[260px] max-w-[380px] px-4 py-3 rounded-xl text-sm shadow-2xl border backdrop-blur-md animate-[toastIn_0.25s_ease-out]
            ${to.type === "success"
                ? "bg-zinc-900/90 text-emerald-200 border-emerald-500/30 shadow-emerald-500/10"
                : to.type === "error"
                  ? "bg-zinc-900/90 text-rose-200 border-rose-500/30 shadow-rose-500/10"
                  : "bg-zinc-900/90 text-zinc-200 border-zinc-500/30"
              }`}
            role="status"
          >
            <div className="font-medium">{title}</div>
            {to.msg && <div className="opacity-80 mt-0.5 text-xs">{to.msg}</div>}
          </div>
        );
      })}

      <style jsx>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

/* ------------------------ UI helpers ------------------------ */
function PermissionPill({ ok, labelKey }) {
  const { t } = useTranslation("strategyIndicator");
  const label = t(`permissions.${labelKey}`);
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${ok
        ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20 shadow-[0_0_6px_rgba(16,185,129,0.15)]"
        : "bg-zinc-800/50 text-zinc-500 border-zinc-700/50"
        }`}
    >
      {ok ? <IoCheckmarkCircle size={12} /> : <IoCloseCircle size={12} />} {label}
    </span>
  );
}

function ReleaseStrip({ titleKey, color, release }) {
  const { t } = useTranslation("strategyIndicator");
  if (!release) return null;
  const p = release.permissions || {};
  const isBlue = color === "blue";

  const ColorBar = () => (
    <div className={`w-1 h-4 rounded-full shadow-[0_0_6px_currentColor] ${isBlue ? "bg-cyan-400 text-cyan-400" : "bg-amber-400 text-amber-400"}`}></div>
  );

  const pills = [
    Object.prototype.hasOwnProperty.call(p, "allow_code_view") ? <PermissionPill key="code" ok={!!p.allow_code_view} labelKey="code" /> : null,
    Object.prototype.hasOwnProperty.call(p, "allow_chart_view") ? <PermissionPill key="chart" ok={!!p.allow_chart_view} labelKey="chart" /> : null,
    Object.prototype.hasOwnProperty.call(p, "allow_scanning") ? <PermissionPill key="scan" ok={!!p.allow_scanning} labelKey="scan" /> : null,
    Object.prototype.hasOwnProperty.call(p, "allow_backtesting") ? <PermissionPill key="back" ok={!!p.allow_backtesting} labelKey="backtest" /> : null,
    Object.prototype.hasOwnProperty.call(p, "allow_bot_execution") ? <PermissionPill key="bot" ok={!!p.allow_bot_execution} labelKey="bot" /> : null,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-2 text-[11px] bg-zinc-900/60 border border-zinc-800/50 rounded-lg px-2.5 py-1.5 mt-2 backdrop-blur-sm">
      <ColorBar />
      <span className={`font-medium ${isBlue ? "text-cyan-300" : "text-amber-300"}`}>
        {t(`release.${titleKey}`)}
      </span>
      <span className="text-zinc-500 text-[10px]">{t("release.versionPrefix")}{release.no ?? "-"}</span>
      {typeof release.views_count === "number" && (
        <span className="inline-flex items-center gap-1 text-zinc-400 ml-1 text-[10px]">
          <IoEye size={11} /> {release.views_count}
        </span>
      )}
      {pills.length > 0 && (
        <>
          <span className="mx-1.5 text-zinc-700">|</span>
          <div className="flex flex-wrap gap-1">{pills}</div>
        </>
      )}
    </div>
  );
}

function EmptyState({ color = "blue", text }) {
  const ring = color === "purple" ? "bg-purple-500/10 border-purple-500/20" : "bg-cyan-500/10 border-cyan-500/20";
  const dot = color === "purple" ? "bg-purple-400 shadow-[0_0_12px_rgba(168,85,247,0.4)]" : "bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.4)]";
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center opacity-70">
      <div className={`w-16 h-16 ${ring} border rounded-full flex items-center justify-center mb-4`}>
        <div className={`w-3 h-3 ${dot} rounded-full`}></div>
      </div>
      <p className="text-zinc-500 text-xs uppercase tracking-wider font-medium">{text}</p>
    </div>
  );
}

/* ------------------------ Main Component ------------------------ */
export default function StrategyIndicatorCard() {
  const { t, i18n } = useTranslation("strategyIndicator");
  const locale = i18n.language || "en";

  // Menu State: { key: string | null, position: { top: number, left: number } | null }
  const [menuState, setMenuState] = useState({ key: null, position: null });

  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // Inspect → CodeModal state
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [inspectTarget, setInspectTarget] = useState(null);

  const { strategies, setStrategyPendingRelease } = useStrategyStore();
  const { indicators, setIndicatorPendingRelease } = useIndicatorStore();

  // Toast state
  const [toasts, setToasts] = useState([]);
  const showToast = (type, msg, title) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, msg, title }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  };

  /* ------------------------ STRATEGY GROUPING ------------------------ */
  const strategyGroups = useMemo(() => {
    if (!Array.isArray(strategies)) return [];
    const map = new Map();
    for (const s of strategies) {
      const groupId = s.parent_strategy_id ?? s.id;
      if (!map.has(groupId)) map.set(groupId, { groupId, versions: [] });
      map.get(groupId).versions.push(s);
    }
    const groups = Array.from(map.values()).map((g) => {
      g.versions.sort((a, b) => {
        const va = Number(a.version ?? 0), vb = Number(b.version ?? 0);
        if (vb !== va) return vb - va;
        const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
        const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return cb - ca;
      });
      g.latest = g.versions[0];
      return g;
    });
    groups.sort((a, b) => {
      const ca = a.latest?.created_at ? new Date(a.latest.created_at).getTime() : 0;
      const cb = b.latest?.created_at ? new Date(b.latest.created_at).getTime() : 0;
      return cb - ca;
    });
    return groups;
  }, [strategies]);

  const [selectedVersionByStrategyGroup, setSelectedVersionByStrategyGroup] = useState({});
  useEffect(() => {
    const init = {};
    for (const g of strategyGroups) init[g.groupId] = g.latest?.id;
    setSelectedVersionByStrategyGroup((prev) => ({ ...init, ...prev }));
  }, [strategyGroups]);

  /* ------------------------ INDICATOR GROUPING ----------------------- */
  const indicatorGroups = useMemo(() => {
    if (!Array.isArray(indicators)) return [];
    const map = new Map();
    for (const it of indicators) {
      const groupId = it.parent_indicator_id ?? it.id;
      if (!map.has(groupId)) map.set(groupId, { groupId, versions: [] });
      map.get(groupId).versions.push(it);
    }
    const groups = Array.from(map.values()).map((g) => {
      g.versions.sort((a, b) => {
        const va = Number(a.version ?? 0), vb = Number(b.version ?? 0);
        if (vb !== va) return vb - va;
        const ca = a.created_at ? new Date(a.created_at).getTime() : 0;
        const cb = b.created_at ? new Date(b.created_at).getTime() : 0;
        return cb - ca;
      });
      g.latest = g.versions[0];
      return g;
    });
    groups.sort((a, b) => {
      const ca = a.latest?.created_at ? new Date(a.latest.created_at).getTime() : 0;
      const cb = b.latest?.created_at ? new Date(b.latest.created_at).getTime() : 0;
      return cb - ca;
    });
    return groups;
  }, [indicators]);

  const [selectedVersionByIndicatorGroup, setSelectedVersionByIndicatorGroup] = useState({});
  useEffect(() => {
    const init = {};
    for (const g of indicatorGroups) init[g.groupId] = g.latest?.id;
    setSelectedVersionByIndicatorGroup((prev) => ({ ...init, ...prev }));
  }, [indicatorGroups]);

  /* ----------------------------- EFFECTS ----------------------------- */
  useEffect(() => {
    const timer = setTimeout(() => setInitialLoad(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const closeMenu = () => setMenuState({ key: null, position: null });

  /* ---------------------------- HANDLERS ----------------------------- */
  const handleModalPublish = async ({ permissions, description }) => {
    if (!selectedStrategyId) return;
    try {
      const res = await publishStrategy({ strategyId: selectedStrategyId, permissions, description });
      if (res.ok) {
        const pr = {
          id: res.data?.release_id,
          no: res.data?.release_no,
          status: "pending",
          permissions: {
            allow_code_view: !!permissions?.codeView,
            allow_chart_view: !!permissions?.chartView,
            allow_scanning: !!permissions?.scan,
            allow_backtesting: !!permissions?.backtest,
            allow_bot_execution: !!permissions?.botRun,
          },
        };
        setStrategyPendingRelease(selectedStrategyId, pr);
        showToast("success", t("toast.messages.strategyPublish.ok"), t("toast.titles.success"));
      } else {
        showToast("error", res.error || t("toast.messages.strategyPublish.failed"), t("toast.titles.error"));
      }
    } catch (e) {
      console.error("Publish error:", e);
      showToast("error", t("toast.messages.strategyPublish.unexpected"), t("toast.titles.error"));
    } finally {
      setShowStrategyModal(false);
      setSelectedStrategyId(null);
    }
  };

  const handleIndicatorPublish = async ({ permissions, description }) => {
    if (!selectedIndicatorId) return;
    try {
      const res = await publishIndicator({ indicatorId: selectedIndicatorId, permissions, description });
      if (res.ok) {
        const pr = {
          id: res.data?.release_id,
          no: res.data?.release_no,
          status: "pending",
          permissions: {
            allow_code_view: !!permissions?.codeView,
            allow_chart_view: !!permissions?.chartView,
          },
        };
        setIndicatorPendingRelease(selectedIndicatorId, pr);
        showToast("success", t("toast.messages.indicatorPublish.ok"), t("toast.titles.success"));
      } else {
        showToast("error", res.error || t("toast.messages.indicatorPublish.failed"), t("toast.titles.error"));
      }
    } catch (e) {
      console.error("Indicator publish error:", e);
      showToast("error", t("toast.messages.indicatorPublish.unexpected"), t("toast.titles.error"));
    } finally {
      setShowIndicatorModal(false);
      setSelectedIndicatorId(null);
    }
  };

  const handleInspect = (item) => {
    setInspectTarget(item);
    setIsInspectOpen(true);
    closeMenu();
  };

  /* --------------------------- ITEMS --------------------------- */
  const StrategyGroupItem = ({ group, index }) => {
    const selectedId = selectedVersionByStrategyGroup[group.groupId] ?? group.latest?.id;
    const selected = group.versions.find((v) => v.id === selectedId) || group.latest;
    const menuKey = `s-${selected.id}`;
    const approved = selected?.approved_release || null;
    const pending = selected?.pending_release || null;

    const onChangeVersion = (e) => {
      const newId = Number(e.target.value);
      setSelectedVersionByStrategyGroup((prev) => ({ ...prev, [group.groupId]: newId }));
    };

    const isMenuOpen = menuState.key === menuKey;

    return (
      <div
        className="group bg-zinc-900/40 backdrop-blur-sm rounded-xl p-4 hover:bg-zinc-800/50 transition-all duration-300 border border-zinc-800/50 hover:border-cyan-500/30 relative hover:shadow-[0_0_20px_rgba(34,211,238,0.08)]"
        style={initialLoad ? { animationDelay: `${index * 100}ms`, animation: "fadeInUp 0.6s ease-out forwards" } : {}}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-semibold text-zinc-100 text-sm group-hover:text-cyan-50 transition-colors">{selected?.name || group.latest?.name}</div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 shadow-[0_0_8px_rgba(34,211,238,0.1)]">
                {t("release.versionPrefix")}{selected?.version ?? "-"}
              </span>
              {group.versions.length > 1 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                  {t("badges.versions", { count: group.versions.length })}
                </span>
              )}
            </div>
            {group.versions.length > 1 && (
              <select
                value={selectedId}
                onChange={onChangeVersion}
                className="bg-zinc-950/60 border border-zinc-700/50 rounded-lg text-[11px] px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 mt-1 cursor-pointer hover:bg-zinc-900/80 transition-colors"
                onClick={(e) => {
                  if (menuState.key) closeMenu();
                  e.stopPropagation();
                }}
              >
                {group.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {t("release.versionPrefix")}{v.version ?? "-"} • {v.created_at ? new Date(v.created_at).toLocaleDateString(locale) : "—"}
                  </option>
                ))}
              </select>
            )}

            <ReleaseStrip titleKey="approved" color="blue" release={approved} />
            <ReleaseStrip titleKey="pending" color="amber" release={pending} />
            {selected?.description && (
              <div className="text-xs text-zinc-500 line-clamp-2 mt-2 font-light leading-relaxed">{selected.description}</div>
            )}
          </div>
          <div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isMenuOpen) {
                  closeMenu();
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuState({
                    key: menuKey,
                    position: {
                      top: rect.bottom + 5,
                      left: Math.max(10, rect.right - 176)
                    }
                  });
                }
              }}
              className={`p-2 rounded-lg transition-all duration-200 ${isMenuOpen ? "bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]" : "hover:bg-zinc-800 text-zinc-400 hover:text-cyan-300"}`}
              title={t("menu.actions")}
            >
              <BsThreeDotsVertical size={16} />
            </button>
            {isMenuOpen && (
              <PositionedMenu position={menuState.position} onClose={closeMenu}>
                <div className="flex flex-col py-1">
                  <button
                    onClick={() => handleInspect(selected)}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-zinc-200 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors"
                  >
                    <IoSearch size={15} /> {t("menu.inspect")}
                  </button>
                  <div className="h-px bg-zinc-800 mx-3 my-1"></div>
                  <button
                    onClick={() => {
                      closeMenu();
                      setSelectedStrategyId(selected.id);
                      setShowStrategyModal(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-zinc-200 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors"
                  >
                    <FiUpload size={15} /> {t("menu.publish")}
                  </button>
                </div>
              </PositionedMenu>
            )}
          </div>
        </div>
      </div>
    );
  };

  const IndicatorGroupItem = ({ group, index }) => {
    const selectedId = selectedVersionByIndicatorGroup[group.groupId] ?? group.latest?.id;
    const selected = group.versions.find((v) => v.id === selectedId) || group.latest;
    const menuKey = `i-${selected.id}`;
    const approved = selected?.approved_release || null;
    const pending = selected?.pending_release || null;

    const onChangeVersion = (e) => {
      const newId = Number(e.target.value);
      setSelectedVersionByIndicatorGroup((prev) => ({ ...prev, [group.groupId]: newId }));
    };

    const isMenuOpen = menuState.key === menuKey;

    return (
      <div
        className="group bg-zinc-900/40 backdrop-blur-sm rounded-xl p-4 hover:bg-zinc-800/50 transition-all duration-300 border border-zinc-800/50 hover:border-purple-500/30 relative hover:shadow-[0_0_20px_rgba(168,85,247,0.08)]"
        style={initialLoad ? { animationDelay: `${index * 100}ms`, animation: "fadeInUp 0.6s ease-out forwards" } : {}}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="font-semibold text-zinc-100 text-sm group-hover:text-purple-50 transition-colors">{selected?.name || group.latest?.name}</div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 shadow-[0_0_8px_rgba(168,85,247,0.1)]">
                {t("release.versionPrefix")}{selected?.version ?? "-"}
              </span>
              {group.versions.length > 1 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
                  {t("badges.versions", { count: group.versions.length })}
                </span>
              )}
            </div>
            {group.versions.length > 1 && (
              <select
                value={selectedId}
                onChange={onChangeVersion}
                className="bg-zinc-950/60 border border-zinc-700/50 rounded-lg text-[11px] px-2.5 py-1.5 text-zinc-300 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 mt-1 cursor-pointer hover:bg-zinc-900/80 transition-colors"
                onClick={(e) => {
                  if (menuState.key) closeMenu();
                  e.stopPropagation();
                }}
              >
                {group.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    {t("release.versionPrefix")}{v.version ?? "-"} • {v.created_at ? new Date(v.created_at).toLocaleDateString(locale) : "—"}
                  </option>
                ))}
              </select>
            )}

            <ReleaseStrip titleKey="approved" color="blue" release={approved} />
            <ReleaseStrip titleKey="pending" color="amber" release={pending} />
            {selected?.description && (
              <div className="text-xs text-zinc-500 line-clamp-2 mt-2 font-light leading-relaxed">{selected.description}</div>
            )}
          </div>
          <div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (isMenuOpen) {
                  closeMenu();
                } else {
                  const rect = e.currentTarget.getBoundingClientRect();
                  setMenuState({
                    key: menuKey,
                    position: {
                      top: rect.bottom + 5,
                      left: Math.max(10, rect.right - 176)
                    }
                  });
                }
              }}
              className={`p-2 rounded-lg transition-all duration-200 ${isMenuOpen ? "bg-purple-500/20 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.2)]" : "hover:bg-zinc-800 text-zinc-400 hover:text-purple-300"}`}
              title={t("menu.actions")}
            >
              <BsThreeDotsVertical size={16} />
            </button>
            {isMenuOpen && (
              <PositionedMenu position={menuState.position} onClose={closeMenu}>
                <div className="flex flex-col py-1">
                  <button
                    onClick={() => handleInspect(selected)}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-zinc-200 hover:bg-purple-500/10 hover:text-purple-300 transition-colors"
                  >
                    <IoSearch size={15} /> {t("menu.inspect")}
                  </button>
                  <div className="h-px bg-zinc-800 mx-3 my-1"></div>
                  <button
                    onClick={() => {
                      closeMenu();
                      setSelectedIndicatorId(selected.id);
                      setShowIndicatorModal(true);
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-2.5 text-xs text-zinc-200 hover:bg-purple-500/10 hover:text-purple-300 transition-colors"
                  >
                    <FiUpload size={15} /> {t("menu.publish")}
                  </button>
                </div>
              </PositionedMenu>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* --------------------------- RENDER --------------------------- */
  return (
    <div className="w-full h-[calc(100vh-120px)] flex gap-4 overflow-hidden">
      {/* Strategies (GROUPED) */}
      <div className="flex-1 bg-zinc-950/90 backdrop-blur-sm rounded-2xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_12px_#22d3ee]"></div>
                <div className="absolute inset-0 bg-cyan-400 rounded-full animate-ping opacity-25"></div>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-wide uppercase">{t("headers.strategies")}</h3>
            </div>
            <span className="bg-cyan-500/10 text-cyan-300 text-xs px-3 py-1 rounded-full font-semibold border border-cyan-500/20 shadow-[0_0_10px_rgba(34,211,238,0.1)]">
              {strategyGroups.length}
            </span>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {strategyGroups.length > 0 ? (
            strategyGroups.map((group, idx) => (
              <StrategyGroupItem key={group.groupId} group={group} index={idx} />
            ))
          ) : (
            <EmptyState color="blue" text={t("empty.strategies")} />
          )}
        </div>
      </div>

      {/* Indicators (GROUPED) */}
      <div className="flex-1 bg-zinc-950/90 backdrop-blur-sm rounded-2xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/50 bg-zinc-900/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 bg-purple-400 rounded-full shadow-[0_0_12px_#a855f7]"></div>
                <div className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-25"></div>
              </div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-wide uppercase">{t("headers.indicators")}</h3>
            </div>
            <span className="bg-purple-500/10 text-purple-300 text-xs px-3 py-1 rounded-full font-semibold border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]">
              {indicatorGroups.length}
            </span>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {indicatorGroups.length > 0 ? (
            indicatorGroups.map((group, idx) => (
              <IndicatorGroupItem key={group.groupId} group={group} index={idx} />
            ))
          ) : (
            <EmptyState color="purple" text={t("empty.indicators")} />
          )}
        </div>
      </div>

      {/* Modals */}
      <PublishStrategyModal
        isOpen={showStrategyModal}
        onClose={() => setShowStrategyModal(false)}
        onPublish={handleModalPublish}
      />
      <PublishIndicatorModal
        isOpen={showIndicatorModal}
        onClose={() => setShowIndicatorModal(false)}
        onPublish={handleIndicatorPublish}
      />

      {/* Inspect → CodeModal */}
      <CodeModal
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        indicator={inspectTarget}
      />

      {/* Toast container */}
      <Toast toasts={toasts} />

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(15px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
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