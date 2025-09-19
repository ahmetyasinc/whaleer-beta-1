"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useLogout } from "@/utils/HookLogout";
import axios from "axios";
import LogoutConfirmModal from "./confirmLogout";
import { BiUser, BiCandles, BiLineChart, BiBroadcast, BiSearchAlt, BiLogOut, BiChevronLeft, BiSupport } from "react-icons/bi";
import { IoMdArrowDropright } from "react-icons/io";
import { LuBot } from "react-icons/lu";
import { BsGrid1X2 } from "react-icons/bs";
import { AiOutlineSetting } from "react-icons/ai";
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

  const menuItems = [
    { href: "/profile", icon: <BiUser />, label: t("profile") },
    //{ href: "/profile/whaleerai", label: t("ai") },
    { href: "/profile/strategies", icon: <BiCandles />, label: t("strategies") },
    //{ href: "/profile/sift", icon: <BiSearchAlt />, label: t("scanner") },
    { href: "/profile/backtest", icon: <BiLineChart />, label: t("backtest") },
    { href: "/profile/bot", icon: <LuBot />, label: t("bots") },
    { href: "/profile/showcase", icon: <BsGrid1X2 />, label: t("showcase") },
    { href: "/profile/apiconnect", icon: <BiBroadcast />, label: t("apiconnect") },
    { href: "/profile/support", icon: <BiSupport />, label: t("support") },
    { href: "/profile/settings", icon: <AiOutlineSetting />, label: t("settings") },
  ];

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/api/user-info`, {
          withCredentials: true,
        });
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

  if (!user) {
    return (
      <div className="sidebar-left bg-black text-white px-6 pt-4">
        <p className="text-sm animate-pulse">{t("loading")}</p>
      </div>
    );
  }

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
          const active = pathname === item.href;
          return (
            <li key={index} className="relative flex items-center">
              <Link
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={[
                  "flex items-center gap-3 w-full px-4 py-2 text-white transition-colors duration-300",
                  active ? "bg-white/10 rounded-md" : "hover:text-[hsl(209,100%,50%)]",
                ].join(" ")}
              >
                {active && (
                  <IoMdArrowDropright className="absolute left-[-10px] top-1/2 -translate-y-1/2 text-2xl text-white" />
                )}
                <span className="text-[20px] inline-flex">{item.icon}</span>
                {isOpen && <span className="text-sm">{item.label}</span>}
              </Link>
            </li>
          );
        })}

        {/* Logout */}
        <li>
          <button
            className="flex items-center gap-3 w-full px-4 py-2 text-left text-white hover:text-[hsl(209,100%,50%)] transition-colors duration-300"
            onClick={() => setShowLogoutModal(true)}
          >
            <span className="text-[20px] inline-flex">
              <BiLogOut />
            </span>
            {isOpen && <span className="text-sm">{t?.("logout") ?? "Logout"}</span>}
          </button>
        </li>
      </ul>
    </div>

    {/* TOGGLE BUTTON */}
    <button
      id="toggleSidebar-left"
      onClick={() => setIsOpen((v) => !v)}
      className={[
        "fixed top-2 h-10 w-10 bg-[rgb(7,67,95)] text-white rounded-[40%] p-2 z-[1101]",
        "flex items-center justify-center transition-all duration-300",
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
