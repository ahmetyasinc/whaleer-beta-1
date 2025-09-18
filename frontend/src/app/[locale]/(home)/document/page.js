import tr from "@/locales/tr/home/pages/document/document.json";
import en from "@/locales/en/home/pages/document/document.json";
import ResponsiveGallery from "@/components/home_component/ResponsiveGallery";

// Next/Image şimdilik gerekmiyor
// import Image from "next/image";

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

export const revalidate = 86400;

/* ----------------------- 1) code-fence parser ----------------------- */
function parseBlocks(text) {
  if (!text) return [];
  const blocks = [];
  const fence = /```(\w+)?\n([\s\S]*?)```/g;
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

/* -------------------- 2) inline medya sözdizimi --------------------- */
function splitInlineMedia(text) {
  const re = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*(?:\{([^}]+)\})?/g;
  const parts = [];
  let lastIndex = 0;
  let m;

  const parseOpts = (raw) => {
    const opts = {};
    if (!raw) return opts;
    raw.split(/\s+/).forEach((tok) => {
      const [k, v] = tok.split("=");
      if (k && v) opts[k.trim()] = v.trim();
    });
    return opts;
  };

  const isVideoSrc = (src) => /\.(mp4|webm|ogg)$/i.test(src);

  while ((m = re.exec(text)) !== null) {
    const [full, alt, src, title, optRaw] = m;
    const start = m.index;
    if (start > lastIndex) {
      const before = text.slice(lastIndex, start);
      if (before.trim()) parts.push({ type: "p", text: before });
    }
    const opts = parseOpts(optRaw);
    const mediaType = (opts.type || (isVideoSrc(src) ? "video" : "image")).toLowerCase();
    parts.push({ type: "media", mediaType, alt: alt || "", src, title: title || "", opts });
    lastIndex = start + full.length;
  }
  const rest = text.slice(lastIndex);
  if (rest.trim()) parts.push({ type: "p", text: rest });
  return parts.length ? parts : [{ type: "p", text }];
}

/* ---------------- 3) inline biçimlendirme (bold/inline code) ---------------- */
function renderInline(text, keyPrefix = "inl") {
  if (!text) return null;

  const tokenRe =
    /(`[^`]+`|\*\*[^*]+\*\*|\bdf\['[^']+'\]|\bget_percentage\(\)|\b(?:commission|take_profit|stop_loss|position|percentage|plot_indicator|indicator_name|on_graph|indicator_data|color|line_width|plot_type|plot)\b)/g;

  const nodes = [];
  let lastIndex = 0;
  let m;
  let idx = 0;

  const CodeChip = ({ children }) => (
    <code className="px-1.5 py-0.5 rounded bg-neutral-900/90 border border-white/10 text-[0.95em]">
      {children}
    </code>
  );

  while ((m = tokenRe.exec(text)) !== null) {
    const start = m.index;
    const match = m[0];

    if (start > lastIndex) nodes.push(<span key={`${keyPrefix}-t-${idx++}`}>{text.slice(lastIndex, start)}</span>);

    if (match.startsWith("`") && match.endsWith("`")) {
      nodes.push(<CodeChip key={`${keyPrefix}-c-${idx++}`}>{match.slice(1, -1)}</CodeChip>);
    } else if (match.startsWith("**") && match.endsWith("**")) {
      nodes.push(<strong key={`${keyPrefix}-b-${idx++}`} className="text-white">{match.slice(2, -2)}</strong>);
    } else {
      nodes.push(<CodeChip key={`${keyPrefix}-k-${idx++}`}>{match}</CodeChip>);
    }

    lastIndex = start + match.length;
  }

  if (lastIndex < text.length) nodes.push(<span key={`${keyPrefix}-t-${idx++}`}>{text.slice(lastIndex)}</span>);
  return nodes;
}

/* ----------------------- 4) IDE code block ----------------------- */
function IDECodeBlock({ lang, code }) {
  return (
    <div className="mb-6 rounded-xl border border-white/10 overflow-hidden shadow-xl bg-black">
      <div className="flex items-center gap-2 px-4 py-2 bg-neutral-900 border-b border-white/10">
        <span className="inline-block w-3 h-3 rounded-full bg-red-500/80" />
        <span className="inline-block w-3 h-3 rounded-full bg-yellow-500/80" />
        <span className="inline-block w-3 h-3 rounded-full bg-green-500/80" />
        <span className="ml-3 text-xs uppercase tracking-wider text-neutral-300">{lang}</span>
      </div>
      <pre className="m-0 p-4 bg-black text-neutral-200 text-[13px] leading-relaxed overflow-x-auto">
        <code className={`language-${lang}`}>{code}</code>
      </pre>
    </div>
  );
}

/* ----------------------- 5) RichContent ----------------------- */
function RichContent({ text }) {
  const blocks = parseBlocks(text);
  if (!blocks.length) return null;

  const flushGallery = (mediaBatch, i, j) => {
    if (!mediaBatch.length) return null;
    return (
      <ResponsiveGallery
        key={`gal-${i}-${j}`}
        items={mediaBatch.map((m) => ({
          type: m.mediaType, // "image" | "video"
          src: m.src,
          poster: m.opts?.poster,
          layout: (m.opts?.w || "auto").toLowerCase(), // auto|full|wide|half|third
          caption: m.title || "",
          alt: m.alt || m.title || "",
        }))}
        className="my-6"
      />
    );
  };

  return (
    <div>
      {blocks.flatMap((b, i) => {
        if (b.type === "code") return <IDECodeBlock key={`code-${i}`} lang={b.lang} code={b.code} />;

        const pieces = splitInlineMedia(b.text);
        const out = [];
        let batch = [];

        pieces.forEach((p, j) => {
          if (p.type === "media") {
            batch.push(p);
          } else {
            const gal = flushGallery(batch, i, j);
            if (gal) out.push(gal);
            batch = [];
            out.push(
              <p key={`p-${i}-${j}`} className="text-neutral-300 leading-relaxed whitespace-pre-line mb-6 text-[15.5px] md:text-[16px]">
                {renderInline(p.text, `p-${i}-${j}`)}
              </p>
            );
          }
        });

        const gal = flushGallery(batch, i, "end");
        if (gal) out.push(gal);

        return out;
      })}
    </div>
  );
}

/* ----------------------- 6) Sayfa (sticky sidebar + grid) ----------------------- */
export default async function DocsPage(props) {
  const params = await props.params;
  const locale = (params?.locale || "tr").toLowerCase();
  const dict = locale === "en" ? en : tr;
  const sections = Array.isArray(dict.sections) ? dict.sections : [];

  // Basit FAQ JSON-LD
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: sections.map((s) => ({
      "@type": "Question",
      name: s.title,
      acceptedAnswer: { "@type": "Answer", text: s.content || "" },
    })),
  };

  return (
    <section
      id="docs"
      className="bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100 pt-20 sm:pt-22 md:pt-24"
    >
      {/* Skip link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-neutral-800 focus:text-white focus:px-3 focus:py-2 focus:rounded"
      >
        İçeriğe atla
      </a>

      {/* GRID LAYOUT: lg+ iki sütun (sidebar + content). Sticky sidebar footer'a taşmaz. */}
      <div className="mx-auto w-full max-w-[1650px] px-0 lg:px-0 lg:grid lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr] gap-0">
        {/* Sidebar (lg+): sticky, header altı 70px; container içinde kaldığı için footer'a binmez */}
        <aside
          className="hidden lg:block sticky top-[70px] self-start h-[calc(100dvh-70px)] overflow-y-auto border-r border-white/10 bg-white/5 backdrop-blur px-5 py-5"
          aria-label={dict.title}
        >
          <nav>
            <ul className="space-y-3 text-sm">
              {sections.map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="hover:text-sky-400 transition-colors font-medium block">
                    {section.title}
                  </a>
                  {section.sub?.length > 0 && (
                    <ul className="ml-3 mt-2 space-y-1 border-l border-white/10 pl-3 text-neutral-400">
                      {section.sub.map((s) => (
                        <li key={s.id}>
                          <a href={`#${s.id}`} className="hover:text-sky-300 transition-colors block">
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
        <main
          id="main-content"
          className="px-4 sm:px-6 md:px-8 lg:px-10 xl:px-12 py-6 md:py-8 lg:py-10 scroll-smooth"
        >
          {/* Mobile TOC */}
          <div className="lg:hidden mb-6">
            <details className="group rounded-xl border border-white/10 bg-white/5 backdrop-blur">
              <summary className="list-none px-4 py-3 flex items-center justify-between cursor-pointer select-none">
                <span className="font-semibold">İçindekiler</span>
                <span className="transition group-open:rotate-180">⌄</span>
              </summary>
              <nav className="px-4 pb-3">
                <ul className="space-y-2 text-sm">
                  {sections.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="block py-1.5 rounded hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                      >
                        {section.title}
                      </a>
                      {section.sub?.length > 0 && (
                        <ul className="ml-3 my-1 border-l border-white/10 pl-3 text-neutral-400 space-y-1">
                          {section.sub.map((s) => (
                            <li key={s.id}>
                              <a
                                href={`#${s.id}`}
                                className="block py-1 hover:text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/40 rounded"
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
            </details>
          </div>

          {/* Header */}
          <header className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white">{dict.title}</h1>
            {dict.intro && (
              <p className="text-neutral-300 mt-2 text-[15.5px] sm:text-base max-w-[78ch]">
                {dict.intro}
              </p>
            )}
          </header>

          {/* Articles */}
          <div className="max-w-[1200px] 2xl:max-w-[1350px]">
            {sections.map((section) => (
              <article
                key={section.id}
                id={section.id}
                className="scroll-mt-24 sm:scroll-mt-28 bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl mb-8 md:mb-10"
              >
                <h2 className="text-xl sm:text-2xl font-bold mb-4 text-white">{section.title}</h2>

                {section.content && <RichContent text={section.content} />}

                {(section?.media?.images?.length || section?.media?.videos?.length) ? (
                  <ResponsiveGallery
                    className="mb-6"
                    items={[
                      ...(section.media?.images || []).map((src) => ({ type: "image", src, layout: "auto" })),
                      ...(section.media?.videos || []).map((src) => ({ type: "video", src, layout: "auto" })),
                    ]}
                  />
                ) : null}

                {section.sub?.map((sub) => (
                  <section
                    key={sub.id}
                    id={sub.id}
                    className="ml-0 mt-8 border-l border-white/10 pl-3 sm:pl-4 scroll-mt-24 sm:scroll-mt-28"
                    aria-labelledby={`${sub.id}-title`}
                  >
                    <h3 id={`${sub.id}-title`} className="text-lg sm:text-xl font-semibold mb-2 text-white">
                      {sub.title}
                    </h3>
                    {sub.content && <RichContent text={sub.content} />}
                  </section>
                ))}
              </article>
            ))}
          </div>
        </main>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </section>
  );
}
