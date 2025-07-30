"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../../styles/css/leftmenu.css";
import "../../styles/css/logOut_modal.css";
import { PiSpiralBold } from "react-icons/pi";
import {
  BiUser, BiCandles, BiLineChart, BiBroadcast, BiSearchAlt, BiLogOut,
  BiChevronLeft,
} from "react-icons/bi";
import { IoMdArrowDropright } from "react-icons/io";
import { IoWarningOutline } from "react-icons/io5";
import { LuBot } from "react-icons/lu";
import { BsGrid1X2 } from "react-icons/bs";
import { useLogout } from "@/utils/HookLogout";
import { IoMdSettings } from "react-icons/io";
import axios from "axios";
import i18n from "@/i18n";

//import LogoIcon from "/img/logo5.png";

const menuItems = [
<<<<<<< HEAD
  { href: "/profile", icon: <BiUser />, label: "Profil"},
  { href: "/profile/whaleerai", icon: <PiSpiralBold />, label: "WhaleerAI"},
  { href: "/profile/indicators", icon: <BiCandles />, label: "İndikatörler" },
  { href: "/profile/sift", icon: <BiSearchAlt />, label: "Strateji Tarama"},
=======
  { href: "/profile", icon: <BiUser />, label: "Profil", locked: false },
  { href: "/profile/whaleerai", icon: <FaRegLightbulb />, label: "WhaleerAI", locked: false },
  { href: "/profile/indicators", icon: <BiCandles />, label: "Strategies" },
  { href: "/profile/sift", icon: <BiSearchAlt />, label: "Strateji Tarama", locked: false },
>>>>>>> e05f4914f889d267c7f9b6fc965cce1cd627d982
  { href: "/profile/backtest", icon: <BiLineChart />, label: "Backtest" },
  { href: "/profile/bot", icon: <LuBot />, label: "Otomatik Botlarım"},
  { href: "/profile/showcase", icon: <BsGrid1X2 />, label: "Vitrin"},
  { href: "/profile/apiconnect", icon: <BiBroadcast />, label: "API Bağlantısı" },
  { href: "/profile/settings", icon: <IoMdSettings />, label: "Ayarlar" },
];

const LeftMenu = ({locale}) => {
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

  // Kullanıcı bilgisini çek
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

  // Sidebar animasyonu
  useEffect(() => {
    const toggleBtn = document.getElementById("toggleSidebar-left");
    if (toggleBtn) {
      toggleBtn.classList.toggle("move-left", isOpen);
    }
  }, [isOpen]);

  if (!user) {
    return (
      <div className="sidebar-left bg-black text-white px-6 pt-4">
        <p className="text-sm animate-pulse">Kullanıcı bilgisi yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className={`sidebar-left ${isOpen ? "open" : ""}`}>
      {/* Header */}
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

      {/* Menü Linkleri */}
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
              <span className={`menu-icon`}>
                {item.icon}
              </span>
              {isOpen && (
                  <span className="link-label flex items-center gap-1">
                    {item.label}
                  </span>
                )}
            </Link>
          </li>
        ))}

        {/* Çıkış Butonu */}
        <li className="sidebar-link-item">
          <button className="logout-button" onClick={() => setShowLogoutModal(true)}>
            <span className="menu-icon"><BiLogOut /></span>
            {isOpen && <span className="link-label">Çıkış Yap</span>}
          </button>
        </li>
      </ul>

      {/* Menü Toggle Butonu */}
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

      {/* Çıkış Onay Modalı */}
      {showLogoutModal && (
        <div className="logout-modal">
          <div className="logout-modal-content">
            <IoWarningOutline />
            <p>Çıkış yapmak istediğinize emin misiniz?</p>
            <div className="logout-modal-buttons">
              <button onClick={() => setShowLogoutModal(false)} className="cancel-btn">Hayır</button>
              <button onClick={handleLogout} className="confirm-btn">Çıkış Yap</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeftMenu;
