import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { parsePhoneNumber } from 'libphonenumber-js'

// ─── Normalizar teléfono a E.164 ─────────────────────────────────────────────
// n8n (Q3) siempre manda el teléfono con + y código de país
// Esta función valida y normaliza usando libphonenumber-js (230+ países)
function normalizePhone(raw: string): string | null {
  if (!raw) return null

  // Limpiar espacios, guiones, paréntesis
  let phone = raw.replace(/[\s\-().]/g, '')

  // 00XX → +XX (formato europeo/LATAM común)
  if (phone.startsWith('00')) phone = '+' + phone.slice(2)

  // Debe tener + en este punto (n8n lo garantiza)
  if (!phone.startsWith('+')) {
    console.warn('[KANSHI /api/quiz] Teléfono sin código de país:', raw)
    return null
  }

  try {
    const parsed = parsePhoneNumber(phone)
    return parsed?.isValid() ? parsed.format('E.164') : null
  } catch {
    return null
  }
}

// ─── POST /api/quiz ───────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      phone_number,
      project_id,
      quiz_type,
      quiz_name,
      responses,
      source = 'ghl_quiz',
    } = body

    // ── Validaciones ──────────────────────────────────────────────────────────
    if (!phone_number) {
      return NextResponse.json(
        { error: 'phone_number es requerido' },
        { status: 400 }
      )
    }
    if (!quiz_type) {
      return NextResponse.json(
        { error: 'quiz_type es requerido' },
        { status: 400 }
      )
    }
    if (!responses || typeof responses !== 'object') {
      return NextResponse.json(
        { error: 'responses debe ser un objeto JSON' },
        { status: 400 }
      )
    }

    // ── Normalizar teléfono ───────────────────────────────────────────────────
    const normalizedPhone = normalizePhone(phone_number)

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: `No se pudo normalizar el teléfono: ${phone_number}` },
        { status: 400 }
      )
    }

    // ── Match con wa_contacts ─────────────────────────────────────────────────
    let matched_contact_id: string | null = null

    const { data: contact } = await supabase
      .from('wa_contacts')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .maybeSingle()

    if (contact) {
      matched_contact_id = contact.id
    }

    // ── Insertar en lead_quiz_responses ───────────────────────────────────────
    const { data: quizRecord, error: insertError } = await supabase
      .from('lead_quiz_responses')
      .insert({
        project_id: project_id || null,
        phone_number: normalizedPhone,
        matched_contact_id,
        quiz_type,
        quiz_name: quiz_name || null,
        responses,
        raw_responses: body,
        source,
        answered_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('[KANSHI /api/quiz] Error insertando:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar respuesta de quiz', detail: insertError.message },
        { status: 500 }
      )
    }

    // ── Hook KANSHI Score ─────────────────────────────────────────────────────
if (matched_contact_id) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wa-dashboard-five.vercel.app'
  fetch(`${appUrl}/api/score`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contact_id: matched_contact_id,
      project_id: project_id || null,
    }),
  }).catch(err => console.error('[KANSHI /api/quiz] Score hook error:', err))
}

    return NextResponse.json({
      success: true,
      quiz_id: quizRecord.id,
      phone_normalized: normalizedPhone,
      matched_contact_id,
      contact_matched: !!matched_contact_id,
    })

  } catch (err) {
    console.error('[KANSHI /api/quiz] Error inesperado:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
