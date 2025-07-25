"use client";
import { CrosshairMode } from "lightweight-charts"; 
import { useEffect, useState, useRef } from "react";
import { createChart } from "lightweight-charts";
import { useLogout } from "@/utils/HookLogout"; 
import useMagnetStore from "@/store/indicator/magnetStore"; // Zustand store'u import et
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore"; // Indicator verilerini import et
import useStrategyDataStore from "@/store/indicator/strategyDataStore"; // Indicator verilerini import et
import useCryptoStore from "@/store/indicator/cryptoPinStore"; // Zustand store'u import et
import IndicatorSettingsModal from './(modal_tabs)/indicatorSettingsModal';
import StrategySettingsModal from './(modal_tabs)/strategySettingsModal';


export default function ChartComponent() {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const [chartData, setChartData] = useState([]);
    const handleLogout = useLogout();   
    const { isMagnetMode } = useMagnetStore();
    const { indicatorData, removeSubIndicator  } = useIndicatorDataStore(); // ✅ burada
    const { strategyData, removeSubStrategy } = useStrategyDataStore(); // ✅ burada
    const { selectedCrypto, selectedPeriod } = useCryptoStore();
    const [settingsIndicatorModalOpen, setSettingsIndicatorModalOpen] = useState(false);
    const [settingsStrategyModalOpen, setSettingsStrategyModalOpen] = useState(false);
    const [activeIndicatorId, setActiveIndicatorId] = useState(null);
    const [activeStrategyId, setActiveStrategyId] = useState(null);
    const [activeSubIndicatorId, setActiveSubIndicatorId] = useState(null);
    const [activeSubStrategyId, setActiveSubStrategyId] = useState(null);

    const openIndicatorSettings = (indicatorId, subId) => {
        setActiveIndicatorId(indicatorId);
        setActiveSubIndicatorId(subId);
        setSettingsIndicatorModalOpen(true);
    };

    const openStrategySettings = (strategyId, subId) => {
        setActiveStrategyId(strategyId);
        setActiveSubStrategyId(subId);
        setSettingsStrategyModalOpen(true);
    };

    useEffect(() => {
      const recalculateIndicators = async () => {
        const indicatorState = useIndicatorDataStore.getState();
        const strategyState = useStrategyDataStore.getState();

        const allIndicators = indicatorState.indicatorData || {};
        const allStrategies = strategyState.strategyData || {};
        console.log("allIndicators, allStrategies");
        console.log(allIndicators, allStrategies);
    
        for (const [indicatorId, indicator] of Object.entries(allIndicators)) {
          const subItems = indicator.subItems || {};
          for (const [subId, sub] of Object.entries(subItems)) {
            const inputs = sub.inputs?.inputs || {};
            const formattedInputs = Object.fromEntries(
              inputs.map(input => [input.name, input.default])
            );
            console.log("Recalculating indicator:");
            await indicatorState.updateInputs(indicatorId, subId, formattedInputs);
          }
        }
        for (const [strategyId, strategy] of Object.entries(allStrategies)) {
          const subItems = strategy.subItems || {};
          for (const [subId, sub] of Object.entries(subItems)) {
            const inputs = sub.inputs?.inputs || {};
            const formattedInputs = Object.fromEntries(
              inputs.map(input => [input.name, input.default])
            );
            console.log("Recalculating strategy:");
            await strategyState.updateInputs(strategyId, subId, formattedInputs);
          }
        }
      };
    
      recalculateIndicators();
    }, [selectedCrypto, selectedPeriod]);

    // ANA DATAYI ÇEKME
    useEffect(() => {
            async function fetchData() {
                try {
                    const response = await fetch(
                        `${process.env.NEXT_PUBLIC_API_URL}/api/get-binance-data/?symbol=${selectedCrypto.binance_symbol}&interval=${selectedPeriod}`,
                        {
                            method: "GET",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            credentials: "include",
                        }
                    );
    
                    if (response.status === 401) {
                        const errorData = await response.json();
                        if (["Token expired", "Invalid token"].includes(errorData.detail)) {
                            alert("Oturum süresi doldu veya geçersiz token! Lütfen tekrar giriş yapın.");
                            handleLogout();
                            return;
                        }
                    }
    
                    const data = await response.json();
    
                    if (data.status === "success" && data.data) {

                        const formattedData = data.data.map((candle) => ({
                            time: Math.floor(new Date(candle.timestamp).getTime() / 1000),
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
    }, [selectedCrypto, selectedPeriod]);

    // CHARTI OLUŞTUR
    useEffect(() => {
        if (chartData.length === 0 || !chartContainerRef.current) return;
    
        // 📌 Eğer önceki grafik varsa temizleyelim
        try {
            chartRef.current?.remove?.(); // çağırılabilir mi, kontrol
            chartRef.current = null; // referansı temizle
        } catch (err) {
            if (err?.message?.includes("disposed")) {
              //console.warn("Grafik zaten dispose edilmiş.");
            } else {
              console.error("Grafik temizlenirken hata:", err);
            }
        }

        // 🔹 Grafiği oluşturma ayarları
        const chartOptions = {
            layout: {
                textColor: "white",
                background: { type: "solid", color: "rgb(0, 0, 7)" }, //#111 önceki hali 
            },
            grid: {
                vertLines: { color: "#111", style: 1 },
                horzLines: { color: "#111", style: 1 },
            },
            crosshair: {
                mode: isMagnetMode ? CrosshairMode.Magnet : CrosshairMode.Normal,
            },
            timeScale: {
              timeVisible: true, // Saat bilgisini göster
              secondsVisible: false,
              tickMarkFormatter: (time) => {
                const date = new Date(time * 1000); // saniyeyi milisaniyeye çevir
                const hours = date.getHours().toString().padStart(2, "0");
                const minutes = date.getMinutes().toString().padStart(2, "0");
                return `${hours}:${minutes}`;
              },
            },
        };
    


        // 🔹 Grafiği oluştur
        const chart = createChart(chartContainerRef.current, chartOptions);
        chartRef.current = chart;

        // 1. Diğer grafiklerden gelen zaman aralığı değişikliklerini dinle
        const handleTimeRangeChange = (event) => {
          const { start, end, sourceId } = event.detail;
          if (sourceId === 'main-chart') return;

          let adjustedStart = start;
          let adjustedEnd = end;

          console.log(`[StockChart] Fark değeri: ${selectedPeriod}`);
          const coefficient = 1000;
          let minBars = coefficient; // Varsayılan değer
          
          switch (selectedPeriod) {
            case "1m":      // 1 Dakika
              minBars = coefficient;
              break;
            case "3m":      // 3 Dakika
              minBars = coefficient * 3;
              break;
            case "5m":      // 5 Dakika
              minBars = coefficient * 5;
              break;
            case "15m":     // 15 Dakika
              minBars = coefficient * 15;
              break;
            case "30m":     // 30 Dakika
              minBars = coefficient * 30;
              break;
            case "1h":      // 1 Saat
              minBars = coefficient * 60;
              break;
            case "2h":      // 2 Saat
              minBars = coefficient * 120;
              break;
            case "4h":      // 4 Saat
              minBars = coefficient * 240;
              break;
            case "1d":      // 1 Gün
              minBars = coefficient * 1440; // 24 saat * 60 dakika
              break;
            case "1w":      // 1 Hafta
              minBars = coefficient * 10080; // 7 gün * 24 saat * 60 dakika
              break;
            default:
              minBars = coefficient; // fallback
              break;
          }

          if (end - start < minBars) {
            const center = (start + end) / 2;
            adjustedStart = center - minBars / 2;
            adjustedEnd = center + minBars / 2;
            const event = new CustomEvent('chartTimeRangeChange', {
                detail: {
                  start: adjustedStart,
                  end: adjustedEnd,
                  sourceId: 'main-chart'
                }
            });
            window.dispatchEvent(event);
          }
          if (chartRef.current) {
            chartRef.current.timeScale().setVisibleRange({
              from: adjustedStart,
              to: adjustedEnd,
            });
          }
        };

        window.addEventListener('chartTimeRangeChange', handleTimeRangeChange);//eventi dinler yukarıda

        // Bu grafikteki zaman aralığı değişikliklerini diğer grafiklere gönder
        const timeScale = chart.timeScale();
        timeScale.subscribeVisibleTimeRangeChange((newRange) => {
          const event = new CustomEvent('chartTimeRangeChange', {
              detail: {
                start: newRange.from,
                end: newRange.to,
                sourceId: 'main-chart'
              }
          });
          window.dispatchEvent(event);// event'i yayınla
        });

        // Crosshair hareketlerini diğer grafiklere gönder
        //chart.subscribeCrosshairMove((param) => {
        //  const hoveredTime = param?.time;
//
        //  if (hoveredTime !== undefined) {
        //    const event = new CustomEvent("chartCrosshairMove", {
        //      detail: {
        //        time: hoveredTime,
        //        sourceId: 'main-chart'
        //      }
        //    });
        //  
        //    window.dispatchEvent(event);
        //  }
        //});


        chart.applyOptions({
            watermark: {
                color: '#222',
                visible: true,
                text: 'BTCUSDT',
                fontSize: 18,
                horzAlign: 'center',
                vertAlign: 'center',
            },
        });
    
        // 🔹 Mum grafiğini ekle
        const candleSeries = chart.addCandlestickSeries({
            upColor: "rgb(8, 153, 129)",
            downColor: "rgb(242, 54, 69)",
            borderVisible: false,
            wickUpColor: "rgb(8, 153, 129)",
            wickDownColor: "rgb(242, 54, 69)",
        });
    
        candleSeries.setData(chartData);
        chart.timeScale().fitContent();

        // 🔸 Başlangıçta yakınlaştırmayı uygula
        const barsToShow = 150; // Ekranda görünmesini istediğin son mum sayısı
        chart.timeScale().fitContent();
        // Başlangıç aralığını ayarla ve event gönder
        const initialRange = {
            from: chartData.length - barsToShow,
            to: chartData.length
        };
        chart.timeScale().setVisibleLogicalRange(initialRange);

        const visibleRange = chart.timeScale().getVisibleRange();
        if (visibleRange) {
            
            const event = new CustomEvent('chartTimeRangeChange', {
                detail: {
                    start: visibleRange.from,
                    end: visibleRange.to,
                    isLocal: true
                }
            });
            window.dispatchEvent(event);
        }

        //  STRATEGY MARKERS
        const allMarkers = [];
        Object.values(strategyData).forEach((strategyInfo) => {
          const subItems = strategyInfo?.subItems || {};
        
          Object.values(subItems).forEach((sub) => {
            const result = sub?.strategy_result?.[0];
            if (!result?.data) return;
        
            result.data.forEach(([time, signal, _value, note = ""]) => {
              const unixTime = Math.floor(new Date(time).getTime() / 1000);
            
              const marker = {
                time: unixTime,
                position: "aboveBar",
                color: "",
                shape: "",
                text: note || "",
              };
          
              switch (signal) {
                case "Long Open":
                  marker.shape = "arrowUp";
                  marker.color = "green";
                  marker.position = "belowBar";
                  break;
                case "Long Close":
                  marker.shape = "arrowDown";
                  marker.color = "red";
                  marker.position = "aboveBar";
                  break;
                case "Short Open":
                  marker.shape = "arrowDown";
                  marker.color = "red";
                  marker.position = "aboveBar";
                  break;
                case "Short Close":
                  marker.shape = "arrowUp";
                  marker.color = "green";
                  marker.position = "belowBar";
                  break;
                default:
                  return;
              }
          
              allMarkers.push(marker);
            });
          });
        });
        allMarkers.sort((a, b) => a.time - b.time);
        candleSeries.setMarkers(allMarkers);

        
        // STRATEGY GRAPH
        Object.values(strategyData).forEach((strategyInfo) => {
          const subItems = strategyInfo?.subItems || {};

          Object.values(subItems).forEach((sub) => {
            const graph = sub?.strategy_graph?.[0];
            if (!graph?.data || !graph?.style) return;
        
            let series;
        
            switch (graph.style.linestyle) {
              case "line":
                series = chart.addLineSeries({
                  color: graph.style?.color || "orange",
                  lineWidth: graph.style?.width || 2,
                });
                break;
              case "area":
                series = chart.addAreaSeries({
                  topColor: graph.settings?.color || "rgba(255, 165, 0, 0.4)",
                  bottomColor: "rgba(255, 165, 0, 0.05)",
                  lineColor: graph.settings?.color || "orange",
                });
                break;
              case "histogram":
                const defaultColor = graph.settings?.color ?? "255, 165, 0";
                const opacity = graph.settings?.opacity ?? 0.4;
            
                series = chart.addHistogramSeries({
                  color: `rgba(${defaultColor}, ${opacity})`,
                });
                break;
              default:
                console.warn(`Bilinmeyen strategy_graph tipi: ${graph.type}`);
                return;
            }
        
            const formattedData = graph.data
              .map(([time, value]) => {
                if (typeof time === "string" && value !== undefined) {
                  return {
                    time: Math.floor(new Date(time).getTime() / 1000),
                    value,
                  };
                }
                return null;
              })
              .filter(Boolean)
              .sort((a, b) => a.time - b.time);
          
            series.setData(formattedData);
          });
        });

        // STRATEGY LABELS
        const strategyLabelsContainer = document.getElementById("strategy-labels");
        if (strategyLabelsContainer) {
          strategyLabelsContainer.innerHTML = ""; // önce temizle
        }
        Object.entries(strategyData).forEach(([strategyId, strategy]) => {
          const strategyName = strategy.name;
          const subItems = strategy.subItems || {};
        
          Object.entries(subItems).forEach(([subId, sub]) => {
            const labelId = `strategy-label-${strategyId}-${subId}`;
            if (document.getElementById(labelId)) return;
        
            const labelDiv = document.createElement("div");
            labelDiv.id = labelId;
            labelDiv.style.cssText = `
              background: rgba(30,30,30,0.4);
              color: white;
              font-size: 12px;
              padding: 4px 8px;
              border-radius: 4px;
              display: flex;
              align-items: center;
              gap: 6px;
            `;
        
            const title = document.createElement("span");
            title.textContent = strategyName || `${strategyId} (${subId})`;
        
            const settingsBtn = document.createElement("button");
            settingsBtn.textContent = "⚙️";
            settingsBtn.style.background = "none";
            settingsBtn.style.border = "none";
            settingsBtn.style.color = "white";
            settingsBtn.style.cursor = "pointer";
            settingsBtn.onclick = () => openStrategySettings(strategyId, subId);
        
            const removeBtn = document.createElement("button");
            removeBtn.textContent = "❌";
            removeBtn.style.background = "none";
            removeBtn.style.border = "none";
            removeBtn.style.color = "white";
            removeBtn.style.cursor = "pointer";
            removeBtn.onclick = () => {
              labelDiv.remove();
              removeSubStrategy(strategyId, subId);
            };
        
            labelDiv.appendChild(title);
            labelDiv.appendChild(settingsBtn);
            labelDiv.appendChild(removeBtn);
        
            strategyLabelsContainer.appendChild(labelDiv);
          });
        });

        // INDICATOR LABELS
        const indicatorLabelsContainer = document.getElementById("indicator-labels");
        if (indicatorLabelsContainer) {
          indicatorLabelsContainer.innerHTML = ""; // ❗ Tüm eski etiketleri temizle
        }
        Object.entries(indicatorData).forEach(([indicatorId, indicator]) => {
            const indicatorName = indicator.name;
            const subItems = indicator.subItems || {};
            
            Object.entries(subItems).forEach(([subId, indicatorInfo]) => {
              if (!indicatorInfo?.result) return;

              if (!Array.isArray(indicatorInfo?.result)) {
                console.warn("🚨 result bir dizi değil:", indicatorInfo?.result, "id:", indicatorId, "subId:", subId);
                return;
              }
          
              indicatorInfo.result
                .filter((item) => item.on_graph === true)
                .forEach((indicatorResult) => {
                  const { type, settings, data, name } = indicatorResult;
          
                  let series;
                  switch (type) {
                    case "line":
                      series = chart.addLineSeries({
                        color: settings?.color || "yellow",
                        lineWidth: settings?.width || 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                      });
                      break;
                    case "area":
                      series = chart.addAreaSeries({
                        topColor: settings?.color || "rgba(33, 150, 243, 0.5)",
                        bottomColor: "rgba(33, 150, 243, 0.1)",
                        lineColor: settings?.color || "blue",
                        lastValueVisible: false,
                        priceLineVisible: false,
                      });
                      break;
                    case "histogram":
                      const defaultColor = settings?.color ?? "0, 128, 0";
                      const opacity = settings?.opacity ?? 0.3;
          
                      series = chart.addHistogramSeries({
                        color: `rgba(${defaultColor}, ${opacity})`,
                        lastValueVisible: false,
                        priceLineVisible: false,
                      });
                      break;
                    default:
                      series = chart.addLineSeries({
                        color: "white",
                        lineWidth: 2,
                        lastValueVisible: false,
                        priceLineVisible: false,
                      });
                  }
          
                  const timeValueMap = new Map();
                  data.forEach(([time, value]) => {
                    if (typeof time === "string" && value !== undefined) {
                      const unixTime = Math.floor(new Date(time).getTime() / 1000);
                      timeValueMap.set(unixTime, value);
                    }
                  });
          
                  const formattedData = Array.from(timeValueMap.entries())
                    .sort(([a], [b]) => a - b)
                    .map(([time, value]) => ({ time, value }));
          
                  series.setData(formattedData);
          
                  const indicatorLabelsContainer = document.getElementById("indicator-labels");
                  if (!indicatorLabelsContainer) return;
          
                  const labelId = `indicator-label-${indicatorId}-${subId}`;
                  if (document.getElementById(labelId)) return;
          
                  const labelDiv = document.createElement("div");
                  labelDiv.id = labelId;
                  labelDiv.style.cssText = `
                    background: rgba(30,30,30,0.4);
                    color: white;
                    font-size: 12px;
                    padding: 4px 8px;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                  `;
          
                  const title = document.createElement("span");
                  title.textContent = indicatorName || `${indicatorId} (${subId})`;
          
                  const settingsBtn = document.createElement("button");
                  settingsBtn.textContent = "⚙️";
                  settingsBtn.style.background = "none";
                  settingsBtn.style.border = "none";
                  settingsBtn.style.color = "white";
                  settingsBtn.style.cursor = "pointer";
                  settingsBtn.onclick = () => openIndicatorSettings(indicatorId, subId);
          
                  const removeBtn = document.createElement("button");
                  removeBtn.textContent = "❌";
                  removeBtn.style.background = "none";
                  removeBtn.style.border = "none";
                  removeBtn.style.color = "white";
                  removeBtn.style.cursor = "pointer";
                  removeBtn.onclick = () => {
                    series.setData([]);
                    labelDiv.remove();
                    removeSubIndicator(indicatorId, subId);
                  };
          
                  labelDiv.appendChild(title);
                  labelDiv.appendChild(settingsBtn);
                  labelDiv.appendChild(removeBtn);
          
                  indicatorLabelsContainer.appendChild(labelDiv);
                });
            });
        });
          

        // 🔹 **Resize Observer ile grafik boyutunu güncelle**
        const resizeObserver = new ResizeObserver(() => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight,
                });
            }
        });
        resizeObserver.observe(chartContainerRef.current);
        // Cleanup: Bileşen unmount olduğunda işlemleri temizle
        return () => {
            window.removeEventListener('chartTimeRangeChange', handleTimeRangeChange);
            resizeObserver.disconnect();
            if (chartRef.current) {
                try {
                    chartRef.current.remove();
                } catch (error) {
                    console.warn("Grafik temizlenirken hata oluştu:", error);
                }
            }
        };

    }, [chartData, indicatorData, strategyData]); // 🔥 `chartData` değiştiğinde çalışır

    // Mıknatıs modu değiştiğinde sadece crosshair modunu güncelle!
    useEffect(() => {
    if (chartRef.current) {
        chartRef.current.applyOptions({
            crosshair: {
                mode: isMagnetMode ? CrosshairMode.Magnet : CrosshairMode.Normal,
            },
        });
    }
    }, [isMagnetMode]); // Sadece mıknatıs modu değiştiğinde çalışır!

    return (
        <div className="relative w-full h-full">
            <div
              id="indicator-labels"
              className="absolute top-2 left-2 z-10 flex flex-col gap-1"
            ></div>

            <div
              id="strategy-labels"
              style={{
                position: 'absolute',
                top: 10,
                right: 80,
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            ></div>


            <div ref={chartContainerRef} className="absolute top-0 left-0 w-full h-full"></div>

            {/* Ayarlar Modalı */}
            <IndicatorSettingsModal
              isOpen={settingsIndicatorModalOpen}
              onClose={() => setSettingsIndicatorModalOpen(false)}
              indicatorId={activeIndicatorId}
              subId={activeSubIndicatorId}
            />

            <StrategySettingsModal
              isOpen={settingsStrategyModalOpen}
              onClose={() => setSettingsStrategyModalOpen(false)}
              strategyId={activeStrategyId}
              subId={activeSubStrategyId}
            />
        </div>
    );
}