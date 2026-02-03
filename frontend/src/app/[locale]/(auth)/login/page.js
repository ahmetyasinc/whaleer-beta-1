"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import LoginForm from "@/components/LoginForm";

export default function LoginPage(props) {
  const params = use(props.params);
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
    </main>
  );
}
