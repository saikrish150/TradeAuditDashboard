import { marketIntelligenceService } from './marketIntelligenceService';
import { economicEventsService } from './economicEventsService';

class MarketPulseEngine {
  constructor() {
    this.cache = null;
    this.lastFetch = null;
    this.inflight = null;
    this.CACHE_TTL = 5 * 60 * 1000; // 5 mins
    // Store raw data for summary sections
    this.rawIntelligence = [];
    this.rawEvents = [];
  }

  // Returns cached pulse instantly if available (no loading state needed)
  getCachedPulse() {
    return this.cache;
  }

  // Returns cached raw intelligence data for summary sections
  getRawIntelligence() {
    return this.rawIntelligence;
  }

  // Returns cached raw events data for summary sections
  getRawEvents() {
    return this.rawEvents;
  }

  async getPulse() {
    if (this.cache && this.lastFetch && (Date.now() - this.lastFetch < this.CACHE_TTL)) {
      return this.cache;
    }
    // If a fetch is already in-flight, wait for it instead of starting another
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this._fetchPulse();
    return this.inflight;
  }

  async _fetchPulse() {
    try {
      const [intelligence, events] = await Promise.all([
        marketIntelligenceService.fetchIntelligence(),
        economicEventsService.fetchEconomicEvents()
      ]);

      // Store raw data for summary sections
      this.rawIntelligence = intelligence || [];
      this.rawEvents = events || [];

      const pulse = this.synthesizeData(intelligence, events);
      
      this.cache = pulse;
      this.lastFetch = Date.now();
      this.inflight = null;
      
      return pulse;
    } catch (error) {
      this.inflight = null;
      console.error('[MarketPulseEngine] Failed to generate pulse:', error);
      return this.getFallbackPulse();
    }
  }

  synthesizeData(intelligence, events) {
    // 1. Calculate Sentiment Score (0-100)
    // Start at neutral 50
    let sentimentScore = 50; 
    let bullishWeight = 0;
    let bearishWeight = 0;

    intelligence.forEach(event => {
      // Analyze market impacts
      Object.values(event.marketImpact).forEach(impact => {
        if (impact === 'Bullish') bullishWeight += event.impactScore;
        if (impact === 'Bearish') bearishWeight += event.impactScore;
      });
    });

    const totalWeight = bullishWeight + bearishWeight;
    if (totalWeight > 0) {
      // Scale based on dominant force, normalize around 50
      const ratio = bullishWeight / totalWeight;
      sentimentScore = Math.round(ratio * 100);
    }

    // 2. Assess Volatility Risk (Low, Medium, High, Critical)
    let riskLevel = 'LOW';
    let riskScore = 0; // 0-10

    const now = new Date();
    const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    // Check upcoming calendar events in next 24h
    const upcomingEvents = events.filter(e => {
      const eDate = new Date(e.date);
      return eDate > now && eDate < next24h;
    });

    const highImpactEvents = upcomingEvents.filter(e => e.importance >= 3).length;
    const extremeNews = intelligence.filter(e => e.urgency === 'EXTREME').length;

    riskScore = Math.min(10, (highImpactEvents * 2) + (extremeNews * 3));

    if (riskScore >= 8) riskLevel = 'CRITICAL';
    else if (riskScore >= 5) riskLevel = 'HIGH';
    else if (riskScore >= 3) riskLevel = 'MEDIUM';

    // 3. Asset Bias Generation
    const bias = {
      equities: this.calculateAssetBias('Equities', intelligence, sentimentScore, riskLevel),
      safeHavens: this.calculateAssetBias('Gold', intelligence, 100 - sentimentScore, riskLevel),
      crypto: this.calculateAssetBias('BTC', intelligence, sentimentScore, riskLevel)
    };

    // 4. Generate AI Synthesis Text
    const synthesisText = this.generateSynthesisText(sentimentScore, riskLevel, bias, upcomingEvents[0]);

    return {
      sentiment: {
        score: sentimentScore,
        label: this.getSentimentLabel(sentimentScore),
        trend: sentimentScore > 50 ? 'bullish' : 'bearish'
      },
      risk: {
        level: riskLevel,
        score: riskScore,
        drivingFactors: [
          highImpactEvents > 0 ? `${highImpactEvents} High-Impact Calendar Events in 24h` : null,
          extremeNews > 0 ? `${extremeNews} Extreme Geo-Macro News Alerts` : null
        ].filter(Boolean)
      },
      bias,
      synthesis: synthesisText,
      timestamp: new Date().toISOString()
    };
  }

  calculateAssetBias(assetCategory, intelligence, baseSentiment, riskLevel) {
    let specificBullish = 0;
    let specificBearish = 0;

    intelligence.forEach(event => {
      if (event.affectedMarkets.some(m => m.includes(assetCategory))) {
        const impact = event.marketImpact[assetCategory];
        if (impact === 'Bullish') specificBullish++;
        if (impact === 'Bearish') specificBearish++;
      }
    });

    // Determine bias state
    if (specificBullish > specificBearish) return { state: 'BULLISH', reason: `Positive news flow for ${assetCategory}` };
    if (specificBearish > specificBullish) return { state: 'BEARISH', reason: `Negative news flow for ${assetCategory}` };
    
    // Fallback to macro logic
    if (assetCategory === 'Gold' && (riskLevel === 'CRITICAL' || riskLevel === 'HIGH')) {
      return { state: 'BULLISH', reason: 'Systemic risk driving safe-haven demand' };
    }
    
    if (baseSentiment > 60) return { state: 'BULLISH', reason: 'Strong macro environment tailwinds' };
    if (baseSentiment < 40) return { state: 'BEARISH', reason: 'Weak macro environment headwinds' };

    return { state: 'VOLATILE', reason: 'Conflicting signals; range-bound action expected' };
  }

  getSentimentLabel(score) {
    if (score >= 80) return 'Extreme Greed';
    if (score >= 60) return 'Greed';
    if (score >= 45) return 'Neutral';
    if (score >= 25) return 'Fear';
    return 'Extreme Fear';
  }

  generateSynthesisText(sentiment, risk, bias, nextEvent) {
    let text = `System detects a ${this.getSentimentLabel(sentiment).toLowerCase()} environment driven by recent algorithmic flows. `;
    
    if (risk === 'CRITICAL' || risk === 'HIGH') {
      text += `Volatility risk is currently ${risk}. Capital preservation mode advised. `;
    } else {
      text += `Market conditions are relatively stable. `;
    }

    if (bias.safeHavens.state === 'BULLISH' && bias.equities.state === 'BEARISH') {
      text += `Strong preference for defensive assets and safe havens. `;
    } else if (bias.equities.state === 'BULLISH') {
      text += `Risk-on assets showing strength. `;
    }

    if (nextEvent) {
      text += `Next major catalyst is ${nextEvent.event} from ${nextEvent.country}.`;
    }

    return text;
  }

  getFallbackPulse() {
    return {
      sentiment: { score: 50, label: 'Neutral', trend: 'neutral' },
      risk: { level: 'MEDIUM', score: 5, drivingFactors: ['Unable to fetch full data'] },
      bias: {
        equities: { state: 'VOLATILE', reason: 'Data pending' },
        safeHavens: { state: 'VOLATILE', reason: 'Data pending' },
        crypto: { state: 'VOLATILE', reason: 'Data pending' }
      },
      synthesis: 'System initializing. Fetching real-time macroeconomic and geopolitical data...',
      timestamp: new Date().toISOString()
    };
  }
}

export const marketPulseEngine = new MarketPulseEngine();

// Pre-fetch on module load so data is ready when the tab opens
marketPulseEngine.getPulse();
