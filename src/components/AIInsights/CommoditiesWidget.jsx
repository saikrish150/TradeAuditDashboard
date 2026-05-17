import React, { useEffect, useRef, memo } from 'react';

function CommoditiesWidget() {
  const containerTop = useRef();
  const containerBottom = useRef();

  useEffect(() => {
    // Clean up previous script if re-rendering
    if (containerTop.current) containerTop.current.innerHTML = '';
    if (containerBottom.current) containerBottom.current.innerHTML = '';

    const createWidget = (containerRef, symbols) => {
      if (!containerRef.current) return;
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-tickers.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbols: symbols,
        colorTheme: "dark",
        isTransparent: true,
        showSymbolLogo: false,
        locale: "en"
      });
      
      const widgetContainer = document.createElement("div");
      widgetContainer.className = "tradingview-widget-container__widget";
      
      containerRef.current.appendChild(widgetContainer);
      containerRef.current.appendChild(script);
    };

    // Row 1: Precious Metals & Energy
    createWidget(containerTop, [
      { proName: "TVC:GOLD", title: "Gold" },
      { proName: "TVC:SILVER", title: "Silver" },
      { proName: "TVC:USOIL", title: "WTI Crude" },
      { proName: "TVC:UKOIL", title: "Brent Crude" }
    ]);

    // Row 2: Base Metals & Agriculture
    createWidget(containerBottom, [
      { proName: "CAPITALCOM:COPPER", title: "Copper" },
      { proName: "CAPITALCOM:NATURALGAS", title: "Natural Gas" },
      { proName: "CAPITALCOM:CORN", title: "Corn" },
      { proName: "CAPITALCOM:WHEAT", title: "Wheat" }
    ]);
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="tradingview-widget-container" ref={containerTop}></div>
      <div className="tradingview-widget-container relative z-10" ref={containerBottom}></div>
    </div>
  );
}

export default memo(CommoditiesWidget);
