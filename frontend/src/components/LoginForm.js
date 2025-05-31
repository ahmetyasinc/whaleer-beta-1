"use client";

import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm() {
  const router = useRouter();
  const { setIsAuthenticated } = useAuth();
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    rememberMe: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prevState) => ({
      ...prevState,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/login/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
          credentials: "include",
        }
      );

        if (response.ok) {
          // Toast ortada gösterilir
          toast.success("Giriş başarılı, profil sayfasına yönlendiriliyorsunuz!", {
            position: "top-center", // Burada ortalanır (üstte)
            autoClose: 1250,        // 1 saniye gösterilir
          });
        
          // Toast gösterildikten 1.2 saniye sonra yönlendirme yapılır
          setTimeout(() => {
            router.push("/profile");
          }, 1200);
        
          setTimeout(() => {
            setIsAuthenticated(true);
          }, 1200);
        }
       else {
        const errorData = await response.json();
        toast.error(`Giriş başarısız: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Giriş isteği başarısız:", error);
      toast.error("Bir hata oluştu, lütfen tekrar deneyin.");
    }
  };

  return (
    <div>
      <button
        onClick={() => router.push("/")}
        className="fixed top-3 left-2 bg-[#363636] text-center w-40 rounded-[8px] h-10 text-white text-xl font-semibold group"
        type="button"
      >
        <div className="bg-[rgb(38,135,192)] rounded-[5px] h-8 w-1/4 flex items-center justify-center absolute left-1 top-[4px] group-hover:w-[151px] z-10 duration-500">
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

      <div className="bg-white/0 backdrop-blur-lg border-[1px] border-gray-400 rounded-lg shadow-xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-center text-3xl font-extrabold text-white">
            Giriş Yap
          </h2>
          <p className="mt-4 text-center text-gray-400">
            Devam etmek için giriş yapın
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div className="rounded-md shadow-sm">
              <div>
                <label className="sr-only" htmlFor="username">
                  Kullanıcı Adı
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Kullanıcı Adı"
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
              <div className="mt-4">
                <label className="sr-only" htmlFor="password">
                  Şifre
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  placeholder="Şifre"
                  className="appearance-none relative block w-full px-3 py-3 border border-gray-700 bg-gray-600 text-white rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  required
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="rememberMe"
                  name="rememberMe"
                  className="h-4 w-4 text-indigo-500 focus:ring-indigo-400 border-gray-600 rounded"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <label
                  className="ml-2 text-sm text-gray-400"
                  htmlFor="rememberMe"
                >
                  Beni Hatırla
                </label>
              </div>

              <div className="text-sm">
                <Link
                  href="/reset-password"
                  className="font-medium text-indigo-500 hover:text-indigo-400"
                >
                  Şifremi Unuttum
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="group relative w-full flex justify-center py-3 px-4 border-transparent text-sm font-medium rounded-md text-gray-900 bg-[hsl(221,60%,52%)] hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Giriş Yap
              </button>
            </div>
          </form>
        </div>
        <div className="px-8 py-4 bg-white/10 backdrop-blur-lg text-center">
          <span className="text-gray-400">Henüz bir hesabın yok mu?</span>
          <Link
            href="/register"
            className="font-medium text-indigo-500 hover:text-indigo-400"
          >
            Kayıt Ol
          </Link>
        </div>
      </div>
    </div>
  );
}