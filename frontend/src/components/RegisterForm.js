"use client";

import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { FaArrowLeftLong } from "react-icons/fa6";
import { FiEye, FiEyeOff } from "react-icons/fi";
import ContinueWithGoogle from "@/ui/ContinueWithGoogle";
import { useTranslation } from "react-i18next";

function extractApiError(err, t) {
  const data = err?.response?.data;
  if (!data) return err?.message || t("toast.unexpected");
  if (typeof data === "string") return data;
  if (typeof data.detail === "string") return data.detail;
  if (typeof data.message === "string") return data.message;
  if (typeof data === "object") {
    try {
      const parts = [];
      for (const [key, val] of Object.entries(data)) {
        if (Array.isArray(val)) parts.push(`${key}: ${val.join(", ")}`);
        else if (typeof val === "string") parts.push(`${key}: ${val}`);
        else parts.push(`${key}: ${JSON.stringify(val)}`);
      }
      if (parts.length) return parts.join(" • ");
    } catch {}
  }
  return t("toast.genericError");
}

export default function RegisterForm() {
  const router = useRouter();
  const { setIsAuthenticated } = useAuth(); // şu an kullanılmıyor
  const { t, i18n } = useTranslation("register", { useSuspense: false });
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const withLocale = (path) => (path === "/" ? `/${locale}` : `/${locale}${path}`);

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error(t("toast.passwordMismatch"), { toastId: "pwd-mismatch" });
      return;
    }

    const payload = {
      first_name: formData.first_name,
      last_name: formData.last_name,
      username: formData.username,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
    };

    setSubmitting(true);
    const toastId = toast.loading(t("toast.submitting"));

    try {
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/register/`,
        payload,
        { headers: { "Content-Type": "application/json" } }
      );

      toast.update(toastId, {
        render: t("toast.success"),
        type: "success",
        isLoading: false,
        autoClose: 1500,
        closeOnClick: true,
      });

      router.push(withLocale("/login")); // ✅ locale’li yönlendirme
    } catch (error) {
      const msg = extractApiError(error, t);
      toast.update(toastId, {
        render: msg,
        type: "error",
        isLoading: false,
        autoClose: 4000,
        closeOnClick: true,
      });
      console.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="py-12">
      <button
        onClick={() => router.push(withLocale("/"))} // ✅ locale’li
        className="absolute top-3 left-2 bg-[#363636] text-center w-40 rounded-[8px] h-10 text-white text-xl font-semibold group"
        type="button"
      >
        <div className="bg-[rgb(38,135,192)] rounded-[5px] h-8 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[151px] z-10 duration-500">
          <FaArrowLeftLong />
        </div>
        <p className="mb-2 translate-x-6 translate-y-1">{t("backHome")}</p>
      </button>

      <div className="bg-white/0 backdrop-blur-lg border border-gray-400 rounded-lg shadow-lg overflow-hidden w-full max-w-md">
        <div className="p-8">
          <h2 className="text-center text-3xl font-extrabold text-white">{t("title")}</h2>
          <p className="mt-4 text-center text-gray-400">{t("subtitle")}</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <input
                  type="text"
                  name="first_name"
                  placeholder={t("placeholders.firstName")}
                  className="appearance-none block w-full px-3 py-3 border border-gray-950 bg-white text-black rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                  value={formData.first_name}
                  onChange={handleChange}
                />
              </div>
              <div>
                <input
                  type="text"
                  name="last_name"
                  placeholder={t("placeholders.lastName")}
                  className="appearance-none block w-full px-3 py-3 border border-gray-950 bg-white text-black rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                  value={formData.last_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            <input
              type="text"
              name="username"
              placeholder={t("placeholders.username")}
              className="appearance-none block w-full px-3 py-3 border border-gray-950 bg-white text-black rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
              value={formData.username}
              onChange={handleChange}
            />

            <input
              type="email"
              name="email"
              placeholder={t("placeholders.email")}
              className="appearance-none block w-full px-3 py-3 border border-gray-950 bg-white text-black rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
              value={formData.email}
              onChange={handleChange}
            />

            {/* Şifre */}
            <div className="mt-4 relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder={t("placeholders.password")}
                className="appearance-none block w-full px-3 py-3 border border-gray-950 bg-white text-black rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                required
                value={formData.password}
                onChange={handleChange}
              />
              <div
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 cursor-pointer"
              >
                {showPassword ? <FiEyeOff /> : <FiEye />}
              </div>
            </div>

            {/* Şifreyi Onayla */}
            <div className="mt-4 relative">
              <input
                type={showConfirm ? "text" : "password"}
                name="confirmPassword"
                placeholder={t("placeholders.passwordConfirm")}
                className="appearance-none block w-full px-3 py-3 border border-gray-950 bg-white text-black rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
              />
              <div
                onClick={() => setShowConfirm((prev) => !prev)}
                className="absolute inset-y-0 right-3 flex items-center text-gray-500 cursor-pointer"
              >
                {showConfirm ? <FiEyeOff /> : <FiEye />}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="group relative w-full flex justify-center py-3 px-4 mb-3 
                         rounded-md text-sm font-medium text-neutral-100 
                         bg-gradient-to-r from-indigo-600 to-emerald-500
                         hover:from-teal-700 hover:to-cyan-600
                         transition-all duration-200 ease-out 
                         transform hover:scale-[1.01]
                         shadow-md hover:shadow-lg hover:shadow-indigo-600/40
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? t("submit.loading") : t("submit.label")}
            </button>
          </form>

          <div className="mt-5">
            <ContinueWithGoogle />
          </div>
        </div>

        <div className="px-8 py-4 bg-white/10 backdrop-blur-lg text-center">
          <span className="text-gray-400">{t("haveAccount")} </span>
          <Link href={withLocale("/login")} className="font-medium text-indigo-500 hover:text-indigo-400">
            {t("login")}
          </Link>
        </div>
      </div>
    </div>
  );
}
