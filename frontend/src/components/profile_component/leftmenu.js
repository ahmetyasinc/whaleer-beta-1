"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "../../styles/css/leftmenu.css";
import "../../styles/css/logOut_modal.css";
import { BiLock } from "react-icons/bi"; // veya başka bir kilit ikonu

import {
  BiUser, BiCandles, BiLineChart, BiBroadcast, BiSearchAlt, BiLogOut,
  BiMenu, BiChevronLeft,
} from "react-icons/bi";
import { IoMdArrowDropright } from "react-icons/io";
import { IoWarningOutline } from "react-icons/io5";
import { LuBot } from "react-icons/lu";
import { BsGrid1X2 } from "react-icons/bs";
import { useLogout } from "@/utils/HookLogout";
import axios from "axios";

const menuItems = [
  { href: "/profile", icon: <BiUser />, label: "Profil", locked: true },
  { href: "/profile/showcase", icon: <BsGrid1X2 />, label: "Vitrin", locked: true },
  { href: "/profile/indicators", icon: <BiCandles />, label: "İndikatörler" },
  { href: "/profile/backtest", icon: <BiLineChart />, label: "Backtest", locked: true },
  { href: "/profile/apiconnect", icon: <BiBroadcast />, label: "API Bağlantısı" },
  { href: "/profile/bot", icon: <LuBot />, label: "Otomatik Botlarım", locked: false },
  { href: "/profile/sift", icon: <BiSearchAlt />, label: "Strateji Tarama", locked: true },
];

const LeftMenu = () => {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const pathname = usePathname();
  const handleLogout = useLogout();

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
              <span className={`menu-icon ${item.locked ? "text-yellow-400" : ""}`}>
                {item.icon}
              </span>
              {isOpen && (
                  <span
                    className={`link-label flex items-center gap-1 ${
                      item.locked ? "text-yellow-400" : ""
                    }`}
                  >
                    {item.label}
                    {item.locked && (
                      <BiLock 
                        title="Bu özellik şu anda kilitli"
                        className="text-yellow-400"
                      />
                    )}
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
        {isOpen ? <BiChevronLeft size={26} /> : <BiMenu size={26} />}
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
