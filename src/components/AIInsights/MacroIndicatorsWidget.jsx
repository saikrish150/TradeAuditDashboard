import React, { useEffect, useRef, memo } from 'react';
import { AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';

function MacroIndicatorsWidget() {
  const container = useRef();

  useEffect(() => {
    if (container.current) container.current.innerHTML = '';

    const createWidget = () => {
      if (!container.current) return;
      
      const script = document.createElement("script");
      script.src = "https://s3.tradingview.com/external-embedding/embed-widget-tickers.js";
      script.type = "text/javascript";
      script.async = true;
      script.innerHTML = JSON.stringify({
        symbols: [
          { proName: "BATS:VXX", title: "Volatility Index (VIX)" },
          { proName: "INDEX:DXY", title: "US Dollar Index" },
          { proName: "NASDAQ:IEF", title: "US 10-Year Treasury" },
          { proName: "CAPITALCOM:EURUSD", title: "EUR/USD" }
        ],
        colorTheme: "dark",
        isTransparent: true,
        showSymbolLogo: false,
        locale: "en"
      });

      const widgetContainer = document.createElement("div");
      widgetContainer.className = "tradingview-widget-container__widget";

      container.current.appendChild(widgetContainer);
      container.current.appendChild(script);
    };
    
    createWidget();
  }, []);

  return (
    <div className="flex flex-col gap-8">
      {/* Top: Tickers (Full Width so they don't get cut off) */}
      <div className="w-full">
        <div className="tradingview-widget-container" ref={container}></div>
      </div>

      {/* Bottom: Explanations & Impact */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* VIX */}
        <div className="bg-journal-card/60 border border-white/5 p-5 rounded-2xl flex flex-col gap-4 group hover:bg-white/5 transition-all hover:-translate-y-1 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-journal-gold/10 rounded-xl text-journal-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              <AlertTriangle size={20} />
            </div>
            <h4 className="text-white font-black italic tracking-tighter uppercase text-sm drop-shadow-md">VIX (Fear Gauge)</h4>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed flex-grow">
            Measures expected market volatility. A VIX <strong className="text-red-400">above 20</strong> means high market fear and panics. A VIX <strong className="text-emerald-400">below 15</strong> signals extreme complacency and slow-grinding bull markets.
          </p>
          <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Rising VIX Impact:</span>
            <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-widest animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.2)]">Bearish for Stocks</span>
          </div>
        </div>

        {/* DXY */}
        <div className="bg-journal-card/60 border border-white/5 p-5 rounded-2xl flex flex-col gap-4 group hover:bg-white/5 transition-all hover:-translate-y-1 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-journal-gold/10 rounded-xl text-journal-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              <DollarSign size={20} />
            </div>
            <h4 className="text-white font-black italic tracking-tighter uppercase text-sm drop-shadow-md">DXY (US Dollar)</h4>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed flex-grow">
            Measures USD against foreign currencies. A <strong className="text-red-400">rising DXY</strong> crushes Gold, Crypto, and tech stocks (cash is king). A <strong className="text-emerald-400">falling DXY</strong> fuels massive rallies in global risk assets.
          </p>
          <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Rising USD Impact:</span>
            <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">Bearish for Crypto/Gold</span>
          </div>
        </div>

        {/* US10Y */}
        <div className="bg-journal-card/60 border border-white/5 p-5 rounded-2xl flex flex-col gap-4 group hover:bg-white/5 transition-all hover:-translate-y-1 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-journal-gold/10 rounded-xl text-journal-gold shadow-[0_0_15px_rgba(212,175,55,0.15)]">
              <TrendingUp size={20} />
            </div>
            <h4 className="text-white font-black italic tracking-tighter uppercase text-sm drop-shadow-md">10-Year Bond Yield</h4>
          </div>
          <p className="text-slate-400 text-[11px] leading-relaxed flex-grow">
            The benchmark for global borrowing. <strong className="text-red-400">Rising yields</strong> trigger massive sell-offs in tech/growth stocks. If yields <strong className="text-emerald-400">crash suddenly</strong>, it signals investors fleeing to safety ahead of a recession.
          </p>
          <div className="flex items-center justify-between border-t border-white/5 pt-3 mt-auto">
            <span className="text-[10px] text-slate-500 font-bold uppercase">Rising Yields Impact:</span>
            <span className="px-2 py-1 rounded-md bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black uppercase tracking-widest shadow-[0_0_10px_rgba(239,68,68,0.2)]">Bearish for Tech/Growth</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default memo(MacroIndicatorsWidget);
