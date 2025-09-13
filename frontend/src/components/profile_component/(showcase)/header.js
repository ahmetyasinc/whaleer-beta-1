// header.js
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SearchButton from '@/ui/showcaseBotSearchButton';
import SellRentModal from "@/components/profile_component/(showcase)/(explore)/sellRentModal";
import useBotDropdownSearchStore from '@/store/showcase/botDropdownSearchStore';
import { useSiwsStore } from "@/store/auth/siwsStore";
import useSiwsAuth from "@/hooks/useSiwsAuth";
import useBotDataStore from '@/store/showcase/botDataStore';
import { useTranslation } from "react-i18next";

export default function Header() {
  const { t } = useTranslation('showcaseHeader');
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  const { fetchBots, hasLoadedOnce, loading } = useBotDropdownSearchStore();
  useEffect(() => { if (!hasLoadedOnce && !loading) fetchBots(); }, [fetchBots, hasLoadedOnce, loading]);

  const { wallet, walletLinked, signOutWallet, authLoading, hydrateSession } = useSiwsStore();
  const { connectWalletAndSignIn, isPhantomInstalled, readyState } = useSiwsAuth();

  // Vitrine gelindiğinde cookie’den wallet oturumunu hydrate et
  useEffect(() => { hydrateSession(); }, [hydrateSession]);

  // 🔒 Featured sayfasında mı?
  const isFeatured = pathname?.includes("/profile/showcase/featured");
  
  const navItems = [
    { name: t("nav.explore"), href: "/profile/showcase" },
    { name: t("nav.featured"), href: "/profile/showcase/featured" }
  ];

  const viewMode = useBotDataStore(s => s.viewMode);
  const setViewMode = useBotDataStore(s => s.setViewMode);
  const initializeBots = useBotDataStore(s => s.initializeBots);

  const onChangeMode = async (mode) => {
    if (isFeatured) return; // 🔒 Featured'da toggle kapalı
    setViewMode(mode);
    await initializeBots(); // modu değiştirince listeyi yenile
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-black text-gray-200 h-[60px] shadow-md z-50 px-6">
        <div className="relative h-full flex items-center justify-between">
          {/* Sell / Rent & Toggle */}
          <div className="absolute left-[45px] top-1/2 -translate-y-1/2 flex items-center gap-3 z-50">
            {/* 🔒 Featured'da her zaman disabled */}
            <button
              className={`bg-black transition px-6 py-[6px] rounded-xl font-semibold shadow-lg text-gray-200 border border-stone-600 disabled:opacity-50 hover:border-stone-500 ${
                isFeatured ? "cursor-not-allowed" : ""
              }`}
              onClick={() => {
                if (isFeatured) return; // güvenlik
                setModalOpen(true);
              }}
              disabled={isFeatured || !walletLinked}
              type="button"
              title={isFeatured ? t("titles.disabledOnFeatured") : undefined}
            >
              {t("buttons.sellRent")}
            </button>

          {/* ✅ All / My toggle — Featured'da tamamen pasif */}
          <div
            className={`flex items-center rounded-xl border border-stone-600 hover:border-stone-500 overflow-hidden transition duration-100 ${
              isFeatured ? "opacity-50 pointer-events-none select-none" : ""
            }`}
            aria-disabled={isFeatured ? "true" : "false"}
            title={isFeatured ? t("titles.disabledOnFeatured") : t("titles.toggleView")}
          >
            <button
              className={`px-3 py-[8px] text-sm border-r border-stone-600 bg-black hover:bg-stone-900 ${
                viewMode === "all" ? "bg-stone-800" : ""
              }`}
              onClick={() => onChangeMode("all")}
              type="button"
            >
              {t("buttons.allListings")}
            </button>
            <button
              className={`px-3 py-[8px] text-sm border-l border-stone-600 bg-black hover:bg-stone-900 ${
                viewMode === "mine" ? "bg-stone-800" : ""
              }`}
              onClick={() => onChangeMode("mine")}
              type="button"
            >
              {t("buttons.myListings")}
            </button>
          </div>

          </div>

          {/* ortadaki arama */}
          <div className="w-[160px]" />
          <div className="absolute left-1/2 -translate-x-1/2">
            <SearchButton />
          </div>

          <div className="flex items-center gap-3">
            <nav className="flex gap-2 mr-2" aria-label="Primary">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-[6px] rounded-xl transition font-medium border border-stone-600 bg-black hover:border-stone-500 text-white ${
                    pathname === item.href ? " shadow-xl shadow-[rgba(97,255,242,0.16)]" : ""
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {!walletLinked ? (
              !isPhantomInstalled && readyState !== "Installed" ? (
                <a
                  href="https://phantom.app/download"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-[6px] rounded-xl border border-stone-600 hover:border-stone-500"
                >
                  {t("buttons.installPhantom")}
                </a>
              ) : (
                <button
                  onClick={connectWalletAndSignIn}
                  disabled={authLoading}
                  className="px-4 py-[6px] rounded-xl border border-stone-600 hover:border-stone-500"
                >
                  {authLoading ? t("buttons.connecting") : t("buttons.connectWallet")}
                </button>
              )
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-80">
                  {wallet?.address ? `${wallet.address.slice(0,4)}...${wallet.address.slice(-4)}` : t("labels.connected")}
                </span>
                <button
                  onClick={signOutWallet}
                  className="px-3 py-[6px] rounded-xl border border-stone-600 hover:border-stone-500"
                >
                  {t("buttons.signOut")}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <SellRentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
