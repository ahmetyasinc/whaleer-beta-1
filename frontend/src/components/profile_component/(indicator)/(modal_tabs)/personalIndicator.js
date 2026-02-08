"use client";

import { useMemo, useState } from "react";
import api from "@/api/axios";
import { IoMdAdd, IoIosStarOutline, IoMdStar } from "react-icons/io";
import { HiOutlineTrash } from "react-icons/hi";
import { MdPublish } from "react-icons/md";
import AddIndicatorButton from "./add_indicator_button";
import { PublishIndicatorModal } from "../../(profile)/publishIndicatorModal";
import { SiRobinhood } from "react-icons/si";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import useCodePanelStore from "@/store/indicator/indicatorCodePanelStore";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import { RiErrorWarningFill } from "react-icons/ri";
import { useTranslation } from "react-i18next";
import { publishIndicator } from "@/api/strategies";

// axios.defaults.withCredentials = true;

// YENİ: closeModal prop'u eklendi

/* ------------------------ Toast ------------------------ */
function Toast({ toasts }) {
  const { t } = useTranslation("personalIndicators");
  return (
    <div className="fixed top-4 right-4 space-y-3 z-[2000]">
      {toasts.map((to) => {
        const title =
          to.title ||
          (to.type === "success"
            ? t("toast.titles.success", "Başarılı")
            : to.type === "error"
              ? t("toast.titles.error", "Hata")
              : t("toast.titles.info", "Bilgi"));
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

export default function PersonalIndicators({ closeModal, isPublishMode }) {
  const { t } = useTranslation("personalIndicators");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  const [showPublishModal, setShowPublishModal] = useState(false);
  const [indicatorToPublish, setIndicatorToPublish] = useState(null);

  // Toast state
  const [toasts, setToasts] = useState([]);
  const showToast = (type, msg, title) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, msg, title }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600);
  };

  const { favorites, toggleFavorite, indicators } = useIndicatorStore();
  const { openPanel, closePanelIfMatches } = useCodePanelStore();
  const { indicatorData } = useIndicatorDataStore();

  const groups = useMemo(() => {
    const map = new Map();
    for (const ind of indicators) {
      const groupId = ind.parent_indicator_id || ind.id;
      if (!map.has(groupId)) map.set(groupId, []);
      map.get(groupId).push(ind);
    }
    for (const [g, list] of map.entries()) {
      list.sort((a, b) => (a.version || 1) - (b.version || 1));
      map.set(g, list);
    }
    return map;
  }, [indicators]);

  const [selectedByGroup, setSelectedByGroup] = useState({});

  const ensureSelected = (groupId, versions) => {
    const current = selectedByGroup[groupId];
    if (current && versions.some(v => v.id === current)) return current;
    const last = versions[versions.length - 1];
    setSelectedByGroup((s) => ({ ...s, [groupId]: last.id }));
    return last.id;
  };

  const handleToggleFavorite = async (indicator) => {
    const isAlreadyFavorite = favorites.some((fav) => fav.id === indicator.id);
    toggleFavorite(indicator);
    try {
      if (isAlreadyFavorite) {
        await api.delete("/indicator-remove-favourite/", {
          data: { indicator_id: indicator.id },
        });
      } else {
        await api.post("/indicator-add-favorite/", {
          indicator_id: indicator.id,
        });
      }
    } catch (error) {
      console.error("Favori işlemi sırasında hata oluştu:", error);
    }
  };

  const askDelete = (indicator) => {
    setToDelete(indicator);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const { indicators, setPersonalIndicators } = useIndicatorStore.getState();
    try {
      await api.delete(`/delete-indicator/${toDelete.id}/`);
      setPersonalIndicators(indicators.filter((ind) => ind.id !== toDelete.id));
      closePanelIfMatches(toDelete.id);
    } catch (e) {
      console.error("Silme hatası:", e);
    } finally {
      setShowDeleteModal(false);
      setToDelete(null);
    }
  };

  const handlePublishClick = (indicator) => {
    setIndicatorToPublish(indicator);
    setShowPublishModal(true);
  };

  const handlePublish = async ({ permissions, description }) => {
    if (!indicatorToPublish) return;
    try {
      const res = await publishIndicator({
        indicatorId: indicatorToPublish.id,
        permissions,
        description
      });

      if (res.ok) {
        console.log("Indicator published successfully", res.data);
        showToast("success", t("toast.messages.indicatorPublish.ok", "İndikatör başarıyla yayınlandı."), t("toast.titles.success", "Başarılı"));
      } else {
        console.error("Publish failed:", res.error);
        showToast("error", res.error || t("toast.messages.indicatorPublish.failed", "Yayınlama başarısız oldu."), t("toast.titles.error", "Hata"));
      }
    } catch (error) {
      console.error("Publish error:", error);
      showToast("error", t("toast.messages.indicatorPublish.unexpected", "Beklenmedik bir hata oluştu."), t("toast.titles.error", "Hata"));
    } finally {
      setShowPublishModal(false);
      setIndicatorToPublish(null);
    }
  };

  return (
    <div className="text-zinc-200 pt-2 flex flex-col items-center w-full">
      <div className="w-full max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
        {groups.size === 0 ? (
          <></>
        ) : (
          Array.from(groups.entries()).map(([groupId, versions]) => {
            const selectedId = ensureSelected(groupId, versions);
            const selected = versions.find(v => v.id === selectedId) || versions[versions.length - 1];

            const subItems = indicatorData?.[selected.id]?.subItems;
            const lastSub = subItems && Object.values(subItems)[Object.values(subItems).length - 1];
            const hasError = lastSub?.result?.status === "error";
            const errorMessage = lastSub?.result?.message || t("error.compile");

            const displayName = selected?.name;

            return (
              <div key={groupId} className="bg-zinc-950 hover:bg-zinc-900 flex items-center justify-between w-full h-[40px] mb-2">
                <div className="flex items-center pl-2 gap-2">
                  <button
                    className="bg-transparent p-2 rounded-md text-zinc-400 hover:text-zinc-200 transition-colors"
                    onClick={() => handleToggleFavorite(selected)}
                    title={t("actions.favorite")}
                  >
                    {favorites.some((fav) => fav.id === selected.id) ? (
                      <IoMdStar className="text-lg text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                    ) : (
                      <IoIosStarOutline className="text-lg" />
                    )}
                  </button>

                  <span className="text-[15px] text-zinc-300">{displayName}</span>

                  {versions.length > 1 && (
                    <select
                      className="ml-2 bg-zinc-900 text-zinc-300 text-sm px-2 py-1 rounded border border-zinc-700 focus:outline-none"
                      value={selectedId}
                      onChange={(e) =>
                        setSelectedByGroup((s) => ({ ...s, [groupId]: Number(e.target.value) }))
                      }
                    >
                      {versions.map(v => (
                        <option key={v.id} value={v.id}>{`v${v.version}`}</option>
                      ))}
                    </select>
                  )}

                  {hasError && (
                    <div className="group relative p-2 rounded-full">
                      <RiErrorWarningFill className="text-red-500" />
                      <div className="bg-red-900/90 text-red-100 p-1 rounded-sm group-hover:flex hidden absolute top-1/2 -translate-y-1/2 -right-2 translate-x-full border border-red-500/50">
                        <span className="whitespace-nowrap text-sm">{errorMessage}</span>
                        <div className="bg-inherit rotate-45 p-1 absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2 border-l border-b border-red-500/50"></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isPublishMode ? (
                    <button
                      className="bg-transparent mr-4 text-zinc-200 px-2 py-1 rounded-2xl flex items-center gap-2 transition-all shadow hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] hover:text-sky-400"
                      onClick={() => handlePublishClick(selected)}
                      title={t("Publish")}
                    >
                      <MdPublish className="text-[18px]" />
                      <span className="text-[12px] font-medium">{t("Yayınla")}</span>
                    </button>
                  ) : (
                    <>
                      <AddIndicatorButton indicatorId={selected.id} closeModal={closeModal} />

                      <button
                        className="bg-transparent p-2 rounded-md transition-colors"
                        onClick={() => {
                          openPanel({
                            groupId,
                            versions,
                            initialSelectedId: selected.id,
                          });
                          // YENİ: Modalı kapat
                          if (closeModal) closeModal();
                        }}
                        title={t("actions.edit")}
                      >
                        <SiRobinhood className="text-blue-400 hover:text-blue-600 text-lg cursor-pointer" />
                      </button>

                      <button
                        className="bg-transparent pr-4 pl-2 rounded-md transition-colors"
                        onClick={() => askDelete(selected)}
                        title={t("actions.delete")}
                      >
                        <HiOutlineTrash className="text-red-600 hover:text-red-500 text-[19.5px] cursor-pointer" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <button
        className="mt-1 p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-sm flex items-center justify-center h-3 w-16 transition-colors shadow-lg shadow-emerald-900/20"
        onClick={() => {
          openPanel({ groupId: null, versions: [], initialSelectedId: null });
          // YENİ: Modalı kapat
          if (closeModal) closeModal();
        }}
        title={t("actions.new")}
      >
        <IoMdAdd className="text-lg" />
      </button>

      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[60]">
          <div className="bg-zinc-900 text-zinc-200 rounded-lg w-[400px] shadow-xl border border-zinc-800 overflow-hidden">

            {/* Header */}
            <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
              <h2 className="text-lg font-semibold text-zinc-100">
                {t("deleteModal.title")}
              </h2>
            </div>

            {/* Body */}
            <div className="px-6 py-5">
              <p className="text-zinc-400 leading-relaxed">
                {t("deleteModal.confirm", { name: toDelete?.name })}
              </p>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-zinc-800 flex justify-end gap-2 bg-zinc-900/80">
              <button
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl transition-colors border border-zinc-700"
                onClick={() => {
                  setShowDeleteModal(false);
                  setToDelete(null);
                }}
              >
                {t("deleteModal.no")}
              </button>

              <button
                className="px-4 py-2 bg-red-600 hover:bg-red-500 border border-gray-400 text-white rounded-2xl transition-colors shadow-sm"
                onClick={confirmDelete}
              >
                {t("deleteModal.yes")}
              </button>
            </div>
          </div>
        </div>
      )}

      <PublishIndicatorModal
        isOpen={showPublishModal}
        onClose={() => {
          setShowPublishModal(false);
          setIndicatorToPublish(null);
        }}
        onPublish={handlePublish}
      />

      {/* Toast container */}
      <Toast toasts={toasts} />
    </div>
  );
}