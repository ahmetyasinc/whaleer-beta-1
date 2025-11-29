"use client";

import PortfolioPieChart from "./portfolioPieChart";
import PortfolioLineChart from "./portfolioLineChart";

export default function PortfolioCharts() {
  return (
    <div className="w-full h-[calc(100vh-108px)] min-h-0 flex flex-col scrollbar-hide">
      {/* Scroll alanı */}
      <div className="flex-1 min-h-0 flex flex-col gap-6 overflow-y-auto pr-1 scrollbar-hide">
        <div className="flex-shrink-0">
          <PortfolioPieChart />
        </div>

        <div className="flex-shrink-0">
          <PortfolioLineChart />
        </div>
      </div>
    </div>
  );
}
