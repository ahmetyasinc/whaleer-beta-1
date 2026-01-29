"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSessionStore } from "@/store/profile/sessionStore";
import { useProfileStore } from "@/store/profile/profileStore";
import { useTranslation } from "react-i18next";
import { FaChevronDown, FaCheck } from "react-icons/fa";

function useCurrentLocale(pathname) {
  // /en/profile/... -> "en"
  const seg = pathname.split("/")[1];
  return seg || "en";
}

export default function ProfileHeader() {
  const pathname = usePathname();
  const locale = useCurrentLocale(pathname);
  const { t } = useTranslation("profileHeader");

  const user = useSessionStore((s) => s.user);
  const apis = useProfileStore((s) => s.apis);
  const activeApiId = useProfileStore((s) => s.activeApiId);
  const setActiveApiById = useProfileStore((s) => s.setActiveApiById);

  // Dropdown state
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeApiName = apis?.find(a => a.id === activeApiId)?.api_name || t("api.noApi");

  const navItems = [
    { name: t("nav.portfolio"), href: `/${locale}/profile` },
    { name: t("nav.bots"), href: `/${locale}/profile/mybots` },
    { name: t("nav.indicators"), href: `/${locale}/profile/myindicators` },
  ];

  return (
    <div className="relative w-full flex flex-col">
      <div className="w-full h-[60px] bg-black border-b border-zinc-900 flex items-center justify-between px-6 shadow-lg z-50">
        {/* Left Profile */}
        <div className="flex items-center gap-3 border-l border-gray-700 pl-4 ml-10">
          {!user ? (
            <span className="text-gray-400 text-sm">{t("loading")}</span>
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

          {/* Custom API Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`
                relative flex items-center gap-3 px-4 py-[8px] rounded-xl font-medium text-sm transition-all duration-300
                border border-gray-800 bg-black/50 backdrop-blur-sm
                hover:border-gray-600 hover:bg-white/5
                ${isOpen ? "border-cyan-500/50 ring-1 ring-cyan-500/50 text-white" : "text-gray-300"}
              `}
            >
              <span className="truncate max-w-[120px]">{activeApiName}</span>
              <FaChevronDown className={`text-xs text-gray-400 transition-transform duration-300 ${isOpen ? "rotate-180 text-cyan-400" : ""}`} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 rounded-xl bg-[#0a0a0a] border border-gray-800 shadow-2xl shadow-black/80 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                <div className="p-1.5 flex flex-col gap-1">
                  {!apis?.length && (
                    <div className="px-3 py-2 text-sm text-gray-500">{t("api.noApi")}</div>
                  )}
                  {apis?.map((api) => {
                    const isActive = api.id === activeApiId;
                    return (
                      <button
                        key={api.id}
                        onClick={() => {
                          setActiveApiById(api.id);
                          setIsOpen(false);
                        }}
                        className={`
                          w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-between
                          ${isActive
                            ? "bg-cyan-950/30 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_-4px_rgba(34,211,238,0.3)]"
                            : "text-gray-400 hover:text-white hover:bg-white/5 border border-transparent"
                          }
                        `}
                      >
                        <span className="truncate">{api.api_name}</span>
                        {isActive && <FaCheck className="text-xs" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex gap-2 bg-black/40 p-1 rounded-2xl border border-white/5">
            {navItems.map((item) => {
              const active =
                item.href === `/${locale}/profile`
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 ease-out
                    flex items-center justify-center
                    ${active
                      ? "text-cyan-400 bg-cyan-950/30 shadow-[0_0_20px_-5px_rgba(34,211,238,0.3)] border border-cyan-500/30"
                      : "text-gray-400 hover:text-gray-100 hover:bg-white/5 border border-transparent"
                    }
                  `}
                >
                  {/* Active Indicator Dot */}
                  {active && (
                    <span className="absolute w-1 h-1 bg-cyan-400 rounded-full bottom-1.5 shadow-[0_0_5px_#22d3ee]"></span>
                  )}
                  <span className={active ? "mb-1" : ""}>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
