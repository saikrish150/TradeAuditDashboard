import React from 'react';
import { Trash2, Bell, BellOff, CheckCircle, Clock, Coins } from 'lucide-react';
import { SUPPORTED_SYMBOLS } from '../types/binance';

export const AlertsPanel = React.memo(({ alerts, onDelete }) => {
  const getSymbolName = (id) => {
    return SUPPORTED_SYMBOLS.find(s => s.id === id)?.name || id;
  };

  return (
    <div className="flex flex-col h-full font-inter">
      <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3 mt-4">
        <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-widest text-slate-400">
          <Bell className="w-4 h-4 text-indigo-500" />
          Active Alerts
        </h2>
        <span className="bg-indigo-600/10 text-indigo-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-500/20">
          {alerts.filter(a => a.status === 'active').length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {alerts.filter(a => a.status === 'active').length === 0 ? (
          <div className="text-center py-12 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
            <BellOff className="w-8 h-8 text-slate-800 mx-auto mb-3" />
            <p className="text-slate-600 text-xs font-bold uppercase tracking-tighter">No Active Alerts</p>
            <p className="text-slate-700 text-[10px] mt-1">Click the + icon on the chart</p>
          </div>
        ) : (
          alerts.filter(a => a.status === 'active').map((alert) => (
            <div 
              key={alert.id}
              className={`p-3 rounded-xl border bg-slate-900/40 backdrop-blur-sm border-slate-800/50 transition-all hover:bg-slate-900/60 hover:border-slate-700 group relative overflow-hidden ${
                alert.status === 'triggered' ? 'opacity-60 grayscale-[0.5]' : ''
              }`}
            >
              {/* Highlight bar for active alerts */}
              {alert.status === 'active' && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  alert.condition === 'gt' ? 'bg-emerald-500' : 'bg-rose-500'
                }`} />
              )}

              <div className="flex justify-between items-start pl-2">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Coins className="w-3 h-3 text-indigo-500" />
                    <h3 className="font-bold text-xs text-slate-200 tracking-tight">{alert.symbol}</h3>
                    <span className="text-[9px] text-slate-600 hidden group-hover:inline-block transition-all">
                      • {getSymbolName(alert.symbol)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter ${
                      alert.condition === 'gt' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {alert.condition === 'gt' ? 'Greater Than' : 'Less Than'}
                    </span>
                    <span className="text-sm font-mono font-black text-slate-100">${alert.target_price.toLocaleString()}</span>
                  </div>
                </div>
                
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => onDelete(alert.id)}
                      className="p-3 -m-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all active:scale-90"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-4 h-4 lg:w-3.5 lg:h-3.5" />
                    </button>
                  </div>
              </div>

              <div className="flex items-center justify-between mt-3 pl-2 text-[9px] font-bold uppercase tracking-widest text-slate-600">
                <span className="flex items-center gap-1.5">
                  {alert.status === 'active' ? (
                    <Clock className="w-2.5 h-2.5 text-indigo-500" />
                  ) : (
                    <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />
                  )}
                  {alert.status}
                </span>
                <span className="opacity-40">{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
