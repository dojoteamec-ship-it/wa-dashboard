// app/api/meta-capi/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { supabase } from '@/lib/supabase'

// Lee config desde kanshi_credentials (no variables de entorno)
async function getCapiConfig(): Promise<{ pixel_id: string; capi_token: string } | null> {
  const { data } = await supabase
    .from('kanshi_credentials')
    .select('credentials')
    .eq('type', 'meta_ads')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()
  if (!data) return null
  return {
    pixel_id: data.credentials.pixel_id,
    capi_token: data.credentials.capi_token,
  }
}

// SHA256 — NUNCA enviar datos en claro a Meta
function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex')
}

async function sendMetaEvent(capiUrl: string, events: object[], testEventCode?: string): Promise<{ success: boolean; response: any }> {
  const res = await fetch(capiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: events, ...(testEventCode && { test_event_code: testEventCode }) }),
  })
  const response = await res.json()
  return { success: !response.error, response }
}

// ─── POST /api/meta-capi ──────────────────────────────────────────────────────
// event_type: 'Purchase' | 'WarmLead' | 'HotLead' | 'ReadyLead' | 'BuyerProfile'
export async function POST(req: NextRequest) {
  try {
    const config = await getCapiConfig()
    if (!config) {
      return NextResponse.json({ error: 'Meta Ads no configurado en KANSHI. Ve a Configuración → Meta Ads CAPI.' }, { status: 503 })
    }

    const CAPI_URL = `https://graph.facebook.com/v19.0/${config.pixel_id}/events?access_token=${config.capi_token}`

    const body = await req.json()
   const { event_type, contact_id, phone_number, email, value, currency = 'USD', utm_campaign, sale_id, event_time_override } = body

    if (!event_type) return NextResponse.json({ error: 'event_type requerido' }, { status: 400 })
    if (!phone_number) return NextResponse.json({ error: 'phone_number requerido' }, { status: 400 })

    // Normalizar teléfono — quitar + para SHA256
    const phone = phone_number.startsWith('+') ? phone_number.slice(1) : phone_number

    // user_data con SHA256
    const user_data: Record<string, string> = {
      ph: sha256(phone),
    }
    if (email) user_data.em = sha256(email)

    // Construir evento
    const event: Record<string, any> = {
      event_name: event_type,
      event_time: event_time_override ?? Math.floor(Date.now() / 1000),
      action_source: 'system_generated',
      user_data,
      custom_data: {
        currency,
        ...(value !== undefined && { value: Number(value) }),
        ...(utm_campaign && { utm_campaign }),
      },
    }

   const { success, response } = await sendMetaEvent(CAPI_URL, [event], body.test_event_code)

    if (!success) {
      console.error('[meta-capi] Error de Meta:', response)
      return NextResponse.json({ error: 'Meta CAPI error', details: response }, { status: 502 })
    }

    // Purchase → marcar capi_purchase_sent_at en kanshi_sales
    if (event_type === 'Purchase' && sale_id) {
      await supabase
        .from('kanshi_sales')
        .update({ capi_purchase_sent_at: new Date().toISOString() })
        .eq('id', sale_id)
        .is('capi_purchase_sent_at', null)
    }

    // QualifiedLead signals → marcar en kanshi_score_breakdown
    const capiFieldMap: Record<string, string> = {
      WarmLead:    'capi_warm_sent_at',
      HotLead:     'capi_hot_sent_at',
      ReadyLead:   'capi_ready_sent_at',
      BuyerProfile:'capi_buyer_sent_at',
    }

    if (contact_id && capiFieldMap[event_type]) {
      await supabase
        .from('kanshi_score_breakdown')
        .update({ [capiFieldMap[event_type]]: new Date().toISOString() })
        .eq('contact_id', contact_id)
        .is(capiFieldMap[event_type], null) // idempotente
    }

    console.log(`[meta-capi] ✅ ${event_type} enviado — pixel ${config.pixel_id}`)

    return NextResponse.json({
      success: true,
      event_type,
      pixel_id: config.pixel_id,
      meta_response: response,
    })
  } catch (err: any) {
    console.error('[/api/meta-capi POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
