"use client";

import { useMemo, useState } from "react";
import useStrategyStore from "@/store/indicator/strategyStore";
import { IoMdStar, IoIosStarOutline } from "react-icons/io";
import { useTranslation } from "react-i18next";

const PersonalStrategies = ({ onSelect }) => {
  const { t } = useTranslation("backtestPersonalStrategies");
  const { favorites, strategies } = useStrategyStore();

  // 1) Gruplama: parent_strategy_id || id
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

  // 2) Her grup için hangi versiyonun seçili olduğunun state'i
  const [selectedByGroup, setSelectedByGroup] = useState({}); // { [groupId]: strategyId }

  // 3) Seçili versiyon yoksa default olarak EN BÜYÜK versiyon
  const ensureSelected = (groupId, versions) => {
    const current = selectedByGroup[groupId];
    if (current && versions.some(v => v.id === current)) return current;
    const last = versions[versions.length - 1];
    setSelectedByGroup((s) => ({ ...s, [groupId]: last.id }));
    return last.id;
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

            const isFavorite = favorites.some((fav) => fav.id === selected.id);

            return (
              <div
                key={groupId}
                className="bg-zinc-950 hover:bg-zinc-900 flex items-center justify-between w-full h-[40px] mb-2"
              >
                {/* left */}
                <div className="flex items-center pl-2 gap-2">
                  <div className="bg-transparent p-2 rounded-md">
                    {isFavorite ? (
                      <IoMdStar className="text-lg text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                    ) : (
                      <IoIosStarOutline className="text-lg text-zinc-600" />
                    )}
                  </div>

                  {/* Seçili versiyonun adı */}
                  <span className="text-[15px] text-zinc-300">{selected?.name}</span>

                  {/* Versiyon seçici */}
                  {versions.length > 1 && (
                    <select
                      className="ml-2 bg-zinc-900 text-zinc-400 text-sm px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 outline-none"
                      value={selectedId}
                      onChange={(e) =>
                        setSelectedByGroup((s) => ({
                          ...s,
                          [groupId]: Number(e.target.value),
                        }))
                      }
                      title={t("versionSelect")}
                      aria-label={t("versionSelect")}
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {`v${v.version}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* right */}
                <div className="flex items-center gap-2">
                  <button
                    className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 rounded-md py-[1px] h-[26px] mr-3 hover:bg-blue-600 hover:text-white hover:border-blue-500 text-xs transition-all shadow-sm"
                    onClick={() => onSelect?.(selected)}
                    title={t("choose")}
                    aria-label={t("choose")}
                  >
                    {t("choose")}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PersonalStrategies;
