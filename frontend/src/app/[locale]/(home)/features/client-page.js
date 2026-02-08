"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUser, FaChartLine, FaPython, FaHistory, FaRobot, FaTools, FaStore,
  FaKey, FaHeadset, FaLayerGroup, FaCloud, FaCompass, FaEthereum, FaTelegramPlane,
  FaFileAlt, FaUsers, FaSlidersH, FaSearch, FaBrain, FaHandHoldingUsd
} from "react-icons/fa";

export default function FeaturesPage() {
  const { t } = useTranslation("features");
  const [activeId, setActiveId] = useState(null);

  // 20 Özelliklik Veri Seti (Örnek içeriklerle)
  // 20 Özelliklik Veri Seti
  const features = [
    { id: 1, title: t("items.1.title"), icon: <FaUser />, desc: t("items.1.desc") },
    { id: 2, title: t("items.2.title"), icon: <FaChartLine />, desc: t("items.2.desc") },
    { id: 3, title: t("items.3.title"), icon: <FaPython />, desc: t("items.3.desc") },
    { id: 4, title: t("items.4.title"), icon: <FaHistory />, desc: t("items.4.desc") },
    { id: 5, title: t("items.5.title"), icon: <FaRobot />, desc: t("items.5.desc") },
    { id: 6, title: t("items.6.title"), icon: <FaTools />, desc: t("items.6.desc") },
    { id: 7, title: t("items.7.title"), icon: <FaStore />, desc: t("items.7.desc") },
    { id: 8, title: t("items.8.title"), icon: <FaKey />, desc: t("items.8.desc") },
    { id: 9, title: t("items.9.title"), icon: <FaHeadset />, desc: t("items.9.desc") },
    { id: 10, title: t("items.10.title"), icon: <FaLayerGroup />, desc: t("items.10.desc") },
    { id: 11, title: t("items.11.title"), icon: <FaCloud />, desc: t("items.11.desc") },
    { id: 12, title: t("items.12.title"), icon: <FaCompass />, desc: t("items.12.desc") },
    { id: 13, title: t("items.13.title"), icon: <FaEthereum />, desc: t("items.13.desc") },
    { id: 14, title: t("items.14.title"), icon: <FaFileAlt />, desc: t("items.14.desc") },
    { id: 15, title: t("items.15.title"), icon: <FaUsers />, desc: t("items.15.desc") },
    { id: 16, title: t("items.16.title"), icon: <FaSlidersH />, desc: t("items.16.desc") },
    { id: 17, title: t("items.17.title"), icon: <FaSearch />, desc: t("items.17.desc") },
    { id: 18, title: t("items.18.title"), icon: <FaBrain />, desc: t("items.18.desc") },
    { id: 19, title: t("items.19.title"), icon: <FaHandHoldingUsd />, desc: t("items.19.desc") },
    { id: 20, title: t("items.20.title"), icon: <FaTelegramPlane />, desc: t("items.20.desc") }
  ];

  return (
    <section className="min-h-screen pt-36 home-hard-gradient text-white py-20 px-4">
      <div className="max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl py-5 font-bold mb-6 bg-gradient-to-b from-white to-stone-500 bg-clip-text text-transparent">
            {t("title")}
          </h2>
          <p className="text-neutral-400 pt-2 text-lg max-w-2xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
          {features.map((f, index) => (
            <motion.button
              key={f.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => setActiveId(activeId === f.id ? null : f.id)}
              className={`group relative p-6 md:p-8 rounded-3xl border hover:scale-[1.02] hover:-translate-y-2 transition-all duration-200 flex flex-col items-center justify-center gap-4 overflow-hidden 
              ${activeId === f.id
                  ? "bg-gradient-to-br from-blue-600/30 to-purple-600/30 border-blue-400/50 shadow-[0_0_40px_rgba(59,130,246,0.4)] scale-105"
                  : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                }`}
            >
              {/* Glow Effect */}
              <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${activeId === f.id ? 'opacity-100' : ''}`} />

              {/* Icon */}
              <div className={`relative text-4xl md:text-5xl transition-all duration-500 ${activeId === f.id ? 'text-blue-300 scale-110' : 'text-blue-400 group-hover:scale-110 group-hover:text-blue-300'
                }`}>
                {f.icon}
              </div>

              {/* Title */}
              <span className="relative text-xs md:text-sm font-semibold tracking-wider uppercase text-center transition-colors duration-300">
                {f.title}
              </span>

              {/* Corner Accent */}
              <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-500/20 to-transparent rounded-bl-full transition-opacity duration-500 ${activeId === f.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'
                }`} />
            </motion.button>
          ))}
        </div>

        {/* Detail Card */}
        <div className="mt-12 min-h-[200px]">
          <AnimatePresence mode="wait">
            {activeId && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="relative w-full overflow-hidden"
              >
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-900/60 via-purple-900/60 to-pink-900/60 rounded-3xl" />

                {/* Animated Border */}
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-blue-900 via-purple-700 to-pink-900 opacity-50 blur-sm" />

                {/* Content Container */}
                <div className="relative bg-black/40 border border-white/20 rounded-3xl backdrop-blur-xl p-8 md:p-10">
                  <div className="flex flex-col md:flex-row items-start gap-6 md:gap-8">
                    {/* Icon */}
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="flex-shrink-0 text-6xl md:text-7xl bg-white/10 p-6 rounded-3xl border border-white/10 shadow-2xl flex items-center justify-center text-blue-400"
                    >
                      {features.find(f => f.id === activeId)?.icon}
                    </motion.div>

                    {/* Text Content */}
                    <div className="flex-1">
                      <motion.h3
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-3xl md:text-4xl font-bold mb-8 bg-gradient-to-r from-white to-neutral-300 bg-clip-text text-transparent"
                      >
                        {features.find(f => f.id === activeId)?.title}
                      </motion.h3>
                      <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-lg md:text-xl text-neutral-300 leading-relaxed"
                      >
                        {features.find(f => f.id === activeId)?.desc}
                      </motion.p>
                    </div>
                  </div>

                  {/* Decorative Elements */}
                  <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}