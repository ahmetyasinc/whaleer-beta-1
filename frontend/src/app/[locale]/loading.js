"use client";
import { useEffect } from "react";
import "@/styles/globals.css";
import { GiCirclingFish } from "react-icons/gi"; // Spinner ikonu

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
          <div className="flex-col gap-4 w-full flex items-center justify-center">
            <div className="w-24 h-24 border-4 text-blue-400 text-4xl animate-spin border-gray-500 flex items-center justify-center border-t-cyan-400 rounded-full">
              <svg fill="currentColor" height="1em" width="1em" className="animate-ping">
            <GiCirclingFish/>
                 </svg>
            </div>
          </div>
          {/* Yazılar */}
          <h2 className="text-zinc-200 dark:text-zinc-100 mt-6 ml-3 z-50 text-xl">Yükleniyor...</h2>
          <p className="text-zinc-400 dark:text-zinc-400 z-50 text-sm mt-4">
            Bu işlem birkaç saniye sürebilir.
          </p>
        </div>
      </div>
    );
}