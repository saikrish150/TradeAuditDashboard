import { supabase } from '../lib/supabase';

// Utility to determine affected markets
function getAffectedMarkets(title, currency, country) {
  const markets = [];
  const upperTitle = title.toUpperCase();

  // Basic rules
  if (country === "United States" || currency === "USD") {
    markets.push("US30", "NAS100", "XAUUSD");
    if (upperTitle.includes("CPI") || upperTitle.includes("FED") || upperTitle.includes("NFP")) {
      markets.push("BTCUSD"); // Crypto reacts heavily to major US data
    }
  }

  if (country === "India" || currency === "INR") {
    markets.push("NIFTY50");
    if (upperTitle.includes("RATE") || upperTitle.includes("RBI") || upperTitle.includes("INFLATION") || upperTitle.includes("WPI") || upperTitle.includes("IIP") || upperTitle.includes("MANUFACTURING") || upperTitle.includes("INDUSTRIAL")) {
      markets.push("BANKNIFTY"); // Banks react to rates and inflation
    }
  }

  // European markets
  if (country === "Euro Zone" || currency === "EUR") {
    markets.push("EURUSD", "DAX40");
  }

  if (country === "United Kingdom" || currency === "GBP") {
    markets.push("GBPUSD", "UK100");
  }

  return markets;
}

export const economicEventsService = {
  /**
   * Fetches high impact economic events from Supabase backend
   */
  async fetchEconomicEvents() {
    try {
      const now = new Date();
      
      const { data: events, error } = await supabase
        .from('economic_events')
        .select('*')
        .gte('event_time', now.toISOString())
        .order('event_time', { ascending: true })
        .limit(50); // Fetch up to 50 upcoming events

      if (error) {
        console.error("Supabase query error for economic_events:", error);
        return [];
      }

      if (!events) return [];

      return events;
    } catch (error) {
      console.error("Error fetching economic events from Supabase:", error);
      return [];
    }
  },
  /**
   * Fetches upcoming market holidays for India
   */
  async fetchHolidays() {
    try {
      const headers = {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      };
      
      const body = "dateFrom=2026-05-12&dateTo=2028-05-12&country=14&currentTab=custom&submitFilters=1&limit_from=0";
      
      const response = await fetch("/api-investing/holiday-calendar/Service/getCalendarFilteredData", {
        method: 'POST',
        headers: headers,
        body: body
      });

      if (!response.ok) return [];

      const result = await response.json();
      const html = result.data;
      if (!html) return [];

      // Regex to parse the HTML table rows
      const holidays = [];
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
      const cellRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      
      let match;
      while ((match = rowRegex.exec(html)) !== null) {
        const rowContent = match[1];
        const cells = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
          // Remove HTML tags and clean up whitespace
          cells.push(cellMatch[1].replace(/<[^>]*>?/gm, '').trim().replace(/&nbsp;/g, ' '));
        }

        if (cells.length >= 4) {
          holidays.push({
            date: cells[0],
            country: cells[1],
            exchange: cells[2],
            name: cells[3],
            jsDate: new Date(cells[0])
          });
        }
      }

      return holidays.sort((a, b) => a.jsDate - b.jsDate);
    } catch (error) {
      console.error("Error fetching holidays:", error);
      return [];
    }
  }
};
