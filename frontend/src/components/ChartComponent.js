"use client";
import { CrosshairMode } from "lightweight-charts"; // 📌 CrosshairMode ekle
import { useEffect, useState, useRef } from "react";
import { createChart } from "lightweight-charts";

export default function ChartComponent() {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/get-binance-data/`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        symbol: "BTCUSDT", // Buraya istediğin sembolü gönderebilirsin
                        interval: "1h",    // Buraya istediğin zaman aralığını gönderebilirsin
                    }),
                });

                const data = await response.json();

                if (data.status === "success" && data.data) {
                    // FastAPI'den gelen veriyi Lightweight Charts formatına çevir
                    const formattedData = data.data.map((candle) => ({
                        time: Math.floor(new Date(candle.timestamp).getTime() / 1000), // Unix timestamp (saniye cinsinden)
                        open: candle.open,
                        high: candle.high,
                        low: candle.low,
                        close: candle.close,
                    }));

                    setChartData(formattedData);
                }
            } catch (error) {
                console.error("Veri çekme hatası:", error);
            }
        }

        fetchData();
    }, []);


    useEffect(() => {
        if (chartData.length === 0 || !chartContainerRef.current) return;
    
        // 🔹 Grafiği oluşturma ayarları
        const chartOptions = { 
            layout: { 
                textColor: 'white', 
                background: { type: 'solid', color: 'black' }  // Siyah arka plan
            },
            grid: {
                vertLines: {
                    color: 'rgba(128, 128, 128, 0.3)',  // Gri ve %30 saydam dikey çizgiler
                    style: 1, // Solid çizgi
                },
                horzLines: {
                    color: 'rgba(128, 128, 128, 0.3)',  // Gri ve %30 saydam yatay çizgiler
                    style: 1, // Solid çizgi
                }
            },
            crosshair: {
                mode: CrosshairMode.Normal // 🔥 Mıknatıs etkisini kapatır
            }
        };
      
        // 🔹 Grafiği oluştur
        const chart = createChart(chartContainerRef.current, chartOptions);
      
        // 🔹 Mum grafiğini ekle ve stil ver
        const candleSeries = chart.addCandlestickSeries({
            upColor: '#26a69a', 
            downColor: '#ef5350', 
            borderVisible: false, 
            wickUpColor: '#26a69a', 
            wickDownColor: '#ef5350'
        });
      
        candleSeries.setData(chartData);
      
        // 🔹 Grafiği içeriğe sığdır
        chart.timeScale().fitContent();
      
        // 🔹 Pencere boyutu değiştiğinde yeniden boyutlandır
        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };
      
        window.addEventListener("resize", handleResize);
      
        // 🔹 Cleanup: Bileşen unmount olduğunda chart'ı kaldır
        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [chartData]);
  
  

    return (
        <div>
            <div ref={chartContainerRef} style={{ width: "100%", height: "400px" }}></div>
        </div>
    );
}
