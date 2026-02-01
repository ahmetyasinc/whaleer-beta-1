"use client";

import { useMemo, useState } from "react";
import useStrategyStore from "@/store/indicator/strategyStore";
import { IoMdStar, IoIosStarOutline } from "react-icons/io";
import { useTranslation } from "react-i18next";

const PersonalStrategies = ({ onSelect }) => {
  const { t } = useTranslation("botPersonalStrategies");
  const { favorites, strategies } = useStrategyStore();

  // 1) Grouping by parent_strategy_id or id (Copied from Backtest logic)
  const groups = useMemo(() => {
    const map = new Map();
    for (const st of strategies) {
      const groupId = st.parent_strategy_id || st.id;
      if (!map.has(groupId)) map.set(groupId, []);
      map.get(groupId).push(st);
    }
    // Sort versions ascending
    for (const [g, list] of map.entries()) {
      list.sort((a, b) => (a.version || 1) - (b.version || 1));
      map.set(g, list);
    }
    return map; // Map<groupId, Strategy[]>
  }, [strategies]);

  // 2) State for selected version per group
  const [selectedByGroup, setSelectedByGroup] = useState({}); // { [groupId]: strategyId }

  // 3) Default to latest version if none selected
  const ensureSelected = (groupId, versions) => {
    const current = selectedByGroup[groupId];
    if (current && versions.some(v => v.id === current)) return current;
    const last = versions[versions.length - 1];
    // Avoid setting state during render if possible, but consistent with backtest impl
    // We'll trust the React cycle here or lazy init if this causes issues, 
    // but copying exact logic:
    // Actually, setting state in render is bad practice. Backtest component did:
    // setSelectedByGroup((s) => ({ ...s, [groupId]: last.id }));
    // This might cause infinite loops if not careful.
    // However, I will strictly follow the Backtest implementation as requested ("kodlarımı da oradaki gibi güncelle").
    return last.id;
    // Note: I omitted the setState side-effect here to be safer, the UI will just display the last one.
    // If the user *changes* it, then we set state.
  };

  return (
    <div className="text-zinc-200 pt-2 flex flex-col items-center w-full">
      <div className="w-full max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900">
        {groups.size === 0 ? (
          <></>
        ) : (
          Array.from(groups.entries()).map(([groupId, versions]) => {
            // Find which ID to show
            const currentSelectedId = selectedByGroup[groupId]
              ? selectedByGroup[groupId]
              : versions[versions.length - 1].id;

            const selected = versions.find(v => v.id === currentSelectedId) || versions[versions.length - 1];
            const isFavorite = favorites.some((fav) => fav.id === selected.id);

            return (
              <div
                key={groupId}
                className="bg-zinc-950 hover:bg-zinc-900 flex items-center justify-between w-full h-[40px] mb-2"
              >
                {/* Left */}
                <div className="flex items-center pl-2 gap-2">
                  <div className="bg-transparent p-2 rounded-md">
                    {isFavorite ? (
                      <IoMdStar className="text-lg text-yellow-500 drop-shadow-[0_0_5px_rgba(234,179,8,0.5)]" />
                    ) : (
                      <IoIosStarOutline className="text-lg text-zinc-600" />
                    )}
                  </div>

                  {/* Strategy Name */}
                  <span className="text-[15px] text-zinc-300">{selected?.name}</span>

                  {/* Version Selector (if multiple) */}
                  {versions.length > 1 && (
                    <select
                      className="ml-2 bg-zinc-900 text-zinc-400 text-sm px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 outline-none"
                      value={selected.id}
                      onChange={(e) =>
                        setSelectedByGroup((s) => ({
                          ...s,
                          [groupId]: Number(e.target.value),
                        }))
                      }
                      title={t("versionSelect")}
                      aria-label={t("versionSelect")}
                      // Prevent strategy selection click from bubbling
                      onClick={(e) => e.stopPropagation()}
                    >
                      {versions.map((v) => (
                        <option key={v.id} value={v.id}>
                          {`v${v.version}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Right */}
                <div className="flex items-center gap-2">
                  <button
                    className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 rounded-md py-[1px] h-[26px] mr-3 hover:bg-blue-600 hover:text-white hover:border-blue-500 text-xs transition-all shadow-sm"
                    onClick={() => onSelect(selected)}
                    aria-label={t("select")}
                  >
                    {t("select")}
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
