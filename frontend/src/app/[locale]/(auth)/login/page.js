"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from '@/context/AuthContext';
import LoginForm from "@/components/LoginForm";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function LoginPage() {
    const { isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (isAuthenticated) {
            router.push('/profile');
        }
    }, [isAuthenticated]);

    return (
        <main className="flex justify-center items-center min-h-screen relative">
            <LoginForm />
            {/* Eğer _app.js içine eklediysen bunu kaldırabilirsin */}
            <ToastContainer position="top-right" autoClose={3000} />
        </main>
    );
}
