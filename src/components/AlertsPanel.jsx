import React from 'react';
import { Trash2, Bell, BellOff, CheckCircle, Clock, Coins } from 'lucide-react';
import { SUPPORTED_SYMBOLS } from '../types/binance';

export const AlertsPanel = React.memo(({ alerts, onDelete }) => {
  const getSymbolName = (id) => {
    return SUPPORTED_SYMBOLS.find(s => s.id === id)?.name || id;
  };

  return (
    <div className="flex flex-col h-full font-inter">
      <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3 mt-4">
        <h2 className="text-[10px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-journal-text-muted">
          <Bell className="w-4 h-4 text-journal-gold" />
          Active Alerts
        </h2>
        <span className="bg-journal-gold text-journal-bg text-[9px] font-black px-3 py-0.5 rounded-full shadow-lg shadow-journal-gold/20">
          {alerts.filter(a => a.status === 'active').length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
        {alerts.filter(a => a.status === 'active').length === 0 ? (
          <div className="text-center py-16 bg-black/20 rounded-2xl border border-dashed border-white/5">
            <BellOff className="w-8 h-8 text-white/5 mx-auto mb-3" />
            <p className="text-journal-text-muted text-[10px] font-black uppercase tracking-widest">No Active Alerts</p>
            <p className="text-journal-text-muted/40 text-[9px] mt-2 uppercase tracking-widest">Place markers on chart</p>
          </div>
        ) : (
          alerts.filter(a => a.status === 'active').map((alert) => (
            <div 
              key={alert.id}
              className={`p-4 rounded-2xl border bg-black/40 backdrop-blur-sm border-white/5 transition-all hover:bg-black/60 hover:border-journal-gold/30 group relative overflow-hidden ${
                alert.status === 'triggered' ? 'opacity-60 grayscale-[0.5]' : ''
              }`}
            >
              {/* Highlight bar for active alerts */}
              {alert.status === 'active' && (
                <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                  alert.condition === 'gt' ? 'bg-journal-green shadow-[0_0_10px_rgba(46,204,113,0.5)]' : 'bg-journal-red shadow-[0_0_10px_rgba(230,57,70,0.5)]'
                }`} />
              )}

              <div className="flex justify-between items-start pl-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-3.5 h-3.5 text-journal-gold" />
                    <h3 className="font-black text-[11px] text-white tracking-widest uppercase">{alert.symbol}</h3>
                    <span className="text-[9px] text-journal-text-muted hidden group-hover:inline-block transition-all font-black uppercase tracking-tighter">
                      • {getSymbolName(alert.symbol)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] px-2 py-0.5 rounded-lg font-black uppercase tracking-widest ${
                      alert.condition === 'gt' ? 'bg-journal-green/10 text-journal-green border border-journal-green/20' : 'bg-journal-red/10 text-journal-red border border-journal-red/20'
                    }`}>
                      {alert.condition === 'gt' ? 'Greater Than' : 'Less Than'}
                    </span>
                    <span className="text-sm font-black text-white italic tracking-tighter">${alert.target_price.toLocaleString()}</span>
                  </div>
                </div>
                
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => onDelete(alert.id)}
                      className="p-3 -m-1.5 text-journal-text-muted hover:text-journal-red hover:bg-journal-red/5 rounded-2xl transition-all active:scale-95"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
              </div>

              <div className="flex items-center justify-between mt-4 pl-2 text-[9px] font-black uppercase tracking-[0.2em] text-journal-text-muted/40 font-mono">
                <span className="flex items-center gap-2">
                  {alert.status === 'active' ? (
                    <Clock className="w-3 h-3 text-journal-gold" />
                  ) : (
                    <CheckCircle className="w-3 h-3 text-journal-green" />
                  )}
                  {alert.status}
                </span>
                <span>{new Date(alert.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
