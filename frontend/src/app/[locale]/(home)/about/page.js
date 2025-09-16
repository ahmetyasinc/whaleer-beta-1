// app/[locale]/(home)/about/page.js

// NOT: Eğer projenizde "@/..." alias'ı yoksa, bu importları relative path'e çevirin.
// Örn: "../../../../tr/home/pages/about/about.json"
import tr from "@/locales/tr/home/pages/about.json";
import en from "@/locales/en/home/pages/about.json";

export const metadata = {
  title: "Whaleer — About",
  description:
    "Learn about Whaleer: the platform to create, test, and run algorithmic trading strategies.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "Whaleer — About",
    description:
      "Learn about Whaleer: the platform to create, test, and run algorithmic trading strategies.",
    url: "/about",
    type: "article"
  }
};

// Statik cache (opsiyonel)
export const revalidate = 86400; // 24 saat

export default function AboutPage({ params }) {
  const locale = (params?.locale || "tr").toLowerCase();
  const dict = locale === "en" ? en : tr;

  // JSON-LD: Organization + AboutPage (opsiyonel ama faydalı)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "name": dict.title,
    "mainEntity": {
      "@type": "Organization",
      "name": "Whaleer",
      // Eğer logonuzu public'e koyduysanız:
      "logo": "/img/logo5.png",
      "description":
        `${dict.p1} ${dict.p2}`.slice(0, 500) // kısa bir özet
    }
  };

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
          {/* Sol Metin Alanı */}
          <div
            className="w-full lg:w-1/2 mb-8 lg:mb-0"
            data-aos="fade-up"
            data-aos-delay="200"
          >
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 sm:p-8 shadow-xl backdrop-blur">
              <h1 className="text-3xl font-bold mb-6 text-white">
                {dict.title}
              </h1>

              <p className="mb-4 text-justify text-neutral-300 leading-relaxed">
                <strong className="text-white">Whaleer</strong> {dict.p1}
              </p>

              <p className="mb-4 text-justify text-neutral-300 leading-relaxed">
                {dict.p2}
              </p>

              <p className="mb-4 text-justify text-neutral-300 leading-relaxed">
                {dict.p3}
              </p>

              <p className="mb-4 text-justify text-neutral-300 leading-relaxed">
                {dict.p4}
              </p>

              <p className="mb-0 text-justify text-neutral-300 leading-relaxed">
                {dict.p5}
              </p>
            </div>
          </div>

          {/* Sağ Görsel */}
          <div className="w-full lg:w-1/2 flex justify-center">
            <div className="w-full h-[300px] rounded-xl shadow-md flex items-center justify-center">
              <img
                src="/img/logo5.png"
                alt={dict.imageAlt || "Whaleer"}
                className="img-fluid rotating-img"
              />
            </div>
          </div>
        </div>
      </div>

      {/* JSON-LD (SSR olarak HTML'e gömülür) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
