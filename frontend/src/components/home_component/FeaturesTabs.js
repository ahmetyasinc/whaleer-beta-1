"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { FiCheck } from "react-icons/fi";

const FeaturesTabs = ({ locale }) => {
  const { t } = useTranslation("feature");
  const [activeTab, setActiveTab] = useState(null);
  const [features, setFeatures] = useState([]);

  useEffect(() => {
    let list = t("list", { returnObjects: true });
    if (!Array.isArray(list)) {
      const lang = locale || i18n.language;
      const bundle = i18n.getResourceBundle(lang, "feature");
      if (Array.isArray(bundle)) list = bundle;
      else if (Array.isArray(bundle?.list)) list = bundle.list;
    }
    setFeatures(Array.isArray(list) ? list : []);
    if (Array.isArray(list) && list.length > 0) {
      setActiveTab(list[0]?.id ?? null);
    }
  }, [t, locale]);

  return (
    <section className="py-12 bg-[rgb(0,0,4)]">
      <div className="mx-auto max-w-screen-xl px-4">
        {/* Tabs */}
        <div className="flex justify-center">
          <ul className="flex w-full max-w-full overflow-x-auto no-scrollbar gap-2 sm:gap-3">
            {features.map((feature) => {
              const isActive = activeTab === feature.id;
              return (
                <li key={feature.id} className="flex-shrink-0">
                  <button
                    onClick={() => setActiveTab(feature.id)}
                    className={[
                      "px-4 py-2 rounded-t-xl text-sm sm:text-base font-medium transition",
                      "border-b-2",
                      isActive
                        ? "text-blue-500 border-blue-500"
                        : "text-neutral-600 border-transparent hover:text-neutral-200 hover:border-neutral-300",
                      "bg-transparent shadow-[0_2px_0_rgba(0,0,0,0.1)] hover:shadow-[0_4px_0_rgba(0,0,0,0.1)]",
                    ].join(" ")}
                    aria-selected={isActive}
                    role="tab"
                  >
                    <h4 className="whitespace-nowrap">{feature.title}</h4>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Tab Panels */}
        <div className="my-4">
          {features.map((feature) => {
            const isActive = activeTab === feature.id;
            return (
              <div key={feature.id} role="tabpanel" className={isActive ? "block" : "hidden"}>
                <div className="grid gap-8 lg:grid-cols-2">
                  {/* Text */}
                  <div className="order-2 lg:order-1 mt-3 lg:mt-0 flex flex-col justify-center">
                    <h3 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
                      {feature.heading}
                    </h3>
                    <p className="italic mt-2 text-neutral-700 dark:text-neutral-300">
                      {feature.description}
                    </p>
                    <ul className="mt-4 space-y-2">
                      {feature.bullets?.map((bullet, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <FiCheck className="mt-0.5 h-5 w-5 flex-none text-emerald-600" />
                          <span className="text-neutral-800 dark:text-neutral-200">{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Image */}
                  <div className="order-1 lg:order-2 flex items-center justify-center text-center">
                    <img
                      src={feature.image}
                      alt="feature-image"
                      className="w-full max-w-xs md:max-w-xs lg:max-w-sm rounded-2xl object-cover shadow-lg"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FeaturesTabs;
