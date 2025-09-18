"use client";

import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation("features");

  const features = [
    {
      title: t("steps.1.title"),
      description: t("steps.1.desc"),
      icon: "📈",
    },
    {
      title: t("steps.2.title"),
      description: t("steps.2.desc"),
      icon: "🧪",
    },
    {
      title: t("steps.3.title"),
      description: t("steps.3.desc"),
      icon: "🤖",
    },
    {
      title: t("steps.4.title"),
      description: t("steps.4.desc"),
      icon: "📂",
    },
  ];

  return (
    <section
      id="hero"
      className="hero section bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100"
    >
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12" data-aos="fade-up" data-aos-delay="100">
          <h1 className="text-4xl font-bold text-white mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-neutral-300">
            {t("subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {features.map((item, index) => (
            <div
              key={index}
              className="group bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur
                         transition-all duration-300 hover:bg-white/10 hover:shadow-2xl"
              data-aos="fade-up"
              data-aos-delay={200 + index * 100}
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-neutral-300">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <a
            href="/login"
            className="inline-block rounded-xl bg-sky-600 text-white px-6 py-3 text-lg font-medium
                       hover:bg-sky-500 focus:outline-none focus-visible:ring focus-visible:ring-sky-400
                       transition-colors duration-300"
          >
            {t("cta")}
          </a>
        </div>
      </div>
    </section>
  );
}
