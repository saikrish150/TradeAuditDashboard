import React, { useEffect, useRef, memo } from 'react';

function GlobalMarketsWidget() {
  const containerTop = useRef();
  const containerMiddle = useRef();
  const containerBottom = useRef();

  useEffect(() => {
    // Clean up previous script if re-rendering
    if (containerTop.current) containerTop.current.innerHTML = '';
    if (containerMiddle.current) containerMiddle.current.innerHTML = '';
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

    // Row 1: The Americas
    createWidget(containerTop, [
      { proName: "FOREXCOM:SPXUSD", title: "US 500" },
      { proName: "FOREXCOM:NSXUSD", title: "US 100" },
      { proName: "CAPITALCOM:US30", title: "US 30" },
      { proName: "TSX:TSX", title: "Canada 60" }
    ]);

    // Row 2: Europe
    createWidget(containerMiddle, [
      { proName: "CAPITALCOM:UK100", title: "UK 100" },
      { proName: "CAPITALCOM:DE40", title: "Germany 40" },
      { proName: "CAPITALCOM:FR40", title: "France 40" },
      { proName: "CAPITALCOM:EU50", title: "Europe 50" }
    ]);

    // Row 3: Asia-Pacific
    createWidget(containerBottom, [
      { proName: "INDEX:NKY", title: "Japan 225" },
      { proName: "BSE:SENSEX", title: "India Sensex" },
      { proName: "INDEX:HSI", title: "Hong Kong 50" },
      { proName: "CAPITALCOM:AU200", title: "Australia 200" }
    ]);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="tradingview-widget-container" ref={containerTop}></div>
      <div className="tradingview-widget-container" ref={containerMiddle}></div>
      <div className="tradingview-widget-container relative z-10" ref={containerBottom}></div>
    </div>
  );
}

export default memo(GlobalMarketsWidget);
