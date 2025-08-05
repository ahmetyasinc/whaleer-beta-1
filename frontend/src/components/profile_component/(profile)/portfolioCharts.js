"use client";

import PortfolioPieChart from "./portfolioPieChart";
import PortfolioLineChart from "./portfolioLineChart";

export default function PortfolioCharts() {
  return (
    <div className="w-full h-full flex flex-col gap-6">
      {/* Portfolio Distribution Chart */}
      <div className="flex-1 min-h-[400px]">
        <PortfolioPieChart />
      </div>

      {/* Portfolio Performance Chart */}
      <div className="flex-1 min-h-[400px]">
        <PortfolioLineChart />
      </div>
    </div>
  );
}