// app/[locale]/(home)/document/page.js

// JSON'ları doğrudan import ediyoruz (SSR).
// Proje köküne göre import yolları: "../" kullanmamak için alias şart değil; 
// kökten import gerekiyorsa next.config.js'te alias tanımlayabilirsin.
// Burada root'a göre import kullandım; gerekirse relative path'e çevir.
import tr from "@/locales/tr/home/pages/document/document.json";
import en from "@/locales/en/home/pages/document/document.json";

export const metadata = {
  title: "Whaleer",
  description: "Create, test, run, and share algorithmic strategies with Whaleer.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Whaleer Docs",
    description: "Create, test, run, and share algorithmic strategies with Whaleer.",
    url: "/docs",
    type: "article"
  }
};

export const revalidate = 86400; // 24 saat (statik cache)

export default function DocsPage({ params }) {
  // URL locale'ine göre sözlük seçimi. Varsayılan TR.
  const locale = (params?.locale || "tr").toLowerCase();
  const dict = locale === "en" ? en : tr;

  const sections = Array.isArray(dict.sections) ? dict.sections : [];

  // Basit FAQ JSON-LD (LLM/SEO için yapılandırılmış veri)
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": sections.map((s) => ({
      "@type": "Question",
      "name": s.title,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": s.content || ""
      }
    }))
  };

  return (
    <section
      id="docs"
      className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100"
    >
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside
          className="hidden md:block w-64 sticky top-0 h-screen p-6 overflow-y-auto border-r border-white/10 bg-white/5 backdrop-blur"
          aria-label={dict.title}
        >
          <nav>
            <ul className="space-y-3 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="hover:text-sky-400 transition-colors duration-300 font-medium"
                  >
                    {section.title}
                  </a>
                  {section.sub?.length > 0 && (
                    <ul className="ml-3 mt-2 space-y-1 border-l border-white/10 pl-3 text-neutral-400">
                      {section.sub.map((s) => (
                        <li key={s.id}>
                          <a
                            href={`#${s.id}`}
                            className="hover:text-sky-300 transition-colors duration-300"
                          >
                            {s.title}
                          </a>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 md:p-8 lg:p-12 space-y-10 scroll-smooth max-w-4xl mx-auto">
          <header className="mb-4">
            <h1 className="text-3xl font-bold text-white">{dict.title}</h1>
            {dict.intro && <p className="text-neutral-300 mt-2">{dict.intro}</p>}
          </header>

          {sections.map((section) => (
            <article
              key={section.id}
              id={section.id}
              className="scroll-mt-28 bg-white/5 border border-white/10 rounded-xl p-6 md:p-8 shadow-xl"
            >
              <h2 className="text-2xl font-bold mb-4 text-white">{section.title}</h2>
              {section.content && (
                <p className="text-neutral-300 mb-6 leading-relaxed">{section.content}</p>
              )}

              {/* Görseller */}
              {section.media?.images?.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                  {section.media.images.map((src, idx) => (
                    <figure key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <img
                        src={src}
                        alt={`${section.title} image ${idx + 1}`}
                        className="w-full h-auto rounded"
                        loading="lazy"
                      />
                    </figure>
                  ))}
                </div>
              )}

              {/* Videolar */}
              {section.media?.videos?.length > 0 && (
                <div className="space-y-4 mb-6">
                  {section.media.videos.map((src, idx) => (
                    <div key={idx} className="bg-white/5 border border-white/10 rounded-lg p-3">
                      <video src={src} controls className="w-full rounded" />
                    </div>
                  ))}
                </div>
              )}

              {/* Alt Bölümler */}
              {section.sub?.map((sub) => (
                <section
                  key={sub.id}
                  id={sub.id}
                  className="ml-0 mt-8 border-l border-white/10 pl-4 scroll-mt-28"
                  aria-labelledby={`${sub.id}-title`}
                >
                  <h3 id={`${sub.id}-title`} className="text-xl font-semibold mb-2 text-white">
                    {sub.title}
                  </h3>
                  {sub.content && (
                    <p className="text-neutral-400 leading-relaxed">{sub.content}</p>
                  )}
                </section>
              ))}
            </article>
          ))}
        </main>
      </div>

      {/* JSON-LD (SSR olarak HTML'e gömülür) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </section>
  );
}
