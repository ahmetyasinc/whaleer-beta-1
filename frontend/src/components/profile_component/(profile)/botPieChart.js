"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import useProfileBotStore from "@/store/profile/profileBotStore";

const COLORS = [
  "#3B82F6", // mavi
  "rgb(200,10,200)", // pembe
  "#90fbff", // açık mavi
  "rgb(122,255,122)", // yeşil
  "hsl(246,28%,28%)", // mor
];

export default function BotPieChart() {
  const { bots } = useProfileBotStore();

  // Botların yönettiği miktarları pie chart için hazırla
  const data = bots.map((bot) => ({
    name: bot.name,
    value: bot.managedAmount,
  }));

  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  // Dilim içindeki verileri gösteren label
  const renderInnerLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, value }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    const percentage = ((value / total) * 100).toFixed(1);
    const formattedValue = new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(value);

    return (
      <text 
        x={x} 
        y={y} 
        fill="black" 
        textAnchor="middle" 
        dominantBaseline="middle"
        fontSize="11"
        fontWeight="600"
      >
        <tspan x={x} dy="-6">{percentage}%</tspan>
        <tspan x={x} dy="12">{formattedValue}</tspan>
      </text>
    );
  };

  // Dışarıdaki bot adlarını gösteren label (çubuklu)
  const renderOuterLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30; // Çubuk uzunluğu
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    // Çubuk başlangıç noktası
    const lineStartX = cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN);
    const lineStartY = cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN);
    
    // Bot adını kısalt
    const displayName = name.length > 15 ? name.slice(0, 15) + "..." : name;
    
    return (
      <g>
        {/* Çubuk çizgisi */}
        <line
          x1={lineStartX}
          y1={lineStartY}
          x2={x}
          y2={y}
          stroke="white"
          strokeWidth="1"
        />
        {/* Bot adı */}
        <text 
          x={x} 
          y={y} 
          fill="white" 
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="700"
        >
          {displayName}
        </text>
      </g>
    );
  };

return (
  <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border-1 border-zinc-700 p-4 text-white w-full h-full flex flex-col">
    {/* Header */}
    <div className="pb-3 mb-4 border-b border-zinc-700">
      <h3 className="text-lg font-semibold text-center">
        Botların Yönetim Dağılımı
      </h3>
    </div>

    {/* Chart */}
    <div className="overflow-hidden border-1 border-zinc-700 rounded-lg p-4">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            innerRadius={20}
            fill="rgb(222,222,222)"
            labelLine={false}
            label={renderInnerLabel}
            stroke="black" // kenar rengi
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>

          {/* Dışarıdaki bot adları için ikinci Pie */}
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            outerRadius={100}
            innerRadius={100}
            fill="transparent"
            labelLine={false}
            label={renderOuterLabel}
            stroke="black"
            strokeWidth={0}
          >
            {data.map((_, index) => (
              <Cell key={`outer-cell-${index}`} fill="transparent" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  </div>
);

}