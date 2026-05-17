import React, { useEffect, useRef, memo } from 'react';

function CryptoWidget() {
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

    // Row 1: Crypto Majors
    createWidget(containerTop, [
      { proName: "BINANCE:BTCUSDT", title: "Bitcoin" },
      { proName: "BINANCE:ETHUSDT", title: "Ethereum" },
      { proName: "BINANCE:SOLUSDT", title: "Solana" },
      { proName: "BINANCE:BNBUSDT", title: "BNB" }
    ]);

    // Row 2: Popular Altcoins
    createWidget(containerBottom, [
      { proName: "BINANCE:XRPUSDT", title: "Ripple" },
      { proName: "BINANCE:ADAUSDT", title: "Cardano" },
      { proName: "BINANCE:DOGEUSDT", title: "Dogecoin" },
      { proName: "BINANCE:AVAXUSDT", title: "Avalanche" }
    ]);
  }, []);

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="tradingview-widget-container" ref={containerTop}></div>
      <div className="tradingview-widget-container relative z-10" ref={containerBottom}></div>
    </div>
  );
}

export default memo(CryptoWidget);
