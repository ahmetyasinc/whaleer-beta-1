"use client";

import { useMemo, useState } from "react";
import useStrategyStore from "@/store/indicator/strategyStore";
import { IoMdStar, IoIosStarOutline } from "react-icons/io";

const PersonalStrategies = ({ onSelect }) => {
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
    <div className="text-white pt-2 flex flex-col items-center w-full">
      <div className="w-full max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
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
                className="bg-gray-900 hover:bg-gray-800 flex items-center justify-between w-full h-[40px] mb-2"
              >
                {/* left */}
                <div className="flex items-center pl-2 gap-2">
                  <div className="bg-transparent p-2 rounded-md hover:bg-gray-800">
                    {isFavorite ? (
                      <IoMdStar className="text-lg text-yellow-500" />
                    ) : (
                      <IoIosStarOutline className="text-lg text-gray-600" />
                    )}
                  </div>

                  {/* Seçili versiyonun adı */}
                  <span className="text-[15px]">{selected?.name}</span>

                  {/* Versiyon seçici */}
                  {versions.length > 1 && (
                    <select
                      className="ml-2 bg-gray-800 text-sm px-2 py-1 rounded border border-gray-700"
                      value={selectedId}
                      onChange={(e) =>
                        setSelectedByGroup((s) => ({
                          ...s,
                          [groupId]: Number(e.target.value),
                        }))
                      }
                      title="Select version"
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
                    className="bg-blue-600 px-2 rounded-md py-[1px] h-[26px] mr-3 hover:bg-blue-800 text-white text-xs"
                    onClick={() => onSelect?.(selected)}
                  >
                    Choose
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
