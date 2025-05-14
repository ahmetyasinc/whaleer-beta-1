"use client"; // ✅ Sayfayı Client Component yaptık

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import RegisterForm from "@/components/RegisterForm"; // ✅ RegisterForm'u çağırıyoruz

export default function RegisterPage() {
    const router = useRouter();

    useEffect(() => {
        const accessToken = sessionStorage.getItem("access_token");
        if (accessToken) {
            router.push("/profile"); // Eğer token varsa ana sayfaya yönlendir
        }
    }, []);
    
    return (
        <main className="flex justify-center items-center min-h-screen">
            <RegisterForm /> {/* ✅ Register form Client Component olarak çağrılıyor */}
        </main>
    );
}
