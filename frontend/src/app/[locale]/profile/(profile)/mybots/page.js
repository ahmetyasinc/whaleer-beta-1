"use client";

import { useEffect, useMemo } from "react";
import ProfileHeader from "@/components/profile_component/(profile)/profileHeader";
import RightBar from "@/components/profile_component/(profile)/rightBar";
import BotCard from "@/components/profile_component/(profile)/profileBotCard";
import BotPieChart from "@/components/profile_component/(profile)/botPieChart";
import { bootstrapProfileIfNeeded } from "@/services/profile/bootstrapProfile";
import { useProfileStore } from "@/store/profile/profileStore";
import { useAccountDataStore } from "@/store/profile/accountDataStore";

export default function MyBotsPage() {
  useEffect(() => {
    bootstrapProfileIfNeeded().catch(() => { });
  }, []);

  const activeApiId = useProfileStore((s) => s.activeApiId);
  const botsMap = useAccountDataStore((s) => s.botsByApiId);
  const bots = useMemo(() => botsMap?.[activeApiId] || [], [botsMap, activeApiId]);

  return (
    <div className="w-full h-[100dvh] overflow-hidden flex flex-col bg-zinc-950/60 text-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-black/90 backdrop-blur supports-[backdrop-filter]:bg-black/70">
        <ProfileHeader />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* İçerik alanı */}
        <div className="flex-1 min-h-0 overflow-hidden p-4 md:p-6">
          {/* XS/SM: tek kolon; LG+: 2/3 + 1/3 grid */}
          <div className="grid h-full grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 items-stretch">
            <div className="lg:col-span-2 h-full min-h-0">
              <BotCard bots={bots} />
            </div>
            <div className="lg:col-span-1 h-full min-h-0">
              <BotPieChart bots={bots} />
            </div>
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
