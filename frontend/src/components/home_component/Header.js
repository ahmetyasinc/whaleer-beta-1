"use client";
import { useAuth } from "@/context/AuthContext";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useLogout } from "@/utils/HookLogout"; // Yeni logout fonksiyonunu içe aktardık

export default function Header({ pageClass }) {
    const router = useRouter();
    const pathname = usePathname();
    const auth = useAuth();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const handleLogout = useLogout(); // useLogout hook'unu çağır

    if (!auth) {
        return null;
    }

    const { isAuthenticated } = auth;

    // Dışarı tıklanınca dropdown menüyü kapat
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    return (
        <header id="header" className="header d-flex align-items-center fixed-top">
            <div className="header-container container-fluid container-xl position-relative d-flex align-items-center justify-content-between">
                
                <Link href="/" className="logo d-flex align-items-center me-auto me-xl-0">
                    <Image src="/img/logo1.jpg" alt="Logo" width={40} height={40} className="whaleavatar" priority unoptimized />
                    <h1 className="sitename">Whaleer.com</h1>
                </Link>

                <nav id="navmenu" className="navmenu">
                    <ul>
                        <li>
                            <Link href="/" className={pathname === "/" ? "active" : ""}>Anasayfa</Link>
                        </li>
                        <li>
                            <Link href="/features" className={pathname === "/features" ? "active" : ""}>Özellikler</Link>
                        </li>
                        <li>
                            <Link href="/premium" className={pathname === "/premium" ? "active" : ""}>Premium Üyelik</Link>
                        </li>
                        <li>
                            <Link href="/about" className={pathname === "/about" ? "active" : ""}>Hakkında</Link>
                        </li>
                        <li>
                            <Link href="/document" className={pathname === "/document" ? "active" : ""}>Dökümantasyon</Link>
                        </li>
                    </ul>
                    <i className="mobile-nav-toggle d-xl-none bi bi-list"></i>
                </nav>

                <div className="hidden md:flex space-x-6">
                    {isAuthenticated ? (
                        <>
                            <Link className="btn-getstarted" href="/profile">Profilim</Link>
                            <button className="btn-getstarted" onClick={handleLogout}>Çıkış yap</button>
                        </>
                    ) : (
                        <>
                            {(pageClass === 0 || pageClass === 2) && (
                                <Link className="btn-getstarted" href="/login">Giriş Yap</Link>
                            )}
                            {(pageClass === 0 || pageClass === 1) && (
                                <Link className="btn-getstarted" href="/register">Kayıt Ol</Link>
                            )}
                        </>
                    )}
                </div>

            </div>
        </header>
    );
}
