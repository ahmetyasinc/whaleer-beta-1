"use client";

import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

export default function RegisterForm() {
    const router = useRouter();
    const { setIsAuthenticated } = useAuth();
    const [formData, setFormData] = useState({
        first_name: "",
        last_name: "",
        username: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prevState) => ({
            ...prevState,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            console.error("Şifreler eşleşmiyor!");
            return;
        }
        try {
            const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/register/`, formData, {
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (response.status === 200) {
                router.push("/login");
            }
        } catch (error) {
            console.error(error.response?.data?.message || "Kayıt başarısız!");
        }
    };

    return (
        <div className="py-12">
        <button
          onClick={() => router.push("/")}
          className="absolute top-3 left-2 bg-[#363636] text-center w-40 rounded-[8px] h-10 text-white text-xl font-semibold group"
          type="button"
        >
          <div
            className="bg-[rgb(38,135,192)] rounded-[5px] h-8 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[151px] z-10 duration-500"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 1024 1024"
              height="25px"
              width="25px"
            >
              <path
                d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"
                fill="#000000"
              ></path>
              <path
                d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"
                fill="#000000"
              ></path>
            </svg>
          </div>
          <p className="translate-x-6 translate-y-1">Anasayfa</p>
        </button>

            <div className="bg-white/0 backdrop-blur-lg border border-gray-400 rounded-lg shadow-lg overflow-hidden w-full max-w-md">
                <div className="p-8">
                    <h2 className="text-center text-3xl font-extrabold text-white">Kayıt Ol</h2>
                    <p className="mt-4 text-center text-gray-400">whaleer'a kayıt olun</p>

                    <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <input
                                    type="text"
                                    name="first_name"
                                    placeholder="İsim"
                                    className="appearance-none block w-full px-3 py-3 border border-gray-700 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    required
                                    value={formData.first_name}
                                    onChange={handleChange}
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    name="last_name"
                                    placeholder="Soyisim"
                                    className="appearance-none block w-full px-3 py-3 border border-gray-700 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    required
                                    value={formData.last_name}
                                    onChange={handleChange}
                                />
                            </div>
                        </div>
                        <input
                            type="text"
                            name="username"
                            placeholder="Kullanıcı Adı"
                            className="appearance-none block w-full px-3 py-3 border border-gray-700 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                            value={formData.username}
                            onChange={handleChange}
                        />
                        <input
                            type="email"
                            name="email"
                            placeholder="E-Posta"
                            className="appearance-none block w-full px-3 py-3 border border-gray-700 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                            value={formData.email}
                            onChange={handleChange}
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Şifre"
                            className="appearance-none block w-full px-3 py-3 border border-gray-700 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                            value={formData.password}
                            onChange={handleChange}
                        />
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Şifreyi Onayla"
                            className="appearance-none block w-full px-3 py-3 border border-gray-700 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                            required
                            value={formData.confirmPassword}
                            onChange={handleChange}
                        />
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border-transparent text-sm font-medium rounded-md text-gray-900 bg-[hsl(221,60%,52%)] hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            Kayıt Ol
                        </button>
                    </form>
                </div>
                <div className="px-8 py-4 bg-white/10 backdrop-blur-lg text-center">
                    <span className="text-gray-400">Zaten bir hesabın var mı?</span>
                    <Link href="/login" className="font-medium text-indigo-500 hover:text-indigo-400">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        </div>
    );
}
