"use client";
import { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts"; 

export default function SyncedCharts() {
  const containerRef1 = useRef(null);
  const containerRef2 = useRef(null);

  useEffect(() => {
    function generateData(startValue, startDate) {
      const res = [];
      const time = startDate ?? new Date(Date.UTC(2018, 0, 1, 0, 0, 0, 0));
      for (let i = 0; i < 500; ++i) {
        res.push({
          time: time.getTime() / 1000,
          value: i + startValue,
        });
        time.setUTCDate(time.getUTCDate() + 1);
      }
      return res;
    }

    // İlk grafik oluşturuluyor
    const chart1 = createChart(containerRef1.current, {
      height: 250,
      crosshair: {
        mode: 0,
      },
      timeScale: {
        visible: true,
      },
      layout: {
        background: {
          type: 'solid',
          color: '#FFF5F5',
        },
      },
    });

    const mainSeries1 = chart1.addLineSeries({
      color: 'red',
    });

    mainSeries1.setData(generateData(0));

    // İkinci grafik oluşturuluyor
    const chart2 = createChart(containerRef2.current, {
      height: 200,
      layout: {
        background: {
          type: 'solid',
          color: '#F5F5FF',
        },
      },
      rightPriceScale: {
        autoScale: false      // Otomatik ölçeklendirmeyi kapat
    }
    });

    const mainSeries2 = chart2.addLineSeries({ 
      color: 'blue',
    });

    mainSeries2.setData(generateData(100));

    // Zaman ölçeklerini senkronize etme
    chart1.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
      chart2.timeScale().setVisibleLogicalRange(timeRange);
    });

    chart2.timeScale().subscribeVisibleLogicalRangeChange((timeRange) => {
      chart1.timeScale().setVisibleLogicalRange(timeRange);
    });

    // Crosshair senkronizasyonu
    function getCrosshairDataPoint(series, param) {
      if (!param.time) {
        return null;
      }
      const dataPoint = param.seriesData.get(series);
      return dataPoint || null;
    }

    function syncCrosshair(chart, series, dataPoint) {
      if (dataPoint) {
        chart.setCrosshairPosition(dataPoint.value, dataPoint.time, series);
        return;
      }
      chart.clearCrosshairPosition();
    }

    chart1.subscribeCrosshairMove((param) => {
      const dataPoint = getCrosshairDataPoint(mainSeries1, param);
      syncCrosshair(chart2, mainSeries2, dataPoint);
    });

    chart2.subscribeCrosshairMove((param) => {
      const dataPoint = getCrosshairDataPoint(mainSeries2, param);
      syncCrosshair(chart1, mainSeries1, dataPoint);
    });

    return () => {
      // Cleanup fonksiyonu: Grafikleri kaldırmak
      chart1.remove();
      chart2.remove();
    };
  }, []);

  return (
    <div>
      <div ref={containerRef1} className="w-[700px]"></div>
      <div ref={containerRef2} className="mt-8 w-[700px]"></div>
    </div>
  );
}
