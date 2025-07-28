
export const metadata = {
  title: "Whaleer Rehberi",
  description: "Whaleer ile kripto stratejileri oluştur, test et ve uygula.",
};


export default function HomePage() {
  const features = [
    {
      title: "1. Stratejini Oluştur",
      description: "Python tabanlı editör ile kendi algoritmik stratejini kolayca oluştur. RSI, MACD gibi indikatörleri kullanarak kurallarını tanımla.",
      icon: "📈",
    },
    {
      title: "2. Backtest ile Test Et",
      description: "Stratejini geçmiş veriler üzerinde test et. Anında sonuçları gör ve performansını analiz et.",
      icon: "🧪",
    },
    {
      title: "3. Botu Çalıştır",
      description: "Stratejini gerçek zamanlı veriyle otomatik olarak çalıştır. Sistemin senin yerine işlem yapsın.",
      icon: "🤖",
    },
    {
      title: "4. Arşivle ve Pazarla",
      description: "Stratejilerini arşivle, geçmiş performanslarını karşılaştır. İster kirala ister sat.",
      icon: "📂",
    },
  ];

    return (
      <section id="hero" className="hero section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white-800 mb-4">Whaleer ile Algoritmik Trade</h1>
          <p className="text-lg text-white-600">
            Whaleer ile strateji oluştur, test et, çalıştır ve paylaş. Başlamak için aşağıdaki adımları takip et!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {features.map((item, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-md p-6 hover:shadow-lg transition opacity-90 hover:opacity-100"
              data-aos="fade-up"
              data-aos-delay={`${200 + index * 100}`}
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-gray-600">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <a
            href="/kayit"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl text-lg font-medium hover:bg-blue-700 transition"
          >
            Hemen Başla
          </a>
        </div>
      </div>
    </section>
    );
  }
  