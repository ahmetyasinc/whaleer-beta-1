'use client';

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import LeftMenu from "@/components/profile_component/leftmenu";

export default function ClientLayoutWrapper({ children, locale }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${locale}/login`);
    }
  }, [isAuthenticated, isLoading, router, locale]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-zinc-950 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Auth yoksa (ve yönlendirme başlamadıysa) içeriği gösterme
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen w-screen hard-gradient">
      <LeftMenu locale={locale} />
      <main>{children}</main>
    </div>
  );
}
