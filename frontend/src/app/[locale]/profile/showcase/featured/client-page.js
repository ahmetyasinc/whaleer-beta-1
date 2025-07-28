'use client';

import Header from '@/components/profile_component/(showcase)/header';
import UserLeaderBoard from '@/components/profile_component/(showcase)/(featured)/userLeaderBoard';
import BotLeaderBoard from '@/components/profile_component/(showcase)/(featured)/botLeaderBoard';

export default function ClientPage() {
  return (
    <div>
      <Header />
      <div className="container mx-20 px-0 py-8 pt-[100px]">
        <div className="flex gap-4">

          {/* Sol yarı - Kullanıcı Sıralaması */}
          <div className="w-4/6">
            <UserLeaderBoard />
          </div>
          
          {/* Sağ yarı - Diğer kart için boş alan */}
          <div className="w-4/6">
             <BotLeaderBoard />
          </div>

        </div>
      </div>
    </div>
  );
}
