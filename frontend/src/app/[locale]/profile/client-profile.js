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
    <div className="w-full min-h-[100dvh] flex flex-col bg-zinc-950/60 text-white">
      {/* Sticky header: mobil için üstte sabit, blur + opaklık */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/70">
        <ProfileHeader />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* İçerik alanı */}
        <div className="flex-1 min-h-0 overflow-hidden p-4 md:p-6">
          {/* XS/SM: tek kolon; LG+: 2/3 + 1/3 grid — büyük ekranda boşluk bırakmaz */}
          <div className="grid h-full grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-stretch">
            <div className="lg:col-span-2 min-h-[320px] h-full min-h-0 overflow-y-auto">
              <Portfolio />
            </div>
            <div className="lg:col-span-1 min-h-[320px] h-full min-h-0 overflow-y-auto">
              <PortfolioChart />
            </div>
          </div>
        </div>

        {/* Sağ panel: sadece lg ve üstünde göster (küçük ekranda gizle) */}
        <div className="hidden lg:flex">
          <RightBar />
        </div>
      </div>
    </div>
  );
}
