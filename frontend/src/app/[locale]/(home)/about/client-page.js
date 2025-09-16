"use client";

import { useTranslation } from "react-i18next";

export default function AboutPage() {
  const { t } = useTranslation("homeAbout");

  return (
    <section
      id="hero"
      className="hero section pt-16 pb-16 bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100"
    >
      <div
        className="container mx-auto px-4 pt-16 md:pt-16 lg:pt-16"
        data-aos="fade-up"
        data-aos-delay="100"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center">
          {/* Left Text Content */}
          <div
            className="w-full lg:w-1/2 mb-8 lg:mb-0"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 shadow-xl backdrop-blur">
              <h1 className="text-3xl font-bold mb-6 text-white">
                {t("title")}
              </h1>

              <p className="mb-4 text-justify text-neutral-300 leading-relaxed">
                <strong className="text-white">Whaleer</strong> {t("p1")}
              </p>

              <p className="mb-4 text-justify text-neutral-300 leading-relaxed">
                {t("p2")}
              </p>

              <p className="mb-4 text-justify text-neutral-300 leading-relaxed">
                {t("p3")}
              </p>

              <p className="mb-4 text-justify text-neutral-300 leading-relaxed">
                {t("p4")}
              </p>

              <p className="mb-0 text-justify text-neutral-300 leading-relaxed">
                {t("p5")}
              </p>
            </div>
          </div>

          {/* Right Side Image */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="w-full h-[300px] rounded-xl shadow-md flex items-center justify-center">
              <img
                src="/img/logo5.png"
                alt={t("imageAlt")}
                className="img-fluid rotating-img"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
