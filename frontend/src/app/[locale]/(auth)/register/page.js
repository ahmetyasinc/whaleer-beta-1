"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import RegisterForm from "@/components/RegisterForm";

export default function RegisterPage() {
  const isBeta = true; // ✅ Sadece burada kontrol edilecek
  const router = useRouter();

  useEffect(() => {
    const accessToken = sessionStorage.getItem("access_token");
    if (accessToken) {
      router.push("/profile");
    }
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
            Beta Access Only
          </h1>
          <p className="text-lg">
            Thank you for your interest in Whaleer! <br />
            Currently, registration is closed during our beta testing phase.{" "}
            <br />
            Please check back soon or contact us for early access.
          </p>
        </div>
      </div>
    ) : (
      <RegisterForm />
    )}
  </main>
);

}
