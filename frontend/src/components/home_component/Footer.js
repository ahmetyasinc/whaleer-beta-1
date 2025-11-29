"use client";

import { useTranslation } from "react-i18next";
import { FaInstagram, FaLinkedin } from "react-icons/fa";
import Link from "next/link";

const Footer = () => {
  const { t, i18n } = useTranslation("footer", { useSuspense: false });

  const locale = i18n.resolvedLanguage || i18n.language || "en";
  const withLocale = (path) => (path === "/" ? `/${locale}` : `/${locale}${path}`);

  const links = t("links", { returnObjects: true }) || [];
  const leftLinks = links.slice(0, 5);
  const rightLinks = links.slice(5);

  return (
    <footer className="bg-[rgb(0,0,4)] text-neutral-200">
      <div className="w-full">
        <div className="mx-auto max-w-screen-xl px-4 py-12">
          <div className="grid gap-10 lg:grid-cols-4 lg:gap-12">
            {/* About */}
            <div className="lg:col-span-2 glightbox group">
              <Link
                href={withLocale("/")}
                className="mb-4 inline-flex items-center gap-3 no-underline"
              >
                <img
                  src="/img/logo1.jpg"
                  alt="Logo"
                  className="h-10 w-10 rounded-full object-cover ring-2 ring-sky-500/30 group-hover:scale-105 transition-transform duration-300"
                />
                <span className="text-xl font-bold text-neutral-200">Whaleer.com</span>
              </Link>

              <div className="text-neutral-200 mt-4 text-left">
                <p className="text-neutral-200 mb-2">{t("addressLine1")}</p>
                <p className="text-neutral-200 mb-3">{t("addressLine2")}</p>

                <p className="mb-2">
                  <strong>{t("phoneLabel")}:</strong>
                  <span className="ml-3 text-neutral-200 ">+90 552 285 34 67</span>
                </p>
                <p className="mb-3">
                  <strong>{t("emailLabel")}:</strong>
                  <span className="ml-3 text-neutral-200 ">whaleertrading@gmail.com</span>
                </p>
              </div>

              <div className="mt-4 flex items-center gap-4">
                <a
                  href="https://www.instagram.com/thewhaleer?igsh=cjhieWpsemdvNzY5"
                  aria-label="Instagram"
                  className="inline-flex text-neutral-100 transition hover:text-sky-600"
                >
                  <FaInstagram className="h-6 w-6" />
                </a>
                <a
                  href="https://www.linkedin.com/company/106360097/"
                  aria-label="LinkedIn"
                  className="inline-flex text-neutral-100 transition hover:text-sky-600"
                >
                  <FaLinkedin className="h-6 w-6" />
                </a>
              </div>
            </div>

            {/* Useful Links */}
            <div>
              <h4 className="my-4 text-lg font-bold text-neutral-200">
                {t("usefulLinksTitle")}
              </h4>
              <ul className="space-y-2">
                {leftLinks.map((link, i) => (
                  <li key={i} className="pl-5">
                    <a
                      href="#"
                      className="text-neutral-400 mt-4 transition hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Other Links */}
            <div>
              <h4 className="my-4 text-lg font-bold text-neutral-200">
                {t("otherLinksTitle")}
              </h4>
              <ul className="space-y-2">
                {rightLinks.map((link, i) => (
                  <li key={i} className="pl-5">
                    <a
                      href="#"
                      className="text-neutral-400 mt-4 transition hover:text-white"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Divider & bottom mini bar */}
          <div className="mt-10 border-t border-neutral-800 pt-6 text-sm text-neutral-400 text-center">
            <p>© {new Date().getFullYear()} {t("rights")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
