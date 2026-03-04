// app/api/sales/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ─── POST /api/sales — Registrar venta ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      project_id,
      phone_number,
      amount,
      currency = 'USD',
      product_name,
      sale_source = 'manual',
      transaction_id,
      sale_date,
    } = body

    // Validación básica
    if (!project_id) return NextResponse.json({ error: 'project_id requerido' }, { status: 400 })
    if (!phone_number) return NextResponse.json({ error: 'phone_number requerido' }, { status: 400 })
    if (!amount || isNaN(Number(amount))) return NextResponse.json({ error: 'amount inválido' }, { status: 400 })

    // Normalizar teléfono
    const phone = phone_number.startsWith('+') ? phone_number : `+${phone_number}`

    // Buscar contact_id + UTMs desde utm_tracking
    const [contactResult, utmResult] = await Promise.all([
      supabase
        .from('wa_contacts')
        .select('id, name')
        .eq('phone_number', phone)
        .maybeSingle(),
      supabase
        .from('utm_tracking')
        .select('utm_campaign, utm_source, utm_content')
        .eq('phone_number', phone)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
    ])

    // Verificar venta duplicada por transaction_id
    if (transaction_id) {
      const { data: existing } = await supabase
        .from('kanshi_sales')
        .select('id')
        .eq('transaction_id', transaction_id)
        .maybeSingle()

      if (existing) {
        return NextResponse.json(
          { error: 'Venta duplicada', transaction_id, existing_id: existing.id },
          { status: 409 }
        )
      }
    }

    // Insertar venta
    const { data: sale, error } = await supabase
      .from('kanshi_sales')
      .insert({
        project_id,
        contact_id: contactResult.data?.id ?? null,
        phone_number: phone,
        amount: Number(amount),
        currency,
        product_name: product_name ?? null,
        sale_source,
        transaction_id: transaction_id ?? null,
        sale_date: sale_date ?? new Date().toISOString(),
        // Atribución first-touch desde utm_tracking
        utm_campaign: utmResult.data?.utm_campaign ?? null,
        utm_source: utmResult.data?.utm_source ?? null,
        utm_content: utmResult.data?.utm_content ?? null,
      })
      .select()
      .single()

    if (error) throw error

    // Actualizar pipeline: si es manual, mover lead a 'comprador'
    if (contactResult.data?.id && sale_source === 'manual') {
      await supabase
        .from('wa_contacts')
        .update({ pipeline_stage: 'comprador' })
        .eq('id', contactResult.data.id)
        .neq('pipeline_stage', 'comprador') // solo si no es ya comprador
    }

// ── Alerta venta confirmada — Día 14 ──────────────────────────────────────
    // Fire-and-forget — no bloquea la respuesta
    ;(async () => {
      try {
        const { error: alertError } = await supabase
          .from('kanshi_alerts')
          .upsert({
            project_id,
            contact_id:   contactResult.data?.id ?? null,
            alert_type:   'sale',
            lead_name:    contactResult.data?.name ?? null,
            lead_phone:   phone,
            kanshi_score: null,
            sale_amount:  Number(amount),
            metadata: {
              product_name:   product_name ?? null,
              sale_source,
              transaction_id: transaction_id ?? null,
              utm_source:     utmResult.data?.utm_source ?? null,
              utm_campaign:   utmResult.data?.utm_campaign ?? null,
              utm_content:    utmResult.data?.utm_content ?? null,
            },
          }, {
            onConflict:       'contact_id,alert_type',
            ignoreDuplicates: true,   // una sola alerta de venta por lead
          })

        if (alertError) {
          console.error('[sales→alerts] Error insertando alerta:', alertError.message)
        } else {
          console.log(`[sales→alerts] ✅ Alerta venta creada para ${phone}`)
        }
      } catch (e: any) {
        console.error('[sales→alerts] Error inesperado:', e.message)
      }
    })()
    // ─────────────────────────────────────────────────────────────────────────
    
    return NextResponse.json({
      success: true,
      sale,
      attribution: utmResult.data ?? null,
      contact_found: !!contactResult.data,
    })
  } catch (err: any) {
    console.error('[/api/sales POST]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// ─── GET /api/sales — Listar ventas por proyecto ─────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const project_id = searchParams.get('project_id')

    if (!project_id) return NextResponse.json({ error: 'project_id requerido' }, { status: 400 })

    const { data, error } = await supabase
      .from('kanshi_sales')
      .select(`
        *,
        wa_contacts (
          id,
          name,
          phone_number,
          kanshi_score,
          kanshi_segment
        )
      `)
      .eq('project_id', project_id)
      .order('sale_date', { ascending: false })

    if (error) throw error

    // Métricas agregadas
    const total_revenue = data.reduce((sum, s) => sum + Number(s.amount), 0)
    const total_sales = data.length
    const by_source = data.reduce((acc: Record<string, number>, s) => {
      acc[s.sale_source] = (acc[s.sale_source] || 0) + 1
      return acc
    }, {})
    const by_campaign = data.reduce((acc: Record<string, { sales: number; revenue: number }>, s) => {
      const key = s.utm_campaign || 'sin_campaña'
      if (!acc[key]) acc[key] = { sales: 0, revenue: 0 }
      acc[key].sales += 1
      acc[key].revenue += Number(s.amount)
      return acc
    }, {})

    return NextResponse.json({
      sales: data,
      metrics: {
        total_revenue,
        total_sales,
        avg_ticket: total_sales > 0 ? total_revenue / total_sales : 0,
        by_source,
        by_campaign,
      },
    })
  } catch (err: any) {
    console.error('[/api/sales GET]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
