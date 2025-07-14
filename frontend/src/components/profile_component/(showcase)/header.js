"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SearchButton from '@/ui/showcaseBotSearchButton';


export default function Header() {
  const pathname = usePathname();

  const navItems = [
    { name: "Keşfet", href: "/profile/showcase" },
    { name: "Öne Çıkanlar", href: "/profile/showcase/featured" }
  ];

  return (
<header className="fixed top-0 left-0 w-full bg-black text-white h-[60px] shadow-md z-50 px-6">
  <div className="relative h-full flex items-center justify-between">
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


  );
}
