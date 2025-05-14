"use client"; // ✅ Sayfayı Client Component yaptık

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import LoginForm from "@/components/LoginForm"; // ✅ Client bileşeni çağırıyoruz

export default function LoginPage() {
    const router = useRouter();

    useEffect(() => {
        const accessToken = sessionStorage.getItem("access_token");
        if (accessToken) {
            router.push("/profile"); // Eğer token varsa ana sayfaya yönlendir
        }
    }, []);

    return (
        <main className="flex justify-center items-center min-h-screen">
            <LoginForm /> {/* ✅ Login işlemleri Client Component'e taşındı */}
        </main>
    );
}