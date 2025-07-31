"use client";

import Link from "next/link";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export default function Hero({ userCount, traderCount, strategyCount, botCount, locale }) {
  const { t } = useTranslation("hero");

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  return (
    <section id="hero" className="hero section">
      <div className="container" data-aos="fade-up" data-aos-delay="100">
        <div className="row align-items-center">
          <div className="col-lg-6">
            <div className="hero-content" data-aos="fade-up" data-aos-delay="200">
              <div className="text-left">
                <div className="company-badge mb-4 flex items-center">
                  <i className="bi bi-gear-fill me-2"></i>
                  {t("badge")}
                </div>

                <h1 className="mb-4 text-left font-sans">
                  {t("heading1")}<br />
                  {t("heading2")} <br />
                  <span className="accent-text">{t("heading3")}</span>
                </h1>

                <div className="container text-left">
                  <div className="row">
                    <div className="col-lg-12 mx-auto text-left">
                      <p className="mb-4 mb-md-5">
                        {t("description")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="hero-buttons text-left">
                <Link href="/deneme" className="text-white btn btn-primary me-0 me-sm-2 mx-1">{t("ctaStart")}</Link>
                <a href="https://www.youtube.com/watch?v=VZcFJ_jtJpk&t=649s" className="btn btn-link mt-2 mt-sm-0 glightbox">
                  <i className="bi bi-play-circle me-1"></i>
                  {t("ctaVideo")}
                </a>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="hero-image rotating-container" data-aos="zoom-out" data-aos-delay="300">
              <img src="/img/logo5.png" alt="Hero Image" className="img-fluid rotating-img" />
            </div>
          </div>
        </div>

        <div className="row stats-row gy-4 mt-5" data-aos="fade-up" data-aos-delay="500">
          <div className="col-lg-3 col-md-6">
            <div className="stat-item">
              <div className="stat-icon">
                <i className="bi bi-person"></i>
              </div>
              <div className="stat-content">
                <h4>{t("statUser")}</h4>
                <p className="mb-0">
                  <span className="font-bold text-3xl">{userCount}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="stat-item">
              <div className="stat-icon">
                <i className="bi bi-person-bounding-box"></i>
              </div>
              <div className="stat-content">
                <h4>{t("statTrader")}</h4>
                <p className="mb-0">
                  <span className="font-bold text-3xl">{traderCount}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="stat-item">
              <div className="stat-icon">
                <i className="bi bi-graph-up"></i>
              </div>
              <div className="stat-content">
                <h4>{t("statStrategy")}</h4>
                <p className="mb-0">
                  <span className="font-bold text-3xl">{strategyCount}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="col-lg-3 col-md-6">
            <div className="stat-item">
              <div className="stat-icon">
                <i className="bi bi-journal-text"></i>
              </div>
              <div className="stat-content">
                <h4>{t("statBot")}</h4>
                <p className="mb-0">
                  <span className="font-bold text-3xl">{botCount}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
