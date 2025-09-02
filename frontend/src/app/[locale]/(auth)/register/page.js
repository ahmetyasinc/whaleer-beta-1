"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";
import { useTranslation } from "react-i18next";

export default function RegisterPage() {
  const isBeta = false;
  const router = useRouter();
  const { t, i18n } = useTranslation("register", { useSuspense: false });
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const withLocale = (path) => (path === "/" ? `/${locale}` : `/${locale}${path}`);

  useEffect(() => {
    const accessToken = sessionStorage.getItem("access_token");
    if (accessToken) {
      router.push(withLocale("/profile")); // ✅ locale’li redirect
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="flex justify-center items-center min-h-screen text-white p-4">
      {isBeta ? (
        <div className="flex max-w-3xl shadow-2xl shadow-black bg-gray-950 border border-blue-500 rounded-2xl overflow-hidden">
          {/* Sol kısım - Görsel */}
          <div className="hidden md:flex items-center justify-center bg-gray-950 p-6">
            <img
              src="/img/sailorWhale.png"
              alt="Sailor Whale"
              className="max-h-60 w-auto object-contain"
            />
          </div>

          {/* Sağ kısım - Metin */}
          <div className="flex-1 text-center p-8">
            <h1 className="text-3xl font-semibold text-blue-400 mb-4">
              {t("beta.title")}
            </h1>
            <p className="text-lg">
              {t("beta.bodyLine1")} <br />
              {t("beta.bodyLine2")} <br />
              {t("beta.bodyLine3")}
            </p>
          </div>
        </div>
      ) : (
        <RegisterForm />
      )}
    </main>
  );
}
