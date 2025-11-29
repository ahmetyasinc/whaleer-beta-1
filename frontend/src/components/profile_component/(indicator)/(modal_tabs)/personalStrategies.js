"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { IoMdAdd, IoIosStarOutline, IoMdStar } from "react-icons/io";
import { HiOutlineTrash } from "react-icons/hi";
import AddStrategyButton from "./add_strategy_button";
import { SiRobinhood } from "react-icons/si";
import useStrategyStore from "@/store/indicator/strategyStore";
import useCodePanelStore from "@/store/indicator/strategyCodePanelStore";
import useStrategyDataStore from "@/store/indicator/strategyDataStore";
import { RiErrorWarningFill, RiLockFill } from "react-icons/ri";
import { useTranslation } from "react-i18next";

axios.defaults.withCredentials = true;

// GÜNCELLEME: closeModal prop'u eklendi
const PersonalStrategies = ({ closeModal }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toDelete, setToDelete] = useState(null); // seçili versiyon objesi

  const { favorites, toggleFavorite, strategies, setPersonalStrategies } = useStrategyStore();
  const { openPanel, closePanelIfMatches } = useCodePanelStore();
  const { strategyData } = useStrategyDataStore();

  const { t } = useTranslation("personalStrategies");

  // --- Gruplama: groupId = parent_strategy_id || id
  const groups = useMemo(() => {
    const map = new Map();
    for (const st of strategies) {
      const groupId = st.parent_strategy_id || st.id;
      if (!map.has(groupId)) map.set(groupId, []);
      map.get(groupId).push(st);
    }
    // versiyonları küçükten büyüğe sırala
    for (const [g, list] of map.entries()) {
      list.sort((a, b) => (a.version || 1) - (b.version || 1));
      map.set(g, list);
    }
    return map; // Map<groupId, Strategy[]>
  }, [strategies]);

  // --- Her grup için hangi versiyonun seçili olduğu
  const [selectedByGroup, setSelectedByGroup] = useState({}); // { [groupId]: strategyId }

  const ensureSelected = (groupId, versions) => {
    const current = selectedByGroup[groupId];
    if (current && versions.some(v => v.id === current)) return current;
    const last = versions[versions.length - 1];
    setSelectedByGroup(s => ({ ...s, [groupId]: last.id }));
    return last.id;
  };

  // --- Favorite toggle (seçili versiyon için)
  const handleToggleFavorite = async (strategy) => {
    const isAlreadyFavorite = favorites.some((fav) => fav.id === strategy.id);
    toggleFavorite(strategy);
    try {
      if (isAlreadyFavorite) {
        await axios.delete(
          `${process.env.NEXT_PUBLIC_API_URL}/api/strategy-remove-favourite/`,
          { data: { strategy_id: strategy.id } }
        );
      } else {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/strategy-add-favorite/`,
          { strategy_id: strategy.id }
        );
      }
    } catch (error) {
      console.error(t("errors.favoriteAction"), error);
    }
  };

  // --- Silme (seçili versiyon)
  const askDelete = (strategy) => {
    setToDelete(strategy);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await axios.delete(
        `${process.env.NEXT_PUBLIC_API_URL}/api/delete-strategy/${toDelete.id}/`,
        { withCredentials: true }
      );
      const { strategies: currentList } = useStrategyStore.getState();
      setPersonalStrategies(currentList.filter((s) => s.id !== toDelete.id));
      closePanelIfMatches(toDelete.id);
    } catch (error) {
      console.error(t("errors.deleteAction"), error);
    } finally {
      setShowDeleteModal(false);
      setToDelete(null);
    }
  };

  const getStrategyStatus = (strategy) => {
    const data = strategyData[strategy.id];
    if (!data) return "none";
    if (data.status === "error") return "error";
    if (data.status === "success" && data.strategy_graph?.length > 0) return "active";
    return "loaded";
  };

  return (
    <div className="text-white pt-2 flex flex-col items-center w-full">
      <div className="w-full max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
        {groups.size === 0 ? (
          <></>
        ) : (
          Array.from(groups.entries()).map(([groupId, versions]) => {
            const selectedId = ensureSelected(groupId, versions);
            const selected = versions.find(v => v.id === selectedId) || versions[versions.length - 1];

            // Error badge (son çalıştırma) — sadece SEÇİLİ versiyon için
            const subItems = strategyData?.[selected.id]?.subItems;
            const lastSub = subItems && Object.values(subItems)[Object.values(subItems).length - 1];
            const hasError = lastSub?.result?.status === "error";
            const errorMessage = lastSub?.result?.message || t("errors.compileDefault");

            // Kilit durumu — sadece SEÇİLİ versiyon için (versiyon bağımsızlığı)
            const isLocked = !!selected.locked;

            return (
              <div
                key={groupId}
                className="bg-gray-900 hover:bg-gray-800 flex items-center justify-between w-full h-[40px] mb-2"
              >
                {/* left */}
                <div className="flex items-center pl-2 gap-2">
                  {/* Favori sadece SEÇİLİ versiyon için */}
                  <button
                    className="bg-transparent p-2 rounded-md hover:bg-gray-800"
                    onClick={() => handleToggleFavorite(selected)}
                    title={t("tooltips.favorite")}
                  >
                    {favorites.some((fav) => fav.id === selected.id) ? (
                      <IoMdStar className="text-lg text-yellow-500" />
                    ) : (
                      <IoIosStarOutline className="text-lg text-gray-600" />
                    )}
                  </button>

                  {/* İsim */}
                  <span className="text-[15px]">{selected?.name}</span>

                  {/* Versiyon seçici (grup içinde) */}
                  {versions.length > 1 && (
                    <select
                      className="ml-2 bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700"
                      value={selectedId}
                      onChange={(e) =>
                        setSelectedByGroup((s) => ({ ...s, [groupId]: Number(e.target.value) }))
                      }
                      title={t("tooltips.versionSelect")}
                    >
                      {versions.map(v => (
                        <option key={v.id} value={v.id}>
                          {`v${v.version}${v.locked ? ` (${t("labels.locked")})` : ""}`}
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Hata rozeti — SEÇİLİ versiyon */}
                  {hasError && (
                    <div className="group relative p-2 rounded-full z-50" title={errorMessage}>
                      <RiErrorWarningFill className="text-red-600" />
                      <div className="bg-[#cc4242] p-1 rounded-sm group-hover:flex hidden absolute top-1/2 -translate-y-1/2 -right-2 translate-x-full">
                        <span className="whitespace-nowrap text-sm">
                          {errorMessage}
                        </span>
                        <div className="bg-inherit rotate-45 p-1 absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* right */}
                <div className="flex items-center gap-2">
                  {/* Kilit ikonu — SEÇİLİ versiyon özelinde */}
                  {isLocked && (
                    <div className="group relative" title={t("tooltips.lockedVersion")}>
                      <RiLockFill className="text-amber-400 text-[18px]" />
                    </div>
                  )}

                  {/* AddStrategyButton sadece SEÇİLİ versiyon için */}
                  {/* GÜNCELLEME: closeModal prop'u AddStrategyButton'a aktarılıyor */}
                  <AddStrategyButton strategyId={selected.id} closeModal={closeModal} />

                  {/* Paneli AÇ (SiRobinhood) — TÜM versiyonları ve groupId’yi gönder */}
                  <button
                    className="bg-transparent p-2 rounded-md hover:bg-gray-800"
                    onClick={() => {
                        openPanel({
                            groupId,
                            versions,                 // tüm versiyon objeleri
                            initialSelectedId: selected.id,
                        });
                        // GÜNCELLEME: Düzenleme butonuna tıklandığında modalı kapat
                        if (closeModal) closeModal();
                    }}
                    title={t("buttons.openEdit")}
                  >
                    <SiRobinhood className="text-blue-400 hover:text-blue-700 text-lg cursor-pointer" />
                  </button>

                  {/* Silme sadece SEÇİLİ versiyon için */}
                  <button
                    className="bg-transparent pr-4 pl-2 rounded-md hover:bg-gray-800"
                    onClick={() => askDelete(selected)}
                    title={t("tooltips.delete")}
                  >
                    <HiOutlineTrash className="text-red-700 hover:text-red-900 text-[19.5px] cursor-pointer" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* + yeni strateji (IoMdAdd) (yeni GRUP: parent null) */}
      <button
        className="mt-1 p-3 bg-green-500 hover:bg-green-600 text-white rounded-sm flex items-center justify-center h-3 w-16"
        onClick={() => {
            openPanel({ groupId: null, versions: [], initialSelectedId: null });
            // GÜNCELLEME: Yeni strateji oluştur butonuna tıklandığında modalı kapat
            if (closeModal) closeModal();
        }}
        title={t("buttons.newStrategy")}
      >
        <IoMdAdd className="text-lg" />
      </button>

      {/* Silme Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/10">
          <div className="bg-gray-900 text-white rounded-md w-[400px] p-6 shadow-lg relative">
            <h2 className="text-lg font-bold mb-4">{t("titles.deleteConfirm")}</h2>
            <p>{t("messages.deleteConfirmQuestion", { name: toDelete?.name })}</p>
            <div className="flex justify-end mt-4 gap-2">
              <button
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
                onClick={() => { setShowDeleteModal(false); setToDelete(null); }}
              >
                {t("buttons.no")}
              </button>
              <button
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded"
                onClick={confirmDelete}
              >
                {t("buttons.yesDelete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalStrategies;