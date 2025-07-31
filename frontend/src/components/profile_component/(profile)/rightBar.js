"use client";

export default function RightBar() {
  const stats = [
    { title: "İndikatör Sayısı", value: 12 },
    { title: "Strateji Sayısı", value: 8 },
    { title: "Bot Sayısı", value: 4 },
    { title: "Aktif Bot", value: 3 },
    { title: "Bot Performansı", value: "%12.4" },
  ];

  return (
    <div className="w-[250px] h-[calc(100vh-60px)] pt-4 px-3 bg-black text-white overflow-y-auto shrink-0">
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-r pt-4 from-gray-950 to-zinc-900 rounded-lg h-16 shadow-md hover:shadow-lg border-1 border-neutral-700 transition-all duration-300 flex flex-col justify-center px-4"
            style={{
            animationDelay: `${index * 200}ms`,
            animation: "fadeInUpRightBar 1s ease-out forwards",
            }}
          >
            <h4 className="text-xs font-medium text-zinc-400 mb-1">{stat.title}</h4>
            <p className="text-lg font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>
          <style jsx>{`
            @keyframes fadeInUpRightBar {
              from {
                opacity: 0;
                transform: translateX(40px);
              }
              to {
                opacity: 1;
                transform: translateX(0);
              }
            }
          `}</style>
    </div>
  );
  
}
