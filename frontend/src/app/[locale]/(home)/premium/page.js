export const metadata = {
  title: "Premium Üyelik",
  description: "whaleer ile kripto stratejileri oluştur, test et ve uygula.",
};

export default function HomePage() {
  const plans = [
    {
      title: "Midye Planı",
      price: "Ücretsiz",
      features: [
        "1 strateji oluştur",
        "Sınırlı backtest",
        "Temel destek",
      ],
    },
    {
      title: "Ahtapot Planı",
      price: "$149/ay",
      features: [
        "Sınırsız strateji",
        "Gelişmiş backtest",
        "Gerçek zamanlı bot çalıştırma",
        "Öncelikli destek",
      ],
    },
    {
      title: "Balina Planı",
      price: "$299/ay",
      features: [
        "API erişimi",
        "Ekip hesabı",
        "Özel altyapı",
        "7/24 destek",
      ],
    },
  ];

  return (
    <section
      id="hero"
      className="hero section bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-20"
    >
      <div className="container mx-auto px-4 min-h-screen">
        <h1 className="text-5xl font-extrabold mb-4">Premium Üyelik</h1>
        <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
          Whaleer ile stratejini geliştir, test et ve uygulamaya al. Hemen planını seç, avantajlardan faydalan!
        </p>

        <div className="grid gap-10 md:grid-cols-3">
          {plans.map((plan, index) => (
            <div
              key={index}
              className="bg-gray-800 border border-gray-700 rounded-2xl shadow-lg hover:shadow-2xl transition duration-300 p-8 flex flex-col items-center"
            >
              <h2 className="text-2xl font-semibold text-white mb-2">{plan.title}</h2>
              <p className="text-2xl font-bold text-indigo-400 mb-6">{plan.price}</p>
              <ul className="text-gray-300 mb-8 space-y-3 text-sm w-full text-left">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <button className="mt-auto w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-xl transition">
                Üye Ol
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
