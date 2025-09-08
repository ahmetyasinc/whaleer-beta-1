'use client';

import { useEffect } from "react";
import { bootstrapProfileIfNeeded } from "@/services/profile/bootstrapProfile";
import ProfileHeader from "@/components/profile_component/(profile)/profileHeader";
import RightBar from "@/components/profile_component/(profile)/rightBar";
import Portfolio from "@/components/profile_component/(profile)/portfolio";
import PortfolioChart from "@/components/profile_component/(profile)/portfolioCharts";

export default function ClientProfilePage() {
  useEffect(() => {
    bootstrapProfileIfNeeded().catch(console.error);
  }, []);

  return (
    <div className="w-full h-screen flex flex-col bg-zinc-950/60 text-white">
      <div className="flex-shrink-0">
        <ProfileHeader />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="flex gap-6 h-full">
            <div className="w-2/3 overflow-y-auto">
              <Portfolio />
            </div>
            <div className="w-1/3 overflow-y-auto">
              <PortfolioChart />
            </div>
          </div>
        </div>
        <RightBar />
      </div>
    </div>
  );
}
