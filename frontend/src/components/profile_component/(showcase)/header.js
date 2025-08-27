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

export default function Header() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  const { fetchBots, hasLoadedOnce, loading } = useBotDropdownSearchStore();
  useEffect(() => { if (!hasLoadedOnce && !loading) fetchBots(); }, [fetchBots, hasLoadedOnce, loading]);

  const { wallet, walletLinked, signOutWallet, authLoading, hydrateSession } = useSiwsStore();
  const { connectWalletAndSignIn } = useSiwsAuth();

  // Vitrine gelindiğinde cookie’den wallet oturumunu hydrate et
  useEffect(() => { hydrateSession(); }, [hydrateSession]);

  const navItems = [
    { name: "Explore", href: "/profile/showcase" },
    { name: "Featured", href: "/profile/showcase/featured" }
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-black text-white h-[60px] shadow-md z-50 px-6">
        <div className="relative h-full flex items-center justify-between">
          <button
            className="absolute left-[45px] top-1/2 -translate-y-1/2 bg-black hover:border-stone-400 transition px-6 py-[6px] rounded-xl font-semibold shadow-lg text-white border border-stone-600 z-50 disabled:opacity-50"
            onClick={() => setModalOpen(true)}
            disabled={!walletLinked}
            type="button"
          >
            Sell / Rent
          </button>

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
                  className={`px-4 py-[6px] rounded-xl transition font-medium border border-stone-600 bg-black hover:border-stone-400 text-white ${
                    pathname === item.href ? " shadow-xl shadow-[rgba(97,255,242,0.16)]" : ""
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {!walletLinked ? (
              <button
                onClick={connectWalletAndSignIn}
                disabled={authLoading}
                className="px-4 py-[6px] rounded-xl border border-stone-600 hover:border-stone-400"
              >
                {authLoading ? "Connecting..." : "Connect Wallet"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm opacity-80">
                  {wallet?.address ? `${wallet.address.slice(0,4)}...${wallet.address.slice(-4)}` : "Connected"}
                </span>
                <button onClick={signOutWallet} className="px-3 py-[6px] rounded-xl border border-stone-600 hover:border-stone-400">
                  Sign Out
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
