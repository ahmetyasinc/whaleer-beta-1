export const metadata = {
  title: "Whaleer - Dökümantasyon",
  description: "Whaleer ile kripto stratejileri oluştur, test et ve uygula.",
};

const sections = [
  {
    id: "olusturma",
    title: "1. Strateji Oluşturma",
    content: `Kendi stratejini oluşturmak için editörü kullan. RSI, EMA, hacim gibi indikatörleri destekler.`,
    sub: [
      { id: "olusturma-temel", title: "Temel Kurallar" },
      { id: "olusturma-indikator", title: "İndikatör Kullanımı" },
    ],
  },
  {
    id: "backtest",
    title: "2. Backtest",
    content: `Geçmiş veriler üzerinde stratejini test et. Performans, drawdown, başarı oranı gibi metrikleri incele.`,
  },
  {
    id: "bot",
    title: "3. Bot Çalıştırma",
    content: `Gerçek zamanlı veriyle bot çalıştır. Al/Sat işlemleri otomatik yapılır.`,
  },
  {
    id: "paylasim",
    title: "4. Strateji Paylaşımı",
    content: `Stratejileri NFT olarak mint edebilir veya arşivleyerek paylaşabilirsin.`,
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
                    {/* Her alt başlık için örnek açıklama */}
                    {sub.title} hakkında detaylı bilgi buraya yazılır.
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
