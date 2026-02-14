'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MdOutlineLanguage } from 'react-icons/md';
import { useRouter, usePathname } from 'next/navigation';
import i18n from '@/i18n';
import { mergeSettingsCookie } from '@/utils/cookies/settingsCookie';

const LOCALES = ['en', 'tr'];

function setLangCookie(lng) {
    const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
    const secure = (typeof location !== 'undefined' && location.protocol === 'https:') ? '; Secure' : '';
    document.cookie = `lang=${lng}; Expires=${expires}; Path=/; SameSite=Lax${secure}`;
}

function splitLocalePath(pathname, locales = LOCALES) {
    const parts = pathname.replace(/^\/+/, '').split('/');
    const maybe = parts[0];
    if (locales.includes(maybe)) {
        return { locale: maybe, rest: parts.slice(1).join('/') };
    }
    return { locale: null, rest: parts.join('/') };
}

export default function LanguageSwitcher() {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const modalRef = useRef(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Close modal when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleLanguageChange = async (lng) => {
        try {
            await i18n.changeLanguage(lng);
        } catch (e) {
            console.error(e);
        }

        mergeSettingsCookie({ language: lng });
        setLangCookie(lng);

        const { rest } = splitLocalePath(pathname, LOCALES);
        const next = `/${lng}/${rest || ''}`.replace(/\/+$/, '');
        router.replace(next || `/${lng}`);
        setIsOpen(false);
    };

    if (!mounted) return null;

    return (
        <div className="relative z-50">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="rounded-full p-1 text-gray-400 border border-white/10 hover:text-white transition-all bg-transparent"
                aria-label="Change Language"
            >
                <MdOutlineLanguage className="text-2xl hover:scale-[1.05]" />
            </button>

            {isOpen && (
                <div
                    ref={modalRef}
                    className="absolute top-12 right-0 w-48 bg-zinc-950/90 border border-white/10 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                >
                    <div className="p-1 space-y-1">
                        <button
                            onClick={() => handleLanguageChange('en')}
                            className={`w-full text-left px-3 py-2.5 text-sm transition-all rounded-lg flex items-center justify-between group ${i18n.language === 'en'
                                ? "bg-blue-600/20 text-blue-100 border border-blue-500/30"
                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/10">
                                    <img
                                        src="/country-icons/en.svg"
                                        alt="English"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="font-medium">English</span>
                            </div>
                            {i18n.language === 'en' && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                            )}
                        </button>
                        <button
                            onClick={() => handleLanguageChange('tr')}
                            className={`w-full text-left px-3 py-2.5 text-sm transition-all rounded-lg flex items-center justify-between group ${i18n.language === 'tr'
                                ? "bg-blue-600/20 text-blue-100 border border-blue-500/30"
                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200 border border-transparent"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className="relative w-5 h-5 rounded-full overflow-hidden border border-white/10">
                                    <img
                                        src="/country-icons/tr.svg"
                                        alt="Türkçe"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <span className="font-medium">Türkçe</span>
                            </div>
                            {i18n.language === 'tr' && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
