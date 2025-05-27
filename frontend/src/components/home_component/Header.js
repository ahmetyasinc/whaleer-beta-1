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
                    <h1 className="sitename">Whaleer</h1>
                </Link>

                <nav id="navmenu" className="navmenu">
                    <ul>
                        <li>
                            <Link href="/" className={pathname === "/" ? "active" : ""}>Anasayfa</Link>
                        </li>
                        <li>
                            <Link href="/how_to_use" className={pathname === "/how_to_use" ? "active" : ""}>Nasıl Kullanılır?</Link>
                        </li>
                        <li>
                            <Link href="/premium" className={pathname === "/premium" ? "active" : ""}>Premium Üyelik</Link>
                        </li>
                        <li>
                            <Link href="/about" className={pathname === "/about" ? "active" : ""}>Hakkında</Link>
                        </li>
                        <li className="dropdown ml-5">
                            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="hover:text-blue-500 flex items-center">
                                Özellikler <span className="ml-2">▼</span>
                            </button>
                            {isDropdownOpen && (
                                <ul ref={dropdownRef} className="absolute top-full left-0 mt-2 bg-gray-800 rounded-md py-2 w-56">
                                    <li><Link href="#features-tab-1" className="block px-6 py-2 hover:bg-gray-700">Strateji oluşturma</Link></li>
                                    <li><Link href="#features-tab-2" className="block px-6 py-2 hover:bg-gray-700">Otomatik alım-satım botları</Link></li>
                                    <li><Link href="#features-tab-3" className="block px-6 py-2 hover:bg-gray-700">Backtest yapma</Link></li>
                                    <li><Link href="#features-tab-4" className="block px-6 py-2 hover:bg-gray-700">İndikatör ekleme</Link></li>
                                    <li><Link href="#features-tab-5" className="block px-6 py-2 hover:bg-gray-700">Strateji taraması</Link></li>
                                </ul>
                            )}
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
