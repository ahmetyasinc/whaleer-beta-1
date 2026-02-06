'use client';

import React, { useState } from 'react';
import BotMarketHeader from '@/components/profile_component/(botmarket)/botMarketHeader';
import BotsList from '@/components/profile_component/(botmarket)/botsList';
import FilterCard from '@/components/profile_component/(botmarket)/filterCard';
import { useBotCardStore } from '@/store/botmarket/botCardStore';
import { useEffect } from 'react';

const initialFilters = {
    onlyMyBots: false,
    tradeType: 'all',
    botType: 'all',
    salePrice: { min: '', max: '' },
    rentalPrice: { min: '', max: '' },
    minPowerScore: '',
    minProfitMargin: { value: '', period: 'day' },
    minUsageTime: '',
};

const initialSort = { key: 'default', direction: 'desc' };

export default function ClientPage() {
    const [mounted, setMounted] = useState(false);
    const [filters, setFilters] = useState(initialFilters);
    const [sort, setSort] = useState(initialSort);

    // Store'dan fetch fonksiyonunu alıyoruz
    const fetchBots = useBotCardStore((state) => state.fetchBots);

    // Sayfa mount olduğunda veriyi bir kez çekiyoruz
    useEffect(() => {
        setMounted(true); // Bileşen yüklendiğinde true yap
        fetchBots();
    }, [fetchBots]);
    if (!mounted) return null;

    const setFilter = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            <BotMarketHeader />
            <div className="flex flex-col gap-2 flex-1 min-h-0">
                <FilterCard filters={filters} setFilter={setFilter} setFilters={setFilters} />
                <BotsList sort={sort} setSort={setSort} filters={filters} />
            </div>
        </div>
    );
}
