"use client";

import { useEffect, useMemo } from 'react';
import ProfileHeader from "@/components/profile_component/(profile)/profileHeader";
import RightBar from "@/components/profile_component/(profile)/rightBar";
import BotCard from "@/components/profile_component/(profile)/profileBotCard";
import BotPieChart from "@/components/profile_component/(profile)/botPieChart";
import { bootstrapProfileIfNeeded } from "@/services/profile/bootstrapProfile";
import { useProfileStore } from "@/store/profile/profileStore";
import { useAccountDataStore } from "@/store/profile/accountDataStore";

export default function MyBotsPage() {
  useEffect(() => {
    bootstrapProfileIfNeeded().catch(()=>{});
  }, []);

  const activeApiId = useProfileStore(s => s.activeApiId);
  const botsMap = useAccountDataStore(s => s.botsByApiId);
  const bots = useMemo(() => botsMap?.[activeApiId] || [], [botsMap, activeApiId]);

  return (
    <div className="w-full h-screen flex flex-col bg-zinc-950/60 text-white">
      <ProfileHeader />
      <div className="flex flex-1">
        <div className="flex-1 overflow-y-auto p-6 flex gap-6">
          <div className="w-2/3"><BotCard bots={bots} /></div>
          <div className="w-1/3"><BotPieChart bots={bots} /></div>
        </div>
        <RightBar />
      </div>
    </div>
  );
}
