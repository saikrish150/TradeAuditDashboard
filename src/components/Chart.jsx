import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, LineStyle, CandlestickSeries } from 'lightweight-charts';
import { binanceService } from '../services/binance';
import { Plus, BellPlus, Trash2 } from 'lucide-react';

export const Chart = React.memo(({ symbol, interval, alerts, autoLevels, onAddAlert, onUpdateAlert, onDeleteAlert }) => {
  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);
  const priceLinesRef = useRef(new Map());
  const autoPriceLinesRef = useRef(new Map());
  const [crosshairPos, setCrosshairPos] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [hoveredAlert, setHoveredAlert] = useState(null);
  const draggingAlertRef = useRef(null);
  const alertsRef = useRef(alerts);

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  // Initialize and Update Chart
  useEffect(() => {
    if (!chartContainerRef.current) return;
    let wasCancelled = false;

    const chart = createChart(chartContainerRef.current, {
      autoSize: true, // Crucial for V5 to prevent silent 0x0 renders
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
      },
      crosshair: {
        mode: 0,
      },
      timeScale: {
        borderColor: 'rgba(51, 65, 85, 0.8)',
        timeVisible: true,
        secondsVisible: false,
        shiftVisibleRangeOnNewBar: true,
      },
      rightPriceScale: {
        borderColor: 'rgba(51, 65, 85, 0.8)',
        visible: true,
      },
      handleScroll: true,
      handleScale: true,
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Crosshair and Dragging logic
    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !seriesRef.current) {
        setCrosshairPos(null);
        setHoveredAlert(null);
        return;
      }

      const price = seriesRef.current.coordinateToPrice(param.point.y);
      if (!price) {
        setCrosshairPos(null);
        return;
      }

      setCrosshairPos({ 
        y: param.point.y, 
        price: parseFloat(price.toFixed(2)) 
      });

      // Check if hovering over any alert line using REF
      const TOLERANCE_PX = 10;
      let hovered = null;
      
      if (!draggingAlertRef.current) {
        alertsRef.current.forEach((alert) => {
          if (alert.status === 'active' && alert.symbol === symbol.id) {
            const lineY = seriesRef.current?.priceToCoordinate(alert.target_price);
            if (lineY !== null && lineY !== undefined && Math.abs(lineY - param.point.y) < TOLERANCE_PX) {
              hovered = { id: alert.id, y: lineY };
            }
          }
        });
        setHoveredAlert(hovered);
      } else {
        // We are dragging! Update the line in real-time
        const alertId = draggingAlertRef.current.id;
        const line = priceLinesRef.current.get(alertId);
        if (line) {
          line.applyOptions({ 
            price: price,
            title: `MODIFYING: $${price.toFixed(2)}`
          });
        }
      }
    });

    const handleMouseDown = (e) => {
      if (!seriesRef.current || !chartRef.current) return;
      if (e.target.closest('button')) return;
      
      const TOLERANCE_PX = 20;
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Ignore clicks on the right-side price axis (approx last 60px)
      if (x > rect.width - 60) return;
      
      for (const alert of alertsRef.current) {
        if (alert.status === 'active' && alert.symbol === symbol.id) {
          const lineY = seriesRef.current.priceToCoordinate(alert.target_price);
          if (lineY !== null && Math.abs(lineY - y) < TOLERANCE_PX) {
            draggingAlertRef.current = { id: alert.id, originalPrice: alert.target_price };
            chart.applyOptions({ handleScroll: false, handleScale: false });
            break;
          }
        }
      }
    };

    const handleMouseUp = (e) => {
      if (draggingAlertRef.current && seriesRef.current) {
        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const y = e.clientY - rect.top;
          const finalPrice = seriesRef.current.coordinateToPrice(y);
          if (finalPrice) {
            onUpdateAlert(draggingAlertRef.current.id, parseFloat(finalPrice.toFixed(2)));
          }
        }
        draggingAlertRef.current = null;
        chart.applyOptions({ handleScroll: true, handleScale: true });
      }
    };

    const handleTouchStart = (e) => {
      if (!seriesRef.current || !chartRef.current || e.touches.length > 1) return;
      if (e.target.closest('button')) return;
      
      const touch = e.touches[0];
      const TOLERANCE_PX = 30; // Larger for touch
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
      // Ignore touch starts on the right-side price axis
      if (x > rect.width - 60) return;
      
      for (const alert of alertsRef.current) {
        if (alert.status === 'active' && alert.symbol === symbol.id) {
          const lineY = seriesRef.current.priceToCoordinate(alert.target_price);
          if (lineY !== null && Math.abs(lineY - y) < TOLERANCE_PX) {
            e.preventDefault(); // Prevent scroll when starting drag
            draggingAlertRef.current = { id: alert.id, originalPrice: alert.target_price };
            chart.applyOptions({ handleScroll: false, handleScale: false });
            break;
          }
        }
      }
    };

    const handleTouchMove = (e) => {
      if (!draggingAlertRef.current || !seriesRef.current || e.touches.length > 1) return;
      
      const touch = e.touches[0];
      const rect = chartContainerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const y = touch.clientY - rect.top;
      const price = seriesRef.current.coordinateToPrice(y);
      
      if (price) {
        const line = priceLinesRef.current.get(draggingAlertRef.current.id);
        if (line) {
          line.applyOptions({ 
            price: price,
            title: `DRAGGING: $${price.toFixed(2)}`
          });
        }
      }
    };

    const handleTouchEnd = (e) => {
      if (draggingAlertRef.current && seriesRef.current) {
        const touch = e.changedTouches[0];
        const rect = chartContainerRef.current?.getBoundingClientRect();
        if (rect) {
          const y = touch.clientY - rect.top;
          const finalPrice = seriesRef.current.coordinateToPrice(y);
          if (finalPrice) {
            onUpdateAlert(draggingAlertRef.current.id, parseFloat(finalPrice.toFixed(2)));
          }
        }
        draggingAlertRef.current = null;
        chart.applyOptions({ handleScroll: true, handleScale: true });
      }
    };


    const container = chartContainerRef.current;
    container?.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    container?.addEventListener('touchstart', handleTouchStart, { passive: false });
    container?.addEventListener('touchmove', handleTouchMove, { passive: false });
    container?.addEventListener('touchend', handleTouchEnd);

    // Note: V5 autoSize natively handles resize logic, so we skip the manual listener

    // Load History
    const loadData = async () => {
      try {
        const history = await binanceService.getHistoricalData(symbol, interval);
        
        if (wasCancelled) return;
        
        if (seriesRef.current && history.length > 0) {
          seriesRef.current.setData(history);
          chart.timeScale().fitContent();
        }
      } catch (e) {
        if (!wasCancelled) console.error(`[Chart] Failed to load data`, e);
      }
    };

    loadData();

    // Live Stream
    const subscription = binanceService.getPriceStream().subscribe((update) => {
      if (seriesRef.current && update.symbol === symbol.id) {
        seriesRef.current.update({
          time: update.time / 1000,
          open: update.price,
          high: update.price,
          low: update.price,
          close: update.price,
        });
      }
    });

    return () => {
      wasCancelled = true;
      container?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      container?.removeEventListener('touchstart', handleTouchStart);
      container?.removeEventListener('touchmove', handleTouchMove);
      container?.removeEventListener('touchend', handleTouchEnd);
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current.clear(); // FATAL BUG FIX: Flush old price lines so they can be securely recreated on the newly constructed chart instance!
      autoPriceLinesRef.current.clear();
      
      // Defer removal to next tick to let internal ResizeObservers flush safely
      requestAnimationFrame(() => {
        try {
          chart.remove();
        } catch (e) {
             // Ignore disposed errors on unmount
        }
      });
    };
  }, [symbol, interval]); // Removed `alerts` to prevent fatal chart teardown on alert changes

  // Update Alert Lines
  useEffect(() => {
    if (!seriesRef.current) return;

    // Use a diff-based update to avoid removing dragging lines
    const currentAlertIds = new Set(alerts.map(a => a.id));
    
    // Remove lines that are no longer there
    priceLinesRef.current.forEach((line, id) => {
      if (!currentAlertIds.has(id)) {
        seriesRef.current?.removePriceLine(line);
        priceLinesRef.current.delete(id);
      }
    });

    alerts.forEach((alert) => {
      const isAuto = ['PDH', 'PDL', 'PWH', 'PWL'].includes(alert.label);
      if (!isAuto && alert.status === 'active' && alert.symbol === symbol.id) {
        let line = priceLinesRef.current.get(alert.id);
        const targetPriceVal = Number(alert.target_price); // Cast to strict Number
        const lineOptions = {
          price: targetPriceVal,
          color: alert.condition === 'gt' ? '#10b981' : '#f43f5e',
          lineWidth: 2,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          lineVisible: true,
          axisLabelColor: alert.condition === 'gt' ? '#10b981' : '#f43f5e',
          axisLabelTextColor: '#ffffff',
          title: `${alert.condition === 'gt' ? 'Above' : 'Below'} ${targetPriceVal}`,
        };

        if (line) {
          // Update existing line
          line.applyOptions(lineOptions);
        } else {
          // Create new line
          line = seriesRef.current?.createPriceLine(lineOptions);
          if (line) {
            priceLinesRef.current.set(alert.id, line);
          }
        }
      }
    });
  }, [alerts, symbol]);

  // Update Auto Levels (PDH, PDL, PWH, PWL)
  useEffect(() => {
    if (!seriesRef.current || !autoLevels) return;

    // 1. Remove old auto lines first
    autoPriceLinesRef.current.forEach((line) => {
      try {
        seriesRef.current?.removePriceLine(line);
      } catch (e) {}
    });
    autoPriceLinesRef.current.clear();

    const levels = [
      { key: 'PDH', val: autoLevels.pdh, color: '#f59e0b', title: 'PDH (Prev Day High)' },
      { key: 'PDL', val: autoLevels.pdl, color: '#f59e0b', title: 'PDL (Prev Day Low)' },
      { key: 'PWH', val: autoLevels.pwh, color: '#ef4444', title: 'PWH (Prev Week High)' },
      { key: 'PWL', val: autoLevels.pwl, color: '#ef4444', title: 'PWL (Prev Week Low)' }
    ];

    levels.forEach(({ key, val, color, title }) => {
      if (val !== null && val !== undefined) {
        const lineVal = Number(val);
        const line = seriesRef.current?.createPriceLine({
          price: lineVal,
          color: color,
          lineWidth: 1.5,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          lineVisible: true,
          axisLabelColor: color,
          axisLabelTextColor: '#ffffff',
          title: title
        });
        if (line) {
          autoPriceLinesRef.current.set(key, line);
        }
      }
    });
  }, [autoLevels, symbol]);

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (!seriesRef.current || !chartContainerRef.current) return;

    const rect = chartContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const price = seriesRef.current.coordinateToPrice(y);
    if (price) {
      setContextMenu({ 
        x: e.clientX, 
        y: e.clientY, 
        price: parseFloat(price.toFixed(2)) 
      });
    }
  };

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  return (
    <div 
      className={`w-full h-full relative group min-h-[300px] ${
        hoveredAlert ? 'cursor-ns-resize' : 'cursor-crosshair'
      }`} 
      onContextMenu={handleContextMenu}
      ref={chartContainerRef}
    >
      {/* Dynamic Plus Button Overlay on Price Scale */}
      {crosshairPos && !hoveredAlert && !draggingAlertRef.current && (
        <button 
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onAddAlert(crosshairPos.price);
          }}
          title={`Set alert at $${crosshairPos.price}`}
          className="absolute z-[100] bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-xl transition-all flex items-center justify-center p-1 border-2 border-slate-900"
          style={{ 
            top: `${crosshairPos.y}px`, 
            right: '62px', 
            transform: 'translateY(-50%)',
            width: '20px',
            height: '20px'
          }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Delete Button Overlay for Hovered Alert */}
      {hoveredAlert && !draggingAlertRef.current && (
        <div 
          className="absolute left-0 right-0 pointer-events-none" 
          style={{ top: `${hoveredAlert.y}px`, height: '1px', backgroundColor: 'rgba(244, 63, 94, 0.2)', transform: 'translateY(-50%)' }}
        />
      )}
      {hoveredAlert && !draggingAlertRef.current && (
        <button 
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            onDeleteAlert(hoveredAlert.id);
            setHoveredAlert(null);
          }}
          title="Delete Alert"
          className="absolute z-[60] bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-2xl transition-all flex items-center justify-center p-2 border-2 border-slate-900 cursor-pointer"
          style={{ 
            top: `${hoveredAlert.y}px`, 
            right: '80px', 
            transform: 'translateY(-50%)',
            width: '36px',
            height: '36px'
          }}
        >
          <Trash2 className="w-4 h-4" strokeWidth={3} />
        </button>
      )}

      {/* Custom Context Menu */}
      {contextMenu && (
        <div 
          className="fixed z-[100] bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 min-w-[160px] animate-in fade-in zoom-in duration-100"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              onAddAlert(contextMenu.price);
              setContextMenu(null);
            }}
            className="w-full flex items-center gap-3 px-4 py-2 text-xs font-bold text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors border-b border-slate-800/50"
          >
            <BellPlus className="w-4 h-4" />
            Add Alert @ ${contextMenu.price}
          </button>
          <div className="px-4 py-2 text-[10px] text-slate-500 font-bold uppercase tracking-widest opacity-40">
            {symbol.id} Perpetual
          </div>
        </div>
      )}
    </div>
  );
});
