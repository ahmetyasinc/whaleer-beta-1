"use client";

import { useEffect } from "react";
import ProfileHeader from "@/components/profile_component/(profile)/profileHeader";
import RightBar from "@/components/profile_component/(profile)/rightBar";
import StrategyIndicatorCard from "@/components/profile_component/(profile)/strategyIndicatorCard";
import { bootstrapProfileIfNeeded } from "@/services/profile/bootstrapProfile";

export default function MyIndicatorsPage() {
  useEffect(() => {
    bootstrapProfileIfNeeded().catch(() => { });
  }, []);

  return (
    <div className="w-full h-[100dvh] overflow-hidden flex flex-col bg-zinc-950/60 text-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/70">
        <ProfileHeader />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* İçerik */}
        <div className="flex-1 min-h-0 overflow-hidden p-4 md:p-6">
          <div className="min-h-[320px]">
            <StrategyIndicatorCard />
          </div>
        </div>

        {/* Sağ panel: küçük ekranlarda gizli */}
        <div className="hidden lg:flex">
          <RightBar />
        </div>
      </div>
    </div>
  );
}
