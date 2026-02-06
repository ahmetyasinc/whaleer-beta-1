"use client";

import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { FaArrowLeftLong } from "react-icons/fa6";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

export default function ResetPasswordForm({ locale }) {
    const router = useRouter();
    const { t } = useTranslation("resetPassword"); // We will create this namespace
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (locale && i18n.language !== locale) {
            i18n.changeLanguage(locale);
        }
    }, [locale]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/${locale}/update-password`, // We'll need an update-password page too
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success(t("successMessage") || "Password reset link sent! Check your email.");
                // Optional: redirect to login or show a success state
            }
        } catch (error) {
            console.error("Reset password error:", error);
            toast.error(t("errorMessage") || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-8">
            <button
                onClick={() => router.push(`/${locale}/login`)}
                className="hidden md:block fixed top-3 left-2 bg-[#363636] text-center w-40 rounded-[8px] h-10 text-white text-xl font-semibold group"
                type="button"
            >
                <div className="bg-[rgb(38,135,192)] rounded-[5px] h-8 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[151px] z-10 duration-500">
                    <FaArrowLeftLong />
                </div>
                <p className="mb-2 translate-x-6 translate-y-1">{t("backToLogin") || "Login"}</p>
            </button>

            <div className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white/0 backdrop-blur-lg border border-gray-400 rounded-lg shadow-xl overflow-hidden mx-auto">
                <div className="p-6 sm:p-8">
                    <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-white">
                        {t("title") || "Reset Password"}
                    </h2>
                    <p className="mt-4 sm:mt-6 text-center text-sm sm:text-base text-gray-400">
                        {t("subtitle") || "Enter your email to receive a reset link."}
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
                        <div className="rounded-md shadow-sm">
                            <div>
                                <label className="sr-only" htmlFor="email">
                                    {t("email") || "Email"}
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    placeholder={t("email") || "Email Address"}
                                    className="appearance-none block w-full px-3 py-3 sm:py-4 bg-white text-black focus:outline-none rounded-md sm:text-sm mb-4 sm:mb-6"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="group relative w-full flex justify-center py-3 sm:py-4 px-4 mb-5 
                         rounded-md text-sm font-medium text-neutral-100 
                         bg-gradient-to-r from-indigo-600 to-emerald-600
                         hover:from-teal-700 hover:to-cyan-500
                         transition-all duration-200 ease-out 
                         transform hover:scale-[1.01]
                         shadow-md hover:shadow-lg hover:shadow-indigo-600/40 disabled:opacity-50"
                            >
                                <span className="relative z-10">{loading ? (t("sending") || "Sending...") : (t("submit") || "Send Reset Link")}</span>
                                <span className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-indigo-500/30 rounded-md blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
