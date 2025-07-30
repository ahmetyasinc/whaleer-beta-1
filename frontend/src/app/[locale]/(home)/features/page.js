
export const metadata = {
  title: "Whaleer Guide",
  description: "Create, test, and execute crypto strategies with Whaleer.",
};


export default function HomePage() {
  const features = [
    {
      title: "1. Create Your Strategy",
      description: "Easily build your own algorithmic strategy using the Python-based editor. Define your rules with indicators like RSI, MACD.",
      icon: "📈",
    },
    {
      title: "2. Test with Backtest",
      description: "Test your strategy on historical data. Instantly see the results and analyze its performance.",
      icon: "🧪",
    },
    {
      title: "3. Run the Bot",
      description: "Execute your strategy in real-time with live market data. Let the system trade on your behalf.",
      icon: "🤖",
    },
    {
      title: "4. Archive and Market",
      description: "Archive your strategies, compare their past performance. Rent or sell them if you like.",
      icon: "📂",
    },
  ];

    return (
      <section id="hero" className="hero section">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white-800 mb-4">Algorithmic Trading with Whaleer</h1>
          <p className="text-lg text-white-600">
            Create, test, run, and share strategies with Whaleer. Follow the steps below to get started!
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
            href="/login"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-xl text-lg font-medium hover:bg-blue-700 transition"
          >
            Get Started Now
          </a>
        </div>
      </div>
    </section>
    );
  }
  