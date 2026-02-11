import React from 'react';
import {
  FiUser,
  FiShare2,
  FiGlobe,
  FiLayout,

} from "react-icons/fi";
import { FaShieldAlt, FaTelegramPlane } from "react-icons/fa";

export default function LeftMenuSettings({ t, activeTab, setActiveTab }) {

  const menuItems = [
    { id: 'basics', label: t('leftmenu.profile_basics'), icon: FiUser },
    { id: 'social', label: t('leftmenu.social_links') || 'Sosyal Medya', icon: FiShare2 },
    { id: 'security', label: t('leftmenu.security'), icon: FaShieldAlt },
    { id: 'language', label: t('leftmenu.language'), icon: FiGlobe },
    { id: 'theme', label: t('leftmenu.theme'), icon: FiLayout },

    { id: 'telegram', label: t('leftmenu.telegram'), icon: FaTelegramPlane },
  ];

  return (
    <aside className="w-64 shrink-0 hidden md:block overflow-y-auto
      relative border-r border-zinc-800/80 bg-gradient-to-b from-zinc-950/95 via-zinc-900/90 to-zinc-950/95">

      {/* Üst mavi çizgi glow */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-blue-500/0 via-blue-500/60 to-blue-500/0" />

      {/* Hafif blur mavi arkaplan patern */}
      <div className="pointer-events-none absolute -left-16 top-20 h-40 w-40 bg-blue-500/10 rounded-full blur-3xl" />

      <nav className="p-4 space-y-1 relative z-10">
        {menuItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl 
                transition-all duration-200 border backdrop-blur-sm
                ${isActive
                  ? "bg-zinc-900/80 border-blue-500/40 text-white shadow-md shadow-blue-500/20 ring-1 ring-blue-500/30"
                  : "text-zinc-400 border-transparent hover:bg-zinc-900/40 hover:text-zinc-200 hover:border-zinc-700/40"
                }`}
            >
              <Icon
                className={`text-lg transition-colors
                  ${isActive ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-300"}`}
              />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
