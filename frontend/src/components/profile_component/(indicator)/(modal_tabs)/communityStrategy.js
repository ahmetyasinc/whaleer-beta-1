"use client";

import { useMemo, useState } from "react";
import {
  IoIosCode,
  IoIosStarOutline,
  IoMdSearch,
  IoMdStar,
} from "react-icons/io";
import { IoLockClosed } from "react-icons/io5";
import AddStrategyButton from "./add_strategy_button";
import useStrategyStore from "@/store/indicator/strategyStore";
import CodeModal from "./CodeModal";
import api from "@/api/axios";

// axios.defaults.withCredentials = true;

const Pill = ({ children, tone = "neutral" }) => {
  const toneClasses =
    tone === "success"
      ? "bg-emerald-900/40 text-emerald-300 border-emerald-700/60"
      : tone === "warning"
        ? "bg-amber-900/40 text-amber-300 border-amber-700/60"
        : tone === "danger"
          ? "bg-rose-900/40 text-rose-300 border-rose-700/60"
          : "bg-zinc-800 text-zinc-300 border-zinc-700";
  return (
    <span className={`px-2 py-[2px] text-[11px] rounded-full border ${toneClasses}`}>
      {children}
    </span>
  );
};

// GÜNCELLEME: closeModal prop'u eklendi
const CommunityStrategies = ({ closeModal }) => {
  const { favorites, toggleFavorite, community } = useStrategyStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStrategy, setSelectedStrategy] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = (searchTerm || "").toLowerCase();
    return (community || []).filter((s) => (s?.name || "").toLowerCase().includes(q));
  }, [community, searchTerm]);

  const isFav = (id) => favorites.some((f) => f.id === id);

  const handleToggleFavorite = async (strategy) => {
    const isAlreadyFavorite = isFav(strategy.id);
    toggleFavorite(strategy); // optimistic
    try {
      if (isAlreadyFavorite) {
        await api.delete("/strategy-remove-favourite/", {
          data: { strategy_id: strategy.id },
        });
      } else {
        await api.post("/strategy-add-favorite/", {
          strategy_id: strategy.id,
        });
      }
    } catch (e) {
      console.error("Favori hatası:", e);
    }
  };

  // release meta + id çıkar
  const computeCommunityMeta = (strategy) => {
    const release = strategy?.release || null; // community için approved
    const approved = strategy?.approved_release || null;
    const pending = strategy?.pending_release || null;

    const perms = release?.permissions || approved?.permissions || {};
    const viewsCount =
      (release && release.views_count) ?? (approved && approved.views_count) ?? null;

    const allowCodeView = !!perms?.allow_code_view;
    const allowChartView = !!perms?.allow_chart_view;

    const status =
      (release && release.status) || (approved && "approved") || (pending && "pending") || null;

    const releaseNo =
      (release && release.no) || (approved && approved.no) || (pending && pending.no) || null;

    const releaseId =
      (release && release.id) || (approved && approved.id) || (pending && pending.id) || null;

    return { viewsCount, allowCodeView, allowChartView, status, releaseNo, releaseId };
  };

  // view ping (strategy)
  const notifyStrategyView = async (releaseId) => {
    if (!releaseId) return;
    try {
      await api.post(
        `/strategy-releases/${releaseId}/view`
      );
    } catch (e) {
      // sessiz fail
      console.debug("strategy view ping error:", e?.message || e);
    }
  };

  const openCodeModal = async (strategy) => {
    const { allowCodeView, releaseId } = computeCommunityMeta(strategy);
    if (!allowCodeView) return;
    await notifyStrategyView(releaseId); // önce ping
    setSelectedStrategy(strategy);
    setIsModalOpen(true);
  };

  return (
    <div className="text-zinc-200">
      {/* Arama */}
      <div className="bg-zinc-900 flex items-center border-b border-zinc-800 mb-2">
        <input
          type="text"
          placeholder="Search..."
          className="w-full px-3 py-2 bg-zinc-900 text-zinc-200 focus:outline-none placeholder:text-zinc-600"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <IoMdSearch className="text-zinc-500 text-[20px] mr-2" />
      </div>

      {/* Liste */}
      <div className="flex flex-col gap-2 w-full mt-2 max-h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
        {filtered.map((strategy) => {
          const { viewsCount, allowCodeView, allowChartView, releaseId } =
            computeCommunityMeta(strategy);
          const locked = !!strategy?.locked;

          return (
            <div
              key={strategy.id}
              className="bg-zinc-950 hover:bg-zinc-900 pl-1 pr-2 flex items-center justify-between w-full h-[56px]"
            >
              {/* Sol */}
              <div className="flex items-center gap-2 min-w-0">
                <button
                  className="bg-transparent p-2 rounded-md shrink-0 text-zinc-400 hover:text-zinc-200 transition-colors"
                  onClick={() => handleToggleFavorite(strategy)}
                  title={isFav(strategy.id) ? "Favorilerden çıkar" : "Favorilere ekle"}
                >
                  {isFav(strategy.id) ? (
                    <IoMdStar className="text-lg text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                  ) : (
                    <IoIosStarOutline className="text-lg" />
                  )}
                </button>

                {locked && (
                  <div className="px-1" title="Kilitli (aktif bot kullanıyor).">
                    <IoLockClosed className="text-[16px] text-zinc-400" />
                  </div>
                )}

                <div className="flex flex-col min-w-0">
                  <span className="text-[14px] truncate text-zinc-300">{strategy.name}</span>
                  <div className="flex items-center gap-2 mt-[2px]">
                    {typeof strategy.version !== "undefined" && (
                      <Pill>Version {strategy.version}</Pill>
                    )}
                    {typeof viewsCount === "number" && (
                      <Pill tone="neutral">{viewsCount} views</Pill>
                    )}
                  </div>
                </div>
              </div>

              {/* Sağ */}
              <div className="flex items-center gap-1">
                {/* Ekle: onClickCapture ile önce view ping */}
                <div
                  className={`relative ${allowChartView ? "" : "opacity-50 cursor-not-allowed"}`}
                  title={
                    allowChartView ? "Stratejiyi ekle" : "Grafiğe ekleme izni yok (allow_chart_view=false)"
                  }
                  onClickCapture={async () => {
                    if (allowChartView) await notifyStrategyView(releaseId);
                  }}
                >
                  {/* GÜNCELLEME: closeModal prop'u AddStrategyButton'a aktarılıyor */}
                  <AddStrategyButton
                    strategyId={strategy.id}
                    disabled={!allowChartView}
                    closeModal={closeModal}
                  />
                  {!allowChartView && (
                    <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
                  )}
                </div>

                {/* Kod: önce view ping, sonra modal */}
                <button
                  className={`bg-transparent p-2 rounded-md transition-colors ${allowCodeView ? "" : "opacity-40 cursor-not-allowed"
                    }`}
                  onClick={() => openCodeModal(strategy)}
                  title={
                    allowCodeView ? "Kodu görüntüle" : "Kod görüntüleme izni yok (allow_code_view=false)"
                  }
                >
                  <IoIosCode
                    className={`text-2xl ${allowCodeView
                      ? "text-fuchsia-700 hover:text-fuchsia-500"
                      : "text-zinc-500"
                      }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <CodeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        indicator={selectedStrategy}
      />
    </div>
  );
};

export default CommunityStrategies;