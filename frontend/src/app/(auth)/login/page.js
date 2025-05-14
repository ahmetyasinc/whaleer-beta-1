"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/context/AuthContext';
import LoginForm from "@/components/LoginForm";

export default function LoginPage() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated) {
            console.log("Giriş yapmışsınız, yönlendiriliyor...");
            router.push('/profile');
        }
    }, [isAuthenticated]);

    return (
        <main className="flex justify-center items-center min-h-screen">
            <LoginForm />
        </main>
    );
}
