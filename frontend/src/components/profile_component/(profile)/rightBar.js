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
    <div className="w-[250px] h-[calc(100vh-200px)] pt-4 px-3 bg-[rgb(2,2,9,0.85)] text-white overflow-y-auto">
      <div className="space-y-3">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-gradient-to-r pt-4 from-zinc-800 to-[#2a2a41] rounded-lg h-16 shadow-md hover:shadow-lg border-l-4 border-blue-700 transition-all duration-300 flex flex-col justify-center px-4"
          >
            <h4 className="text-xs font-medium text-zinc-400 mb-1">{stat.title}</h4>
            <p className="text-lg font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
  
}
