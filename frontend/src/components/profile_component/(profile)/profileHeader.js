"use client";

import { FaCog, FaUpload } from "react-icons/fa";

export default function ProfileHeader() {
  return (
    <div className="relative w-full h-[200px] flex flex-col">
      {/* Upper section - 50px black header */}
      <div className="w-full h-[60px] bg-black flex items-center justify-end px-4">
        {/* Ayarlar Butonu */}
        <button
          className="p-2 rounded-full text-zinc-300 hover:text-zinc-100 transition"
          aria-label="Ayarlar"
        >
          <FaCog className="w-5 h-5" />
        </button>
      </div>

      {/* Lower section - remaining 150px */}
      <div className="flex-1 bg-[rgb(2,2,9,0.85)] p-6 relative">
        {/* Profil Bilgisi */}
        <div className="flex items-start space-x-4">
          <img
            src="/img/user.jpg"
            alt="Profil Fotoğrafı"
            className="w-16 h-16 rounded-full object-cover"
          />
          <div>
            <h2 className="text-xl font-semibold text-white">Bilal Bostan</h2>
            <p className="text-sm text-zinc-400">@bilal848</p>
          </div>
        </div>

        {/* Gösterge Yayınla Butonu 
        <div className="absolute bottom-4 right-4">
          <button className="flex items-center bg-[rgb(15,26,77)] hover:bg-blue-900 text-white px-4 py-2 rounded-md text-sm font-medium shadow transition">
            <FaUpload className="w-4 h-4 mr-2" />
            Gösterge Yayınla
          </button>
        </div> */}
      </div>
    </div>
  );
}