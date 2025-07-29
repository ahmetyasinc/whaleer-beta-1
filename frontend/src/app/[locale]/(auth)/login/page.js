"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoginForm from "@/components/LoginForm";
import { ToastContainer } from "react-toastify";

export default function LoginPage({ params }) {
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const locale = params?.locale || "en";

  useEffect(() => {
    if (isAuthenticated) {
      router.push("/profile");
    }
  }, [isAuthenticated]);

  return (
    <main className="flex justify-center items-center min-h-screen relative">
      <LoginForm locale={locale} />
      <ToastContainer position="top-right" autoClose={3000} />
    </main>
  );
}
