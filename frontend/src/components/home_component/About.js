"use client";

import { useTranslation } from "react-i18next";
import { FiCheck, FiPhone } from "react-icons/fi";

export default function About() {
  const { t } = useTranslation("about", { useSuspense: false });

  return (
    <section
      id="about"
      className="py-12 sm:py-16 bg-[rgb(0,0,4)]"
      data-aos="fade-up"
      data-aos-delay="100"
    >
      <div className="mx-auto max-w-screen-xl px-4">
        <div className="grid items-center justify-between gap-10 lg:grid-cols-2">
          {/* Left / Content */}
          <div className="space-y-6" data-aos="fade-up" data-aos-delay="200">
            <span className="inline-block text-sm font-semibold tracking-wide text-indigo-800">
              {t("more")}
            </span>

            <h2 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {t("title")}
            </h2>

            <p className="text-neutral-600 dark:text-neutral-300">
              {t("description")}
            </p>

            {/* Feature list */}
            <div className="grid gap-6 sm:grid-cols-2">
              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <FiCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {t("featureList0")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <FiCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {t("featureList1")}
                  </span>
                </li>
              </ul>

              <ul className="space-y-3">
                <li className="flex items-start gap-2">
                  <FiCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {t("featureList2")}
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <FiCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                  <span className="text-neutral-800 dark:text-neutral-200">
                    {t("featureList3")}
                  </span>
                </li>
              </ul>
            </div>

            {/* Info block */}
            <div className="rounded-2xl border border-neutral-200/60 bg-gray-950 p-5 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/40">
              <div className="grid items-center gap-6 md:grid-cols-2">
                {/* Profile */}
                <div>
                  <div className="flex items-center gap-3">
                    <img
                      src="/img/logo1.jpg"
                      alt="Logo"
                      className="h-12 w-12 rounded-full object-cover ring-2 ring-emerald-500/30"
                    />
                    <div>
                      <h4 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                        Whaleer.com
                      </h4>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div>
                  <div className="flex items-center gap-3">
                    <FiPhone className="h-5 w-5 flex-none text-indigo-600" />
                    <div className="leading-tight">
                      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                        {t("contact")}
                      </p>
                      <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        +90 552 285 34 67
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right / Images */}
          <div className="relative" data-aos="fade-up" data-aos-delay="300">
            <div className="relative" data-aos="zoom-out" data-aos-delay="400">
              <img
                src="/img/image2.png" //src="/img/bluewhale1.jpg"
                alt="bluewhale"
                className="w-full rounded-2xl object-cover border border-gray-700 shadow-lg"
              />
              <img
                src="/img/image3.png" //src="/img/img1.jpeg"
                alt="tablet-image"
                className="absolute -bottom-16 -right-8 w-40 rounded-xl border border-gray-700 shadow-xl sm:w-48 md:w-56"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
