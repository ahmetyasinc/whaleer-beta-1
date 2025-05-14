// /store/chartSyncStore.js
import { create } from 'zustand';

const useChartSyncStore = create((set, get) => ({
  // Store all chart references
  charts: [],
  
  // Store all series references
  series: [],
  
  // Register a chart and its main series
  registerChart: (chartId, chartRef, seriesRef) => {
    const { charts, series } = get();
    
    set({
      charts: [...charts.filter(c => c.id !== chartId), { id: chartId, ref: chartRef }],
      series: [...series.filter(s => s.chartId !== chartId), { chartId, ref: seriesRef }]
    });
  },
  
  // Remove a chart and its series
  unregisterChart: (chartId) => {
    const { charts, series } = get();
    
    set({
      charts: charts.filter(c => c.id !== chartId),
      series: series.filter(s => s.chartId !== chartId)
    });
  },
  
  // Current visible range
  visibleRange: null,
  
  // Set visible range and sync all charts
  setVisibleRange: (range, sourceChartId) => {
    const { charts } = get();
    
    set({ visibleRange: range });
    
    // Apply the range to all other charts
    charts.forEach(chart => {
      if (chart.id !== sourceChartId && chart.ref) {
        chart.ref.timeScale().setVisibleLogicalRange(range);
      }
    });
  },
  
  // Crosshair position
  crosshairPosition: null,
  
  // Set crosshair position and sync all charts
  setCrosshairPosition: (position, sourceChartId) => {
    const { charts, series } = get();
    
    set({ crosshairPosition: position });
    
    // Apply crosshair to all other charts
    charts.forEach(chart => {
      if (chart.id !== sourceChartId && chart.ref) {
        const seriesForChart = series.find(s => s.chartId === chart.id);
        
        if (seriesForChart && position) {
          chart.ref.setCrosshairPosition(position.value, position.time, seriesForChart.ref);
        } else {
          chart.ref.clearCrosshairPosition();
        }
      }
    });
  },
  
  // Clear crosshair from all charts
  clearCrosshairPosition: () => {
    const { charts } = get();
    
    set({ crosshairPosition: null });
    
    charts.forEach(chart => {
      if (chart.ref) {
        chart.ref.clearCrosshairPosition();
      }
    });
  }
}));

export default useChartSyncStore;