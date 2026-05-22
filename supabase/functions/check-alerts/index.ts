import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    // Attempt to parse Webhook payload
    let payload;
    try {
      payload = await req.json()
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), { status: 400, headers: corsHeaders })
    }

    // Only process if it's an UPDATE and status became triggered
    if (payload.type === 'UPDATE' && payload.record && payload.record.status === 'triggered') {
      const alert = payload.record;
      
      // Prevent double triggers if old status was already triggered
      if (payload.old_record && payload.old_record.status === 'triggered') {
        return new Response(JSON.stringify({ message: 'Already triggered previously' }), { status: 200, headers: corsHeaders })
      }

      const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
      const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID')

      // Format the beautiful dynamic message
      const labelEmoji = alert.label ? `🚨 [${alert.label} LEVEL]` : '🔔 [PRICE ALERT]'
      const conditionText = alert.condition === 'gt' ? 'Crossed Above' : 'Crossed Below'
      
      const message = `${labelEmoji} Triggered!\n\n📈 Symbol: #${alert.symbol}\n🎯 Target: $${alert.target_price}\n📊 Condition: ${conditionText}\n⏰ Time: ${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC`

      // Send to Telegram
      if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
        const tgRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
          }),
        })
        
        if (!tgRes.ok) {
          console.error('Telegram API Error:', await tgRes.text())
        }
      }

      return new Response(JSON.stringify({ success: true, message: 'Telegram sent!' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    return new Response(JSON.stringify({ message: 'Ignored payload' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook processing error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
