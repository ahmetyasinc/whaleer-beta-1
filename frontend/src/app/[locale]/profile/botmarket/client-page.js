'use client';

import BotMarketHeader from '@/components/profile_component/(botmarket)/botMarketHeader';
import BotsList from '@/components/profile_component/(botmarket)/botsList';
import FilterCard from '@/components/profile_component/(botmarket)/filterCard';

export default function ClientPage() {
    return (
        <div className="min-h-screen">
            <BotMarketHeader />
            <div className="flex flex-col">
                <FilterCard />
                <BotsList />
            </div>
        </div>
    );
}
