export const metadata = {
  title: "Whaleer - Documentation",
  description: "Create, test, and implement crypto strategies with Whaleer.",
};

const sections = [
  {
    id: "olusturma",
    title: "1. Strategy Creation",
    content: `Use the editor to build your own strategy. Supports indicators like RSI, EMA, and volume.`,
    sub: [
      { id: "olusturma-temel", title: "Basic Rules" },
      { id: "olusturma-indikator", title: "Using Indicators" },
    ],
  },
  {
    id: "backtest",
    title: "2. Backtesting",
    content: `Test your strategy on historical data. Analyze metrics such as performance, drawdown, and success rate.`,
  },
  {
    id: "bot",
    title: "3. Running a Bot",
    content: `Run your bot with real-time data. Buy/Sell actions are executed automatically.`,
  },
  {
    id: "paylasim",
    title: "4. Strategy Sharing",
    content: `You can mint your strategies as NFTs or archive and share them.`,
  },
];

export default function DocumentationPage() {
  return (
    <section
      id="hero"
      className="hero section bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100"
    >
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="hidden md:block w-64 sticky top-0 h-screen p-6 overflow-y-auto border-r border-white/10 bg-white/5 backdrop-blur">
          <ul className="space-y-3 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="hover:text-sky-400 transition-colors duration-300 font-medium"
                >
                  {section.title}
                </a>
                {section.sub && (
                  <ul className="ml-3 mt-2 space-y-1 border-l border-white/10 pl-3 text-neutral-400">
                    {section.sub.map((subItem) => (
                      <li key={subItem.id}>
                        <a
                          href={`#${subItem.id}`}
                          className="hover:text-sky-300 transition-colors duration-300"
                        >
                          {subItem.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </aside>

        {/* Content */}
        <main className="flex-1 p-6 md:p-8 lg:p-12 space-y-16 scroll-smooth max-w-4xl mx-auto">
          {sections.map((section) => (
            <div
              key={section.id}
              id={section.id}
              className="scroll-mt-28 bg-white/5 border border-white/10 rounded-xl p-6 md:p-8 shadow-xl"
            >
              <h2 className="text-2xl font-bold mb-4 text-white">{section.title}</h2>
              <p className="text-neutral-300 mb-6 leading-relaxed">{section.content}</p>

              {section.sub &&
                section.sub.map((sub) => (
                  <div
                    key={sub.id}
                    id={sub.id}
                    className="ml-0 mt-8 border-l border-white/10 pl-4 scroll-mt-28"
                  >
                    <h3 className="text-xl font-semibold mb-2 text-white">
                      {sub.title}
                    </h3>
                    <p className="text-neutral-400 leading-relaxed">
                      Detailed information about {sub.title.toLowerCase()} will be
                      provided here.
                    </p>
                  </div>
                ))}
            </div>
          ))}
        </main>
      </div>
    </section>
  );
}
