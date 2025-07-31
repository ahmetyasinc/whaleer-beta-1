"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { usePortfolioStore } from "@/store/profile/portfolioStore";

const COLORS = [
  "#3B82F6", // Tailwind blue-500
  "hsl(290,100%,79%)", // Tailwind emerald-500
  "#90fbff", // Tailwind amber-500
  "rgb(122,255,122)", // Tailwind red-500
  "hsl(246,28%,28%)", // Tailwind violet-500
];

export default function PortfolioChart() {
  const { portfolio } = usePortfolioStore();

  // Calculate portfolio cost values
  const data = portfolio.map((item) => ({
    name: item.symbol.toUpperCase(),
    value: item.amount,
  }));

  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  // Inner label showing percentage and value
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

  // Outer label showing coin names with lines
  const renderOuterLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 30; // Line length
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    
    const lineStartX = cx + (outerRadius + 5) * Math.cos(-midAngle * RADIAN);
    const lineStartY = cy + (outerRadius + 5) * Math.sin(-midAngle * RADIAN);
    
    return (
      <g>
        {/* Connector line */}
        <line
          x1={lineStartX}
          y1={lineStartY}
          x2={x}
          y2={y}
          stroke="white"
          strokeWidth="1"
        />
        {/* Coin name */}
        <text 
          x={x} 
          y={y} 
          fill="white" 
          textAnchor={x > cx ? 'start' : 'end'} 
          dominantBaseline="middle"
          fontSize="12"
          fontWeight="700"
        >
          {name}
        </text>
      </g>
    );
  };

  return (
    <div className="bg-gradient-to-br from-gray-950 to-zinc-900 rounded-xl shadow-lg border-1 border-zinc-700 p-4 text-white w-full h-full flex flex-col">
      {/* Header */}
      <div className="pb-3 mb-4 border-b border-zinc-700">
        <h3 className="text-lg font-semibold text-center">
          Bot Portfolio Cost Distribution
        </h3>
      </div>

      {/* Chart */}
      <div className="flex-1 overflow-hidden border-1 border-zinc-700 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              innerRadius={20}
              fill="#8884d8"
              labelLine={false}
              label={renderInnerLabel}
              stroke="hsl(0,0%,14%)"
              strokeWidth={0}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>

            {/* Second Pie for outer labels */}
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              outerRadius={100}
              innerRadius={100}
              fill="transparent"
              labelLine={false}
              label={renderOuterLabel}
              stroke="white"
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
