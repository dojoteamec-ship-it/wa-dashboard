import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parsePhoneNumber } from 'libphonenumber-js'

// ─── Aumentar límite body para Next.js App Router ─────────────────────────────
export const maxDuration = 60 // Vercel Pro: 60s. Hobby: 10s (igual optimizamos)

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string | null {
  if (!raw || raw === '(none)') return null
  let phone = raw.replace(/[\s\-().]/g, '')
  if (phone.startsWith('00')) phone = '+' + phone.slice(2)
  if (!phone.startsWith('+')) phone = '+' + phone
  try {
    const parsed = parsePhoneNumber(phone)
    return parsed?.isValid() ? parsed.format('E.164') : null
  } catch {
    return null
  }
}

function parseHotmartDate(raw: string): string | null {
  if (!raw || raw === '(none)') return null
  try {
    const [datePart, timePart] = raw.trim().split(' ')
    const [day, month, year] = datePart.split('/')
    return new Date(`${year}-${month}-${day}T${timePart || '00:00:00'}Z`).toISOString()
  } catch {
    return null
  }
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headerLine = lines[0].replace(/^\uFEFF/, '')

  const parseRow = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        inQuotes = !inQuotes
      } else if (ch === ';' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += ch
      }
    }
    result.push(current.trim())
    return result
  }

  const headers = parseRow(headerLine)
  const rows: Record<string, string>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i])
    if (values.length < 3) continue
    const row: Record<string, string> = {}
    headers.forEach((h, idx) => { row[h] = values[idx] || '' })
    rows.push(row)
  }
  return rows
}

// ─── POST /api/import-buyers ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id, csv_text } = body

    if (!project_id) return NextResponse.json({ error: 'project_id requerido' }, { status: 400 })
    if (!csv_text) return NextResponse.json({ error: 'csv_text requerido' }, { status: 400 })

    const rows = parseCSV(csv_text)
    if (rows.length === 0) return NextResponse.json({ error: 'CSV vacío' }, { status: 400 })

    const VALID_STATUSES = ['Aprobado', 'Completo']
    const validRows = rows.filter(r => VALID_STATUSES.includes(r['Estatus de la transacción']))

    if (validRows.length === 0) {
      return NextResponse.json({
        error: 'No hay transacciones Aprobadas o Completas',
        total_rows: rows.length,
      }, { status: 400 })
    }

    // ── 1. Obtener transaction_ids ya existentes (dedup bulk) ─────────────────
    const incomingTxIds = validRows.map(r => r['Código de la transacción']).filter(Boolean)

    const { data: existingTx } = await supabase
      .from('hotmart_buyers')
      .select('hotmart_transaction_id')
      .in('hotmart_transaction_id', incomingTxIds)

    const existingSet = new Set((existingTx || []).map(r => r.hotmart_transaction_id))

    // ── 2. Filtrar nuevos solamente ───────────────────────────────────────────
    const newRows = validRows.filter(r => !existingSet.has(r['Código de la transacción']))

    const results = {
      total_csv: rows.length,
      valid_rows: validRows.length,
      inserted: 0,
      skipped_dup: validRows.length - newRows.length,
      skipped_no_phone: 0,
      matched_contacts: 0,
      capi_queued: 0,
      errors: 0,
    }

    if (newRows.length === 0) {
      return NextResponse.json({
        success: true,
        ...results,
        message: `Todo ya estaba importado. ${results.skipped_dup} duplicados omitidos.`,
      })
    }

    // ── 3. Obtener todos los wa_contacts del proyecto de una sola vez ─────────
    const { data: allContacts } = await supabase
      .from('wa_contacts')
      .select('id, phone_number, utm_data')
      .eq('project_id', project_id)

    const contactMap = new Map<string, { id: string; utm_data: any }>()
    ;(allContacts || []).forEach(c => {
      contactMap.set(c.phone_number, { id: c.id, utm_data: c.utm_data })
    })

    // ── 4. Preparar registros para insert bulk ────────────────────────────────
    const toInsert: Record<string, any>[] = []
    const capiQueue: { phone: string; amount: number; currency: string; event_time: number }[] = []

    for (const row of newRows) {
      const rawPhone     = row['Teléfono']
      const phoneNorm    = normalizePhone(rawPhone)

      if (!phoneNorm) {
        results.skipped_no_phone++
        continue
      }

      const transactionId = row['Código de la transacción']
      const buyerName     = row['Comprador(a)']?.replace(/^"+|"+$/g, '').trim() || null
      const buyerEmail    = row['Email del Comprador(a)']?.toLowerCase() || null
      const productName   = row['Producto'] || null
      const amountRaw     = row['Valor de compra sin impuestos']?.replace(',', '.') || '0'
      const amount        = parseFloat(amountRaw) || 0
      const currency      = row['Moneda de compra'] || 'USD'
      const affiliate     = row['Nombre del Afiliado(a)'] !== '(none)' ? row['Nombre del Afiliado(a)'] : null
      const purchaseDate  = parseHotmartDate(row['Fecha de la transacción'])

      const contact       = contactMap.get(phoneNorm)
      const matchedContactId = contact?.id || null
      const utmCampaign   = contact?.utm_data?.utm_campaign || affiliate || null

      if (matchedContactId) results.matched_contacts++

      toInsert.push({
        project_id,
        hotmart_transaction_id: transactionId,
        buyer_name:    buyerName,
        buyer_email:   buyerEmail,
        buyer_phone:   rawPhone,
        phone_normalized: phoneNorm,
        product_name:  productName,
        amount,
        currency,
        purchase_date: purchaseDate,
        matched_contact_id: matchedContactId,
        utm_campaign:  utmCampaign,
      })

      // Preparar para CAPI retroactivo
      if (purchaseDate) {
        capiQueue.push({
          phone: phoneNorm,
          amount,
          currency,
          event_time: Math.floor(new Date(purchaseDate).getTime() / 1000),
        })
        results.capi_queued++
      }
    }

    // ── 5. Insert bulk en lotes de 100 ────────────────────────────────────────
    const BATCH_SIZE = 100
    for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
      const batch = toInsert.slice(i, i + BATCH_SIZE)
      const { error } = await supabase
        .from('hotmart_buyers')
        .upsert(batch, { onConflict: 'hotmart_transaction_id', ignoreDuplicates: true })

      if (error) {
        console.error('[import-buyers] batch insert error:', error.message)
        results.errors += batch.length
      } else {
        results.inserted += batch.length
      }
    }

    // ── 6. CAPI retroactivo — fire-and-forget (no bloquea respuesta) ──────────
    // Solo disparamos si hay credenciales y hay registros insertados
    if (results.inserted > 0 && capiQueue.length > 0) {
      const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://wa-dashboard-five.vercel.app'

      // Disparar en background — no awaiteamos para no bloquear
      Promise.allSettled(
        capiQueue.slice(0, 200).map(item => // máximo 200 eventos retroactivos por importación
          fetch(`${BASE_URL}/api/meta-capi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type: 'Purchase',
              phone_number: item.phone,
              value: item.amount,
              currency: item.currency,
              event_time_override: item.event_time,
            }),
          }).catch(() => {})
        )
      ).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `${results.inserted} compradores importados · ${results.matched_contacts} con match WA · ${results.skipped_dup} duplicados omitidos`,
    })

  } catch (err: any) {
    console.error('[import-buyers] fatal:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}

// ─── GET /api/import-buyers — estadísticas ────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const project_id = searchParams.get('project_id')
    if (!project_id) return NextResponse.json({ error: 'project_id requerido' }, { status: 400 })

    const [countRes, matchRes, capiRes, revenueRes, buyersRes] = await Promise.all([
      supabase.from('hotmart_buyers').select('id', { count: 'exact', head: true }).eq('project_id', project_id),
      supabase.from('hotmart_buyers').select('id', { count: 'exact', head: true }).eq('project_id', project_id).not('matched_contact_id', 'is', null),
      supabase.from('hotmart_buyers').select('id', { count: 'exact', head: true }).eq('project_id', project_id).not('capi_sent_at', 'is', null),
      supabase.from('hotmart_buyers').select('amount').eq('project_id', project_id),
      supabase.from('hotmart_buyers').select('id,buyer_name,buyer_email,phone_normalized,product_name,amount,currency,purchase_date,utm_campaign,capi_sent_at,matched_contact_id').eq('project_id', project_id).order('purchase_date', { ascending: false }).limit(200),
    ])

    const total   = countRes.count || 0
    const matched = matchRes.count || 0
    const capiSent = capiRes.count || 0
    const totalRevenue = (revenueRes.data || []).reduce((acc, r) => acc + (r.amount || 0), 0)

    const byCampaign: Record<string, number> = {}
    ;(buyersRes.data || []).forEach(b => {
      const key = b.utm_campaign || 'Sin campaña'
      byCampaign[key] = (byCampaign[key] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      stats: {
        total,
        matched,
        capi_sent: capiSent,
        total_revenue: totalRevenue,
        match_rate: total ? Math.round((matched / total) * 100) : 0,
      },
      buyers: buyersRes.data || [],
      by_campaign: byCampaign,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
