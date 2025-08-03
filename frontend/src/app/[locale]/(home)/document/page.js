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
    <section id="hero" className="hero section">
      <div className="flex min-h-screen bg-gradient-to-br text-white">
        {/* Sidebar */}
        <aside className="w-64 sticky top-0 h-screen p-6 overflow-y-auto border-r border-gray-800">
          <ul className="space-y-3 text-sm">
            {sections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`} className="hover:text-blue-400 transition-colors font-medium">
                  {section.title}
                </a>
                {section.sub && (
                  <ul className="ml-3 mt-2 space-y-1 border-l border-gray-700 pl-3 text-gray-400">
                    {section.sub.map((subItem) => (
                      <li key={subItem.id}>
                        <a href={`#${subItem.id}`} className="hover:text-blue-300 transition-colors">
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
        <main className="flex-1 p-8 space-y-16 scroll-smooth">
          {sections.map((section) => (
            <div key={section.id} id={section.id}>
              <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
              <p className="text-gray-300 mb-6">{section.content}</p>

              {section.sub &&
                section.sub.map((sub) => (
                  <div key={sub.id} id={sub.id} className="ml-4 mt-8">
                    <h3 className="text-xl font-semibold mb-2">{sub.title}</h3>
                    <p className="text-gray-400">
                      {/* Placeholder text for each subsection */}
                      Detailed information about {sub.title.toLowerCase()} will be provided here.
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
