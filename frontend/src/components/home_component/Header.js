"use client";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useLogout } from "@/utils/HookLogout";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

export default function Header({ pageClass, locale }) {
  const { t } = useTranslation("header");
  const pathname = usePathname();
  const auth = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const handleLogout = useLogout();

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  // Dış tıklamaları dinle
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!auth) return null;
  const { isAuthenticated } = auth;

  return (
    <header id="header" className="header d-flex align-items-center fixed-top">
      <div className="header-container container-fluid container-xl position-relative d-flex align-items-center justify-content-between">
        
        <Link href="/" className="logo d-flex align-items-center me-auto me-xl-0">
          <Image src="/img/logo1.jpg" alt="Logo" width={40} height={40} className="whaleavatar" priority unoptimized />
          <h1 className="sitename">Whaleer</h1>
        </Link>

        <nav id="navmenu" className="navmenu">
          <ul>
            <li>
              <Link href="/" className={pathname === "/" ? "active" : ""}>{t("home")}</Link>
            </li>
            <li>
              <Link href="/features" className={pathname === "/features" ? "active" : ""}>{t("features")}</Link>
            </li>
            <li>
              <Link href="/premium" className={pathname === "/premium" ? "active" : ""}>{t("premium")}</Link>
            </li>
            <li>
              <Link href="/about" className={pathname === "/about" ? "active" : ""}>{t("about")}</Link>
            </li>
            <li>
              <Link href="/document" className={pathname === "/document" ? "active" : ""}>{t("document")}</Link>
            </li>
          </ul>
          <i className="mobile-nav-toggle d-xl-none bi bi-list"></i>
        </nav>

        <div className="hidden md:flex space-x-6">
          {isAuthenticated ? (
            <>
              <Link className="btn-getstarted" href="/profile">{t("myProfile")}</Link>
              <button className="btn-getstarted" onClick={handleLogout}>{t("logout")}</button>
            </>
          ) : (
            <>
              {(pageClass === 0 || pageClass === 2) && (
                <Link className="text-white btn-getstarted" href="/login">{t("login")}</Link>
              )}
              {(pageClass === 0 || pageClass === 1) && (
                <Link className="text-white btn-getstarted" href="/register">{t("register")}</Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
