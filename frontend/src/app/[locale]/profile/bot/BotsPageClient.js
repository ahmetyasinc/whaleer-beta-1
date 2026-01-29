'use client';

import { useState, useEffect, useMemo } from 'react';
import { BotModal } from '@/components/profile_component/(bot)/botModal';
import { BotCard } from '@/components/profile_component/(bot)/botCard';
import { useBotStore } from '@/store/bot/botStore';
import useApiStore from '@/store/api/apiStore';
import { load_strategies } from '@/api/load_strategies';
import { HiPlusSmall } from 'react-icons/hi2';
import { ToastContainer } from 'react-toastify';
import SwitchConfirmModal from "@/components/profile_component/(bot)/switchConfirmModal";
import 'react-toastify/dist/ReactToastify.css';
import { useTranslation } from 'react-i18next';
import { RiRobot2Line } from "react-icons/ri";
import { toast } from "react-toastify";

import { useRef } from 'react';

const TABS = [
  { key: 'ORIGINAL' },
  { key: 'PURCHASED' },
  { key: 'RENTED' },
];

const MAX_ORIGINAL_BOTS = 3;

function TabButton({ active, disabled, label, disabledTitle, count, onClick }) {
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      aria-disabled={disabled}
      title={disabled ? disabledTitle : label}
      className={[
        "px-3 h-9 rounded-md text-sm font-medium transition-all",
        "border",
        active
          ? "bg-white/10 border-white/20 text-white"
          : "bg-transparent border-white/10 text-white/80 hover:bg-white/5",
        disabled ? "opacity-40 cursor-not-allowed hover:bg-transparent" : "cursor-pointer"
      ].join(' ')}
    >
      <span>{label}</span>
      <span className="ml-2 inline-flex items-center justify-center min-w-5 px-1 rounded-sm text-[11px] bg-white/10">
        {count}
      </span>
    </button>
  );
}

export default function BotsPageClient() {
  const { t } = useTranslation('botPage');

  const [modalOpen, setModalOpen] = useState(false);
  const bots = useBotStore((state) => state.bots);
  const loadBots = useBotStore((state) => state.loadBots);
  const loadApiKeys = useApiStore((state) => state.loadApiKeys);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const { deactivateAllBots } = useBotStore();



  const originals = useMemo(
    () => (bots || []).filter(b => b?.acquisition_type === 'ORIGINAL'),
    [bots]
  );
  const purchased = useMemo(
    () => (bots || []).filter(b => b?.acquisition_type === 'PURCHASED'),
    [bots]
  );
  const rented = useMemo(
    () => (bots || []).filter(b => b?.acquisition_type === 'RENTED'),
    [bots]
  );

  const counts = {
    ORIGINAL: originals.length,
    PURCHASED: purchased.length,
    RENTED: rented.length,
  };

  const has = {
    ORIGINAL: counts.ORIGINAL > 0,
    PURCHASED: counts.PURCHASED > 0,
    RENTED: counts.RENTED > 0,
  };

  const canCreateBot = counts.ORIGINAL < MAX_ORIGINAL_BOTS;
  const createTooltip = canCreateBot
    ? t('actions.createNewBot')
    : t('actions.planInsufficient', { limit: MAX_ORIGINAL_BOTS });

  const pickDefaultTab = () => {
    if (has.ORIGINAL) return 'ORIGINAL';
    if (has.PURCHASED) return 'PURCHASED';
    if (has.RENTED) return 'RENTED';
    return 'ORIGINAL';
  };

  const [activeTab, setActiveTab] = useState('ORIGINAL');

  useEffect(() => {
    setActiveTab(prev => {
      if (prev && has[prev]) return prev;
      return pickDefaultTab();
    });
  }, [counts.ORIGINAL, counts.PURCHASED, counts.RENTED]);

  useEffect(() => {
    const loadData = async () => {
      await loadApiKeys();
      await load_strategies();
      await loadBots();
    };
    loadData();
  }, [loadApiKeys, loadBots]);

  const visibleBots = useMemo(() => {
    switch (activeTab) {
      case 'PURCHASED': return purchased;
      case 'RENTED': return rented;
      case 'ORIGINAL':
      default: return originals;
    }
  }, [activeTab, originals, purchased, rented]);

  // --- Bot List Sorting Helper ---
  const getSortedBots = (listToSort) => {
    const locale = typeof navigator !== 'undefined' ? navigator.language : 'tr';
    const collator = new Intl.Collator(locale, { sensitivity: 'base', numeric: true });

    const getName = (b) => (b?.name ?? '').toString() || `#${b?.id ?? ''}`;
    const isOn = (b) => {
      const v = b?.isActive ?? b?.is_active ?? b?.active ?? b?.status;
      if (typeof v === 'string') return ['1', 'true', 'active', 'ACTIVE'].includes(v);
      return !!v;
    };

    const arr = [...(listToSort ?? [])];
    arr.sort((a, b) => {
      const aActive = isOn(a);
      const bActive = isOn(b);

      if (aActive !== bActive) return aActive ? -1 : 1;

      const byName = collator.compare(getName(a), getName(b));
      if (byName !== 0) return byName;

      return (a?.id ?? 0) - (b?.id ?? 0);
    });
    return arr;
  };

  // --- Stable Sorting State ---
  const [orderedIds, setOrderedIds] = useState(null);
  const lastTabRef = useRef(activeTab);

  useEffect(() => {
    const currentTab = activeTab;
    const isTabChanged = currentTab !== lastTabRef.current;

    // Helper to extract IDs
    const getIds = (list) => new Set(list.map(b => b.id));

    if (isTabChanged || !orderedIds) {
      // 1. Tab changed or Initial Load: Full Re-sort
      const sorted = getSortedBots(visibleBots);
      setOrderedIds(sorted.map(b => b.id));
      lastTabRef.current = currentTab;
    } else {
      // 2. Same Tab: Handle Add/Remove without re-sorting existing
      const currentIdSet = getIds(visibleBots);
      const prevIdSet = new Set(orderedIds);

      const hasAdded = visibleBots.some(b => !prevIdSet.has(b.id));
      const hasRemoved = orderedIds.some(id => !currentIdSet.has(id));

      if (hasAdded || hasRemoved) {
        // Keep existing order for those that remain
        const preserved = orderedIds.filter(id => currentIdSet.has(id));

        // Find new bots (not in orderedIds)
        const newBots = visibleBots.filter(b => !prevIdSet.has(b.id));
        // Sort new bots among themselves (optional, but good practice)
        const sortedNew = getSortedBots(newBots);

        // Add new bots to top (or bottom, user prefers active top initially, 
        // usually new items go top in UI). Let's prepend.
        setOrderedIds([...sortedNew.map(b => b.id), ...preserved]);
      }
      // Else: Just property updates (toggle loops) -> Do NOT update orderedIds
    }
  }, [activeTab, visibleBots]); // Depend on visibleBots to catch add/remove/updates

  const displayBots = useMemo(() => {
    if (!orderedIds) return getSortedBots(visibleBots);

    const botMap = new Map((visibleBots || []).map(b => [b.id, b]));
    // Map orderedIds to objects, filtering out any that might have been removed (safety)
    // and appending any that might be missing from orderedIds (failsafe)

    const list = orderedIds.map(id => botMap.get(id)).filter(Boolean);

    // Failsafe: if there are bots in visibleBots not in orderedIds yet (render cycle gap)
    const listIds = new Set(list.map(b => b.id));
    const leftovers = visibleBots.filter(b => !listIds.has(b.id));

    return [...leftovers, ...list];
  }, [orderedIds, visibleBots]);



  const tabLabels = {
    ORIGINAL: t('tabs.myBots'),
    PURCHASED: t('tabs.purchased'),
    RENTED: t('tabs.rented'),
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="h-[60px] bg-black/95 backdrop-blur flex items-center px-4 sticky top-0 z-50 border-b border-white/10">
        <div className="flex items-center gap-2 ml-6 md:ml-12">
          {TABS.map(tab => {
            const label = tabLabels[tab.key];
            const disabledTitle = t('tabs.noTabYet', { tab: label });
            return (
              <TabButton
                key={tab.key}
                label={label}
                disabledTitle={disabledTitle}
                count={counts[tab.key]}
                active={activeTab === tab.key}
                disabled={!has[tab.key]}
                onClick={() => setActiveTab(tab.key)}
              />
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-4">


          {/* Panic button */}
          <button
            className="relative inline-flex items-center justify-center px-8 py-1 overflow-hidden tracking-tighter text-white bg-[#661b1b9c] rounded-md group"
            title={t('actions.panicButtonTitle')}
            onClick={() => setConfirmModalOpen(true)}
          >
            <span className="absolute w-0 h-0 transition-all duration-500 ease-out bg-red-600 rounded-full group-hover:w-56 group-hover:h-56"></span>
            <span className="absolute bottom-0 left-0 h-full -ml-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-auto h-full opacity-100 object-stretch" viewBox="0 0 487 487">
                <path fillOpacity=".1" fillRule="nonzero" fill="#FFF" d="M0 .3c67 2.1 134.1 4.3 186.3 37 52.2 32.7 89.6 95.8 112.8 150.6 23.2 54.8 32.3 101.4 61.2 149.9 28.9 48.4 77.7 98.8 126.4 149.2H0V.3z"></path>
              </svg>
            </span>
            <span className="absolute top-0 right-0 w-12 h-full -mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="object-cover w-full h-full" viewBox="0 0 487 487">
                <path fillOpacity=".1" fillRule="nonzero" fill="#FFF" d="M487 486.7c-66.1-3.6-132.3-7.3-186.3-37s-95.9-85.3-126.2-137.2c-30.4-51.8-49.3-99.9-76.5-151.4C70.9 109.6 35.6 54.8.3 0H487v486.7z"></path>
              </svg>
            </span>
            <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-gray-200"></span>
            <span className="relative text-base font-semibold">{t('actions.panicButton')}</span>
          </button>

          <SwitchConfirmModal
            isOpen={confirmModalOpen}
            onClose={() => setConfirmModalOpen(false)}
            onConfirm={() => {
              deactivateAllBots();
              setConfirmModalOpen(false);
            }}
          />

          {/* Create New Bot */}
          <button
            onClick={() => {
              if (!canCreateBot) return;
              setModalOpen(true);
            }}
            aria-disabled={!canCreateBot}
            title={createTooltip}
            className={[
              "group/button relative inline-flex items-center justify-center overflow-hidden rounded-md px-6 py-1 text-sm font-semibold transition-all duration-300 ease-in-out",
              canCreateBot
                ? "bg-gray-800/90 text-white backdrop-blur-lg hover:shadow-md hover:shadow-gray-600/50 cursor-pointer"
                : "bg-gray-700/60 text-white/60 cursor-not-allowed ring-1 ring-white/10"
            ].join(" ")}
          >
            <span className="text-[13px]">
              {canCreateBot ? t('actions.createNewBot') : t('actions.createLocked')}
            </span>
            <HiPlusSmall className="text-2xl relative font-semibold ml-1" />
            {canCreateBot && (
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/button:duration-1000 group-hover/button:[transform:skew(-13deg)_translateX(100%)]">
                <div className="relative h-full w-10 bg-white/20"></div>
              </div>
            )}
          </button>
        </div>
      </header>

      <main className="scrollbar-hide flex-1 overflow-y-auto py-6">
        <ToastContainer position="top-center" />
        {modalOpen && <BotModal onClose={() => setModalOpen(false)} />}

        {displayBots.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-white/70 py-24">
            <RiRobot2Line className="text-8xl text-gray-400 mb-4 animate-pulse" />

            <h2 className="text-2xl font-semibold text-gray-200 mb-2">
              {activeTab === 'ORIGINAL' && t("empty.originalTitle")}
              {activeTab === 'PURCHASED' && t("empty.purchasedTitle")}
              {activeTab === 'RENTED' && t("empty.rentedTitle")}
            </h2>

            <p className="max-w-md text-sm text-gray-400 mb-6 leading-relaxed">
              {activeTab === 'ORIGINAL' && t("empty.originalDesc")}
              {activeTab === 'PURCHASED' && t("empty.purchasedDesc")}
              {activeTab === 'RENTED' && t("empty.rentedDesc")}
            </p>

            {activeTab === 'ORIGINAL' && canCreateBot && (
              <button
                onClick={() => setModalOpen(true)}
                className="
                  relative inline-flex items-center gap-2 
                  px-6 py-2 rounded-lg font-semibold text-white
                  bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
                  shadow-[0_0_10px_rgba(99,102,241,0.4)] 
                  hover:shadow-[0_0_20px_rgba(139,92,246,0.6)]
                  hover:scale-[1.01] active:scale-[0.97]
                  transition-all.duration-200.ease-out
                  overflow-hidden
                "
              >
                <span
                  className="
                    absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                    translate-x-[-100%] group-hover:translate-x-[100%] 
                    transition-transform duration-1000 ease-in-out
                  "
                />
                <HiPlusSmall className="text-xl relative z-10" />
                <span className="relative z-10">{t("actions.createNewBot")}</span>
              </button>
            )}

            {!canCreateBot && activeTab === 'ORIGINAL' && (
              <span className="text-sm text-gray-500 italic">
                {t("actions.createLocked")}
              </span>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-4">
            {displayBots.map((bot, index) => (
              <BotCard
                key={bot.id}
                bot={bot}
                column={index % 2 === 0 ? "left" : "right"}
              />
            ))}
          </div>
        )}
      </main>


    </div>
  );
}
