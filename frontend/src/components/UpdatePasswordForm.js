"use client";

import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { FiEye, FiEyeOff } from "react-icons/fi";

export default function UpdatePasswordForm({ locale }) {
    const router = useRouter();
    const { t } = useTranslation("updatePassword");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    useEffect(() => {
        if (locale && i18n.language !== locale) {
            i18n.changeLanguage(locale);
        }
    }, [locale]);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error(t("passwordsDoNotMatch") || "Passwords do not match.");
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) {
                toast.error(error.message);
            } else {
                toast.success(t("successMessage") || "Password updated successfully!");
                router.push(`/${locale}/profile`);
            }
        } catch (error) {
            console.error("Update password error:", error);
            toast.error(t("errorMessage") || "An error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center px-4 py-8">
            <div className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white/0 backdrop-blur-lg border border-gray-400 rounded-lg shadow-xl overflow-hidden mx-auto">
                <div className="p-6 sm:p-8">
                    <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-white">
                        {t("title") || "Update Password"}
                    </h2>
                    <p className="mt-4 sm:mt-6 text-center text-sm sm:text-base text-gray-400">
                        {t("subtitle") || "Enter your new password below."}
                    </p>

                    <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
                        <div className="rounded-md shadow-sm">
                            <div className="relative">
                                <label className="sr-only" htmlFor="password">
                                    {t("newPassword") || "New Password"}
                                </label>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    name="password"
                                    placeholder={t("newPassword") || "New Password"}
                                    className="appearance-none block w-full px-3 py-3 sm:py-4 bg-white text-black focus:outline-none rounded-md sm:text-sm mb-4 sm:mb-6 pr-10"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                />
                                <div
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer"
                                >
                                    {showPassword ? <FiEyeOff /> : <FiEye />}
                                </div>
                            </div>

                            <div className="relative">
                                <label className="sr-only" htmlFor="confirmPassword">
                                    {t("confirmPassword") || "Confirm Password"}
                                </label>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    id="confirmPassword"
                                    name="confirmPassword"
                                    placeholder={t("confirmPassword") || "Confirm New Password"}
                                    className="appearance-none block w-full px-3 py-3 sm:py-4 bg-white text-black focus:outline-none rounded-md sm:text-sm mb-4 sm:mb-6 pr-10"
                                    required
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    minLength={6}
                                />
                                <div
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer"
                                >
                                    {showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                                </div>
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
                                <span className="relative z-10">{loading ? (t("updating") || "Updating...") : (t("submit") || "Update Password")}</span>
                                <span className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-indigo-500/30 rounded-md blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
