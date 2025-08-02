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
        <div className="max-w-xl text-center bg-gray-800 border border-blue-500 rounded-2xl p-8 shadow-lg">
          <h1 className="text-3xl font-semibold text-blue-400 mb-4">Beta Access Only</h1>
          <p className="text-lg">
            Thank you for your interest in Whaleer! 🚀 <br />
            Currently, registration is closed during our beta testing phase. <br />
            Please check back soon or contact us for early access.
          </p>
        </div>
      ) : (
        <RegisterForm />
      )}
    </main>
  );
}
