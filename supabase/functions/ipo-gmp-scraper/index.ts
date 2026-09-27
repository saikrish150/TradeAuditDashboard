import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as cheerio from 'https://esm.sh/cheerio@1.0.0-rc.12'

serve(async (req) => {
  try {
    const MSG_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const CHAT_DEST = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!MSG_TOKEN || !CHAT_DEST) {
      return new Response(JSON.stringify({ error: "Missing bot credentials" }), { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the list of all IPO details to determine category (Mainline vs SME)
    const listRes = await fetch('https://webnodejs.investorgain.com/cloud/v2/ipo/list-read', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    // Fetch the current GMP percentages
    const gmpRes = await fetch('https://webnodejs.investorgain.com/cloud/v2/index/gmp-price-read', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });

    if (!listRes.ok || !gmpRes.ok) throw new Error("Investorgain APIs are down");
    
    const listData = await listRes.json();
    const gmpData = await gmpRes.json();

    let alertsFired = 0;

    if (gmpData && gmpData.gmpList) {
      for (const ipo of gmpData.gmpList) {
        const ipoName = ipo.company_short_name;
        const gmpPercentage = parseFloat(ipo.gmp_perc);
        const gmpPrice = parseFloat(ipo.gmp);

        // Find category from the master list
        const ipoDetails = listData.ipoList?.find((item: any) => item.company_short_name === ipoName);
        const category = ipoDetails ? ipoDetails.issue_category : 'Unknown';
        
        // Ensure it's a Main Board (Mainline) IPO and meets the threshold
        if (category === 'Mainline' && !isNaN(gmpPercentage) && gmpPercentage >= 30.0) {
          
          // Check if alert was already sent for this stock
          const { data: alreadyAlerted } = await supabase
            .from('triggered_ipo_alerts')
            .select('id')
            .eq('ipo_name', ipoName)
            .maybeSingle();

          if (alreadyAlerted) continue;

          // Construct Telegram message
          const message = `🚨 *High GMP IPO Alert (>30%)* 🚨\n\n` +
                          `🏢 *Stock:* ${ipoName}\n` +
                          `📈 *Current GMP:* ₹${gmpPrice} (*${gmpPercentage.toFixed(2)}%*)\n` +
                          `💼 *Category:* Main Board Issue\n\n` +
                          `🔗 _Check your broker app to verify subscription numbers before applying._`;

          const apiUrl = `https://api.telegram.org/bot${MSG_TOKEN}/sendMessage`;
          const telRes = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: CHAT_DEST, text: message, parse_mode: 'Markdown' })
          });

          if (telRes.ok) {
            // Log to DB to prevent duplicate spams
            await supabase.from('triggered_ipo_alerts').insert([{ ipo_name: ipoName, gmp_percentage: gmpPercentage }]);
            alertsFired++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, alertsSent: alertsFired }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
