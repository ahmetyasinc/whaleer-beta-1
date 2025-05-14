"use client";  // ✅ Çünkü useEffect kullanıyoruz

import { useEffect, useState } from "react";
import Hero from "@/components/home_component/Hero";

export default function HomeClientComponent() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch("${process.env.NEXT_PUBLIC_API_URL}/api/hero-infos/");
                const result = await res.json();
                setData(result);
            } catch (error) {
                console.error("Veri çekme hatası:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    return (
        <Hero 
            userCount={data?.user_count || 0} 
            traderCount={data?.trader_count || 0} 
            strategyCount={data?.strategy_count || 0} 
            botCount={data?.bot_count || 0}  
        />
    );
}
