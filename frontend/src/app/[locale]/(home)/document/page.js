import tr from "@/locales/tr/home/pages/document/document.json";
import en from "@/locales/en/home/pages/document/document.json";
import ResponsiveGallery from "@/components/home_component/ResponsiveGallery";

export const metadata = {
  title: "Whaleer",
  description: "Create, test, run, and share algorithmic strategies with Whaleer.",
  alternates: { canonical: "/docs" },
  openGraph: {
    title: "Whaleer Docs",
    description: "Create, test, run, and share algorithmic strategies with Whaleer.",
    url: "/docs",
    type: "article",
  },
};

export const revalidate = 86400; // 24 saat (statik cache)

// ------------------------------
// Helpers: Markdown-lite parser for code fences
// ------------------------------
function parseBlocks(text) {
  if (!text) return [];
  const blocks = [];
  const fence = /```(\w+)?\n([\s\S]*?)```/g; // ```lang\n...```
  let lastIndex = 0;
  let m;
  while ((m = fence.exec(text)) !== null) {
    const [full, langRaw, code] = m;
    const start = m.index;
    if (start > lastIndex) {
      const before = text.slice(lastIndex, start).trim();
      if (before) blocks.push({ type: "p", text: before });
    }
    blocks.push({ type: "code", lang: (langRaw || "plaintext").toLowerCase(), code });
    lastIndex = start + full.length;
  }
  const rest = text.slice(lastIndex).trim();
  if (rest) blocks.push({ type: "p", text: rest });
  return blocks;
}

function IDECodeBlock({ lang, code }) {
  // IDE-like görünüm – siyah arka plan
  return (
    <div className="mb-6 rounded-xl border border-white/10 overflow-hidden shadow-xl bg-black">
      <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border-b border-white/10">
        <span className="inline-block w-3 h-3 rounded-full bg-red-500/80"></span>
        <span className="inline-block w-3 h-3 rounded-full bg-yellow-500/80"></span>
        <span className="inline-block w-3 h-3 rounded-full bg-green-500/80"></span>
        <span className="ml-3 text-xs uppercase tracking-wider text-neutral-300">{lang}</span>
      </div>
      <pre className="m-0 p-4 bg-black text-neutral-200 text-sm leading-relaxed overflow-x-auto">
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </div>
  );
}

function RichContent({ text }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;
  return (
    <div>
      {blocks.map((b, i) =>
        b.type === "code" ? (
          <IDECodeBlock key={i} lang={b.lang} code={b.code} />
        ) : (
          <p key={i} className="text-neutral-300 leading-relaxed whitespace-pre-line mb-6">
            {b.text}
          </p>
        )
      )}
    </div>
  );
}

export default async function DocsPage(props) {
  const params = await props.params;
  // URL locale'ine göre sözlük seçimi. Varsayılan TR.
  const locale = (params?.locale || "tr").toLowerCase();
  const dict = locale === "en" ? en : tr;

  const sections = Array.isArray(dict.sections) ? dict.sections : [];

  // Basit FAQ JSON-LD (LLM/SEO için yapılandırılmış veri)
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.map((s) => ({
      "@type": "Question",
      name: s.title,
      acceptedAnswer: {
        "@type": "Answer",
        text: s.content || "",
      },
    })),
  };

  return (
    <section
      id="docs"
      className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100 pt-24 md:pt-28"
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
        <main className="flex-1 p-6 md:p-8 lg:p-12 space-y-10 scroll-smooth max-w-6xl lg:max-w-7xl mx-auto">
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

              {/* Rich content with code-fence support */}
              {section.content && <RichContent text={section.content} />}

              {/* Otomatik yerleşen görseller + lightbox */}
              {section.media?.images?.length > 0 && (
                <div className="mb-6">
                  <ResponsiveGallery images={section.media.images} />
                  {section.media?.captions?.map((caption, idx) => (
                    <p key={idx} className="text-sm text-neutral-400 mt-2 text-center">
                      {caption}
                    </p>
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
                  {sub.content && <RichContent text={sub.content} />}
                </section>
              ))}
            </article>
          ))}
        </main>
      </div>

      {/* JSON-LD (SSR olarak HTML'e gömülür) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </section>
  );
}
