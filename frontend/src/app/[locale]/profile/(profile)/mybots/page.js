"use client";

import { useEffect } from 'react';
import ProfileHeader from "@/components/profile_component/(profile)/profileHeader";
import RightBar from "@/components/profile_component/(profile)/rightBar";
import BotCard from "@/components/profile_component/(profile)/profileBotCard";
import BotPieChart from "@/components/profile_component/(profile)/botPieChart";
import { useBotStore } from '@/store/bot/botStore';


export default function MyBotsPage() {
    const bots = useBotStore((state) => state.bots);
    const loadBots = useBotStore((state) => state.loadBots);

  useEffect(() => {
    const loadData = async () => {
      await loadBots();
    };

    loadData();
  }, []);

return (
  <div className="w-full h-screen flex flex-col bg-zinc-950/60 text-white">
    {/* Header */}
    <ProfileHeader />

    <div className="flex flex-1">
      {/* Ana içerik */}
      <div className="flex-1 overflow-y-auto p-6 flex gap-6">
        {/* Sol kısım - BotCard */}
        <div className="w-2/3">
          <BotCard />
        </div>

        {/* Sağ kısım - BotPieChart */}
        <div className="w-1/3">
          <BotPieChart />
        </div>
      </div>

      {/* Sağ bar */}
      <RightBar />
    </div>
  </div>
);
}


