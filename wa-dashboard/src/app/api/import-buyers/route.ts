import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parsePhoneNumber } from 'libphonenumber-js'

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

// Parsea "28/02/2026 08:16:26" → ISO string
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

// Parser CSV simple para el formato Hotmart (separador ;, posibles campos con comillas)
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  // Eliminar BOM si existe
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

    if (!project_id) {
      return NextResponse.json({ error: 'project_id es requerido' }, { status: 400 })
    }
    if (!csv_text || typeof csv_text !== 'string') {
      return NextResponse.json({ error: 'csv_text es requerido' }, { status: 400 })
    }

    const rows = parseCSV(csv_text)
    if (rows.length === 0) {
      return NextResponse.json({ error: 'CSV vacío o sin filas válidas' }, { status: 400 })
    }

    // Solo importar transacciones Aprobado y Completo
    const VALID_STATUSES = ['Aprobado', 'Completo']
    const validRows = rows.filter(r => VALID_STATUSES.includes(r['Estatus de la transacción']))

    if (validRows.length === 0) {
      return NextResponse.json({
        error: 'No hay transacciones Aprobadas o Completas en el CSV',
        total_rows: rows.length,
      }, { status: 400 })
    }

    // Obtener credenciales Meta CAPI del proyecto
    const { data: creds } = await supabase
      .from('kanshi_credentials')
      .select('meta_pixel_id, meta_capi_token')
      .eq('project_id', project_id)
      .maybeSingle()

    const results = {
      total_csv: rows.length,
      valid_rows: validRows.length,
      inserted: 0,
      skipped_dup: 0,
      skipped_no_phone: 0,
      matched_contacts: 0,
      capi_sent: 0,
      errors: 0,
    }

    for (const row of validRows) {
      try {
        const transactionId = row['Código de la transacción']
        const buyerName    = row['Comprador(a)']?.replace(/^"+|"+$/g, '').trim() || null
        const buyerEmail   = row['Email del Comprador(a)']?.toLowerCase() || null
        const rawPhone     = row['Teléfono']
        const productName  = row['Producto'] || null
        const amountRaw    = row['Valor de compra sin impuestos']?.replace(',', '.') || '0'
        const amount       = parseFloat(amountRaw) || 0
        const currency     = row['Moneda de compra'] || 'USD'
        const dateRaw      = row['Fecha de la transacción']
        const affiliate    = row['Nombre del Afiliado(a)'] !== '(none)' ? row['Nombre del Afiliado(a)'] : null

        const phoneNormalized = normalizePhone(rawPhone)
        if (!phoneNormalized) {
          results.skipped_no_phone++
          continue
        }

        const purchaseDate = parseHotmartDate(dateRaw)

        // Verificar duplicado por transaction_id
        const { data: existing } = await supabase
          .from('hotmart_buyers')
          .select('id, capi_sent_at')
          .eq('hotmart_transaction_id', transactionId)
          .maybeSingle()

        if (existing) {
          results.skipped_dup++
          continue
        }

        // Buscar match con wa_contacts por phone normalizado
        const { data: contact } = await supabase
          .from('wa_contacts')
          .select('id, utm_data')
          .eq('phone_number', phoneNormalized)
          .maybeSingle()

        const matchedContactId = contact?.id || null
        const utmCampaign = contact?.utm_data?.utm_campaign || affiliate || null

        // Insertar en hotmart_buyers
        const { data: inserted, error: insertErr } = await supabase
          .from('hotmart_buyers')
          .insert({
            project_id,
            hotmart_transaction_id: transactionId,
            buyer_name:     buyerName,
            buyer_email:    buyerEmail,
            buyer_phone:    rawPhone,
            phone_normalized: phoneNormalized,
            product_name:   productName,
            amount,
            currency,
            purchase_date:  purchaseDate,
            matched_contact_id: matchedContactId,
            utm_campaign:   utmCampaign,
          })
          .select('id')
          .single()

        if (insertErr) {
          console.error('[import-buyers] insert error:', insertErr.message)
          results.errors++
          continue
        }

        results.inserted++
        if (matchedContactId) results.matched_contacts++

        // ── CAPI retroactivo: Purchase (fire-and-forget) ──────────────────────
        if (creds?.meta_pixel_id && creds?.meta_capi_token && purchaseDate) {
          const eventTime = Math.floor(new Date(purchaseDate).getTime() / 1000)

          // Llamada interna al /api/meta-capi
          const capiPayload = {
            event_type: 'Purchase',
            phone_number: phoneNormalized,
            value: amount,
            currency,
            sale_id: inserted.id,
            event_time_override: eventTime, // fecha real histórica
          }

          // Fire-and-forget: no bloqueamos el loop
          fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL || 'https://wa-dashboard-five.vercel.app'}/api/meta-capi`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(capiPayload),
            }
          )
          .then(async (capiRes) => {
            if (capiRes.ok) {
              // Marcar capi_sent_at en hotmart_buyers
              await supabase
                .from('hotmart_buyers')
                .update({ capi_sent_at: new Date().toISOString() })
                .eq('id', inserted.id)
              results.capi_sent++
            }
          })
          .catch(() => {}) // CAPI falla silenciosamente, no bloquea importación

        }
      } catch (rowErr) {
        console.error('[import-buyers] row error:', rowErr)
        results.errors++
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      message: `${results.inserted} compradores importados · ${results.matched_contacts} con match WA · ${results.skipped_dup} duplicados omitidos`,
    })

  } catch (err) {
    console.error('[import-buyers] fatal:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── GET /api/import-buyers — estadísticas de compradores ────────────────────
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const project_id = searchParams.get('project_id')

    if (!project_id) {
      return NextResponse.json({ error: 'project_id requerido' }, { status: 400 })
    }

    // Totales
    const { count: total } = await supabase
      .from('hotmart_buyers')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project_id)

    const { count: matched } = await supabase
      .from('hotmart_buyers')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project_id)
      .not('matched_contact_id', 'is', null)

    const { count: capiSent } = await supabase
      .from('hotmart_buyers')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', project_id)
      .not('capi_sent_at', 'is', null)

    // Lista de compradores con match (para análisis)
    const { data: buyers } = await supabase
      .from('hotmart_buyers')
      .select(`
        id, buyer_name, buyer_email, phone_normalized,
        product_name, amount, currency, purchase_date,
        utm_campaign, capi_sent_at, imported_at,
        matched_contact_id
      `)
      .eq('project_id', project_id)
      .order('purchase_date', { ascending: false })
      .limit(200)

    // Revenue total
    const { data: revenueData } = await supabase
      .from('hotmart_buyers')
      .select('amount')
      .eq('project_id', project_id)

    const totalRevenue = (revenueData || []).reduce((acc, r) => acc + (r.amount || 0), 0)

    // Compradores por campaña
    const byCampaign: Record<string, number> = {}
    ;(buyers || []).forEach(b => {
      const key = b.utm_campaign || 'Sin campaña'
      byCampaign[key] = (byCampaign[key] || 0) + 1
    })

    return NextResponse.json({
      success: true,
      stats: {
        total: total || 0,
        matched: matched || 0,
        capi_sent: capiSent || 0,
        total_revenue: totalRevenue,
        match_rate: total ? Math.round(((matched || 0) / total) * 100) : 0,
      },
      buyers: buyers || [],
      by_campaign: byCampaign,
    })
  } catch (err) {
    console.error('[import-buyers] GET error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
