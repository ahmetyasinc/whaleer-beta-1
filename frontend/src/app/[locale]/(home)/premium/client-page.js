"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation("premium");

  const plans = [
    {
      code: "clam",
      title: t("plans.clam.title"),
      price: t("plans.clam.price"),
      status: "available",
      features: t("plans.clam.features", { returnObjects: true }),
      accent: "from-sky-400 to-blue-600"
    },
    {
      code: "octopus",
      title: t("plans.octopus.title"),
      price: t("plans.octopus.price"),
      status: "soon",
      features: t("plans.octopus.features", { returnObjects: true }),
      accent: "from-indigo-400 to-purple-600"
    },
    {
      code: "whale",
      title: t("plans.whale.title"),
      price: t("plans.whale.price"),
      status: "soon",
      features: t("plans.whale.features", { returnObjects: true }),
      accent: "from-emerald-400 to-teal-600"
    },
  ];

  return (
    <section id="hero" className="relative home-hard-gradient text-zinc-100 overflow-hidden min-h-screen pt-32 pb-24 flex items-center">
      {/* Arkaplan Efektleri */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-sky-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        {/* Beta Badge - Ortalı */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-medium text-zinc-400">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            {t("labels.beta")} — {t("betaBanner")}
          </div>
        </div>

        {/* Başlık Grubu - Ortalı */}
        <div className="max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-600">
            {t("hero.title")}
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed mx-auto">
            {t("hero.desc")}
            <span className="block mt-2 text-indigo-400/90 font-medium italic">
              {t("hero.notice")}
            </span>
          </p>
        </div>

        {/* Plan Kartları */}
        <div className="grid gap-8 md:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan, index) => {
            const isSoon = plan.status === "soon";
            return (
              <div
                key={plan.code ?? index}
                className="group relative flex flex-col rounded-3xl bg-gradient-to-br from-zinc-900/60 to-zinc-900/20 border border-zinc-800/50 p-8 transition-all duration-300 hover:border-zinc-700 hover:shadow-xl hover:shadow-zinc-900/50 hover:-translate-y-2 backdrop-blur-sm"
              >
                {/* Hafif arka plan efekti */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-zinc-700/5 to-transparent rounded-full blur-2xl" />

                <div className="flex flex-col items-center mb-6">
                  <span className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-full border mb-4 ${isSoon
                    ? "border-amber-500/20 text-amber-400 bg-amber-500/5"
                    : "border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                    }`}>
                    {isSoon ? t("labels.comingSoon") : t("labels.available")}
                  </span>

                  <div className="flex items-center gap-3 mb-2">
                    {/* Plan İkonu */}
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${plan.accent} p-2 opacity-90`}>
                      {index === 0 && (
                        <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      )}
                      {index === 1 && (
                        <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      )}
                      {index === 2 && (
                        <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                      )}
                    </div>

                    <h2 className="text-2xl font-bold text-zinc-100 tracking-tight">{plan.title}</h2>
                  </div>

                  <div className={`h-1 w-16 rounded-full mt-3 bg-gradient-to-r ${plan.accent}`} />
                </div>

                <div className="mb-8 text-center">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-black text-zinc-100 tracking-tight">
                      {plan.price}
                    </span>
                  </div>
                  {!isSoon && (
                    <span className="text-zinc-500 block text-xs mt-2 uppercase tracking-wider font-medium">
                      Aylık Ödeme
                    </span>
                  )}
                </div>

                <ul className="space-y-4 mb-10 text-left w-full mx-auto max-w-[220px]">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isSoon
                        ? "bg-zinc-800 border border-zinc-700"
                        : "bg-gradient-to-br from-emerald-500 to-emerald-600"
                        }`}>
                        <svg className={`w-3 h-3 ${isSoon ? "text-zinc-600" : "text-white"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto">
                  {isSoon ? (
                    <button
                      disabled
                      className="w-full py-4 px-4 rounded-xl bg-zinc-800/50 text-zinc-500 font-semibold border border-zinc-700/50 cursor-not-allowed italic text-sm"
                    >
                      {t("labels.comingSoon")}
                    </button>
                  ) : (
                    <Link
                      href="/signup"
                      className={`block w-full rounded-xl bg-gradient-to-r ${plan.accent} py-4 px-4 text-sm font-bold text-white transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] text-center`}
                    >
                      {t("cta.getStarted")}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}