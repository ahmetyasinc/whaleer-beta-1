'use client';

import { FaLock } from 'react-icons/fa';
import Header from '@/components/profile_component/(showcase)/header';
import BotSidebar from '@/components/profile_component/(showcase)/(explore)/botSideBar';
import BotDiscoveryContent from '@/components/profile_component/(showcase)/(explore)/botDiscoveryContent';
import FilterLeftBar from '@/components/profile_component/(showcase)/(explore)/filterLeftBar';

export default function ClientPage() {
    return (
      <div>
        <Header />
        <div className="flex">
          <FilterLeftBar/>
          <BotDiscoveryContent />
          <BotSidebar />
        </div>
      </div>
    );

}