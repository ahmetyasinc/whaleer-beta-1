"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import SellRentModal from "@/components/profile_component/(showcase)/(explore)/sellRentModal";
import { useSiwsStore } from "@/store/auth/siwsStore";
import useSiwsAuth from "@/hooks/useSiwsAuth";
import useBotDataStore from '@/store/showcase/botDataStore';
import { useTranslation } from "react-i18next";

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
                        {/* Sell/Rent Button - Moved Here */}
                        <button
                            className="bg-black transition px-6 py-[6px] rounded-xl font-semibold shadow-lg text-gray-200 border border-stone-600 disabled:opacity-50 hover:border-stone-500"
                            onClick={() => setModalOpen(true)}
                            disabled={!isAnyWalletConnected}
                            type="button"
                        >
                            {t("buttons.sellRent")}
                        </button>

                        {/* Wallet Logic */}
                        {!walletLinked ? (
                            !isPhantomInstalled && readyState !== "Installed" ? (
                                <a
                                    href="https://phantom.app/download"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-[6px] rounded-xl border border-stone-600 hover:border-stone-500"
                                >
                                    {t("buttons.installPhantom")}
                                </a>
                            ) : (
                                <button
                                    onClick={connectWalletAndSignIn}
                                    disabled={authLoading}
                                    className="px-4 py-[6px] rounded-xl border border-stone-600 hover:border-stone-500"
                                >
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
        </>
    );
}
