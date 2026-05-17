/**
 * Market Intelligence Service
 * 
 * Institutional-grade market intelligence engine.
 * Fetches geopolitical & macro news from GDELT + RSS feeds,
 * scores them by market impact, and returns only high-relevance events.
 */

// ============================================================
// WEIGHTED KEYWORD SYSTEM — Tiered by market impact
// Each keyword has a weight: CRITICAL=5, HIGH=3, MEDIUM=2, SUPPORT=1
// A single CRITICAL keyword alone = score 5 (passes threshold)
// ============================================================

const WEIGHTED_KEYWORDS = {
  MACRO: [
    // CRITICAL (5) — Markets react within minutes
    { kw: 'federal reserve', w: 5 }, { kw: 'fomc', w: 5 }, { kw: 'rate decision', w: 5 },
    { kw: 'rate cut', w: 5 }, { kw: 'rate hike', w: 5 }, { kw: 'interest rate', w: 5 },
    { kw: 'recession', w: 5 }, { kw: 'depression', w: 5 }, { kw: 'stagflation', w: 5 },
    { kw: 'inflation', w: 5 }, { kw: 'cpi', w: 5 }, { kw: 'nfp', w: 5 },
    { kw: 'non-farm', w: 5 }, { kw: 'economic crisis', w: 5 },
    { kw: 'fed chair', w: 5 }, { kw: 'powell', w: 5 }, { kw: 'jerome powell', w: 5 },
    { kw: 'debt default', w: 5 }, { kw: 'debt ceiling', w: 5 },
    // HIGH (3)
    { kw: 'ppi', w: 3 }, { kw: 'gdp', w: 3 }, { kw: 'treasury yield', w: 3 },
    { kw: 'bond yield', w: 3 }, { kw: 'yield curve', w: 3 },
    { kw: 'quantitative tightening', w: 3 }, { kw: 'quantitative easing', w: 3 },
    { kw: 'monetary policy', w: 3 }, { kw: 'central bank', w: 3 },
    { kw: 'hawkish', w: 3 }, { kw: 'dovish', w: 3 },
    { kw: 'ecb', w: 3 }, { kw: 'boj', w: 3 }, { kw: 'boe', w: 3 },
    { kw: 'jobs report', w: 3 }, { kw: 'unemployment', w: 3 },
    { kw: 'consumer price', w: 3 }, { kw: 'economic slowdown', w: 3 },
    { kw: 'fiscal stimulus', w: 3 }, { kw: 'stimulus package', w: 3 },
    { kw: 'credit downgrade', w: 3 }, { kw: 'manufacturing pmi', w: 3 },
    // MEDIUM (2)
    { kw: 'payroll', w: 2 }, { kw: 'taper', w: 2 }, { kw: 'liquidity', w: 2 },
    { kw: 'deflation', w: 2 }, { kw: 'producer price', w: 2 },
    { kw: 'wage growth', w: 2 }, { kw: 'retail sales', w: 2 },
    { kw: 'housing starts', w: 2 }, { kw: 'services pmi', w: 2 },
    { kw: 'labor market', w: 2 }, { kw: 'consumer spending', w: 2 },
    { kw: 'trade deficit', w: 2 }, { kw: 'rbi policy', w: 2 },
  ],

  GEOPOLITICAL: [
    // CRITICAL (5) — Immediate global risk-off triggers
    { kw: 'war', w: 5 }, { kw: 'invasion', w: 5 }, { kw: 'nuclear', w: 5 },
    { kw: 'bomb', w: 5 }, { kw: 'bombing', w: 5 }, { kw: 'attack', w: 5 },
    { kw: 'missile strike', w: 5 }, { kw: 'airstrike', w: 5 },
    { kw: 'military action', w: 5 }, { kw: 'military strike', w: 5 },
    { kw: 'tariff', w: 5 }, { kw: 'tariffs', w: 5 }, { kw: 'trade war', w: 5 },
    { kw: 'sanctions', w: 5 }, { kw: 'embargo', w: 5 },
    { kw: 'oil price', w: 5 }, { kw: 'oil crisis', w: 5 }, { kw: 'crude oil', w: 5 },
    { kw: 'oil supply', w: 5 }, { kw: 'energy crisis', w: 5 },
    { kw: 'strait of hormuz', w: 5 }, { kw: 'martial law', w: 5 },
    { kw: 'coup', w: 5 }, { kw: 'assassination', w: 5 },
    { kw: 'trump tariff', w: 5 }, { kw: 'trump sanction', w: 5 },
    { kw: 'trump trade', w: 5 }, { kw: 'trump threat', w: 5 },
    // HIGH (3) — Major geopolitical actors & events
    { kw: 'russia', w: 3 }, { kw: 'ukraine', w: 3 }, { kw: 'china', w: 3 },
    { kw: 'taiwan', w: 3 }, { kw: 'israel', w: 3 }, { kw: 'iran', w: 3 },
    { kw: 'north korea', w: 3 }, { kw: 'trump', w: 3 },
    { kw: 'military', w: 3 }, { kw: 'missile', w: 3 }, { kw: 'drone strike', w: 3 },
    { kw: 'escalation', w: 3 }, { kw: 'ceasefire', w: 3 }, { kw: 'conflict', w: 3 },
    { kw: 'opec', w: 3 }, { kw: 'nato', w: 3 }, { kw: 'troops', w: 3 },
    { kw: 'blockade', w: 3 }, { kw: 'cyberattack', w: 3 },
    { kw: 'middle east', w: 3 }, { kw: 'houthi', w: 3 }, { kw: 'hezbollah', w: 3 },
    { kw: 'red sea', w: 3 }, { kw: 'suez canal', w: 3 },
    { kw: 'south china sea', w: 3 }, { kw: 'brics', w: 3 },
    { kw: 'proxy war', w: 3 }, { kw: 'arms deal', w: 3 },
    // MEDIUM (2)
    { kw: 'g7', w: 2 }, { kw: 'g20', w: 2 }, { kw: 'un security council', w: 2 },
    { kw: 'geopolitical', w: 2 }, { kw: 'naval', w: 2 },
    { kw: 'diplomatic', w: 2 }, { kw: 'territory', w: 2 },
    { kw: 'sovereignty', w: 2 }, { kw: 'border conflict', w: 2 },
  ],

  BANKING: [
    // CRITICAL (5)
    { kw: 'banking crisis', w: 5 }, { kw: 'bank collapse', w: 5 },
    { kw: 'financial contagion', w: 5 }, { kw: 'bank run', w: 5 },
    { kw: 'liquidity crisis', w: 5 }, { kw: 'credit crunch', w: 5 },
    { kw: 'market crash', w: 5 }, { kw: 'stock crash', w: 5 },
    // HIGH (3)
    { kw: 'credit risk', w: 3 }, { kw: 'sovereign debt', w: 3 },
    { kw: 'bailout', w: 3 }, { kw: 'systemic risk', w: 3 }, { kw: 'default', w: 3 },
    { kw: 'currency crisis', w: 3 }, { kw: 'capital flight', w: 3 },
    { kw: 'bond market stress', w: 3 }, { kw: 'margin call', w: 3 },
    // MEDIUM (2)
    { kw: 'fiscal deficit', w: 2 }, { kw: 'interbank', w: 2 },
    { kw: 'repo market', w: 2 }, { kw: 'insolvency', w: 2 },
    { kw: 'stress test', w: 2 }, { kw: 'deposit flight', w: 2 },
  ],

  CRYPTO: [
    // CRITICAL (5)
    { kw: 'bitcoin etf', w: 5 }, { kw: 'ethereum etf', w: 5 },
    { kw: 'crypto ban', w: 5 }, { kw: 'sec crypto', w: 5 },
    { kw: 'crypto crash', w: 5 }, { kw: 'bitcoin crash', w: 5 },
    // HIGH (3)
    { kw: 'bitcoin', w: 3 }, { kw: 'ethereum', w: 3 }, { kw: 'crypto', w: 3 },
    { kw: 'etf inflow', w: 3 }, { kw: 'etf outflow', w: 3 },
    { kw: 'binance', w: 3 }, { kw: 'coinbase', w: 3 },
    { kw: 'blackrock', w: 3 }, { kw: 'stablecoin', w: 3 },
    { kw: 'liquidation', w: 3 }, { kw: 'regulation', w: 3 },
    // MEDIUM (2)
    { kw: 'whale', w: 2 }, { kw: 'exchange outflow', w: 2 },
    { kw: 'on-chain', w: 2 }, { kw: 'defi', w: 2 },
    { kw: 'grayscale', w: 2 }, { kw: 'fidelity', w: 2 },
    { kw: 'halving', w: 2 }, { kw: 'hack', w: 2 },
    { kw: 'leverage flush', w: 2 }, { kw: 'blockchain', w: 2 },
  ],

  INDIA: [
    // CRITICAL (5)
    { kw: 'rbi rate', w: 5 }, { kw: 'india election', w: 5 },
    { kw: 'union budget', w: 5 }, { kw: 'india recession', w: 5 },
    // HIGH (3)
    { kw: 'rbi', w: 3 }, { kw: 'nifty', w: 3 }, { kw: 'sensex', w: 3 },
    { kw: 'banknifty', w: 3 }, { kw: 'sebi', w: 3 },
    { kw: 'fii', w: 3 }, { kw: 'dii', w: 3 }, { kw: 'rupee', w: 3 },
    { kw: 'adani', w: 3 }, { kw: 'reliance', w: 3 },
    { kw: 'india gdp', w: 3 }, { kw: 'india inflation', w: 3 },
    { kw: 'modi', w: 3 },
    // MEDIUM (2)
    { kw: 'tata', w: 2 }, { kw: 'hdfc', w: 2 }, { kw: 'icici', w: 2 },
    { kw: 'nse', w: 2 }, { kw: 'psu bank', w: 2 },
    { kw: 'parliament', w: 2 }, { kw: 'gst', w: 2 },
    { kw: 'india growth', w: 2 }, { kw: 'crude oil india', w: 2 },
  ]
};

// Junk filter — remove noise
const JUNK_KEYWORDS = [
  'entertainment', 'celebrity', 'recipe', 'tourism', 'music',
  'fashion', 'movie', 'comic', 'lifestyle', 'gossip',
  'meme coin', 'influencer', 'tiktok', 'instagram',
  'kardashian', 'bollywood', 'hollywood', 'cricket score',
  'football score', 'soccer', 'tennis', 'basketball', 'nba',
  'nfl', 'ipl score', 'world cup sport', 'olympic',
  'horoscope', 'astrology', 'dating', 'wedding',
  'cooking', 'travel blog', 'fitness tip', 'yoga',
  'video game', 'gaming', 'esports', 'anime', 'manga',
  'dinosaur', 'fossil', 'archaeology', 'museum', 'concert',
  'box office', 'streaming', 'reality show', 'contestant'
];

// ============================================================
// SCORING ENGINE — Weighted tier system
// ============================================================

function countKeywordMatches(text, keywords) {
  const lower = text.toLowerCase();
  let count = 0;
  const matched = [];
  for (const kw of keywords) {
    if (lower.includes(kw)) {
      count++;
      matched.push(kw);
    }
  }
  return { count, matched };
}

function scoreByCategory(text, categoryKeywords) {
  const lower = text.toLowerCase();
  let totalWeight = 0;
  const matched = [];
  for (const { kw, w } of categoryKeywords) {
    if (lower.includes(kw)) {
      totalWeight += w;
      matched.push(kw);
    }
  }
  return { totalWeight, matched };
}

function scoreArticle(article) {
  const text = `${article.title || ''} ${article.description || ''} ${article.summary || ''}`.toLowerCase();

  // Junk filter first
  const junkCheck = countKeywordMatches(text, JUNK_KEYWORDS);
  if (junkCheck.count >= 1) return null; // Kill any junk

  // Score each category using weighted keywords
  const categoryResults = Object.entries(WEIGHTED_KEYWORDS).map(([category, keywords]) => {
    const result = scoreByCategory(text, keywords);
    return { category, ...result };
  });

  // Sort by weight to find primary category
  categoryResults.sort((a, b) => b.totalWeight - a.totalWeight);
  const primary = categoryResults[0];

  // Total weight across all categories
  const totalWeight = categoryResults.reduce((sum, c) => sum + c.totalWeight, 0);

  // No relevant keywords found
  if (totalWeight === 0) return null;

  // Impact score = total weight, capped at 10
  let impactScore = Math.min(10, totalWeight);

  // THRESHOLD: Only show score >= 5 (high-impact only)
  if (impactScore < 5) return null;

  // Determine urgency
  let urgency = 'MEDIUM';
  if (impactScore >= 9) urgency = 'EXTREME';
  else if (impactScore >= 7) urgency = 'HIGH';

  // Market mapping per category
  const MARKET_MAP = {
    MACRO: { markets: ['NIFTY', 'BANKNIFTY', 'S&P500', 'Gold', 'DXY', 'BTC', 'US10Y'], default: 'Volatile' },
    GEOPOLITICAL: { markets: ['Gold', 'Oil', 'DXY', 'NIFTY', 'BTC', 'S&P500'], default: 'Volatile' },
    BANKING: { markets: ['BANKNIFTY', 'S&P500', 'Gold', 'DXY', 'BTC', 'US10Y'], default: 'Bearish' },
    CRYPTO: { markets: ['BTC', 'ETH', 'NIFTY', 'S&P500'], default: 'Volatile' },
    INDIA: { markets: ['NIFTY', 'BANKNIFTY', 'Sensex', 'Rupee'], default: 'Volatile' }
  };

  const config = MARKET_MAP[primary.category] || MARKET_MAP.GEOPOLITICAL;
  const affectedMarkets = config.markets;

  // Quick sentiment scan
  const bearishWords = ['crash', 'collapse', 'crisis', 'selloff', 'panic', 'recession', 'default',
    'downgrade', 'plunge', 'decline', 'slump', 'fear', 'risk-off', 'escalation',
    'war', 'invasion', 'sanctions', 'ban', 'hack', 'contagion', 'hawkish', 'tighten', 'rate hike'];
  const bullishWords = ['rally', 'surge', 'recovery', 'growth', 'boom', 'rate cut', 'dovish',
    'easing', 'stimulus', 'inflow', 'approval', 'adoption', 'ceasefire', 'peace', 'deal',
    'record high', 'breakout', 'accumulation', 'upgrade'];

  const bearCount = bearishWords.filter(w => text.includes(w)).length;
  const bullCount = bullishWords.filter(w => text.includes(w)).length;

  let overallSentiment = config.default;
  if (bearCount > bullCount) overallSentiment = 'Bearish';
  else if (bullCount > bearCount) overallSentiment = 'Bullish';

  // Build per-market impact
  const marketImpact = {};
  for (const market of affectedMarkets) {
    if (market === 'Gold' && overallSentiment === 'Bearish') {
      marketImpact[market] = 'Bullish'; // Fear drives gold up
    } else if (market === 'DXY' && overallSentiment === 'Bearish' && primary.category !== 'MACRO') {
      marketImpact[market] = 'Bullish'; // Dollar as safe haven
    } else {
      marketImpact[market] = overallSentiment;
    }
  }

  return {
    title: article.title || 'Untitled Event',
    summary: article.description || article.summary || '',
    impactScore,
    category: primary.category,
    affectedMarkets,
    marketImpact,
    urgency,
    source: article.source || article.domain || 'Unknown',
    sourceUrl: article.url || article.link || '#',
    timestamp: article.publishedAt || article.pubDate || article.seendate || new Date().toISOString(),
    matchedKeywords: categoryResults.flatMap(c => c.matched).slice(0, 8),
    image: article.image || article.socialimage || null
  };
}

// ============================================================
// DATA FETCHERS
// ============================================================

async function fetchFromGDELT() {
  // Combine multiple topics into a single query string to reduce API calls
  // This drastically reduces the chance of hitting 429 "Too Many Requests" blocks
  const combinedQuery = '(sanctions OR tariff OR "trade war" OR military OR conflict OR "federal reserve" OR inflation OR recession OR bitcoin OR "crypto regulation" OR india OR nifty OR sensex OR rbi OR rupee)';
  
  const allArticles = [];

  try {
    const url = `/api-gdelt/api/v2/doc/doc?query=${encodeURIComponent(combinedQuery)}&mode=artlist&format=json&maxrecords=50&timespan=24h&sourcelang=english`;
    const response = await fetch(url);
    
    if (response.status === 429) {
      console.warn('[Intelligence] GDELT Rate Limited (429). Skipping GDELT for this cycle.');
      return [];
    }
    
    if (!response.ok) return [];
    
    const text = await response.text();
    if (!text.startsWith('{') && !text.startsWith('[')) return [];
    
    const data = JSON.parse(text);
    if (!data.articles) return [];

    allArticles.push(...data.articles.map(a => ({
        title: a.title || '',
        description: a.seendate ? `Source: ${a.domain}` : '',
        url: a.url,
        source: a.domain || 'GDELT',
        domain: a.domain,
        publishedAt: a.seendate || new Date().toISOString(),
        socialimage: a.socialimage,
        language: a.language
      })));
  } catch (error) {
    console.error('[Intelligence] GDELT Fetch Error:', error);
  }

  if (allArticles.length === 0) {
    console.warn('[Intelligence] All GDELT queries failed, falling back to RSS');
  }

  return allArticles;
}

async function fetchFromRSS() {
  // Global + Indian financial news RSS feeds
  const feeds = [
    // Global
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.cnbc.com/id/100727362/device/rss/rss.html',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://news.google.com/rss/topics/CAAqJggKIiBDQkFTRWdvSUwyMHZNRGx1YlY4U0FtVnVHZ0pWVXlnQVAB?hl=en-US&gl=US&ceid=US:en',
    // India — Markets & Economy
    'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms',
    'https://www.livemint.com/rss/markets',
    'https://feeds.feedburner.com/ndtvprofit-latest'
  ];

  const results = [];

  for (const feedUrl of feeds) {
    try {
      const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) continue;
      const data = await response.json();

      if (data.status === 'ok' && data.items) {
        results.push(...data.items.map(item => ({
          title: item.title || '',
          description: item.description?.replace(/<[^>]*>/g, '').slice(0, 300) || '',
          url: item.link,
          source: data.feed?.title || 'RSS Feed',
          publishedAt: item.pubDate || new Date().toISOString(),
          image: item.thumbnail || item.enclosure?.link || null
        })));
      }
    } catch (error) {
      console.warn(`[Intelligence] RSS feed failed: ${feedUrl}`, error.message);
    }
  }

  return results;
}

// ============================================================
// DEDUPLICATION
// ============================================================

function deduplicateArticles(articles) {
  const seen = new Set();
  return articles.filter(a => {
    // Create a simplified key from the first 60 chars of the title
    const key = (a.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ============================================================
// HISTORICAL IMPACT DATABASE
// What happened to markets when similar events occurred in the past
// ============================================================

const HISTORICAL_IMPACT = {
  'tariff': { event: 'US-China Tariff Escalation (2019)', impact: 'S&P500 dropped 6% in 2 weeks. Gold rallied 4%. NIFTY fell 3.5%. USD strengthened.' },
  'tariffs': { event: 'US-China Tariff Escalation (2019)', impact: 'S&P500 dropped 6% in 2 weeks. Gold rallied 4%. NIFTY fell 3.5%. USD strengthened.' },
  'trade war': { event: 'US-China Trade War (2018-19)', impact: 'Global equities lost $5T. Commodities crashed. Safe havens (Gold, JPY, CHF) surged.' },
  'sanctions': { event: 'Russia Sanctions (2022)', impact: 'Oil spiked 30%+ to $130. Wheat +50%. Ruble crashed 50%. European gas prices 10x.' },
  'war': { event: 'Russia-Ukraine War (Feb 2022)', impact: 'Global markets crashed 3-5%. Oil spiked to $130. Gold hit $2050. BTC dropped 10%.' },
  'invasion': { event: 'Russia Invaded Ukraine (Feb 2022)', impact: 'NIFTY dropped 4.7%. Gold surged to $2050. Crude oil hit $130. Global risk-off.' },
  'nuclear': { event: 'North Korea Nuclear Tests (2017)', impact: 'Immediate risk-off. Gold +2%, JPY strengthened. S&P500 dropped 1%. VIX spiked 25%.' },
  'missile': { event: 'Iran Missile Strike on US Base (Jan 2020)', impact: 'Oil spiked 4% overnight. Gold hit $1611. S&P500 futures dropped 1.5%.' },
  'missile strike': { event: 'Iran Missile Strike on US Base (Jan 2020)', impact: 'Oil spiked 4% overnight. Gold hit $1611. S&P500 futures dropped 1.5%.' },
  'federal reserve': { event: 'Fed Pivot Signal (Dec 2023)', impact: 'S&P500 rallied 14% in 8 weeks. BTC surged 60%. Bond yields dropped 100bps. Gold rallied.' },
  'rate cut': { event: 'Emergency Rate Cut (Mar 2020)', impact: 'S&P500 rallied 70% from lows. BTC went from $5k to $69k. Massive liquidity injection.' },
  'rate hike': { event: 'Fed Rate Hike Cycle (2022)', impact: 'S&P500 dropped 25%. BTC crashed 65%. Bond yields spiked. Dollar index hit 20yr high.' },
  'inflation': { event: 'US CPI Hit 9.1% (Jun 2022)', impact: 'S&P500 dropped 3.6% in a week. BTC crashed below $20k. DXY surged above 108.' },
  'cpi': { event: 'Hot CPI Print (Sep 2022)', impact: 'S&P500 fell 4.3% in a day. BTC dropped 10%. Treasury yields spiked. Gold fell.' },
  'recession': { event: 'Global Recession (2008)', impact: 'S&P500 crashed 57%. Gold rallied 25%. Crude crashed from $147 to $32. BTC didn\'t exist yet.' },
  'banking crisis': { event: 'SVB Bank Collapse (Mar 2023)', impact: 'Bank stocks crashed 25%. Gold rallied 10%. BTC surged 40% on Fed intervention hopes.' },
  'bank collapse': { event: 'SVB/Credit Suisse Crisis (2023)', impact: 'KBW Bank Index -28%. Fed emergency lending $300B+. Gold +10%. BTC +40%.' },
  'oil price': { event: 'Oil Price War (Mar 2020)', impact: 'Oil crashed to -$37. Energy stocks collapsed. Airlines dropped 50%. Gold volatile.' },
  'crude oil': { event: 'OPEC Supply Cut (Oct 2022)', impact: 'Crude rallied 15%. Inflation fears reignited. Central banks hawkish. Rupee weakened.' },
  'opec': { event: 'OPEC+ Surprise Cut (Apr 2023)', impact: 'Crude jumped 8% in a day. Energy stocks rallied 5%. Inflation expectations rose.' },
  'bitcoin': { event: 'Bitcoin ETF Approval (Jan 2024)', impact: 'BTC rallied from $42k to $73k. Crypto market cap +$800B. Coinbase stock +60%.' },
  'bitcoin etf': { event: 'Spot Bitcoin ETF Approved (Jan 2024)', impact: 'BTC surged to ATH $73k. $4.6B inflows in first week. Entire crypto market rallied.' },
  'crypto ban': { event: 'China Crypto Ban (Sep 2021)', impact: 'BTC dropped 10% instantly. Mining hashrate collapsed 50%. Miners relocated globally.' },
  'rbi': { event: 'RBI Rate Hold (Apr 2024)', impact: 'NIFTY rallied 1.2%. Banking stocks surged. Rupee stable. Bond yields eased.' },
  'nifty': { event: 'NIFTY 50 Correction (Oct 2024)', impact: 'FIIs pulled $10B. Midcaps crashed 15%. Rupee hit 84. IT stocks resilient.' },
  'adani': { event: 'Hindenburg Report (Jan 2023)', impact: 'Adani Group lost $150B market cap. NIFTY dropped 1.6%. FIIs sold $2B in a week.' },
  'trump': { event: 'Trump Tariff Threats (2024-25)', impact: 'S&P500 dropped 2%. Global supply chain stocks fell. Gold and USD rallied as safe havens.' },
  'coup': { event: 'Myanmar Coup (Feb 2021)', impact: 'Localized market crash. Regional currencies weakened. Gold edged up on uncertainty.' },
  'iran': { event: 'Iran-Israel Tensions (Apr 2024)', impact: 'Oil spiked 3.5%. Gold hit new ATH $2431. Defense stocks rallied. Risk-off globally.' },
  'israel': { event: 'Israel-Hamas War (Oct 2023)', impact: 'Oil spiked 6%. Gold surged 8%. Defense stocks +15%. Global risk sentiment deteriorated.' },
};

// ============================================================
// CROSS-MARKET CORRELATION MAP
// How events in one area ripple across other markets
// ============================================================

const CROSS_MARKET_CORRELATIONS = {
  MACRO: [
    { trigger: 'Rate Hike', flow: 'USD ↑ → Gold ↓ → Equities ↓ → Bonds ↓ → BTC ↓', type: 'bearish' },
    { trigger: 'Rate Cut', flow: 'USD ↓ → Gold ↑ → Equities ↑ → BTC ↑ → Rupee ↑', type: 'bullish' },
    { trigger: 'Hot CPI', flow: 'Yields ↑ → Equities ↓ → Gold volatile → DXY ↑ → EM currencies ↓', type: 'bearish' },
    { trigger: 'Recession Signal', flow: 'Equities ↓ → Gold ↑ → Yields ↓ → USD mixed → BTC volatile', type: 'bearish' },
  ],
  GEOPOLITICAL: [
    { trigger: 'War Escalation', flow: 'Oil ↑ → Gold ↑ → Equities ↓ → DXY ↑ → NIFTY ↓', type: 'bearish' },
    { trigger: 'Tariff Increase', flow: 'Target exports ↓ → USD ↑ → Supply chains disrupted → Inflation ↑', type: 'bearish' },
    { trigger: 'Oil Supply Cut', flow: 'Oil ↑ → Inflation ↑ → Rupee ↓ → NIFTY ↓ → Gold ↑', type: 'bearish' },
    { trigger: 'Ceasefire/Peace', flow: 'Oil ↓ → Gold ↓ → Equities ↑ → Risk-on → BTC ↑', type: 'bullish' },
  ],
  BANKING: [
    { trigger: 'Bank Collapse', flow: 'Bank stocks ↓ → Contagion fear → Gold ↑ → BTC ↑ → Yields ↓', type: 'bearish' },
    { trigger: 'Credit Crisis', flow: 'Lending freezes → Equities ↓ → Safe havens ↑ → Central bank intervention', type: 'bearish' },
  ],
  CRYPTO: [
    { trigger: 'ETF Approval', flow: 'BTC ↑ → ETH ↑ → Altcoins ↑ → Crypto stocks ↑ → FOMO cycle', type: 'bullish' },
    { trigger: 'Regulatory Crackdown', flow: 'BTC ↓ → Exchange tokens ↓ → DeFi ↓ → Stablecoins depegging risk', type: 'bearish' },
  ],
  INDIA: [
    { trigger: 'RBI Rate Cut', flow: 'Banking stocks ↑ → NIFTY ↑ → Bond prices ↑ → Rupee weakens slightly', type: 'bullish' },
    { trigger: 'FII Outflow', flow: 'NIFTY ↓ → Rupee ↓ → Midcaps ↓↓ → Largecaps resilient', type: 'bearish' },
    { trigger: 'Crude Oil Spike', flow: 'Rupee ↓ → Inflation ↑ → OMCs ↓ → NIFTY pressure → Gold ↑ in INR', type: 'bearish' },
  ]
};

// ============================================================
// ENRICHMENT — Add historical context + correlations to events
// ============================================================

function enrichEvent(event) {
  // Find best historical match
  let bestHistory = null;
  for (const kw of event.matchedKeywords) {
    if (HISTORICAL_IMPACT[kw.toLowerCase()]) {
      bestHistory = HISTORICAL_IMPACT[kw.toLowerCase()];
      break;
    }
  }
  event.historicalImpact = bestHistory;

  // Add cross-market correlation
  event.correlations = CROSS_MARKET_CORRELATIONS[event.category] || [];

  return event;
}

// ============================================================
// EVENT CLUSTERING — Group related articles about the same topic
// ============================================================

function clusterEvents(events) {
  const clusters = [];
  const used = new Set();

  for (let i = 0; i < events.length; i++) {
    if (used.has(i)) continue;

    const cluster = { primary: events[i], related: [] };
    const wordsA = getSignificantWords(events[i].title);

    for (let j = i + 1; j < events.length; j++) {
      if (used.has(j)) continue;
      const wordsB = getSignificantWords(events[j].title);
      const overlap = calculateOverlap(wordsA, wordsB);

      // If 40%+ word overlap, they're about the same event
      if (overlap >= 0.4) {
        cluster.related.push(events[j]);
        used.add(j);
      }
    }

    // Keep the highest-scored article as primary
    if (cluster.related.length > 0) {
      const all = [cluster.primary, ...cluster.related];
      all.sort((a, b) => b.impactScore - a.impactScore);
      cluster.primary = all[0];
      cluster.related = all.slice(1);
    }

    cluster.primary.clusterCount = cluster.related.length + 1;
    cluster.primary.relatedSources = cluster.related.map(r => r.source).filter((v, i, a) => a.indexOf(v) === i);
    clusters.push(cluster.primary);
    used.add(i);
  }

  return clusters;
}

function getSignificantWords(title) {
  const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'and', 'or', 'but', 'not', 'be', 'has', 'had', 'have',
    'will', 'can', 'may', 'it', 'its', 'this', 'that', 'than', 'after', 'before', 'over', 'says',
    'said', 'new', 'also', 'more', 'about', 'into', 'up', 'out', 'his', 'her', 'he', 'she']);
  return (title || '').toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w));
}

function calculateOverlap(wordsA, wordsB) {
  if (wordsA.length === 0 || wordsB.length === 0) return 0;
  const setA = new Set(wordsA);
  const setB = new Set(wordsB);
  let common = 0;
  for (const w of setA) if (setB.has(w)) common++;
  return common / Math.min(setA.size, setB.size);
}

// ============================================================
// CACHE — Pre-fetch on app load so data is instant
// ============================================================

let _cache = null;
let _cacheTime = 0;
let _inflight = null; // shared promise to avoid duplicate fetches
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function _fetchAndCache() {
  try {
    console.log('[Intelligence] Pre-fetching market intelligence...');
    const [gdeltArticles, rssArticles] = await Promise.all([
      fetchFromGDELT(),
      fetchFromRSS()
    ]);

    const allArticles = [...gdeltArticles, ...rssArticles];
    const unique = deduplicateArticles(allArticles);

    const scored = unique
      .map(scoreArticle)
      .filter(Boolean)
      .map(enrichEvent)
      .sort((a, b) => b.impactScore - a.impactScore);

    const clustered = clusterEvents(scored);

    _cache = clustered;
    _cacheTime = Date.now();
    _inflight = null;
    console.log(`[Intelligence] Cached ${clustered.length} events`);
    return clustered;
  } catch (error) {
    _inflight = null;
    console.error('[Intelligence] Fatal error:', error);
    return [];
  }
}

// Auto-fetch on module load — store the promise so others can await it
_inflight = _fetchAndCache();

// ============================================================
// PUBLIC API
// ============================================================

export const marketIntelligenceService = {
  // Returns cached data instantly if available
  getCachedData() {
    return _cache;
  },

  async fetchIntelligence() {
    // Return cache if fresh
    if (_cache && (Date.now() - _cacheTime) < CACHE_TTL) {
      return _cache;
    }
    // If a fetch is already running, wait for it instead of starting another
    if (_inflight) {
      return _inflight;
    }
    _inflight = _fetchAndCache();
    return _inflight;
  }
};
