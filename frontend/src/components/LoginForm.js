"use client";

import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { FaArrowLeftLong } from "react-icons/fa6";
import { useState, useEffect } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

export default function LoginForm({ locale }) {
  const router = useRouter();
  const { t } = useTranslation("auth/login");
  const { setIsAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/login/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
          credentials: "include",
        }
      );

      if (response.ok) {
        toast.success(t("loginSuccess"), {
          position: "top-center",
          autoClose: 1250,
        });

        setTimeout(() => {
          router.push("/profile");
          setIsAuthenticated(true);
        }, 1200);
      } else {
        const errorData = await response.json();
        toast.error(`${t("loginError")}: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Giriş isteği başarısız:", error);
      toast.error(t("loginFail"));
    }
  };

  return (
    <div>
      <button
        onClick={() => router.push("/")}
        className="fixed top-3 left-2 bg-[#363636] text-center w-40 rounded-[8px] h-10 text-white text-xl font-semibold group"
        type="button"
      >
        <div className="bg-[rgb(38,135,192)] rounded-[5px] h-8 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[151px] z-10 duration-500">
          <FaArrowLeftLong />
        </div>
        <p className="translate-x-6 translate-y-1">{t("homepage")}</p>
      </button>

      <div className="bg-white/0 backdrop-blur-lg border-[1px] border-gray-400 rounded-lg shadow-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-center text-3xl font-extrabold text-white">
            {t("title")}
          </h2>
          <p className="mt-4 text-center text-gray-400">
            {t("subtitle")}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="rounded-md shadow-sm">
              <div>
                <label className="sr-only" htmlFor="username">
                  {t("username")}
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder={t("username")}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-950 bg-white text-black  rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              <div className="mt-4 relative">
                <label className="sr-only" htmlFor="password">
                  {t("password")}
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder={t("password")}
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-950 bg-white text-black rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
                <div
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 cursor-pointer"
                >
                  {showPassword ? <FiEyeOff /> : <FiEye />}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  className="h-4 w-4 text-indigo-500 focus:ring-indigo-400 border-gray-600 rounded"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <label className="ml-2 text-sm text-gray-400" htmlFor="rememberMe">
                  {t("rememberMe")}
                </label>
              </div>

              <div className="text-sm">
                <Link href="/reset-password" className="font-medium text-indigo-500 hover:text-indigo-400">
                  {t("forgotPassword")}
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border-transparent text-sm font-medium rounded-md text-neutral-300 bg-[hsl(221,60%,52%)] hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {t("submit")}
              </button>
            </div>
          </form>
        </div>
        <div className="px-8 py-4 bg-white/10 backdrop-blur-lg text-center">
          <span className="text-gray-400">{t("noAccount")} </span>
          <Link href="/register" className="font-medium text-indigo-500 hover:text-indigo-400">
            {t("register")}
          </Link>
        </div>
      </div>
    </div>
  );
}
