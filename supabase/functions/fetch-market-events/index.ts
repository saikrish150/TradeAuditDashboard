import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Helper function to calculate importance score
function getImportanceScore(title: string, impact: string, isMajorIndia = false): number {
  const upperTitle = title.toUpperCase();
  if (impact === "HIGH") return 100;
  if (isMajorIndia) return 90;
  if (upperTitle.includes("INFLATION") || upperTitle.includes("CPI") || upperTitle.includes("PCE")) return 100;
  if (upperTitle.includes("FED") || upperTitle.includes("FOMC") || upperTitle.includes("RATE") || upperTitle.includes("RBI")) return 100;
  if (upperTitle.includes("PAYROLLS") || upperTitle.includes("NFP") || upperTitle.includes("UNEMPLOYMENT")) return 95;
  if (upperTitle.includes("GDP") || upperTitle.includes("RETAIL SALES")) return 85;
  if (upperTitle.includes("PMI") || upperTitle.includes("ISM")) return 80;
  return 75;
}

function getAffectedMarkets(title: string, currency: string, country: string): string[] {
  const markets: string[] = [];
  const upperTitle = title.toUpperCase();
  if (country === "United States" || currency === "USD") {
    markets.push("US30", "NAS100", "XAUUSD");
    if (upperTitle.includes("CPI") || upperTitle.includes("FED") || upperTitle.includes("NFP")) {
      markets.push("BTCUSD");
    }
  }
  if (country === "India" || currency === "INR") {
    markets.push("NIFTY50");
    if (
      upperTitle.includes("RATE") ||
      upperTitle.includes("RBI") ||
      upperTitle.includes("INFLATION") ||
      upperTitle.includes("WPI") ||
      upperTitle.includes("IIP") ||
      upperTitle.includes("MANUFACTURING") ||
      upperTitle.includes("INDUSTRIAL")
    ) {
      markets.push("BANKNIFTY");
    }
  }
  return markets;
}

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Need service role to bypass RLS
    )

    const allEvents: any[] = [];
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + 30);
    
    // 1. Fetch from Investing.com (US High Impact - with fallback graceful catch)
    try {
      const startDate = encodeURIComponent(now.toISOString());
      const endDate = encodeURIComponent(future.toISOString());
      const investingUrl = `https://endpoints.investing.com/pd-instruments/v1/calendars/economic/events/occurrences?domain_id=56&limit=100&start_date=${startDate}&end_date=${endDate}&country_ids=5&importance=high`;
      
      const invResponse = await fetch(investingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Origin': 'https://in.investing.com',
          'Referer': 'https://in.investing.com/'
        }
      });

      if (invResponse.ok) {
        const invData = await invResponse.json();
        const { events, occurrences } = invData;
        
        if (Array.isArray(events) && Array.isArray(occurrences)) {
          const eventMap = new Map();
          for (const ev of events) eventMap.set(ev.event_id, ev);
          
          for (const occ of occurrences) {
            const meta = eventMap.get(occ.event_id);
            if (meta) {
              const formatVal = (val: any) => val != null ? `${val}${occ.unit || ''}` : null;
              const title = meta.event_meta_title || meta.short_name || "Economic Event";
              
              allEvents.push({
                id: `inv-${meta.event_id}-${occ.occurrence_id}`,
                title: title,
                country: "United States",
                currency: meta.currency || "USD",
                impact: "HIGH",
                importance_score: 100,
                forecast: formatVal(occ.forecast),
                previous: formatVal(occ.previous),
                actual: formatVal(occ.actual),
                source: "Investing.com",
                event_time: occ.occurrence_time,
                affected_markets: getAffectedMarkets(title, meta.currency || "USD", "United States"),
                alerted: false
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Investing.com fetch failed (skipping to TradingView fallback):", e);
    }

    // 2. Fetch from TradingView (US & India High/Medium Impact)
    try {
      const from = now.toISOString();
      const to = future.toISOString();
      const tvHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Origin': 'https://in.tradingview.com',
        'Referer': 'https://in.tradingview.com/',
        'Accept': 'application/json'
      };

      const tvCountries = [
        { code: 'US', name: 'United States', currency: 'USD' },
        { code: 'IN', name: 'India', currency: 'INR' }
      ];

      for (const c of tvCountries) {
        const tvUrl = `https://economic-calendar.tradingview.com/events?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&countries=${c.code}`;
        const tvResponse = await fetch(tvUrl, { headers: tvHeaders });
        
        if (tvResponse.ok) {
          const tvData = await tvResponse.json();
          const results = Array.isArray(tvData) ? tvData : tvData.result;
          
          if (Array.isArray(results)) {
            for (const ev of results) {
              const title = ev.title || "Economic Event";
              const upper = title.toUpperCase();
              let isCandidate = false;
              let impact = "MEDIUM";

              if (c.code === 'US') {
                if (ev.importance === 1) {
                  isCandidate = true;
                  impact = "HIGH";
                } else if (ev.importance === 0 && (upper.includes("FED") || upper.includes("FOMC") || upper.includes("PMI") || upper.includes("JOBLESS"))) {
                  isCandidate = true;
                  impact = "MEDIUM";
                }
              } else if (c.code === 'IN') {
                const isIndiaMacro = upper.includes("PRODUCTION") || upper.includes("INFLATION") || upper.includes("CPI") ||
                                     upper.includes("WPI") || upper.includes("GDP") || upper.includes("RBI") ||
                                     upper.includes("RATE") || upper.includes("TRADE") || upper.includes("BUDGET") ||
                                     upper.includes("PMI");
                if (ev.importance >= 0 || isIndiaMacro) {
                  isCandidate = true;
                  impact = (upper.includes("RBI") || upper.includes("INFLATION") || upper.includes("GDP") || upper.includes("RATE") || upper.includes("PRODUCTION")) ? "HIGH" : "MEDIUM";
                }
              }

              if (isCandidate) {
                const eventTime = ev.time || ev.date;
                if (!eventTime) continue;

                allEvents.push({
                  id: `tv-${ev.id}`,
                  title: title,
                  country: c.name,
                  currency: ev.currency || c.currency,
                  impact: impact,
                  importance_score: getImportanceScore(title, impact, c.code === 'IN' && impact === 'HIGH'),
                  forecast: ev.forecast != null ? String(ev.forecast) : null,
                  previous: ev.previous != null ? String(ev.previous) : null,
                  actual: ev.actual != null ? String(ev.actual) : null,
                  source: "TradingView",
                  event_time: eventTime,
                  affected_markets: getAffectedMarkets(title, ev.currency || c.currency, c.name),
                  alerted: false
                });
              }
            }
          }
        }
      }
    } catch (e) {
      console.error("TradingView fetch failed:", e);
    }

    // 3. Upsert into Supabase (Preserving existing alerted status for duplicate events)
    if (allEvents.length > 0) {
      // Query existing alerted event IDs to prevent re-alerting already processed events
      const { data: existingEvents } = await supabaseClient
        .from('economic_events')
        .select('id, alerted')
        .in('id', allEvents.map(e => e.id));

      const alertedIds = new Set(
        (existingEvents || [])
          .filter((e: any) => e.alerted === true)
          .map((e: any) => e.id)
      );

      const eventsToUpsert = allEvents.map(ev => ({
        ...ev,
        alerted: alertedIds.has(ev.id) ? true : false,
        updated_at: new Date().toISOString()
      }));

      const { error } = await supabaseClient
        .from('economic_events')
        .upsert(eventsToUpsert, { onConflict: 'id' });

      if (error) {
        throw error;
      }
    }

    return new Response(
      JSON.stringify({ success: true, count: allEvents.length }),
      { headers: { "Content-Type": "application/json" } },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    )
  }
})
