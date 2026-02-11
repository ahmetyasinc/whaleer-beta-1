"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, CrosshairMode } from "lightweight-charts"; // CrosshairMode eklendi
import { useChartSettingsStore } from "@/store/indicator/chartSettingsStore";
import useCryptoStore from "@/store/indicator/cryptoPinStore";
import { installCursorWheelZoom } from "@/utils/cursorCoom";
import api from "@/api/axios"; // API eklendi
import {
    RANGE_EVENT,
    RANGE_REQUEST_EVENT,
    CROSSHAIR_EVENT,
    nextSeq,
    markLeader,
    unmarkLeader,
    isLeader,
    minBarsFor,
    FUTURE_PADDING_BARS,
    getLastRangeCache,
    setLastRangeCache // setLastRangeCache eklendi
} from "@/utils/chartSync";

export default function TimeScale() {
    const pad = (n) => String(n).padStart(2, "0");

    function timeToUTCDate(t) {
        if (t && typeof t === "object" && "year" in t && "month" in t && "day" in t) {
            return new Date(Date.UTC(t.year, t.month - 1, t.day, 0, 0, 0));
        }
        return new Date((typeof t === "number" ? t : 0) * 1000);
    }

    // ---- Cookie & timezone helpers ----
    function getCookie(name) {
        if (typeof document === 'undefined') return null;
        const m = document.cookie.split('; ').find(row => row.startsWith(name + '='));
        return m ? decodeURIComponent(m.split('=')[1]) : null;
    }
    function parseGmtToMinutes(tzStr) {
        const m = /^GMT\s*([+-])\s*(\d{1,2})(?::?(\d{2}))?$/i.exec((tzStr || '').trim());
        if (!m) return 0;
        const sign = m[1] === '-' ? -1 : 1;
        const h = parseInt(m[2] || '0', 10);
        const mins = parseInt(m[3] || '0', 10);
        return sign * (h * 60 + mins);
    }
    function readTimezoneOffsetMinutesFromCookie() {
        try {
            const raw = getCookie('wh_settings');
            if (!raw) return 0;
            const obj = JSON.parse(raw);
            return parseGmtToMinutes(obj?.timezone || 'GMT+0');
        } catch { return 0; }
    }

    function timeToZonedDate(t, offsetMinutes) {
        let msUTC;
        if (t && typeof t === 'object' && 'year' in t && 'month' in t && 'day' in t) {
            msUTC = Date.UTC(t.year, t.month - 1, t.day, 0, 0, 0);
        } else {
            const sec = (typeof t === 'number' ? t : 0);
            msUTC = sec * 1000;
        }
        return new Date(msUTC + (offsetMinutes || 0) * 60 * 1000);
    }
    function makeZonedFormatter(period, offsetMinutes) {
        const isMins = ["1m", "3m", "5m", "15m", "30m"].includes(period);
        const isHours = ["1h", "2h", "4h"].includes(period);
        const isDays = period === "1d";
        const isWeeks = period === "1w";
        const twoDigitYear = (Y) => String(Y).slice(2);
        return (t) => {
            const d = timeToZonedDate(t, offsetMinutes);
            const Y = d.getUTCFullYear();
            const yy = twoDigitYear(Y);
            const M = pad(d.getUTCMonth() + 1);
            const D = pad(d.getUTCDate());
            const h = pad(d.getUTCHours());
            const m = pad(d.getUTCMinutes());
            if (isMins) return `${D}.${M} ${h}:${m}`;
            if (isHours) return `${D}.${M}.${yy} ${h}:00`;
            if (isDays) return `${D}.${M}.${yy}`;
            if (isWeeks) return `${D}.${M}.${yy}`;
            return `${D}.${M}.${yy} ${h}:${m}`;
        };
    }

    const { selectedCrypto, selectedPeriod } = useCryptoStore(); // selectedCrypto eklendi
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const dummySeriesRef = useRef(null); // Dummy series ref

    const [tzOffsetMin, setTzOffsetMin] = useState(0);
    const [chartData, setChartData] = useState([]); // Data state

    const { settings } = useChartSettingsStore();

    // ==== Senkronizasyon guard & ID ====
    const chartId = `time-scale-singleton`; // Unique ID for singleton
    const isApplyingRef = useRef(false);
    const lastSeqAppliedRef = useRef(0);
    let rafHandle = null;

    useEffect(() => {
        setTzOffsetMin(readTimezoneOffsetMinutesFromCookie());
    }, [settings.timezoneMode, settings.timezoneFixed]);

    const fmt = makeZonedFormatter(selectedPeriod, tzOffsetMin);

    // ===== Fetch Data (StockChart.js'den uyarlandı) =====
    useEffect(() => {
        async function fetchData() {
            if (!selectedCrypto) return;
            try {
                // Sadece veriyi alıp zamanları kullanacağız, fiyatlar önemli değil ama dummy seriye basacağız
                const response = await api.get(`/get-binance-data/?symbol=${selectedCrypto.binance_symbol}&interval=${selectedPeriod}&market_type=${selectedCrypto.market_type}`);
                const data = response.data;
                if (data.status === "success" && data.data) {
                    if (!data.data.length) {
                        setChartData([]);
                    } else {
                        const formattedData = data.data.map((c) => {
                            const ts = c.timestamp; let ms;
                            if (typeof ts === 'number') ms = ts > 1e12 ? ts : ts * 1000;
                            else { const iso = /Z$|[+-]\d\d:\d\d$/.test(ts) ? ts : ts + 'Z'; ms = Date.parse(iso); }
                            // Close değerini value olarak kullan, sıfır veya close fark etmez, görünmez olacak
                            return { time: Math.floor(ms / 1000), value: c.close };
                        });
                        setChartData(formattedData);
                    }
                }
            } catch (error) { console.error("Veri çekme hatası (TimeScale):", error); }
        }
        fetchData();
    }, [selectedCrypto, selectedPeriod]);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const COLOR_MAP = {
            white: "#FFFFFF",
            black: "#111111",
            gray: "#8C8C8C",
            yellow: "#F2D024",
            red: "#F23645",
            green: "#0ECB81"
        };
        const textColor = COLOR_MAP[settings.textColor] ?? "#8C8C8C";
        const gridColor = settings?.grid?.color || "#111111";
        const bgColor = settings.bgColor || (settings.theme === 'light' ? '#ffffff' : 'rgb(0,0,7)');

        const crosshairStyle = {
            color: settings?.crosshair?.color || "#758696",
            width: settings?.crosshair?.width ?? 1,
            style: settings?.crosshair?.style ?? 1, // 0=Solid, 1=Dotted, 2=Dashed
            labelBackgroundColor: settings?.crosshair?.color || "#758696",
        };

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
            layout: { background: { color: bgColor }, textColor },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false }
            },
            lastValueVisible: false,
            localization: { timeFormatter: fmt },
            timeScale: {
                rightBarStaysOnScroll: true,
                shiftVisibleRangeOnNewBar: false,
                timeVisible: true, // Tarih skalası görünür
                secondsVisible: false,
                tickMarkFormatter: fmt,
                borderVisible: true, // Hide top border of time scale if preferred
            },
            rightPriceScale: {
                visible: true,
                minimumWidth: 70,
                autoScale: true,
                ticksVisible: false,
                borderVisible: false,
                textColor: 'rgba(0, 0, 0, 0)',
            },
            crosshair: {
                mode: CrosshairMode.Normal,
                vertLine: { ...crosshairStyle, visible: true, labelVisible: true },
                horzLine: { visible: false, labelVisible: false }, // Yatay çizgi gerekmez
            },
            handleScroll: true,
            handleScale: true,
        });

        chartRef.current = chart;

        // Dummy Series - Crosshair snapping için gerekli
        // Görünmez çizgi serisi ekleyip veriyi basıyoruz
        const dummySeries = chart.addLineSeries({
            color: 'transparent',
            lineWidth: 0,
            crosshairMarkerVisible: false,
            lastValueVisible: false,
            priceLineVisible: false
        });
        dummySeriesRef.current = dummySeries;
        dummySeries.setData(chartData);

        // Lider işaretleme
        const el = chartContainerRef.current;
        const cleanupFns = [];
        if (el) {
            const onStart = () => markLeader(chartId);
            const onEnd = () => unmarkLeader(chartId);
            el.addEventListener('mousedown', onStart);
            el.addEventListener('wheel', onStart, { passive: false });
            el.addEventListener('touchstart', onStart, { passive: true });
            window.addEventListener('mouseup', onEnd);
            // el.addEventListener('mouseleave', onEnd);
            window.addEventListener('touchend', onEnd);
            cleanupFns.push(() => {
                el.removeEventListener('mousedown', onStart);
                el.removeEventListener('wheel', onStart);
                el.removeEventListener('touchstart', onStart);
                window.removeEventListener('mouseup', onEnd);
                // el.removeEventListener('mouseleave', onEnd);
                window.removeEventListener('touchend', onEnd);
            });
        }

        const timeScale = chart.timeScale();
        timeScale.applyOptions({ rightOffset: FUTURE_PADDING_BARS });

        // No series to add.

        const applyRangeSilently = (range) => {
            if (!range) return;
            const { from, to, rightOffset } = range;
            isApplyingRef.current = true;
            if (rightOffset != null) timeScale.applyOptions({ rightOffset });
            timeScale.setVisibleLogicalRange({ from, to });
            requestAnimationFrame(() => { isApplyingRef.current = false; });
        };

        const cached = getLastRangeCache();
        if (cached) {
            applyRangeSilently(cached);
        } else {
            const oneShot = (e) => {
                const { sourceId } = (e && e.detail) || {};
                if (sourceId === 'main-chart') {
                    window.removeEventListener(RANGE_EVENT, oneShot);
                    applyRangeSilently(e.detail);
                }
            };
            window.addEventListener(RANGE_EVENT, oneShot);
            window.dispatchEvent(new CustomEvent(RANGE_REQUEST_EVENT));
            setTimeout(() => {
                try { window.removeEventListener(RANGE_EVENT, oneShot); } catch (_) { }
            }, 1000);
        }

        const removeWheelZoom = installCursorWheelZoom({
            chart,
            chartId,
            selectedPeriod,
            containerEl: chartContainerRef.current,
            isApplyingRef,
            lastSeqAppliedRef,
        });
        cleanupFns.push(removeWheelZoom);

        // Zaman sink – yayın
        timeScale.subscribeVisibleTimeRangeChange(() => {
            if (isApplyingRef.current) return;
            if (!isLeader(chartId)) return;
            const logical = timeScale.getVisibleLogicalRange();
            if (!logical) return;
            let { from, to } = logical;
            const minBars = minBarsFor(selectedPeriod);
            if (to - from < minBars) {
                const c = (from + to) / 2;
                from = c - minBars / 2;
                to = c + minBars / 2;
                isApplyingRef.current = true;
                timeScale.setVisibleLogicalRange({ from, to });
                requestAnimationFrame(() => { isApplyingRef.current = false; });
            }
            const rightOffset = timeScale.getRightOffset ? timeScale.getRightOffset() : FUTURE_PADDING_BARS;
            if (rafHandle) cancelAnimationFrame(rafHandle);
            const seq = nextSeq();
            rafHandle = requestAnimationFrame(() => {
                setLastRangeCache({ from, to, rightOffset });
                window.dispatchEvent(new CustomEvent(RANGE_EVENT, { detail: { from, to, rightOffset, sourceId: chartId, seq } }));
            });
        });

        // Zaman sink – dinle
        const onRangeEvent = (e) => {
            const { from, to, rightOffset, sourceId, seq } = (e && e.detail) || {};
            if (sourceId === chartId) return;
            if (seq && seq <= lastSeqAppliedRef.current) return;
            lastSeqAppliedRef.current = seq;
            isApplyingRef.current = true;
            if (rightOffset != null) timeScale.applyOptions({ rightOffset });
            timeScale.setVisibleLogicalRange({ from, to });
            requestAnimationFrame(() => { isApplyingRef.current = false; });
        };
        window.addEventListener(RANGE_EVENT, onRangeEvent);

        // Crosshair Sync - Broadcast
        chart.subscribeCrosshairMove((param) => {
            if (!param.time) {
                window.dispatchEvent(new CustomEvent(CROSSHAIR_EVENT, { detail: { time: null, sourceId: chartId } }));
                return;
            }
            window.dispatchEvent(new CustomEvent(CROSSHAIR_EVENT, { detail: { time: param.time, sourceId: chartId } }));
        });

        // Crosshair Sync - Listen
        const onCrosshairCode = (e) => {
            const { time, sourceId } = (e && e.detail) || {};
            if (sourceId === chartId) return;

            if (time === null || time === undefined) {
                try { chart.clearCrosshairPosition(); } catch (_) { }
                return;
            }
            // Dummy series kullanarak crosshair pozisyonunu set et
            // Eğer dummy series yoksa veya data yüklenmediyse çalışmayabilir
            if (dummySeriesRef.current && chartData.length > 0) {
                // Verify time is within range or simply try-catch to avoid crash
                // Lightweight-charts throws 'Value is null' if we pass an invalid time relative to series?
                // Or if series has no data. We checked length > 0.
                try {
                    chart.setCrosshairPosition(NaN, time, dummySeriesRef.current);
                } catch (err) {
                    // Ignore sync errors to prevent crash
                    // console.warn("Sync error:", err);
                }
            }
        };
        window.addEventListener(CROSSHAIR_EVENT, onCrosshairCode);

        const resizeObserver = new ResizeObserver(() => {
            if (chartContainerRef.current) {
                chart.applyOptions({
                    width: chartContainerRef.current.clientWidth,
                    height: chartContainerRef.current.clientHeight
                });
            }
        });
        resizeObserver.observe(chartContainerRef.current);

        return () => {
            window.removeEventListener(CROSSHAIR_EVENT, onCrosshairCode);
            window.removeEventListener(RANGE_EVENT, onRangeEvent);
            resizeObserver.disconnect();
            if (chartRef.current) { try { chartRef.current.remove(); } catch { } }
            cleanupFns.forEach((fn) => { try { fn(); } catch { } });
        };
    }, [selectedPeriod, tzOffsetMin, settings, chartData]); // chartData eklendi

    // Update settings without recreate
    useEffect(() => {
        if (!chartRef.current) return;
        const COLOR_MAP = {
            white: "#FFFFFF",
            black: "#111111",
            gray: "#8C8C8C",
            yellow: "#F2D024",
            red: "#F23645",
            green: "#0ECB81"
        };
        const textColor = COLOR_MAP[settings.textColor] ?? "#8C8C8C";
        const gridColor = settings?.grid?.color || "#111111";
        const bgColor = settings.bgColor || (settings.theme === 'light' ? '#ffffff' : 'rgb(0,0,7)');

        const crosshairStyle = {
            color: settings?.crosshair?.color || "#758696",
            width: settings?.crosshair?.width ?? 1,
            style: settings?.crosshair?.style ?? 1,
            labelBackgroundColor: settings?.crosshair?.color || "#758696",
        };

        chartRef.current.applyOptions({
            layout: { background: { color: bgColor }, textColor },
            grid: {
                vertLines: { visible: false },
                horzLines: { visible: false }
            },
            localization: {
                timeFormatter: makeZonedFormatter(selectedPeriod, tzOffsetMin),
            },
            timeScale: { tickMarkFormatter: makeZonedFormatter(selectedPeriod, tzOffsetMin) },
            rightPriceScale: { textColor: 'rgba(0, 0, 0, 0)' }, // Ensure transparent on update
            crosshair: {
                vertLine: crosshairStyle,
                horzLine: { visible: false, labelVisible: false },
            },
        });
    }, [settings, selectedPeriod, tzOffsetMin]);

    return (
        <div className="relative w-full h-full">
            <div ref={chartContainerRef} className={`absolute top-0 left-0 w-full h-full ${settings.cursorType === 'crosshair' ? 'cursor-crosshair' : settings.cursorType === 'dot' ? 'cursor-dot' : ''}`}></div>
        </div>
    );
}

// No propTypes needed as it operates on global store/events

