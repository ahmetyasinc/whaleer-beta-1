"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoMdSettings } from "react-icons/io";
import { useState, useEffect } from "react";
import axios from "axios";

export default function ProfileHeader() {
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const navItems = [
    { name: "Portföyüm", href: "/profile" },
    { name: "Botlarım", href: "/profile/mybots" },
    { name: "İndikatör ve Stratejilerim", href: "/profile/myindicators" },
  ];

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_API_URL}/api/user-info`,
          { withCredentials: true }
        );
        setUser(res.data);
      } catch (err) {
        console.error("Kullanıcı alınamadı", err);
      } finally {
        setLoading(false);
      }
    };
    fetchUserInfo();
  }, []);

  return (
    <div className="relative w-full flex flex-col">
      <div className="w-full h-[60px] bg-black flex items-center justify-between px-6 shadow-lg">
        {/* Sol Profil */}
        <div className="flex items-center gap-3 border-l border-gray-700 pl-4 ml-10">
          {loading ? (
            <span className="text-gray-400 text-sm">Yükleniyor...</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                {user.name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-white font-semibold text-[16px]">
                  {user.name}
                </span>
                <span className="text-neutral-400 text-[10px] font-semibold">
                  #{user.username}
                </span>
              </div>
            </div>
          ) : (
            <span className="text-red-400 text-sm">
              Kullanıcı bilgisi alınamadı
            </span>
          )}
        </div>

        {/* Sağ Menü */}
        <div className="flex items-center gap-4">
          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-[6px] rounded-2xl hover:scale-[1.01] transition font-medium border-1 border-gray-700 text-white ${
                  pathname === item.href
                    ? "bg-black hover:bg-gray-950 shadow-xl shadow-[rgba(97,255,242,0.14)]"
                    : "bg-black hover:bg-gray-950"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <Link
            href="/settings"
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
              pathname === "/settings"
                ? "text-white shadow-lg hover:text-gray-500 shadow-cyan-500/30"
                : "text-gray-100 hover:text-gray-500 transition duration-100"
            }`}
            title="Ayarlar"
          >
            <IoMdSettings size={24} />
          </Link>
        </div>
      </div>
    </div>
  );
}
