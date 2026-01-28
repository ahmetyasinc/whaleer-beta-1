"use client";

import React, { useMemo } from "react";

const CandleLoader = () => {
  // Görseldeki grafiğin şeklini statik veri olarak oluşturuyoruz.
  const chartData = useMemo(() => {
    const data = [
      // 1-5: Yükselen başlangıç
      { open: 100, close: 116, high: 121, low: 99 },
      { open: 116, close: 118, high: 123, low: 110.4 },
      { open: 118.2, close: 122, high: 126.6, low: 108.3 },
      { open: 123.45, close: 120.55, high: 134.3, low: 130.7 },
      { open: 120.55, close: 133.6, high: 140.9, low: 117.18 },

      // 6-10: Zirveye tırmanış ve ilk düşüş
      { open: 133.57, close: 133.33, high: 148.3, low: 130.7 }, // Düşüş (fitilli)
      { open: 131.65, close: 124.3, high: 139.8, low: 119.1 }, // Büyük düşüş
      { open: 124.3, close: 103.86, high: 125.4, low: 102.5 }, // Zirve sonrası en büyük düşüş
      { open: 104, close: 116.76, high: 121.8, low: 103.7 }, // Düşüş devamı
      { open: 117.5, close: 127.67, high: 141.2, low: 117.4 }, // Büyük yükseliş (dipten dönüş)

      // 11-15: Zirve bölgesi (dalgalı)
      { open: 127.67, close: 151.54, high: 151.55, low: 127.4 }, // Zirveye çıkış
      { open: 153.83, close: 159.13, high: 166.5, low: 145.51 }, // Zirve mum (fitilli)
      { open: 160.34, close: 158.05, high: 176, low: 151.78 }, // Zirveden ilk düşüş
      { open: 158.17, close: 150.81, high: 169.86, low: 148.76 }, // Yatay/düşüş
      { open: 151.3, close: 157.93, high: 165.9, low: 142.62 }, // Düşüş
      { open: 158.41, close: 153.22, high: 159.5, low: 141.05 }, // Düşüş (uzun üst fitilli)
      { open: 153.22, close: 150.1, high: 165.16, low: 143.1 },
      { open: 148.76, close: 157.02, high: 157.44, low: 134.42 }, // Hafif yükseliş
    ];

    // Normalizasyon için min/max
    const min = Math.min(...data.map(d => d.low));
    const max = Math.max(...data.map(d => d.high));
    return { data, min, max, range: max - min };
  }, []);

  return (
    <div className="flex items-center justify-center p-4 rounded-xl bg-black w-fit mx-auto">
      {/* Animasyon Keyframes ve Shadow Efekti Tanımı */}
      <style jsx>{`
        @keyframes candle-cycle {
          0% { opacity: 0; transform: scaleY(0.8); }
          10% { opacity: 1; transform: scaleY(1); }
          50% { opacity: 1; transform: scaleY(1); }
          60% { opacity: 0; transform: scaleY(0.8); }
          100% { opacity: 0; transform: scaleY(0.8); }
        }
        .animate-candle {
          animation: candle-cycle 3s infinite ease-in-out;
        }
        /* Mum ve fitillere beyaz parlama efekti */
        .white-glow {
          filter: drop-shadow(0 0 1.5px rgba(255, 255, 255, 0.4));
        }
      `}</style>

      <div className="flex items-end h-20 gap-[3px]">
        {chartData.data.map((candle, i) => {
          // Hesaplamalar
          const range = chartData.range || 1;
          const min = chartData.min;

          const bottomWick = ((candle.low - min) / range) * 100;
          const heightWick = ((candle.high - candle.low) / range) * 100;

          const bodyBottomVal = Math.min(candle.open, candle.close);
          const bottomBody = ((bodyBottomVal - min) / range) * 100;
          const heightBody = (Math.abs(candle.open - candle.close) / range) * 100;

          // Gecikme Hesaplama (Daha hızlı dalgalanma için 0.06s)
          const delay = `${i * 0.06}s`;

          return (
            <div
              key={i}
              className="relative w-[7px] h-full animate-candle"
              style={{ animationDelay: delay }}
            >
              <div className="relative w-full h-full white-glow">
                {/* Fitil (Wick) - Beyaz */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 bg-white w-[1px]"
                  style={{
                    bottom: `${bottomWick}%`,
                    height: `${heightWick}%`,
                  }}
                />
                {/* Gövde (Body) - Beyaz ve Beyaz Çerçeveli */}
                <div
                  className="absolute left-0 w-full bg-white border border-white"
                  style={{
                    bottom: `${bottomBody}%`,
                    height: `max(2px, ${heightBody}%)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CandleLoader;