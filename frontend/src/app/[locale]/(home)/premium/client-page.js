"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";

export default function HomePage() {
  const { t } = useTranslation("premium");

  // Statü kodunu (available/soon) koruyoruz; görünen etiketleri i18n'den alıyoruz
  const plans = [
    {
      code: "clam",
      title: t("plans.clam.title"),
      price: t("plans.clam.price"),
      status: "available",
      features: t("plans.clam.features", { returnObjects: true }),
    },
    {
      code: "octopus",
      title: t("plans.octopus.title"),
      price: t("plans.octopus.price"),
      status: "soon",
      features: t("plans.octopus.features", { returnObjects: true }),
    },
    {
      code: "whale",
      title: t("plans.whale.title"),
      price: t("plans.whale.price"),
      status: "soon",
      features: t("plans.whale.features", { returnObjects: true }),
    },
  ];

  return (
    <section
      id="hero"
      className="
        relative text-white
        pt-36 md:pt-64 lg:pt-36 pb-32
        min-h-screen
        bg-[#070B12]
      "
    >
      {/* Whaleer vurgusu için overlay */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute inset-0
          [background-image:radial-gradient(80rem_40rem_at_12%_8%,rgba(56,189,248,0.14),transparent_60%),
          linear-gradient(180deg,rgba(9,12,20,1)_0%,rgba(6,10,18,1)_100%)]
        "
      />

      <div className="container mx-auto px-4 relative">
        {/* Beta Şeridi */}
        <div className="mb-6 rounded-xl border border-sky-700/40 bg-sky-900/20 px-4 py-2 text-sm text-sky-200">
          <span className="mr-2 inline-flex items-center rounded-md bg-sky-500/20 px-2 py-0.5 text-xs font-semibold text-sky-300 ring-1 ring-inset ring-sky-400/40">
            {t("labels.beta")}
          </span>
          {t("betaBanner")}
        </div>

        <h1 className="text-5xl font-extrabold mb-4 leading-tight">{t("hero.title")}</h1>

        <p className="text-lg text-slate-300 mb-12 max-w-2xl">
          {t("hero.desc")}
          <br />
          <span className="text-indigo-300 font-semibold">
            {t("hero.notice")}
          </span>
        </p>

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => {
            const isSoon = plan.status === "soon";
            return (
              <div
                key={plan.code ?? index}
                className="
                  group flex flex-col items-start rounded-2xl
                  bg-[#0B1220]/80 border border-[#1C2740] p-6
                  shadow-[0_10px_30px_-15px_rgba(0,0,0,0.6)]
                  hover:border-sky-700/60 hover:shadow-[0_12px_40px_-18px_rgba(25,113,194,0.35)]
                  transition
                "
              >
                <div className="flex w-full items-center justify-between mb-2">
                  <h2 className="text-2xl font-semibold">{plan.title}</h2>
                  <span
                    className={`text-xs rounded-full px-2 py-0.5 ring-1 ${
                      isSoon
                        ? "bg-yellow-500/10 text-yellow-300 ring-yellow-500/30"
                        : "bg-emerald-500/10 text-emerald-300 ring-emerald-500/30"
                    }`}
                  >
                    {isSoon ? t("labels.comingSoon") : t("labels.available")}
                  </span>
                </div>

                <p
                  className={`text-2xl font-bold mb-4 ${
                    isSoon
                      ? "text-slate-400"
                      : "text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-indigo-400"
                  }`}
                >
                  {plan.price}
                </p>

                <ul className="text-slate-300 mb-6 space-y-2 text-sm w-full">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <span className={isSoon ? "text-slate-500" : "text-emerald-400"}>✓</span>
                      <span className={isSoon ? "text-slate-400" : ""}>{feature}</span>
                    </li>
                  ))}
                </ul>

                {isSoon ? (
                  <button
                    disabled
                    aria-disabled="true"
                    className="mt-auto w-full rounded-xl bg-slate-800 text-slate-400 cursor-not-allowed py-2 ring-1 ring-inset ring-slate-700"
                    title={t("labels.comingSoon")}
                  >
                    {t("labels.comingSoon")}
                  </button>
                ) : (
                  <Link
                    href="/signup"
                    prefetch
                    className="
                      mt-auto w-full rounded-xl py-2 text-center font-semibold
                      bg-gradient-to-r from-sky-500 to-indigo-500
                      hover:from-sky-400 hover:to-indigo-400
                      focus:outline-none focus:ring-2 focus:ring-sky-400/60
                      transition
                    "
                  >
                    {t("cta.getStarted")}
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
