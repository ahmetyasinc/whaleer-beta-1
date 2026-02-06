"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useLogout } from "@/utils/HookLogout";
import api from "@/api/axios";
import LogoutConfirmModal from "./confirmLogout";
import {
  BiUser,
  BiCandles,
  BiLineChart,
  BiBroadcast,
  BiLogOut,
  BiChevronLeft,
  BiSupport,
} from "react-icons/bi";
import { IoIosArrowForward } from "react-icons/io";
import { LuBot } from "react-icons/lu";
import { AiOutlineSetting } from "react-icons/ai";
import { MdShoppingCart } from "react-icons/md";
import { CiCompass1 } from "react-icons/ci";

const LeftMenu = ({ locale }) => {
  const { t } = useTranslation("leftmenu");
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();
  const handleLogout = useLogout();

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  const Clock = () => {
    const [time, setTime] = useState({ h: "", m: "", s: "", ms: "" });

    useEffect(() => {
      const update = () => {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, "0");
        const m = String(now.getMinutes()).padStart(2, "0");
        const s = String(now.getSeconds()).padStart(2, "0");
        const ms = String(now.getMilliseconds()).padStart(3, "0");
        setTime({ h, m, s, ms });
      };
      update();
      const interval = setInterval(update, 50);
      return () => clearInterval(interval);
    }, []);

    return (
      <span className="text-orange-400 font-mono text-sm tracking-widest">
        {time.h}:{time.m}:{time.s}
        <span className="text-[10px] opacity-80 relative top-[1px]">
          .{String(Math.floor(time.ms / 10)).padStart(2, "0")}
        </span>
      </span>
    );
  };

  const menuItems = [
    { href: "/profile", icon: <BiUser />, label: t("profile") },
    { href: "/profile/strategies", icon: <BiCandles />, label: t("strategies") },
    { href: "/profile/backtest", icon: <BiLineChart />, label: t("backtest") },
    { href: "/profile/bot", icon: <LuBot />, label: t("bots") },
    { href: "/profile/botmarket", icon: <MdShoppingCart />, label: t("botmarket") },
    //  { href: "/profile/showcase", icon: <CiCompass1 />, label: t("showcase") },
    { href: "/profile/apiconnect", icon: <BiBroadcast />, label: t("apiconnect") },
    { href: "/profile/support", icon: <BiSupport />, label: t("support") },
    { href: "/profile/settings", icon: <AiOutlineSetting />, label: t("settings") },
  ];

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await api.get("/user-info");
        setUser(res.data);
      } catch (err) {
        console.error("Kullanıcı alınamadı", err);
      }
    };
    fetchUserInfo();
  }, []);

  useEffect(() => {
    const toggleBtn = document.getElementById("toggleSidebar-left");
    if (toggleBtn) {
      toggleBtn.classList.toggle("move-left", isOpen);
    }
  }, [isOpen]);

  /*
    if (!user) {
      return (
        <div className="sidebar-left bg-black text-white px-6 pt-4">
          <p className="text-sm animate-pulse">{t("loading")}</p>
        </div>
      );
    }*/

  return (
    <>
      {/* SIDEBAR */}
      <div
        className={[
          "fixed top-0 left-0 h-screen w-[260px] bg-[rgb(7,67,95)] text-white",
          "z-[1000] overflow-y-auto rounded-tr-md",
          "transform transition-transform duration-300",
          isOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Header */}
        <div className="flex items-center justify-center gap-3 px-4 pt-4">
          <img
            src="/img/user.jpg"
            alt="user_img"
            className="w-10 h-10 rounded-full shadow-[0_0_9px_rgba(0,0,0,0.66)] mr-5"
          />
          {isOpen && (
            <div className="flex flex-col items-start text-left pl-2">
              <p className="text-base font-bold">{user?.username}</p>
              <p className="text-xs font-bold text-gray-300">#{user?.username}</p>
            </div>
          )}
        </div>

        {isOpen && (
          <div className="w-[80%] h-[2px] bg-black mx-auto mt-[20px] mb-2" />
        )}

        {/* Links */}
        <ul className="space-y-1.5 pl-4 mt-4">
          {menuItems.map((item, index) => {
            const isActive = pathname === item.href;

            return (
              <li key={index} className="relative flex items-center overflow-visible">
                <Link
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={[
                    "relative flex items-center gap-3 w-full px-4 py-2 text-white transition-colors duration-100 overflow-visible",
                    isActive ? "bg-white/10 rounded-md" : "hover:text-[#00d9ff]",
                  ].join(" ")}
                >
                  {isActive && (
                    <IoIosArrowForward className="absolute left-1 top-1/2 -translate-y-1/2 text-base text-[#00d9ff] z-[9999]" />
                  )}
                  <span className="text-[20px] inline-flex">{item.icon}</span>
                  {isOpen && <span className="text-sm">{item.label}</span>}
                </Link>
              </li>
            );
          })
          }

          {/* Logout */}
          <li>
            <button
              className="flex items-center gap-3 w-full px-4 py-2 text-left text-white hover:text-[#00d9ff] transition-colors duration-200"
              onClick={() => setShowLogoutModal(true)}
            >
              <span className="text-[20px] inline-flex">
                <BiLogOut />
              </span>
              {isOpen && <span className="text-sm">{t?.("logout") ?? "Logout"}</span>}
            </button>
          </li>
        </ul>
        {/* Saat kutusu */}
        {isOpen && (
          <div className="absolute bottom-3 left-0 w-full flex justify-center">
            <div className="px-3 py-1.5 bg-black/40 rounded-md border border-orange-500 shadow-[0_0_8px_rgba(255,165,0,0.4)]">
              <Clock />
            </div>
          </div>
        )}
      </div>

      {/* BACKDROP → menü açıkken dışarıya tıklayınca kapanır -----> bunu silince özellik kalkıyor */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[999] bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* TOGGLE BUTTON */}
      <button
        id="toggleSidebar-left"
        onClick={() => setIsOpen((v) => !v)}
        className={[
          "fixed top-2 h-10 w-10 bg-[rgb(7,67,95)] text-white rounded-[40%] p-2 z-[1101]",
          "flex items-center justify-center transition-all duration-200",
          "hover:scale-[1.07] hover:rotate-6",
          isOpen ? "left-[270px]" : "left-2",
        ].join(" ")}
      >
        {isOpen ? (
          <BiChevronLeft size={26} />
        ) : (
          <img src="/img/logo5_2.png" alt="Menu" width={26} height={26} />
        )}
      </button>

      {/* MODAL */}
      <LogoutConfirmModal
        open={showLogoutModal}
        onCancel={() => setShowLogoutModal(false)}
        onConfirm={handleLogout}
        t={t}
      />
    </>
  );
};

export default LeftMenu;
