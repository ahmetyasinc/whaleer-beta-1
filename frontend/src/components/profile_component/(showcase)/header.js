"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SearchButton from '@/ui/showcaseBotSearchButton';
import SellRentModal from "@/components/profile_component/(showcase)/(explore)/sellRentModal";
import useBotDropdownSearchStore from '@/store/showcase/botDropdownSearchStore';

export default function Header() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  // Auto-fetch once on mount if not loaded
  const { fetchBots, hasLoadedOnce, loading } = useBotDropdownSearchStore();
  useEffect(() => {
    if (!hasLoadedOnce && !loading) {
      fetchBots();
    }
  }, [fetchBots, hasLoadedOnce, loading]);

  const navItems = [
    { name: "Explore", href: "/profile/showcase" },
    { name: "Featured", href: "/profile/showcase/featured" }
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-black text-white h-[60px] shadow-md z-50 px-6">
        <div className="relative h-full flex items-center justify-between">
          {/* Sell/Rent button */}
          <button
            className="absolute left-[45px] top-1/2 -translate-y-1/2 bg-black hover:border-stone-400 transition px-6 py-[6px] rounded-xl font-semibold shadow-lg text-white border border-stone-600 z-50"
            onClick={() => setModalOpen(true)}
            type="button"
            aria-label="Open Sell/Rent modal"
          >
            Sell / Rent
          </button>

          {/* Spacer for left area */}
          <div className="w-[160px]" />

          {/* Centered search */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <SearchButton />
          </div>

          {/* Right-aligned nav */}
          <nav className="flex gap-4" aria-label="Primary">
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
        </div>
      </header>
      <SellRentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
