"use client";

import PortfolioPieChart from "./portfolioPieChart";
import PortfolioLineChart from "./portfolioLineChart";

export default function PortfolioCharts() {
  return (
    <div className="w-full h-full flex flex-col gap-6">
      <div className="flex-1 min-h-[400px]">
        <PortfolioPieChart />
      </div>
      <div className="flex-1 min-h-[400px]">
        <PortfolioLineChart />
      </div>
    </div>
  );
}
