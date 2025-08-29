"use client";

import { useMemo, useState } from "react";
import axios from "axios";
import { IoMdAdd, IoIosStarOutline, IoMdStar } from "react-icons/io";
import { HiOutlineTrash } from "react-icons/hi";
import AddIndicatorButton from "./add_indicator_button";
import { SiRobinhood } from "react-icons/si";
import useIndicatorStore from "@/store/indicator/indicatorStore";
import useCodePanelStore from "@/store/indicator/indicatorCodePanelStore";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";
import { RiErrorWarningFill } from "react-icons/ri";

axios.defaults.withCredentials = true;

export default function PersonalIndicators() {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [toDelete, setToDelete] = useState(null);

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
    // her grubun versiyonlarını küçükten büyüğe sırala
    for (const [g, list] of map.entries()) {
      list.sort((a, b) => (a.version || 1) - (b.version || 1));
      map.set(g, list);
    }
    return map; // Map<groupId, Indicator[]>
  }, [indicators]);

  // Hangi grupta hangi versiyonun seçili olduğunu tut
  const [selectedByGroup, setSelectedByGroup] = useState({}); // { [groupId]: versionId }

  const ensureSelected = (groupId, versions) => {
    // yoksa default: en büyük versiyon
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
        await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/indicator-remove-favourite/`, {
          data: { indicator_id: indicator.id },
        });
      } else {
        await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/indicator-add-favorite/`, {
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
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/api/delete-indicator/${toDelete.id}/`, { withCredentials: true });
      setPersonalIndicators(indicators.filter((ind) => ind.id !== toDelete.id));
      closePanelIfMatches(toDelete.id);
    } catch (e) {
      console.error("Silme hatası:", e);
    } finally {
      setShowDeleteModal(false);
      setToDelete(null);
    }
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

            // error badge (son çalıştırma)
            const subItems = indicatorData?.[selected.id]?.subItems;
            const lastSub = subItems && Object.values(subItems)[Object.values(subItems).length - 1];
            const hasError = lastSub?.result?.status === "error";
            const errorMessage = lastSub?.result?.message || "Derleme Hatası !";

            // Dropdown için label: varsayılan görünürde SON versiyonun adı
            const displayName = selected?.name;

            return (
              <div key={groupId} className="bg-gray-900 hover:bg-gray-800 flex items-center justify-between w-full h-[40px] mb-2">
                {/* left */}
                <div className="flex items-center pl-2 gap-2">
                  {/* favori sadece SEÇİLİ versiyon için */}
                  <button
                    className="bg-transparent p-2 rounded-md hover:bg-gray-800"
                    onClick={() => handleToggleFavorite(selected)}
                    title="Favori"
                  >
                    {favorites.some((fav) => fav.id === selected.id) ? (
                      <IoMdStar className="text-lg text-yellow-500" />
                    ) : (
                      <IoIosStarOutline className="text-lg text-gray-600" />
                    )}
                  </button>

                  {/* İsim + Versiyon seçici */}
                  <span className="text-[15px]">{displayName}</span>

                  {versions.length > 1 && (
                    <select
                      className="ml-2 bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700"
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
                      <RiErrorWarningFill className="text-red-600" />
                      <div className="bg-[#cc4242] p-1 rounded-sm group-hover:flex hidden absolute top-1/2 -translate-y-1/2 -right-2 translate-x-full">
                        <span className="whitespace-nowrap text-sm">{errorMessage}</span>
                        <div className="bg-inherit rotate-45 p-1 absolute top-1/2 -translate-y-1/2 left-0 -translate-x-1/2"></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* right */}
                <div className="flex items-center gap-2">
                  {/* AddIndicatorButton SEÇİLİ versiyona gider */}
                  <AddIndicatorButton indicatorId={selected.id} />

                  {/* Aç (panel) → TÜM versiyonları ve grupId’yi gönder */}
                  <button
                    className="bg-transparent p-2 rounded-md hover:bg-gray-800"
                    onClick={() =>
                      openPanel({
                        groupId,
                        versions,                 // tüm versiyon objeleri
                        initialSelectedId: selected.id,
                      })
                    }
                    title="Düzenle / Aç"
                  >
                    <SiRobinhood className="text-blue-400 hover:text-blue-700 text-lg cursor-pointer" />
                  </button>

                  {/* Silme sadece SEÇİLİ versiyonda */}
                  <button
                    className="bg-transparent pr-4 pl-2 rounded-md hover:bg-gray-800"
                    onClick={() => askDelete(selected)}
                    title="Sil"
                  >
                    <HiOutlineTrash className="text-red-700 hover:text-red-900 text-[19.5px] cursor-pointer" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* + yeni indikatör */}
      <button
        className="mt-1 p-3 bg-green-500 hover:bg-green-600 text-white rounded-sm flex items-center justify-center h-3 w-16"
        onClick={() => openPanel({ groupId: null, versions: [], initialSelectedId: null })}
        title="Yeni indikatör"
      >
        <IoMdAdd className="text-lg" />
      </button>

      {/* Silme Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/10">
          <div className="bg-gray-900 text-white rounded-md w-[400px] p-6 shadow-lg relative">
            <h2 className="text-lg font-bold mb-4">Silme Onayı</h2>
            <p>{toDelete?.name} indikatörünü silmek istediğinize emin misiniz?</p>
            <div className="flex justify-end mt-4 gap-2">
              <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded" onClick={() => { setShowDeleteModal(false); setToDelete(null); }}>
                Hayır
              </button>
              <button className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded" onClick={confirmDelete}>
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
