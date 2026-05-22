import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

    // 1. Fetch all active alerts, including the NEW 'label' column!
    const { data: alerts, error: alertsError } = await supabaseClient
      .from('alerts')
      .select('id, symbol, target_price, condition, status, label, user_id')
      .eq('status', 'active')

    if (alertsError) throw alertsError
    if (!alerts || alerts.length === 0) {
      return new Response(JSON.stringify({ message: 'No active alerts' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 2. Fetch current prices (using Binance as default, adapt if you use a different source)
    const symbolsToFetch = [...new Set(alerts.map(a => a.symbol))]
    let currentPrices = {}
    
    // Fetch prices in parallel for efficiency
    await Promise.all(symbolsToFetch.map(async (symbol) => {
      try {
        const res = await fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${symbol}USDT`)
        const data = await res.json()
        if (data.price) {
          currentPrices[symbol] = parseFloat(data.price)
        }
      } catch (err) {
        console.error(`Failed to fetch price for ${symbol}`, err)
      }
    }))

    const triggeredAlerts = []

    // 3. Process each alert
    for (const alert of alerts) {
      const currentPrice = currentPrices[alert.symbol]
      if (!currentPrice) continue

      const isTriggered = 
        (alert.condition === 'gt' && currentPrice >= alert.target_price) ||
        (alert.condition === 'lt' && currentPrice <= alert.target_price)

      if (isTriggered) {
        // --- THIS IS THE UPDATED TELEGRAM MESSAGE WITH THE LABEL ---
        const labelEmoji = alert.label ? `🚨 [${alert.label} LEVEL]` : '🔔 [PRICE ALERT]'
        const conditionText = alert.condition === 'gt' ? 'Crossed Above' : 'Crossed Below'
        
        const message = `${labelEmoji} Triggered!\n\n📈 Symbol: #${alert.symbol}\n🎯 Target: $${alert.target_price}\n💵 Current Price: $${currentPrice}\n📊 Condition: ${conditionText}`

        // Send to Telegram
        if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: TELEGRAM_CHAT_ID,
              text: message,
            }),
          })
        }

        // Mark as triggered
        await supabaseClient
          .from('alerts')
          .update({ status: 'triggered' })
          .eq('id', alert.id)

        triggeredAlerts.push({ id: alert.id, symbol: alert.symbol, label: alert.label })
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      triggered: triggeredAlerts.length,
      details: triggeredAlerts
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
