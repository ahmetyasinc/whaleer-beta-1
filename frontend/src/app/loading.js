"use client";
import { useEffect } from "react";
import "../styles/globals.css";

export default function Loading() { 
    useEffect(() => {
        const originalTitle = document.title; // Mevcut title'ı sakla
        document.title = "Yükleniyor..."; // Geçici title'ı ayarla

        return () => {
            document.title = originalTitle; // Sayfa yüklenince eski title'a geri dön
        };
    }, []);

    return (
<div className="flex justify-center items-center h-screen relative hard-gradient before:absolute before:inset-0 before:backdrop-blur-xl">
  <div className="text-center flex flex-col items-center">
    {/* Spinner */}
    <div className="w-24 h-24 border-5 border-transparent text-[#395cbd] text-2xl animate-spin flex items-center justify-center border-t-[#395cbd] rounded-full z-50">
      <div className="w-20 h-20 border-5 border-transparent text-[#395cbd] text-4xl animate-spin flex items-center justify-center border-t-[#395cbd] rounded-full z-50"></div>
    </div>
    
    {/* Yazılar */}
    <h2 className="text-white dark:text-white mt-4 text-lg z-50">Yükleniyor...</h2>
    <p className="text-zinc-400 dark:text-zinc-400 z-50">
      Bu işlem birkaç saniye sürebilir.
    </p>
  </div>
</div>

    );
}




