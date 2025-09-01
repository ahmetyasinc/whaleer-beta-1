'use client'

import { useState, useRef, useEffect, useMemo } from "react";
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

/* ------------------------ Toast (yüksek kontrast) ------------------------ */
function Toast({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[9999] space-y-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`min-w-[260px] max-w-[380px] px-4 py-3 rounded-xl text-sm shadow-2xl border backdrop-blur-md animate-[toastIn_0.25s_ease-out]
          ${
            t.type === "success"
              ? "bg-emerald-600/80 text-white border-emerald-300/30"
              : t.type === "error"
              ? "bg-rose-600/80 text-white border-rose-300/30"
              : "bg-black/80 text-white border-white/10"
          }`}
          role="status"
        >
          <div className="font-medium">
            {t.title || (t.type === "success" ? "Success" : t.type === "error" ? "Error" : "Info")}
          </div>
          {t.msg && <div className="opacity-90 mt-0.5">{t.msg}</div>}
        </div>
      ))}

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
function PermissionPill({ ok, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border ${
        ok
          ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/30"
          : "bg-zinc-700/50 text-zinc-300 border-zinc-500/40"
      }`}
    >
      {ok ? <IoCheckmarkCircle size={12} /> : <IoCloseCircle size={12} />} {label}
    </span>
  );
}

/* undefined olan izinleri gizler; böylece indicator tarafında Scan/Backtest/Bot görünmez */
function ReleaseStrip({ title, color, release }) {
  if (!release) return null;
  const p = release.permissions || {};
  const ColorBar = () => (
    <div className={`w-1 h-5 rounded ${color === "blue" ? "bg-blue-400" : "bg-amber-400"}`}></div>
  );

  const pills = [
    Object.prototype.hasOwnProperty.call(p, "allow_code_view")  ? <PermissionPill key="code"  ok={!!p.allow_code_view}  label="Code" /> : null,
    Object.prototype.hasOwnProperty.call(p, "allow_chart_view") ? <PermissionPill key="chart" ok={!!p.allow_chart_view} label="Chart" /> : null,
    Object.prototype.hasOwnProperty.call(p, "allow_scanning")   ? <PermissionPill key="scan"  ok={!!p.allow_scanning}   label="Scan" /> : null,
    Object.prototype.hasOwnProperty.call(p, "allow_backtesting")? <PermissionPill key="back"  ok={!!p.allow_backtesting}label="Backtest" /> : null,
    Object.prototype.hasOwnProperty.call(p, "allow_bot_execution") ? <PermissionPill key="bot" ok={!!p.allow_bot_execution} label="Bot" /> : null,
  ].filter(Boolean);

  return (
    <div className="flex items-center gap-2 text-[11px] bg-zinc-900/80 border border-zinc-600/70 rounded-md px-2 py-1 mt-2">
      <ColorBar />
      <span className={`font-medium ${color === "blue" ? "text-blue-300" : "text-amber-300"}`}>
        {title}
      </span>
      <span className="text-zinc-400">v{release.no ?? "-"}</span>
      {typeof release.views_count === "number" && (
        <span className="inline-flex items-center gap-1 text-zinc-200 ml-1">
          <IoEye size={12} /> {release.views_count}
        </span>
      )}
      {pills.length > 0 && (
        <>
          <span className="mx-2 text-zinc-600">|</span>
          <div className="flex flex-wrap gap-1">{pills}</div>
        </>
      )}
    </div>
  );
}

function EmptyState({ color = "blue", text = "Empty" }) {
  const ring = color === "purple" ? "bg-purple-500/15" : "bg-blue-500/15";
  const dot  = color === "purple" ? "bg-purple-400/50" : "bg-blue-400/50";
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className={`w-12 h-12 ${ring} rounded-full flex items-center justify-center mb-3`}>
        <div className={`w-6 h-6 ${dot} rounded-full`}></div>
      </div>
      <p className="text-gray-400 text-xs">{text}</p>
    </div>
  );
}

/* ------------------------ Main Component ------------------------ */
export default function StrategyIndicatorCard() {
  const [menuOpenKey, setMenuOpenKey] = useState(null); // "s-<id>" | "i-<id>"
  const menuRef = useRef(null);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [showIndicatorModal, setShowIndicatorModal] = useState(false);
  const [selectedStrategyId, setSelectedStrategyId] = useState(null);
  const [selectedIndicatorId, setSelectedIndicatorId] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true);

  // 👇 Inspect → CodeModal state (view ping YOK)
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [inspectTarget, setInspectTarget] = useState(null);

  const { strategies, setStrategyPendingRelease } = useStrategyStore();
  const { indicators, setIndicatorPendingRelease } = useIndicatorStore();

  // 🔔 Toast state
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
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpenKey(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    const timer = setTimeout(() => setInitialLoad(false), 1500);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      clearTimeout(timer);
    };
  }, []);

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
            allow_code_view:  !!permissions?.codeView,
            allow_chart_view: !!permissions?.chartView,
            allow_scanning:   !!permissions?.scan,
            allow_backtesting:!!permissions?.backtest,
            allow_bot_execution: !!permissions?.botRun,
          },
        };
        setStrategyPendingRelease(selectedStrategyId, pr);
        showToast("success", "Strategy published successfully.", "Publish OK");
      } else {
        showToast("error", res.error || "Failed to publish strategy.", "Publish Failed");
      }
    } catch (e) {
      console.error("Publish error:", e);
      showToast("error", "Unexpected error while publishing strategy.", "Publish Error");
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
            allow_code_view:  !!permissions?.codeView,
            allow_chart_view: !!permissions?.chartView,
          },
        };
        setIndicatorPendingRelease(selectedIndicatorId, pr);
        showToast("success", "Indicator published successfully.", "Publish OK");
      } else {
        showToast("error", res.error || "Failed to publish indicator.", "Publish Failed");
      }
    } catch (e) {
      console.error("Indicator publish error:", e);
      showToast("error", "Unexpected error while publishing indicator.", "Publish Error");
    } finally {
      setShowIndicatorModal(false);
      setSelectedIndicatorId(null);
    }
  };

  // Inspect: sadece modal aç (view notify YOK)
  const handleInspect = (item) => {
    setInspectTarget(item);
    setIsInspectOpen(true);
    setMenuOpenKey(null);
  };

  /* --------------------------- ITEMS --------------------------- */
  const StrategyGroupItem = ({ group, index }) => {
    const selectedId = selectedVersionByStrategyGroup[group.groupId] ?? group.latest?.id;
    const selected = group.versions.find((v) => v.id === selectedId) || group.latest;
    const menuKey = `s-${selected.id}`;
    const approved = selected?.approved_release || null;
    const pending  = selected?.pending_release  || null;

    const onChangeVersion = (e) => {
      const newId = Number(e.target.value);
      setSelectedVersionByStrategyGroup((prev) => ({ ...prev, [group.groupId]: newId }));
    };

    return (
      <div
        className="group bg-gradient-to-r from-slate-800/60 to-slate-900/60 rounded-lg p-3 hover:bg-zinc-900 transition-all duration-200 border border-zinc-700 hover:border-zinc-500 relative"
        style={initialLoad ? { animationDelay: `${index * 200}ms`, animation: "fadeInUp 1s ease-out forwards" } : {}}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-medium text-white text-sm">{selected?.name || group.latest?.name}</div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/30 text-blue-100 border border-blue-300/30">
                v{selected?.version ?? "-"}
              </span>
              {group.versions.length > 1 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-zinc-700/60 text-zinc-200 border border-zinc-500/50">
                  {group.versions.length} versiyon
                </span>
              )}
            </div>

            {group.versions.length > 1 && (
              <select
                value={selectedId}
                onChange={onChangeVersion}
                className="bg-zinc-900/80 border border-zinc-600 rounded-md text-xs px-2 py-1 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                {group.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version ?? "-"} • {v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                  </option>
                ))}
              </select>
            )}

            <ReleaseStrip title="Approved" color="blue"  release={approved} />
            <ReleaseStrip title="Pending"  color="amber" release={pending} />

            {selected?.description && (
              <div className="text-xs text-gray-300/90 line-clamp-2 mt-2">{selected.description}</div>
            )}
          </div>

          <div className="relative" ref={menuOpenKey === menuKey ? menuRef : null}>
            <button
              onClick={() => setMenuOpenKey(menuOpenKey === menuKey ? null : menuKey)}
              className="p-1.5 rounded-full hover:bg-zinc-700 transition-colors"
              title="Actions"
            >
              <BsThreeDotsVertical className="text-gray-200" size={14} />
            </button>

            {menuOpenKey === menuKey && (
              <div className="absolute top-0 right-8 w-40 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 z-20 overflow-hidden">
                <button
                  onClick={() => handleInspect(selected)} // 👈 sadece modal
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-yellow-300 hover:bg-gray-800/80 transition-colors"
                >
                  <IoSearch size={14} /> Inspect (v{selected.version ?? "-"})
                </button>
                <button
                  onClick={() => {
                    setMenuOpenKey(null);
                    setSelectedStrategyId(selected.id);
                    setShowStrategyModal(true);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-blue-300 hover:bg-gray-800/80 transition-colors border-t border-gray-700"
                >
                  <FiUpload size={14} /> Publish
                </button>
              </div>
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
    const pending  = selected?.pending_release  || null;

    const onChangeVersion = (e) => {
      const newId = Number(e.target.value);
      setSelectedVersionByIndicatorGroup((prev) => ({ ...prev, [group.groupId]: newId }));
    };

    return (
      <div
        className="group bg-gradient-to-r from-slate-800/60 to-slate-900/60 rounded-lg p-3 hover:bg-zinc-900 transition-all duration-200 border border-zinc-700 hover:border-zinc-500 relative"
        style={initialLoad ? { animationDelay: `${index * 200}ms`, animation: "fadeInUp 1s ease-out forwards" } : {}}
      >
        <div className="flex justify-between items-start gap-3">
          <div className="flex-1 pr-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="font-medium text-white text-sm">{selected?.name || group.latest?.name}</div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/30 text-purple-100 border border-purple-300/30">
                v{selected?.version ?? "-"}
              </span>
              {group.versions.length > 1 && (
                <span className="text-[10px] px-1 py-0.5 rounded bg-zinc-700/60 text-zinc-200 border border-zinc-500/50">
                  {group.versions.length} versiyon
                </span>
              )}
            </div>

            {group.versions.length > 1 && (
              <select
                value={selectedId}
                onChange={onChangeVersion}
                className="bg-zinc-900/80 border border-zinc-600 rounded-md text-xs px-2 py-1 text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-400"
              >
                {group.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.version ?? "-"} • {v.created_at ? new Date(v.created_at).toLocaleDateString() : "—"}
                  </option>
                ))}
              </select>
            )}

            <ReleaseStrip title="Approved" color="blue"  release={approved} />
            <ReleaseStrip title="Pending"  color="amber" release={pending} />

            {selected?.description && (
              <div className="text-xs text-gray-300/90 line-clamp-2 mt-2">{selected.description}</div>
            )}
          </div>

          <div className="relative" ref={menuOpenKey === menuKey ? menuRef : null}>
            <button
              onClick={() => setMenuOpenKey(menuOpenKey === menuKey ? null : menuKey)}
              className="p-1.5 rounded-full hover:bg-zinc-700 transition-colors"
              title="Actions"
            >
              <BsThreeDotsVertical className="text-gray-200" size={14} />
            </button>

            {menuOpenKey === menuKey && (
              <div className="absolute top-0 right-8 w-40 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-xl border border-gray-700 z-20 overflow-hidden">
                <button
                  onClick={() => handleInspect(selected)} // 👈 sadece modal
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-yellow-300 hover:bg-gray-800/80 transition-colors"
                >
                  <IoSearch size={14} /> Inspect (v{selected.version ?? "-"})
                </button>
                <button
                  onClick={() => {
                    setMenuOpenKey(null);
                    setSelectedIndicatorId(selected.id);
                    setShowIndicatorModal(true);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-xs text-blue-300 hover:bg-gray-800/80 transition-colors border-t border-gray-700"
                >
                  <FiUpload size={14} /> Publish
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* --------------------------- RENDER --------------------------- */
  return (
    <div className="w-full h-full flex gap-3 overflow-hidden">
      {/* Strategies (GROUPED) */}
      <div className="flex-1 bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl border border-zinc-700 shadow-xl flex flex-col max-h=[calc(100vh-110px)]">
        <div className="px-4 py-3 border-b border-zinc-700 bg-gradient-to-r from-blue-900/20 to-blue-800/10">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-400 rounded-full"></div>
            <h3 className="text-sm mt-[6px] font-semibold text-blue-200">My Strategies</h3>
            <span className="bg-blue-500/20 text-blue-200 text-xs px-2 py-0.5 rounded-full font-medium border border-blue-400/20">
              {strategyGroups.length}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div className="space-y-3">
            {strategyGroups.length > 0 ? (
              strategyGroups.map((group, idx) => (
                <StrategyGroupItem key={group.groupId} group={group} index={idx} />
              ))
            ) : (
              <EmptyState color="blue" text="No strategies added yet" />
            )}
          </div>
        </div>
      </div>

      {/* Indicators (GROUPED) */}
      <div className="flex-1 bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl border border-zinc-700 shadow-xl flex flex-col max-h=[calc(100vh-110px)]">
        <div className="px-4 py-3 border-b border-zinc-700 bg-gradient-to-r from-purple-900/20 to-purple-800/10">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
            <h3 className="text-sm mt-[6px] font-semibold text-purple-200">My Indicators</h3>
            <span className="bg-purple-500/20 text-purple-200 text-xs px-2 py-0.5 rounded-full font-medium border border-purple-400/20">
              {indicatorGroups.length}
            </span>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
          <div className="space-y-3">
            {indicatorGroups.length > 0 ? (
              indicatorGroups.map((group, idx) => (
                <IndicatorGroupItem key={group.groupId} group={group} index={idx} />
              ))
            ) : (
              <EmptyState color="purple" text="No indicators added yet" />
            )}
          </div>
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

      {/* Inspect → CodeModal (view ping YOK) */}
      <CodeModal
        isOpen={isInspectOpen}
        onClose={() => setIsInspectOpen(false)}
        indicator={inspectTarget} // CodeModal değiştirilmedi; tek prop kullanıyoruz
      />

      {/* Toast container */}
      <Toast toasts={toasts} />

      <style jsx>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
