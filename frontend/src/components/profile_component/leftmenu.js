"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useLogout } from "@/utils/HookLogout";
import axios from "axios";

import "@/styles/css/leftmenu.css";
import "@/styles/css/logOut_modal.css";

import { BiLock, BiUser, BiCandles, BiLineChart, BiBroadcast, BiSearchAlt, BiLogOut, BiChevronLeft } from "react-icons/bi";
import { FaRegLightbulb } from "react-icons/fa";
import { IoMdArrowDropright } from "react-icons/io";
import { IoWarningOutline } from "react-icons/io5";
import { LuBot } from "react-icons/lu";
import { BsGrid1X2 } from "react-icons/bs";

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
    { href: "/profile/whaleerai", icon: <FaRegLightbulb />, label: t("ai") },
    { href: "/profile/strategies", icon: <BiCandles />, label: t("strategies") },
    { href: "/profile/sift", icon: <BiSearchAlt />, label: t("scanner") },
    { href: "/profile/backtest", icon: <BiLineChart />, label: t("backtest") },
    { href: "/profile/bot", icon: <LuBot />, label: t("bots") },
    { href: "/profile/showcase", icon: <BsGrid1X2 />, label: t("showcase") },
    { href: "/profile/apiconnect", icon: <BiBroadcast />, label: t("apiconnect") },
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
    <div className={`sidebar-left ${isOpen ? "open" : ""}`}>
      <div className="sidebar-header bg-[rgb(7,67,95)] text-white flex items-center justify-between ml-4 mt-2">
        <img src="/img/user.jpg" alt="user_img" className="profile-img" />
        {isOpen && (
          <div className="sidebar-header-left flex flex-col items-start text-left pl-5 pt-[10px]">
            <p className="username-left text-base font-bold">{user.name}</p>
            <p className="text-xs font-bold text-gray-400">#{user.username}</p>
          </div>
        )}
      </div>

      {isOpen && <div className="w-[80%] h-[2px] bg-black mx-auto my-2" />}

      <ul className="sidebar-links-left space-y-0">
        {menuItems.map((item, index) => (
          <li key={index} className="relative flex items-center">
            <Link
              href={item.href}
              className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
              onClick={() => setIsOpen(false)}
            >
              {pathname === item.href && (
                <IoMdArrowDropright className="absolute left-[-10px] top-1/2 transform -translate-y-1/2 text-2xl text-white" />
              )}
              <span className="menu-icon">{item.icon}</span>
              {isOpen && <span className="link-label">{item.label}</span>}
            </Link>
          </li>
        ))}

        <li className="sidebar-link-item">
          <button className="logout-button" onClick={() => setShowLogoutModal(true)}>
            <span className="menu-icon"><BiLogOut /></span>
            {isOpen && <span className="link-label">{t("logout")}</span>}
          </button>
        </li>
      </ul>

      <button
        id="toggleSidebar-left"
        className="toggle-btn-left"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? (
          <BiChevronLeft size={26} />
        ) : (
          <img src="/img/logo5_2.png" alt="Menu" width={26} height={26} />
        )}
      </button>

      {showLogoutModal && (
        <div className="logout-modal">
          <div className="logout-modal-content">
            <IoWarningOutline />
            <p>{t("logoutConfirm")}</p>
            <div className="logout-modal-buttons">
              <button onClick={() => setShowLogoutModal(false)} className="cancel-btn">{t("no")}</button>
              <button onClick={handleLogout} className="confirm-btn">{t("logout")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftMenu;
