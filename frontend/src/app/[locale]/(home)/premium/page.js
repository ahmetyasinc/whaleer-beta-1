export const metadata = {
  title: "Premium Membership",
  description: "Create, test, and apply crypto strategies with Whaleer.",
};

export default function HomePage() {
  const plans = [
    {
      title: "Clam Plan",
      price: "Free",
      features: [
        "Create 1 bot",
        "Real-time bot execution",
        "Unlimited strategies",
      ],
    },
    {
      title: "Octopus Plan",
      price: "$5/month",
      features: [
        "Unlimited strategies",
        "Advanced scanner",
        "Advanced backtest",
        "Real-time bot execution",
        "Priority support",
      ],
    },
    {
      title: "Whale Plan",
      price: "$10/month",
      features: [
        "API access",
        "Team account",
        "Dedicated infrastructure",
        "24/7 support",
      ],
    },
  ];

  return (
    <section
      id="hero"
      className="hero section bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white py-20"
    >
      <div className="container mx-auto px-4 min-h-screen">
        <h1 className="text-5xl font-extrabold mb-4">Premium Membership</h1>
        <p className="text-lg text-gray-300 mb-12 max-w-2xl mx-auto">
          Improve, test, and deploy your strategy with Whaleer. Choose your plan now and enjoy the benefits!
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
                Sign Up
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
