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
import ContinueWithGoogle from "@/ui/ContinueWithGoogle";

export default function LoginForm({ locale }) {
  const router = useRouter();
  const { t } = useTranslation("login");
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
        `${process.env.NEXT_PUBLIC_API_URL}/login/`,
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
  <div className="flex min-h-screen items-center justify-center px-4 py-8">
    <button
      onClick={() => router.push("/")}
      className="hidden md:block fixed top-3 left-2 bg-[#363636] text-center w-40 rounded-[8px] h-10 text-white text-xl font-semibold group"
      type="button"
    >
      <div className="bg-[rgb(38,135,192)] rounded-[5px] h-8 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[151px] z-10 duration-500">
        <FaArrowLeftLong />
      </div>
      <p className="mb-2 translate-x-6 translate-y-1">{t("homepage")}</p>
    </button>

    <div className="w-full max-w-md sm:max-w-lg md:max-w-xl bg-white/0 backdrop-blur-lg border border-gray-400 rounded-lg shadow-xl overflow-hidden mx-auto">
      <div className="p-6 sm:p-8">
        <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-white">
          {t("title")}
        </h2>
        <p className="mt-4 sm:mt-6 text-center text-sm sm:text-base text-gray-400">
          {t("subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="mt-6 sm:mt-8 space-y-4 sm:space-y-6">
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
                className="appearance-none block w-full px-3 py-3 sm:py-4 bg-white text-black focus:outline-none rounded-md sm:text-sm mb-4 sm:mb-6"
                required
                value={formData.username}
                onChange={handleChange}
              />
            </div>
            <div className="mt-3 sm:mt-4 relative">
              <label className="sr-only" htmlFor="password">
                {t("password")}
              </label>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                placeholder={t("password")}
                className="appearance-none block w-full px-3 py-3 sm:py-4 bg-white text-black rounded-md focus:outline-none sm:text-sm pr-10"
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

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mt-4">
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

            <div className="text-sm text-right">
              <Link href="/reset-password" className="font-medium text-indigo-500 hover:text-indigo-400">
                {t("forgotPassword")}
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              onClick={() => {
               
                //const audio = new Audio("/sounds/tencere.mp3");
                //audio.play();
              }}
              className="group relative w-full flex justify-center py-3 sm:py-4 px-4 mb-5 
                         rounded-md text-sm font-medium text-neutral-100 
                         bg-gradient-to-r from-indigo-600 to-emerald-600
                         hover:from-teal-700 hover:to-cyan-500
                         transition-all duration-200 ease-out 
                         transform hover:scale-[1.01]
                         shadow-md hover:shadow-lg hover:shadow-indigo-600/40"
            >
              <span className="relative z-10">{t("submit")}</span>
              <span className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-indigo-500/30 rounded-md blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>
          </div>
        </form>

        <ContinueWithGoogle className="mt-4" />
      </div>

      <div className="px-6 sm:px-8 py-4 sm:py-6 bg-white/10 backdrop-blur-lg text-center">
        <span className="text-gray-400">{t("noAccount")} </span>
        <Link href="/register" className="font-medium text-indigo-500 hover:text-indigo-400">
          {t("register")}
        </Link>
      </div>
    </div>
  </div>
);

}

/*
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
        <p className="mb-2 translate-x-6 translate-y-1">{t("homepage")}</p>
      </button>

      <div className="bg-white/0 backdrop-blur-lg border border-gray-400 rounded-lg shadow-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-center text-3xl font-extrabold text-white">
            {t("title")}
          </h2>
          <p className="mt-6 text-center text-gray-400">
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
                  className="appearance-none relative block w-full px-3 py-4 bg-white text-black focus:outline-none rounded-md sm:text-sm mb-6"
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
                  className="appearance-none relative block w-full px-3 py-4 bg-white text-black rounded-md focus:outline-none sm:text-sm pr-10"
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
              onClick={() => {
                const audio = new Audio("/sounds/tencere.mp3");
                audio.play();
              }}
              className="group relative w-full flex justify-center py-4 px-4 mb-5 
                         rounded-md text-sm font-medium text-neutral-100 
                         bg-gradient-to-r from-indigo-600 to-emerald-600
                         hover:from-teal-700 hover:to-cyan-500
                         transition-all duration-200 ease-out 
                         transform hover:scale-[1.01]
                         shadow-md hover:shadow-lg hover:shadow-indigo-600/40"
            >
              <span className="relative z-10">{t("submit")}</span>
            
             
              <span className="absolute inset-0 bg-gradient-to-r from-purple-500/30 to-indigo-500/30 rounded-md blur opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </button>

            </div>
          </form>
          <ContinueWithGoogle className="mt-4"/>
        </div>
        <div className="px-8 py-6 bg-white/10 backdrop-blur-lg text-center">
          <span className="text-gray-400">{t("noAccount")} </span>
          <Link href="/register" className="font-medium text-indigo-500 hover:text-indigo-400">
            {t("register")}
          </Link>
        </div>
      </div>
    </div>
  );
*/
  