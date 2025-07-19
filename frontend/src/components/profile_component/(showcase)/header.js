"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SearchButton from '@/ui/showcaseBotSearchButton';
import SellRentModal from "@/components/profile_component/(showcase)/(explore)/sellRentModal"; // Import et

export default function Header() {
  const pathname = usePathname();
  const [modalOpen, setModalOpen] = useState(false);

  const navItems = [
    { name: "Keşfet", href: "/profile/showcase" },
    { name: "Öne Çıkanlar", href: "/profile/showcase/featured" }
  ];

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-black text-white h-[60px] shadow-md z-50 px-6">
        <div className="relative h-full flex items-center justify-between">
          {/* Sat/Kirala butonu */}
          <button
            className="absolute left-[45px] top-1/2 -translate-y-1/2 bg-black hover:border-stone-400 transition px-6 py-[6px] rounded-xl font-semibold shadow-lg text-white border-1 border-stone-600 z-50"
            onClick={() => setModalOpen(true)}
          >
            Sat / Kirala
          </button>
          {/* Boş div sol denge için */}
          <div className="w-[160px]" />
          {/* Ortalanmış SearchButton */}
          <div className="absolute left-1/2 -translate-x-1/2">
            <SearchButton />
          </div>
          {/* Sağda Linkler */}
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-[6px] rounded-2xl hover:scale-105 transition font-medium border-1 border-gray-700 text-white ${
                  pathname === item.href
                    ? "bg-black hover:bg-gray-950 shadow-xl shadow-[rgba(97,255,242,0.14)]"
                    : "bg-black hover:bg-gray-950"
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
