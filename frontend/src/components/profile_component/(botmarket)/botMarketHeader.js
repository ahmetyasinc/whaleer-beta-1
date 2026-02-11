"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import SellRentModal from "@/components/profile_component/(botmarket)/sellRentModal";
import { useSiwsStore } from "@/store/auth/siwsStore";
import useSiwsAuth from "@/hooks/useSiwsAuth";
import useBotDataStore from '@/store/showcase/botDataStore';
import { useTranslation } from "react-i18next";
import { MdSell } from "react-icons/md";

const PhantomIcon = ({ }) => (
    <img className="w-[20px] mt-[1px]" src="/PhantomLogoWhite.svg" alt="Phantom" />
);

export default function BotMarketHeader() {
    const { t } = useTranslation('showcaseHeader');
    const pathname = usePathname();
    const [modalOpen, setModalOpen] = useState(false);

    const { wallet, walletLinked, signOutWallet, authLoading, hydrateSession } = useSiwsStore();
    const { connectWalletAndSignIn, isPhantomInstalled, readyState } = useSiwsAuth();

    useEffect(() => { hydrateSession(); }, [hydrateSession]);

    const isAnyWalletConnected = walletLinked;

    // View mode stuff (unused in JSX but kept for functions)
    const viewMode = useBotDataStore(s => s.viewMode);
    const setViewMode = useBotDataStore(s => s.setViewMode);
    const initializeBots = useBotDataStore(s => s.initializeBots);


    //Nah kontrolleri
    const audioRef = useRef(null);
    useEffect(() => {
        audioRef.current = new Audio("/sounds/yetersiz-bakiye.mp3");
    }, []);

    const playSound = () => {
        audioRef.current?.play();
    };
    const [showSvg, setShowSvg] = useState(false);


    return (
        <>
            <header className="fixed top-0 left-0 w-full bg-black text-gray-200 h-[60px] shadow-md z-50 px-6">
                <div className="relative h-full flex items-center justify-between">

                    {/* LEFT - Empty as requested button moved to right */}
                    <div className="absolute left-[45px] top-1/2 -translate-y-1/2 flex items-center gap-3 z-50">
                    </div>

                    <div className="w-[160px]" />
                    {/* Search Bar Removed */}

                    {/* RIGHT - Buttons */}
                    <div className="flex items-center gap-3">

                        {/* Nah butonu */}
                        <button
                            onClick={() => {
                                setShowSvg(true);
                                playSound();
                            }}
                            className="bg-black transition px-6 py-[6px] rounded-xl font-semibold shadow-lg text-gray-200 border border-stone-600 disabled:opacity-50 hover:border-stone-500 flex items-center justify-center gap-2"
                            type="button"
                        >
                            <span>Para ödemeden bütün botları satın almak istiyorum</span>
                        </button>

                        {/* Nah ikonu */}
                        {showSvg && (
                            <div
                                onClick={() => setShowSvg(false)}
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 32 32"
                                    className="w-[40vmin] h-[40vmin] animate-rainbow"
                                >
                                    <path fill="currentColor" d="M26.67 18.29h-3.05v1.52h3.05v4.57h1.52V13.71h-1.52zm-1.53 9.14H9.91v-1.52H8.38v1.52H6.86V32h21.33v-4.57h-1.52v-3.05h-1.53Zm0 3.05H22.1v-1.53h3.04Zm0-18.29h1.53v1.52h-1.53Zm-3.04 6.1h1.52v-6.1h1.52v-1.52H22.1zm-3.05 0h3.05v1.52h-3.05Z" />
                                    <path fill="currentColor" d="M17.53 15.24h-3.05v1.52H16v3.05h1.53v-1.52h1.52v-7.62h3.05V9.14h-3.05V1.52h-1.52zM14.48 0h3.05v1.52h-3.05Z" />
                                    <path fill="currentColor" d="M11.43 19.81H16v1.52h-4.57Zm1.52-6.1h-1.52v1.53h3.05V1.52h-1.53v7.62H9.91v1.53h3.04zm-3.04 4.58h1.52v1.52H9.91Z" />
                                    <path fill="currentColor" d="M11.43 13.71v-1.52H9.91v-1.52H8.38v1.52H6.86v1.52zM6.86 24.38h1.52v1.53H6.86Zm-1.52-3.05h1.52v3.05H5.34Zm0-7.62h1.52v1.53H5.34Zm-1.53 1.53h1.53v6.09H3.81Z" />
                                </svg>                            </div>
                        )}

                        {/* Sell/Rent Button - Moved Here */}
                        <button
                            className="bg-black transition px-6 py-[6px] rounded-xl font-semibold shadow-lg text-gray-200 border border-stone-600 disabled:opacity-50 hover:border-stone-500 flex items-center justify-center gap-2"
                            onClick={() => setModalOpen(true)}
                            type="button"
                        >
                            <MdSell className="text-lg mt-[1px]" />
                            <span>{t("buttons.sellRent")}</span>
                        </button>

                        {/* Wallet Logic */}
                        {!walletLinked ? (
                            !isPhantomInstalled && readyState !== "Installed" ? (
                                <a
                                    href="https://phantom.app/download"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-6 py-[7px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98]"
                                >
                                    <PhantomIcon className="w-5 h-5" />
                                    {t("buttons.installPhantom")}
                                </a>
                            ) : (
                                <button
                                    onClick={connectWalletAndSignIn}
                                    disabled={authLoading}
                                    className="inline-flex items-center gap-2 px-6 py-[7px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 active:scale-[0.98]"
                                >
                                    <PhantomIcon className="w-5 h-5" />
                                    {authLoading ? t("buttons.connecting") : t("buttons.connectWallet")}
                                </button>
                            )
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-sm opacity-80">
                                    {wallet?.address ? `${wallet.address.slice(0, 4)}...${wallet.address.slice(-4)}` : t("labels.connected")}
                                </span>
                                <button
                                    onClick={signOutWallet}
                                    className="px-3 py-[6px] rounded-xl border border-stone-600 hover:border-stone-500"
                                >
                                    {t("buttons.signOut")}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <SellRentModal open={modalOpen} onClose={() => setModalOpen(false)} />

            {/* Nah animasyonu*/}
            <style jsx>{`
              .animate-rainbow {
                animation: rainbow 0.25s linear infinite,
                           shake 0.12s infinite;
              }

              @keyframes rainbow {
                0%   { color: red; }
                14%  { color: orange; }
                28%  { color: yellow; }
                42%  { color: lime; }
                56%  { color: cyan; }
                70%  { color: blue; }
                84%  { color: magenta; }
                100% { color: red; }
              }
            `}</style>
        </>
    );
}
