'use client';

import { FaLock } from 'react-icons/fa';

import ProfileHeader from "@/components/profile_component/(profile)/profileHeader";
import RightBar from "@/components/profile_component/(profile)/rightBar";
import Portfolio from "@/components/profile_component/(profile)/portfolio";
import PortfolioChart from "@/components/profile_component/(profile)/portfolioCharts";

const isBeta = false;

export default function ClientProfilePage() {
  if (isBeta) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
        <img
          src="/pages/profil.png"
          alt="Profil"
          className="absolute top-0 left-0 w-full h-full object-cover blur"
        />
        <div className="absolute inset-0 bg-white bg-opacity-10 z-10" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
          <FaLock className="text-yellow-500 text-6xl mb-4" />
          <h1 className="text-white text-xl font-semibold">
            Bu sayfa yakında sizlerle buluşacak
          </h1>
        </div>
      </div>
    );
  }
  

return (
  <div className="w-full h-screen flex flex-col bg-zinc-950/60 text-white">
    {/* Header */}
    <div className="flex-shrink-0">
      <ProfileHeader />
    </div>

    <div className="flex flex-1 overflow-hidden">
      {/* Ana içerik */}
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="flex gap-6 h-full">
        {/* Portfolio daha geniş */}
        <div className="w-2/3 overflow-y-auto">
          <Portfolio />
        </div>
        {/* Chart daha dar */}
        <div className="w-1/3 overflow-y-auto">
          <PortfolioChart />
        </div>
      </div>
    </div>


      {/* Sağ bar */}
      <RightBar />
    </div>
  </div>
);

}


