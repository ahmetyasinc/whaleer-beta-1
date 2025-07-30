"use client";

import ProfileHeader from "@/components/profile_component/(profile)/profileHeader";
import RightBar from "@/components/profile_component/(profile)/rightBar";
import StrategyIndicatorCard from "@/components/profile_component/(profile)/strategyIndicatorCard";


export default function MyIndicatorsPage() {
  return (
    <div className="w-full h-screen flex flex-col bg-zinc-950/60 text-white">
      {/* Header */}
      <ProfileHeader />

      <div className="flex flex-1">
        {/* Ana içerik */}
        <div className="flex-1 overflow-y-auto p-6">
          <StrategyIndicatorCard />
        </div>

        {/* Sağ bar */}
        <RightBar />
      </div>
    </div>
  );
}


