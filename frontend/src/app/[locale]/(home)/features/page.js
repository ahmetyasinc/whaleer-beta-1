export const metadata = {
  title: "Whaleer Guide",
  description: "Create, test, and execute crypto strategies with Whaleer.",
};

export default function HomePage() {
  const features = [
    {
      title: "1. Create Your Strategy",
      description:
        "Easily build your own algorithmic strategy using the Python-based editor. Define your rules with indicators like RSI, MACD.",
      icon: "📈",
    },
    {
      title: "2. Test with Backtest",
      description:
        "Test your strategy on historical data. Instantly see the results and analyze its performance.",
      icon: "🧪",
    },
    {
      title: "3. Run the Bot",
      description:
        "Execute your strategy in real-time with live market data. Let the system trade on your behalf.",
      icon: "🤖",
    },
    {
      title: "4. Archive and Market",
      description:
        "Archive your strategies, compare their past performance. Rent or sell them if you like.",
      icon: "📂",
    },
  ];

  return (
    <section
      id="hero"
      className="hero section bg-gradient-to-b from-neutral-950 via-neutral-900 to-neutral-950 text-neutral-100"
    >
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="text-center mb-12" data-aos="fade-up" data-aos-delay="100">
          <h1 className="text-4xl font-bold text-white mb-4">
            Algorithmic Trading with Whaleer
          </h1>
          <p className="text-lg text-neutral-300">
            Create, test, run, and share strategies with Whaleer. Follow the steps below to get started!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          {features.map((item, index) => (
            <div
              key={index}
              className="group bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur
                         transition-all duration-300 hover:bg-white/10 hover:shadow-2xl"
              data-aos="fade-up"
              data-aos-delay={200 + index * 100}
            >
              <div className="text-4xl mb-4">{item.icon}</div>
              <h3 className="text-xl font-semibold text-white mb-2">{item.title}</h3>
              <p className="text-neutral-300">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <a
            href="/login"
            className="inline-block rounded-xl bg-sky-600 text-white px-6 py-3 text-lg font-medium
                       hover:bg-sky-500 focus:outline-none focus-visible:ring focus-visible:ring-sky-400
                       transition-colors duration-300"
          >
            Get Started Now
          </a>
        </div>
      </div>
    </section>
  );
}
