"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import StockChart from "@/components/profile_component/(indicator)/StockChart";
import PanelChart from "./panelChart";
import usePanelStore from "@/store/indicator/panelStore";
import useCodePanelStore from "@/store/indicator/indicatorCodePanelStore";
import CodePanel from "./(modal_tabs)/indicatorCodePanel"; // yeni bileşen
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import useStrategyCodePanelStore from "@/store/indicator/strategyCodePanelStore";
import StrategyCodePanel from "./(modal_tabs)/strategyCodePanel";
import useIndicatorDataStore from "@/store/indicator/indicatorDataStore";

const ResponsiveGridLayout = WidthProvider(Responsive);

const FlexibleGridLayout = () => {
  const [windowWidth, setWindowWidth] = useState(0);
  const [initialLoad, setInitialLoad] = useState(true);
  const [activeItemId, setActiveItemId] = useState(null);
  const { isOpen: isCodePanelOpen } = useCodePanelStore();
  const { isOpen: isStrategyCodePanelOpen } = useStrategyCodePanelStore();
  const { indicatorData } = useIndicatorDataStore();
  const {
    synced_panels,
    panelWidth,
    setPanelWidth,
    layouts,
    updateLayouts,
    updateItemLayout,
    syncWidths
  } = usePanelStore();



  const filteredSubItems = Object.entries(indicatorData)
    .flatMap(([indicatorId, indicatorObj]) =>
      Object.entries(indicatorObj.subItems || {})
        .filter(([subId, sub]) =>
          Array.isArray(sub.result) &&
          sub.result.some((res) => res.on_graph === false)
        )
        .map(([subId]) => ({
          indicatorId,
          subId,
          indicatorName: indicatorObj.name
        }))
    );


  // Layout değişikliklerinin yönetimi için referans
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    // İlk render sırasında pencere genişliğini ayarla
    setWindowWidth(window.innerWidth);

    // Pencere boyutu değiştiğinde genişliği güncelle
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);

    // İlk yükleme sırasında genişlikleri senkronize et
    if (initialLoad && layouts) {
      const syncedLayouts = syncWidths(layouts);
      updateLayouts(syncedLayouts);
      setInitialLoad(false);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [windowWidth, initialLoad, layouts, syncWidths, updateLayouts]);

  // Layout değişikliklerini işle
  const handleLayoutChange = useCallback((allLayouts) => {
    if (!isResizing) {
      const synced = syncWidths(allLayouts); // Bu kritik!
      updateLayouts(synced);
    }
  }, [isResizing, updateLayouts, syncWidths]);


  // Boyutlandırma başladığında
  const handleResizeStart = useCallback((layout, oldItem) => {
    setIsResizing(true);
    setActiveItemId(oldItem.i);
  }, []);

  // Boyutlandırma bittiğinde
  const handleResizeStop = useCallback((layout) => {
    setIsResizing(false);
    const updatedItem = layout.find(item => item.i === activeItemId);
    if (!updatedItem) return;
    if (synced_panels.includes(updatedItem.i)) {
      if (updatedItem.w !== panelWidth) {
        setPanelWidth(updatedItem.w);
      }
    }
    setActiveItemId(null); // Temizle
  }, [activeItemId]);

  // Sürükleme bittiğinde
  const handleDragStop = useCallback((newItem) => {
    updateItemLayout(newItem.i, {
      x: newItem.x,
      y: newItem.y,
      h: newItem.h
    });
  }, [updateItemLayout]);


  // ✅ Grid layout'u dinamik oluştur
  const generateLayouts = () => {
    const currentLg = (layouts && layouts.lg) ? layouts.lg : [];
    const newLg = [];

    // Helper to find existing item properties
    const getExisting = (id, defaultY, defaultH) => {
      const existing = currentLg.find(item => item.i === id);
      return {
        y: existing ? existing.y : defaultY,
        h: existing ? existing.h : defaultH,
        x: existing ? existing.x : 0 // x hep 0 gerçi ama olsun
      };
    };

    // Ana grafik paneli
    const chartProps = getExisting("chart", 0, 11);
    newLg.push({
      i: "chart",
      x: 0,
      y: chartProps.y,
      w: panelWidth,
      h: chartProps.h,
      minW: 13,
      maxW: 60,
      minH: 6,
      maxH: 40,
      isDraggable: false,
    });

    filteredSubItems.forEach(({ indicatorId, subId }, index) => {
      const id = `panel-${indicatorId}-${subId}`;
      const props = getExisting(id, 11 + index * 4, 6);
      newLg.push({
        i: id,
        x: 0,
        y: props.y,
        w: panelWidth,
        h: props.h,
        minW: 13,
        maxW: 60,
        minH: 3,
        maxH: 40,
        isDraggable: false,
      });
    });

    const indEditorProps = getExisting("panel-indicator-editor", 50, 11);
    newLg.push({
      i: "panel-indicator-editor",
      x: indEditorProps.x, // Editors draggable so maintain x
      y: indEditorProps.y,
      w: 22,
      h: indEditorProps.h,
      minW: 13,
      maxW: 60,
      minH: 10,
      maxH: 40,
      isDraggable: true,
    });

    const stratEditorProps = getExisting("panel-strategy-editor", 55, 11);
    newLg.push({
      i: "panel-strategy-editor",
      x: 39, // Varsayılan x...
      y: stratEditorProps.y,
      w: 22,
      h: stratEditorProps.h,
      minW: 13,
      maxW: 60,
      minH: 10,
      maxH: 40,
      isDraggable: true,
    });

    return { lg: newLg };
  };

  const memoizedLayouts = useMemo(() => {
    const raw = generateLayouts();
    return syncWidths(raw);
  }, [panelWidth, filteredSubItems, isCodePanelOpen, isStrategyCodePanelOpen, layouts]); // layouts dependency eklendi


  // Anlık boyutlandırma (Resize sırasında çalışır)
  const handleResize = useCallback((layout, oldItem, newItem, placeholder, e, element) => {
    // Tüm değişiklikleri tek seferde store'a bildir (w, h, x, y)
    updateItemLayout(newItem.i, { w: newItem.w, h: newItem.h, x: newItem.x, y: newItem.y });
  }, [updateItemLayout]);


  return (
    <div className="p-0 w-full min-h-screen">
      {windowWidth > 0 && (
        <ResponsiveGridLayout
          className="layout"
          layouts={memoizedLayouts}
          initialLayout={[
            { i: 'panel-indicator-editor', x: 0, y: 50, w: 34, h: 11 }
          ]}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 60, md: 48, sm: 30, xs: 20 }}
          rowHeight={30}
          margin={[3, 3]}
          containerPadding={[8, 9]}
          isDraggable={true}
          isResizable={true}
          onLayoutChange={handleLayoutChange}
          onResizeStart={handleResizeStart}
          onResize={handleResize} // Anlık senkronizasyon için
          onResizeStop={(layout) => handleResizeStop(layout)}
          onDragStop={handleDragStop}
          draggableHandle=".drag-handle" // Sürükleme alanı tanımlandı
          style={{ minHeight: "100vh", overflow: "visible" }}
        >
          {/* Ana grafik */}
          <div key="chart" className="relative w-full h-full m-0">
            <StockChart />
          </div>

          {/* Sadece on_graph: false olan indikatör panelleri */}
          {filteredSubItems.map(({ indicatorName, indicatorId, subId }) => (
            <div key={`panel-${indicatorId}-${subId}`} className="relative w-full h-full m-0">
              <PanelChart indicatorName={indicatorName} indicatorId={indicatorId} subId={subId} />
            </div>
          ))}

          <div
            key="panel-indicator-editor"
            className="relative w-full h-full m-0"
            style={{ display: isCodePanelOpen ? "block" : "none" }}
          >
            {isCodePanelOpen && <CodePanel />}
          </div>

          {/* Strategy Code Panel her zaman DOM’da, ama yalnızca açıkken görünür */}
          <div
            key="panel-strategy-editor"
            className="relative w-full h-full m-0"
            style={{ display: isStrategyCodePanelOpen ? "block" : "none" }}
          >
            {isStrategyCodePanelOpen && <StrategyCodePanel />}
          </div>



        </ResponsiveGridLayout>
      )}
    </div>
  );
};

export default FlexibleGridLayout;