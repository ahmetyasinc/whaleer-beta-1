"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import { FiPlayCircle, FiUsers, FiUserCheck, FiTrendingUp, FiBook } from "react-icons/fi";
import { IoSettingsOutline } from "react-icons/io5";
import { PiCursorClickFill } from "react-icons/pi";
import TypewriterText from "./typeWriter";
import { motion } from "framer-motion";

export default function Hero({ userCount, traderCount, strategyCount, botCount }) {
  const { t, i18n } = useTranslation("hero", { useSuspense: false });

  // Aktif dil (LanguageProvider zaten eşitlemiş durumda)
  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const withLocale = (path) => (path === "/" ? `/${locale}` : `/${locale}${path}`);

  return (
    <section
      id="hero"
      className="
        home-hard-gradient
        py-20 md:px-28 lg:py-36
        relative overflow-hidden
        after:content-[''] after:absolute after:inset-0
        after:bg-gradient-to-b after:from-transparent after:to-[rgb(0,0,4)]
        after:opacity-100 after:pointer-events-none
        after:z-10
      "
    >
      <div className="container relative z-20 mx-auto px-4" data-aos="fade-up" data-aos-delay="100">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left content */}
          <div className="w-full lg:w-1/2">
            <div className="hero-content" data-aos="fade-up" data-aos-delay="200">
              <div className="text-left">
                <div className="company-badge mb-6 inline-flex items-center px-4 py-2 cursor-text backdrop-blur-sm rounded-full bg-[rgb(255,255,255,0.05)] text-stone-300">
                  <IoSettingsOutline className="mr-3 mb-[2px] text-[20px]" />
                  <TypewriterText text={t("badge")} speed={90} restartEvery={40000} />
                </div>

                <h1 className="mb-6 text-left font-sans text-4xl lg:text-5xl xl:text-6xl font-bold text-white">
                  <span className="mb-4">{t("heading1")}</span> <br />
                  <span className="mb-4">{t("heading2")}</span> <br />
                  <motion.span
                    className="bg-clip-text text-transparent [will-change:background-image] mt-2"
                    style={{
                      ["--angle"]: "0deg",
                      backgroundImage: "linear-gradient(var(--angle), #06b6d4, #60a5fa, #d946ef)",
                      backgroundSize: "100% 100%",
                    }}
                    animate={{ ["--angle"]: ["0deg", "180deg", "360deg"] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  >
                    {t("heading3")}
                  </motion.span>
                </h1>

                <div className="text-left max-w-2xl">
                  <p className="mb-6 md:mb-8 text-lg text-white/80 leading-relaxed">
                    {t("description")}
                  </p>
                </div>
              </div>

              <div className="hero-buttons text-left flex flex-col sm:flex-row gap-4">
                <Link
                  href={withLocale("/login")}
                  className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-cyan-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-md shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 transform glightbox group"
                >
                  <PiCursorClickFill className="rotate-90 mr-4 text-[23px] group-hover:scale-125 transition-transform duration-200" />
                  {t("ctaStart")}
                </Link>

                <a
                  href="https://youtu.be/5F2xA1n4i08"
                  className="inline-flex items-center justify-center px-8 py-4 bg-fuchsia-700/5 backdrop-blur-sm hover:bg-fuchsia-600/10 text-white border border-white/10 hover:border-white/20 font-semibold rounded-xl shadow-md  hover:shadow-fuchsia-900/10 transition-all duration-300 glightbox group"
                >
                  <FiPlayCircle className="mr-4 text-[20px] group-hover:scale-150 transition-transform duration-200" />
                  {t("ctaVideo")}
                </a>
              </div>
            </div>
          </div>

          {/* Right image */}
          <div className="w-full lg:w-1/2 hidden md:block">
            <div className="hero-image rotating-container" data-aos="zoom-out" data-aos-delay="300">
              <img
                src="/img/logo5.png"
                alt="Hero Image"
                className="w-full max-w-xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mx-auto rotating-img mb-10"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16 lg:mt-20"
          data-aos="fade-up"
          data-aos-delay="500"
        >
          {/* Users */}
          <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center border border-blue-400/20 group-hover:from-blue-500/30 group-hover:to-cyan-500/30 transition-all duration-300">
                <FiUsers className="text-blue-400 text-2xl" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2 uppercase tracking-wide">{t("statUser")}</h4>
                <p className="text-3xl font-bold text-white mb-0">{userCount}</p>
              </div>
            </div>
          </div>

          {/* Traders */}
          <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-xl flex items-center justify-center border border-emerald-400/20 group-hover:from-emerald-500/30 group-hover:to-green-500/30 transition-all duration-300">
                <FiUserCheck className="text-emerald-400 text-2xl" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2 uppercase tracking-wide">{t("statTrader")}</h4>
                <p className="text-3xl font-bold text-white mb-0">{traderCount}</p>
              </div>
            </div>
          </div>

          {/* Strategies */}
          <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500/20 to-violet-500/20 rounded-xl flex items-center justify-center border border-purple-400/20 group-hover:from-purple-500/30 group-hover:to-violet-500/30 transition-all duration-300">
                <FiTrendingUp className="text-purple-400 text-2xl" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2 uppercase tracking-wide">{t("statStrategy")}</h4>
                <p className="text-3xl font-bold text-white mb-0">{strategyCount}</p>
              </div>
            </div>
          </div>

          {/* Bots */}
          <div className="group bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl flex items-center justify-center border border-orange-400/20 group-hover:from-orange-500/30 group-hover:to-amber-500/30 transition-all duration-300">
                <FiBook className="text-orange-400 text-2xl" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-white/70 mb-2 uppercase tracking-wide">{t("statBot")}</h4>
                <p className="text-3xl font-bold text-white mb-0">{botCount}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
