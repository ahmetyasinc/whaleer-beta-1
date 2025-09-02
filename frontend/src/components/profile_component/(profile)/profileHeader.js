"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IoMdSettings } from "react-icons/io";
import { useSessionStore } from "@/store/profile/sessionStore";
import { useProfileStore } from "@/store/profile/profileStore";

export default function ProfileHeader() {
  const pathname = usePathname();
  const user = useSessionStore(s => s.user);
  const apis = useProfileStore(s => s.apis);
  const activeApiId = useProfileStore(s => s.activeApiId);
  const setActiveApiById = useProfileStore(s => s.setActiveApiById);

  const navItems = [
    { name: "My Portfolio", href: "/en/profile" },
    { name: "My Bots", href: "/en/profile/mybots" },
    { name: "My Indicators and Strategies", href: "/en/profile/myindicators" },
  ];

  return (
    <div className="relative w-full flex flex-col">
      <div className="w-full h-[60px] bg-black flex items-center justify-between px-6 shadow-lg">
        {/* Left Profile */}
        <div className="flex items-center gap-3 border-l border-gray-700 pl-4 ml-10">
          {!user ? (
            <span className="text-gray-400 text-sm">Loading...</span>
          ) : (
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
          )}
        </div>

        {/* Right Menu + API Dropdown */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={activeApiId || ""}
              onChange={(e) => setActiveApiById(Number(e.target.value))}
              className="px-4 py-[6px] rounded-2xl transition font-medium border-1 border-gray-700 text-white
                         bg-black hover:bg-gray-950 hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-cyan-500"
              title="Select Active API"
            >
              {!apis?.length && <option value="">No API</option>}
              {apis?.map(api => (
                <option key={api.id} value={api.id}>{api.api_name}</option>
              ))}
            </select>
          </div>

          <nav className="flex gap-4">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-[6px] rounded-xl transition font-medium border border-gray-800 hover:border-gray-600 text-gray-200 ${
                  pathname === item.href
                    ? "bg-black shadow-xl shadow-[rgba(97,255,242,0.05)]"
                    : "bg-black"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <Link
            href="/profile/settings"
            className={`flex items-center justify-center w-10 h-10 rounded-full transition-all ${
              pathname === "/settings"
                ? "text-gray-100 shadow-lg hover:text-gray-400 shadow-cyan-500/30"
                : "text-gray-100 hover:text-gray-400 transition duration-100"
            }`}
            title="Settings"
          >
            <IoMdSettings size={24} />
          </Link>
        </div>
      </div>
    </div>
  );
}
