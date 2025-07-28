'use client';

import { FaLock } from 'react-icons/fa';

import ProfileHeader from "@/components/profile_component/(profile)/profileHeader";
import RightBar from "@/components/profile_component/(profile)/rightBar";
import Portfolio from "@/components/profile_component/(profile)/portfolio";
import StrategyIndicatorCard from "@/components/profile_component/(profile)/strategyIndicatorCard";
import BotCard from "@/components/profile_component/(profile)/profileBotCard";

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
    <div className="h-screen flex flex-col overflow-hidden">
      <ProfileHeader />
      <div className="flex flex-1 overflow-hidden">
        <main className="flex w-full flex-1 overflow-auto p-3">
          <Portfolio />
          <StrategyIndicatorCard />
          <BotCard />
        </main>
        <RightBar />
      </div>
    </div>
  );
}
