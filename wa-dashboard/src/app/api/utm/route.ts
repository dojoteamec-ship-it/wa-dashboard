import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Normalizar teléfono a E.164 ───────────────────────────────────────────
function normalizePhone(raw: string): string | null {
  if (!raw) return null
  // Eliminar todo excepto dígitos y +
  let phone = raw.replace(/[^\d+]/g, '')
  // Si no empieza con +, asumir que necesita código de país
  if (!phone.startsWith('+')) {
    // Si empieza con 0, quitar el 0 (ej: Ecuador 0999 → 593999)
    if (phone.startsWith('0')) phone = phone.slice(1)
    phone = '+' + phone
  }
  // Validar longitud mínima (7 dígitos después del +)
  if (phone.replace('+', '').length < 7) return null
  return phone
}

// ─── Payload esperado (plataforma-agnóstico) ───────────────────────────────
interface UTMPayload {
  // Identificación del proyecto en KANSHI
  project_id?: string

  // Datos del lead
  phone_number?: string
  phone?: string           // alias alternativo (GHL usa "phone")
  email?: string
  first_name?: string
  last_name?: string

  // UTM params
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
  utm_content?: string
  utm_term?: string

  // Metadata adicional
  landing_url?: string
  ip_address?: string
  user_agent?: string
  source_platform?: string  // 'ghl' | 'html' | 'systeme' | etc.

  // GHL específico (para mapeo automático)
  locationId?: string       // subcuenta GHL → ayuda a identificar proyecto
  customFields?: Array<{ id: string; value: string }>
}

export async function POST(req: NextRequest) {
  try {
    const body: UTMPayload = await req.json()

    // ── 1. Normalizar teléfono ──────────────────────────────────────────
    const rawPhone = body.phone_number || body.phone || ''
    const phone = normalizePhone(rawPhone)

    if (!phone) {
      return NextResponse.json(
        { error: 'phone_number requerido y debe ser válido' },
        { status: 400 }
      )
    }

    // ── 2. Resolver project_id ──────────────────────────────────────────
    // Prioridad: payload directo → locationId de GHL → proyecto activo
    let projectId = body.project_id || null

    if (!projectId && body.locationId) {
      // Buscar proyecto por ghl_location_id si existe en el futuro
      // Por ahora, tomar el proyecto activo
      const { data: activeProject } = await supabase
        .from('kanshi_projects')
        .select('id')
        .eq('status', 'active')
        .single()
      projectId = activeProject?.id || null
    }

    if (!projectId) {
      // Fallback: proyecto activo
      const { data: activeProject } = await supabase
        .from('kanshi_projects')
        .select('id')
        .eq('status', 'active')
        .single()
      projectId = activeProject?.id || null
    }

    // ── 3. Construir objeto UTM limpio ──────────────────────────────────
    const utmRecord = {
      project_id:      projectId,
      phone_number:    phone,
      email:           body.email || null,
      first_name:      body.first_name || null,
      last_name:       body.last_name || null,
      utm_source:      body.utm_source || 'organic',
      utm_medium:      body.utm_medium || 'none',
      utm_campaign:    body.utm_campaign || null,
      utm_content:     body.utm_content || null,
      utm_term:        body.utm_term || null,
      landing_url:     body.landing_url || null,
      ip_address:      body.ip_address || 
                       req.headers.get('x-forwarded-for')?.split(',')[0] || null,
      user_agent:      body.user_agent || 
                       req.headers.get('user-agent') || null,
      registered_at:   new Date().toISOString(),
      matched_contact_id: null as string | null,
      source_platform: body.source_platform || null,
      matched_at:      null as string | null,
    }

    // ── 4. INSERT en utm_tracking ───────────────────────────────────────
    const { data: inserted, error: insertError } = await supabase
      .from('utm_tracking')
      .insert(utmRecord)
      .select()
      .single()

    if (insertError) {
      console.error('[KANSHI UTM] Insert error:', insertError)
      return NextResponse.json(
        { error: 'Error guardando UTM', detail: insertError.message },
        { status: 500 }
      )
    }

    // ── 5. Match automático: buscar lead en wa_contacts ─────────────────
    const utmDataForContact = {
      utm_source:   utmRecord.utm_source,
      utm_medium:   utmRecord.utm_medium,
      utm_campaign: utmRecord.utm_campaign,
      utm_content:  utmRecord.utm_content,
      utm_term:     utmRecord.utm_term,
      landing_url:  utmRecord.landing_url,
      source_platform: body.source_platform || 'unknown',
      captured_at:  utmRecord.registered_at,
    }

    // Buscar por número exacto en wa_contacts
    const { data: contact } = await supabase
      .from('wa_contacts')
      .select('id, phone_number, utm_data')
      .eq('phone_number', phone)
      .maybeSingle()

    let matchStatus = 'no_match'

    if (contact) {
      // Contacto encontrado → actualizar utm_data + matched en utm_tracking
      const now = new Date().toISOString()

      await Promise.all([
        // Actualizar utm_tracking con el match
        supabase
          .from('utm_tracking')
          .update({
            matched_contact_id: contact.id,
            matched_at: now,
          })
          .eq('id', inserted.id),

        // Guardar utm_data en el perfil del lead
        // Solo si no tenía UTM previo (first-touch attribution)
        supabase
          .from('wa_contacts')
          .update({
            utm_data: contact.utm_data && Object.keys(contact.utm_data).length > 0
              ? contact.utm_data  // ya tenía UTM → no sobreescribir (first-touch)
              : utmDataForContact,
          })
          .eq('id', contact.id),
      ])

      matchStatus = 'matched'
    }

    // ── 6. Respuesta ────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      utm_id: inserted.id,
      project_id: projectId,
      phone: phone,
      match_status: matchStatus,
      contact_id: contact?.id || null,
    }, { status: 200 })

  } catch (err) {
    console.error('[KANSHI UTM] Unexpected error:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    endpoint: 'KANSHI UTM Tracker',
    version: '1.0',
    status: 'active',
    accepts: 'POST application/json',
  })
}
