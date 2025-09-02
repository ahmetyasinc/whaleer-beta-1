"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useLogout } from "@/utils/HookLogout";
import { useTranslation } from "react-i18next";

export default function Header({ pageClass }) {
  // Dil tüketimi: LanguageProvider zaten dili eşitliyor
  const { t, i18n } = useTranslation("header", { useSuspense: false });

  const pathname = usePathname();
  const auth = useAuth();
  const handleLogout = useLogout();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const mobileRef = useRef(null);

  // Scroll efekti
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Dış tıklama ile mobil menüyü kapat
  useEffect(() => {
    function handleClickOutside(e) {
      if (mobileRef.current && !mobileRef.current.contains(e.target)) {
        setMobileOpen(false);
      }
    }
    if (mobileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.body.style.overflow = "unset";
    };
  }, [mobileOpen]);

  if (!auth) return null;
  const { isAuthenticated } = auth;

  // URL'leri locale ön eki ile üret (/[locale]/...)
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const withLocale = (path) => (path === "/" ? `/${locale}` : `/${locale}${path}`);

  // Modern nav item with micro-interactions
  const navItem = (href, label, isMobile = false) => {
    const target = withLocale(href);
    const active = pathname === target;

    const baseClasses = isMobile
      ? "group relative hover:bg-[rgb(0,0,0,0)] flex items-center rounded-full px-4 py-3 text-base font-medium transition-all duration-200"
      : "group relative hover:bg-[rgb(0,0,0,0)] inline-flex items-center rounded-full px-4 py-2.5 text-sm font-medium transition-all duration-200";

    return (
      <Link
        href={target}
        onClick={() => isMobile && setMobileOpen(false)}
        aria-current={active ? "page" : undefined}
        className={[
          baseClasses,
          "group relative inline-flex items-center justify-center rounded-full px-4 py-2",
          "backdrop-blur-sm hover:ring-white/20",
          "transition-all duration-200 ease-out active:scale-95",
          "shadow-sm hover:shadow-lg",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900",
          active ? "text-white bg-white/5" : "text-slate-300 hover:text-white bg-transparent",
        ].join(" ")}
      >
        <span className="relative z-10">{label}</span>

        {/* Hover sweep gradient */}
        <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        {/* Bottom glow */}
        <span className="pointer-events-none absolute inset-x-2 -bottom-px h-px origin-center bg-gradient-to-r from-transparent via-sky-500 to-transparent transition-transform duration-400 group-hover:scale-x-100 scale-x-0" />

        {/* Active indicator */}
        <span
          className={[
            "pointer-events-none absolute -top-1 left-1/2 h-1 w-8 -translate-x-1/2 rounded-full",
            "bg-gradient-to-r from-sky-400 to-cyan-400",
            "transition-all duration-300",
            active ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1",
          ].join(" ")}
        />
      </Link>
    );
  };

  return (
    <>
      {/* Backdrop overlay for mobile menu */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <header
        className={[
          "fixed inset-x-0 top-0 z-50 transition-all duration-500",
          "px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6",
          scrolled ? "bg-[rgb(0,0,0,0)] backdrop-blur-lg shadow-[0_8px_32px_rgba(0,0,0,0.4)]" : "bg-transparent",
        ].join(" ")}
      >
        <div className="mx-auto max-w-7xl">
          <div
            className={[
              "flex items-center justify-between transition-all duration-500",
              "bg-black mx-12 backdrop-blur-xl rounded-full",
              "shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
              "px-4 sm:px-6 lg:px-8",
              scrolled ? "h-14 sm:h-16" : "h-16 sm:h-18 lg:h-20",
            ].join(" ")}
          >
            {/* Logo */}
            <Link href={withLocale("/")} className="flex items-center gap-3 group">
              <div className="relative">
                <Image
                  src="/img/logo1.jpg"
                  alt="Logo"
                  width={scrolled ? 36 : 44}
                  height={scrolled ? 36 : 44}
                  className="rounded-full object-cover ring-2 ring-blue-500/40 transition-all duration-300 group-hover:ring-blue-400/60 group-hover:scale-105"
                  priority
                  unoptimized
                />
                {/* Glow effect */}
                <div className="absolute inset-0 rounded-full bg-blue-500/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100 blur-md" />
              </div>
              <div className="hidden sm:block">
                <h1
                  className={[
                    "mb-2 ml-2 font-bold mt-2 tracking-tight",
                    "bg-transparent",
                    "bg-[length:200%_100%]",
                    "group-hover:animate-[pulse_1.5s_ease-in-out_infinite]",
                    scrolled ? "text-lg" : "text-xl lg:text-2xl",
                  ].join(" ")}
                >
                  Whaleer.com
                </h1>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-2 xl:gap-4">
              {navItem("/", t("home"))}
              {navItem("/features", t("features"))}
              {navItem("/premium", t("premium"))}
              {navItem("/about", t("about"))}
              {navItem("/document", t("document"))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <Link
                    href={withLocale("/profile")}
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-md hover:shadow-cyan-300/30 transition-all duration-300 hover:from-cyan-600 hover:to-blue-600 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/70"
                  >
                    <span className="relative z-10">{t("myProfile")}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-100 group-hover:opacity-100" />
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-md hover:shadow-cyan-300/30 transition-all duration-300 hover:from-cyan-600 hover:to-blue-600 trainsition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
                  >
                    <span className="relative z-10">{t("logout")}</span>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/10 to-transparent opacity-0 transition-opacity duration-100 group-hover:opacity-100" />
                  </button>
                </>
              ) : (
                <>
                  {(pageClass === 0 || pageClass === 2) && (
                    <Link
                      href={withLocale("/login")}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-md hover:shadow-cyan-300/30 transition-all duration-300 hover:from-cyan-600 hover:to-blue-600 trainsition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
                    >
                      <span className="relative z-10">{t("login")}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-100 group-hover:opacity-100" />
                    </Link>
                  )}
                  {(pageClass === 0 || pageClass === 1) && (
                    <Link
                      href={withLocale("/register")}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-md hover:shadow-cyan-300/30 transition-all duration-300 hover:from-cyan-600 hover:to-blue-600 trainsition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
                    >
                      <span className="relative z-10">{t("register")}</span>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 transition-opacity duration-100 group-hover:opacity-100" />
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="relative md:hidden inline-flex items-center justify-center rounded-2xl p-2.5 text-slate-200 transition-all duration-300 hover:bg-slate-800/70 hover:text-white hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileOpen}
            >
              <div className="relative h-6 w-6">
                <MenuIcon isOpen={mobileOpen} />
              </div>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          ref={mobileRef}
          className={[
            "md:hidden fixed left-4 right-4 top-24 sm:top-28",
            "bg-slate-950/95 backdrop-blur-xl rounded-3xl",
            "shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
            "transition-all duration-500 ease-out",
            mobileOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-4 pointer-events-none",
          ].join(" ")}
        >
          <div className="p-6">
            {/* Mobile Navigation */}
            <nav className="flex flex-col gap-2 mb-6">
              {navItem("/", t("home"), true)}
              {navItem("/features", t("features"), true)}
              {navItem("/premium", t("premium"), true)}
              {navItem("/about", t("about"), true)}
              {navItem("/document", t("document"), true)}
            </nav>

            {/* Mobile Actions */}
            <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/50">
              {isAuthenticated ? (
                <>
                  <Link
                    href={withLocale("/profile")}
                    onClick={() => setMobileOpen(false)}
                    className="group relative overflow-hidden rounded-2xl bg-slate-800/80 px-6 py-3 font-semibold text-slate-100 transition-all duration-300 hover:bg-slate-700/90 hover:text-white active:scale-95 ring-1 ring-slate-700/60 hover:ring-slate-600/80"
                  >
                    <span className="relative z-10">My Profile</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="group relative w-full rounded-2xl bg-slate-800/80 px-6 py-3 font-semibold text-slate-100 transition-all duration-300 hover:bg-slate-700/90 hover:text-white active:scale-95 ring-1 ring-slate-700/60 hover:ring-slate-600/80"
                  >
                    <span className="relative z-10">Log Out</span>
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-red-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </button>
                </>
              ) : (
                <>
                  {(pageClass === 0 || pageClass === 2) && (
                    <Link
                      href={withLocale("/login")}
                      onClick={() => setMobileOpen(false)}
                      className="group relative overflow-hidden w-full rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-3 text-center font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-500 hover:to-cyan-500 hover:shadow-[0_8px_30px_rgba(59,130,246,0.4)] active:scale-95"
                    >
                      <span className="relative z-10">{t("login")}</span>
                      <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </Link>
                  )}
                  {(pageClass === 0 || pageClass === 1) && (
                    <Link
                      href={withLocale("/register")}
                      onClick={() => setMobileOpen(false)}
                      className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-md hover:shadow-cyan-300/30 transition-all duration-300 hover:from-cyan-600 hover:to-blue-600 trainsition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/70"
                    >
                      <span className="relative z-10">{t("register")}</span>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

/* Animasyonlu Hamburger Menü İkonu */
function MenuIcon({ isOpen }) {
  return (
    <div className="flex flex-col justify-center items-center w-6 h-6">
      <span className={`bg-current block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${isOpen ? "rotate-45 translate-y-1" : "-translate-y-0.5"}`} />
      <span className={`bg-current block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm my-0.5 ${isOpen ? "opacity-0" : "opacity-100"}`} />
      <span className={`bg-current block transition-all duration-300 ease-out h-0.5 w-6 rounded-sm ${isOpen ? "-rotate-45 -translate-y-1" : "translate-y-0.5"}`} />
    </div>
  );
}
