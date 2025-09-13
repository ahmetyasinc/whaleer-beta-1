"use client";

import { useEffect } from "react";
import ProfileHeader from "@/components/profile_component/(profile)/profileHeader";
import RightBar from "@/components/profile_component/(profile)/rightBar";
import StrategyIndicatorCard from "@/components/profile_component/(profile)/strategyIndicatorCard";
import { bootstrapProfileIfNeeded } from "@/services/profile/bootstrapProfile";

export default function MyIndicatorsPage() {
  useEffect(() => { bootstrapProfileIfNeeded().catch(()=>{}); }, []);

  return (
    <div className="w-full h-screen flex flex-col bg-zinc-950/60 text-white">
      <ProfileHeader />
      <div className="flex flex-1">
        <div className="flex-1 overflow-y-auto p-4 h-full max-h-screen">
          <StrategyIndicatorCard />
        </div>
        <RightBar />
      </div>
    </div>
  );
}
