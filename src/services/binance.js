import { Subject, BehaviorSubject } from 'rxjs';

class BinanceService {
  constructor() {
    this.sockets = new Map();
    this.priceSubject = new Subject();
    this.statusSubject = new BehaviorSubject('disconnected');
    this.reconnectTimeouts = new Map();
    this.activeSymbols = [];
    this.activeInterval = null;
    this.useBinanceUS = false;
    this.lastSubKey = '';
  }

  setUseBinanceUS(value) {
    console.log(`[Binance] Switching to ${value ? 'US' : 'Global'} mode`);
    this.useBinanceUS = value;
  }

  isUsingBinanceUS() {
    return this.useBinanceUS;
  }

  async testConnectivity() {
    const domain = this.useBinanceUS ? 'api.binance.us' : 'api.binance.com';
    const restUrl = `https://${domain}/api/v3/ping`;
    
    const results = { rest: false, ws: false, message: '' };

    try {
      const resp = await fetch(restUrl);
      results.rest = resp.ok;
    } catch (e) {
      results.message += `REST Error: ${e.message}. `;
    }

    try {
      const wsDomain = this.useBinanceUS ? 'stream.binance.us' : 'stream.binance.com';
      const wsUrl = this.useBinanceUS ? `wss://${wsDomain}:9443/ws/btcusdt@kline_1m` : `wss://${wsDomain}/ws/btcusdt@kline_1m`;
      const testWs = new WebSocket(wsUrl);
      
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => { testWs.close(); reject(new Error('WS Timeout (3s)')); }, 3000);
        testWs.onopen = () => { clearTimeout(timeout); testWs.close(); resolve(true); };
        testWs.onerror = () => { clearTimeout(timeout); reject(new Error('WS Refused/Closed')); };
      });
      results.ws = true;
    } catch (e) {
      results.message += `WS Error: ${e.message}. `;
    }

    return results;
  }

  async getHistoricalData(symbol, interval = '15m') {
    const domain = this.useBinanceUS ? 'api.binance.us' : 'api.binance.com';
    const fDomain = 'fapi.binance.com';
    
    // In US Mode, we don't have Futures. Switch to spot if needed.
    const isFutures = symbol.type === 'futures' && !this.useBinanceUS;
    const baseUrl = isFutures ? `https://${fDomain}/fapi/v1/klines` : `https://${domain}/api/v3/klines`;
    const url = `${baseUrl}?symbol=${symbol.ticker}&interval=${interval}&limit=1000`;
    
    console.log(`[Binance] Fetching historical data: ${url}`);
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data.map((d) => ({
        time: d[0] / 1000,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
      }));
    } catch (e) {
      console.warn(`[Binance] Historical data failed for ${symbol.ticker}:`, e);
      return [];
    }
  }

  connectAll(symbols, interval = '15m') {
    const subKey = `${symbols.map(s => s.ticker).sort().join(',')}:${interval}:${this.useBinanceUS}`;
    if (subKey === this.lastSubKey && this.sockets.size > 0) {
      console.log(`[Binance] Subscriptions already up to date: ${subKey}`);
      return;
    }

    console.log(`[Binance] Updating connections for ${subKey}`);
    this.lastSubKey = subKey;
    this.activeSymbols = symbols;
    this.activeInterval = interval;

    const domain = this.useBinanceUS ? 'stream.binance.us' : 'stream.binance.com';
    const fDomain = 'fstream.binance.com';

    // In US Mode, treat everything as spot
    const spotSymbols = symbols.filter(s => s.type === 'spot' || this.useBinanceUS);
    const futuresSymbols = this.useBinanceUS ? [] : symbols.filter(s => s.type === 'futures');

    if (spotSymbols.length > 0) {
      this.startConnection('spot', domain, spotSymbols, interval);
    } else {
      this.disconnect('spot');
    }

    if (futuresSymbols.length > 0) {
      this.startConnection('futures', fDomain, futuresSymbols, interval);
    } else {
      this.disconnect('futures');
    }

    this.updateAggregateStatus();
  }

  startConnection(type, wsDomain, syms, interval) {
    this.disconnect(type);

    const streams = syms.map(s => `${s.ticker.toLowerCase()}@kline_${interval}`).join('/');
    const baseUrl = this.useBinanceUS && type === 'spot' ? `wss://${wsDomain}:9443/stream` : `wss://${wsDomain}/stream`;
    const wsUrl = `${baseUrl}?streams=${streams}`;
    
    console.log(`[Binance] Connecting ${type}: ${wsUrl}`);
    
    try {
      const ws = new WebSocket(wsUrl);
      this.sockets.set(type, ws);
      this.statusSubject.next('connecting');

      ws.onopen = () => {
        console.log(`[Binance] ${type} connected`);
        this.updateAggregateStatus();
      };

      ws.onmessage = (event) => {
        try {
          const rawData = JSON.parse(event.data);
          const data = rawData.data;
          if (!data || !data.k) return;
          
          const kline = data.k;
          const symId = syms.find(s => s.ticker === data.s)?.id || data.s;
          
          this.priceSubject.next({
            symbol: symId,
            price: parseFloat(kline.c),
            time: kline.t,
            isClosed: kline.x
          });
        } catch (e) {}
      };

      ws.onerror = (e) => {
        console.error(`[Binance] ${type} websocket error`);
        this.updateAggregateStatus();
      };
      
      ws.onclose = () => {
        console.log(`[Binance] ${type} connection closed`);
        this.sockets.delete(type);
        this.updateAggregateStatus();
        
        if (this.activeInterval === interval) {
          this.reconnect(type, wsDomain, syms, interval);
        }
      };
    } catch (e) {
      console.error(`[Binance] Failed to create ${type} websocket`, e);
      this.updateAggregateStatus();
    }
  }

  updateAggregateStatus() {
    if (this.sockets.size === 0) {
      this.statusSubject.next('disconnected');
      return;
    }

    let allConnected = true;
    let anyError = false;
    let anyConnecting = false;

    this.sockets.forEach(ws => {
      if (ws.readyState === WebSocket.CONNECTING) anyConnecting = true;
      if (ws.readyState !== WebSocket.OPEN) allConnected = false;
      if (ws.readyState === WebSocket.CLOSED) anyError = true;
    });

    if (allConnected) {
      this.statusSubject.next('connected');
    } else if (anyConnecting) {
      this.statusSubject.next('connecting');
    } else if (anyError) {
      this.statusSubject.next('error');
    } else {
      this.statusSubject.next('disconnected');
    }
  }

  reconnect(type, wsDomain, syms, interval) {
    const timeoutKey = `${type}_reconnect`;
    if (this.reconnectTimeouts.has(timeoutKey)) clearTimeout(this.reconnectTimeouts.get(timeoutKey));
    
    const timeout = setTimeout(() => {
      if (this.activeInterval === interval) {
        this.startConnection(type, wsDomain, syms, interval);
      }
    }, 5000);
    
    this.reconnectTimeouts.set(timeoutKey, timeout);
  }

  getPriceStream() { return this.priceSubject.asObservable(); }
  getConnectionStatus() { return this.statusSubject.asObservable(); }

  disconnect(type) {
    if (type) {
      const timeoutKey = `${type}_reconnect`;
      if (this.reconnectTimeouts.has(timeoutKey)) {
        clearTimeout(this.reconnectTimeouts.get(timeoutKey));
        this.reconnectTimeouts.delete(timeoutKey);
      }
      const ws = this.sockets.get(type);
      if (ws) {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
        this.sockets.delete(type);
      }
      this.lastSubKey = '';
    } else {
      console.log('[Binance] Full disconnect');
      this.lastSubKey = '';
      this.reconnectTimeouts.forEach(t => clearTimeout(t));
      this.reconnectTimeouts.clear();
      this.sockets.forEach(ws => {
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      });
      this.sockets.clear();
      this.statusSubject.next('disconnected');
    }
  }
}

export const binanceService = new BinanceService();
