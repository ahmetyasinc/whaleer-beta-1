"use client";

import Link from "next/link";
import i18n from "@/i18n";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";

export default function About({ locale }) {
  const { t } = useTranslation("about");

  useEffect(() => {
    if (locale && i18n.language !== locale) {
      i18n.changeLanguage(locale);
    }
  }, [locale]);

  return (
    <section id="about" className="about section mt-16">
      <div className="container" data-aos="fade-up" data-aos-delay="100">
        <div className="row gy-4 align-items-center justify-content-between">
          <div className="col-xl-5" data-aos="fade-up" data-aos-delay="200">
            <span className="about-meta">{t("more")}</span>
            <h2 className="about-title">{t("title")}</h2>
            <p className="about-description">{t("description")}</p>

            <div className="row feature-list-wrapper">
              <div className="col-md-6">
                <ul className="feature-list">
                  <li><i className="bi bi-check-circle-fill"></i> {t("featureList0")}</li>
                  <li><i className="bi bi-check-circle-fill"></i> {t("featureList1")}</li>
                </ul>
              </div>
              <div className="col-md-6">
                <ul className="feature-list">
                  <li><i className="bi bi-check-circle-fill"></i> {t("featureList2")}</li>
                  <li><i className="bi bi-check-circle-fill"></i> {t("featureList3")}</li>
                </ul>
              </div>
            </div>

            <div className="info-wrapper">
              <div className="row gy-4">
                <div className="col-lg-5">
                  <div className="profile d-flex align-items-center gap-3">
                    <img src="/img/logo1.jpg" alt="Logo" className="profile-image" />
                    <div>
                      <h4 className="profile-name">whaleer.com</h4>
                    </div>
                  </div>
                </div>

                <div className="col-lg-7">
                  <div className="contact-info d-flex align-items-center gap-2">
                    <i className="bi bi-telephone-fill"></i>
                    <div>
                      <p className="contact-label">{t("contact")}</p>
                      <p className="contact-number">+90 552 285 34 67</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-6" data-aos="fade-up" data-aos-delay="300">
            <div className="image-wrapper">
              <div className="images position-relative" data-aos="zoom-out" data-aos-delay="400">
                <img src="/img/bluewhale1.jpg" alt="bluewhale" className="img-fluid main-image rounded-4" />
                <img src="/img/img1.jpeg" alt="tablet-image" className="img-fluid small-image rounded-4" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
