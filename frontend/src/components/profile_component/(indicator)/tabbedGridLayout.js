  "use client";

  import { useState, useEffect, useCallback, useMemo } from "react";
  import { Responsive, WidthProvider } from "react-grid-layout";
  import StockChart from "@/components/profile_component/(indicator)/StockChart";
  import PanelChart from "./panelChart";
  import usePanelStore from "@/store/indicator/panelStore";
  import ChatBox from "./chatBox";
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
      isChatBoxVisible, 
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
      const layouts = { lg: [] };

      // Ana grafik paneli
      layouts.lg.push({
        i: "chart",
        x: 0,
        y: 0,
        w: panelWidth,
        h: 11,
        minW: 3,
        maxW: 14,
        minH: 6,
        maxH: 40,
        isDraggable: false,
      });

      filteredSubItems.forEach(({ indicatorId, subId }, index) => {
        layouts.lg.push({
          i: `panel-${indicatorId}-${subId}`,
          x: 0,
          y: 11 + index * 4,
          w: panelWidth,
          h: 6,
          minW: 3,
          maxW: 14,
          minH: 3,
          maxH: 40,
          isDraggable: false,
        });
      });

      layouts.lg.push({
        i: "panel-indicator-editor",
        x: 0,
        y: 50,
        w: 5,
        h: 11,
        minW: 3,
        maxW: 14,
        minH: 8,
        maxH: 40,
        isDraggable: true,
      });

      layouts.lg.push({
        i: "panel-strategy-editor",
        x: 9,
        y: 55,
        w: 5, // istediğin default genişlik
        h: 11,
        minW: 3,
        maxW: 14,
        minH: 8,
        maxH: 40,
        isDraggable: true,
      });

      //layouts.lg.push({
      //  i: "f",
      //  x: 5,
      //  y: 55,
      //  w: 4, // istediğin default genişlik
      //  h: 11,
      //  minW: 3,
      //  maxW: 14,
      //  minH: 8,
      //  maxH: 40,
      //  isDraggable: true,
      //});
      
      return layouts;
    };

    const memoizedLayouts = useMemo(() => {
      const raw = generateLayouts();
      return syncWidths(raw);
    }, [panelWidth, filteredSubItems, isCodePanelOpen, isStrategyCodePanelOpen]);


    return (
      <div className="p-0 w-full min-h-screen">
        {windowWidth > 0 && (
        <ResponsiveGridLayout
          className="layout"
          layouts={memoizedLayouts}
          initialLayout={[
            { i: 'panel-indicator-editor', x: 0, y: 50, w: 8, h: 11 }
          ]}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
          cols={{ lg: 14, md: 14, sm: 10, xs: 8 }}
          rowHeight={30}
          margin={[3, 3]}
          containerPadding={[8, 9]}
          isDraggable={true}
          isResizable={true}
          onLayoutChange={handleLayoutChange}
          onResizeStart={handleResizeStart}
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
                
          {/* ChatBox paneli de aynı şekilde yönetilir */}
          <div
            key="f"
            className="relative w-full h-full m-0"
            style={{ display: isChatBoxVisible ? "block" : "none" }}
          >
            {isChatBoxVisible && <ChatBox />}
          </div>

          </ResponsiveGridLayout>
        )}
      </div>
    );
  };

  export default FlexibleGridLayout;