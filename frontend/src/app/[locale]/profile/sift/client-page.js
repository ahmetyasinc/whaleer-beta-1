'use client';

import { FaLock } from 'react-icons/fa';
import IndicatorHeatMap from "@/components/profile_component/(sift)/IndicatorHeatMap";
import StrategySift from "@/components/profile_component/(sift)/strategySift";
import WhaleerSift from "@/components/profile_component/(sift)/whaleerSift";

const isBeta = false;

export default function ClientPage() {
  if (isBeta) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden">
  <div
  className="absolute inset-0 bg-center bg-no-repeat bg-cover blur-lg"
  style={{ backgroundImage: "url('/pages/sift.png')" }}
></div>
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
  <div className="px-16 h-screen overflow-hidden">
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 h-full py-3">
      <div className="w-full h-full bg-zinc-900 shadow-lg rounded p-2 text-white overflow-auto">
        <WhaleerSift />
      </div>
      <div className="w-full h-full bg-zinc-900 shadow-lg rounded p-2 text-white z-20 overflow-auto">
        <StrategySift />
      </div>
      <div className="w-full h-full bg-zinc-900 shadow-lg rounded p-2 text-white z-10 overflow-auto">
        <IndicatorHeatMap />
      </div>
    </div>
  </div>
);

}