import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Cliente con service role — necesitamos escribir sin RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Normalizar teléfono a E.164 ─────────────────────────────────────────────
// Misma lógica que /api/utm
// Ecuador: 09XXXXXXXX → +593XXXXXXXXX
// Ya con código: 593XXXXXXXXX → +593XXXXXXXXX
// Internacional: +1XXXXXXXXXX → ya está bien
function normalizePhone(raw: string): string | null {
  if (!raw) return null

  // Eliminar todo excepto dígitos y el + inicial
  let phone = raw.replace(/[^\d+]/g, '')

  // Si ya empieza con +, asumimos que está bien formado
  if (phone.startsWith('+')) return phone

  // Si empieza con 00, convertir a +
  if (phone.startsWith('00')) return '+' + phone.slice(2)

  // Ecuador: número local empieza con 0 (09XXXXXXXX = 10 dígitos)
  if (phone.startsWith('0') && phone.length === 10) {
    return '+593' + phone.slice(1)
  }

  // Ecuador: sin el 0 inicial (9XXXXXXXX = 9 dígitos)
  if (phone.startsWith('9') && phone.length === 9) {
    return '+593' + phone
  }

  // Ya tiene código de país sin +
  if (phone.length >= 10) return '+' + phone

  return null
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

    // ── Validaciones mínimas ──────────────────────────────────────────────────
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
    // Buscamos por phone_number normalizado
    // Si no hay match, el registro igual se guarda (matched_contact_id queda null)
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
        responses,          // JSONB normalizado
        raw_responses: body, // payload completo sin tocar
        source,
        answered_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (insertError) {
      console.error('[KANSHI] Error insertando quiz response:', insertError)
      return NextResponse.json(
        { error: 'Error al guardar respuesta de quiz', detail: insertError.message },
        { status: 500 }
      )
    }

    // ── Hook: recálculo de KANSHI Score ───────────────────────────────────────
    // TODO Día 9: descomentar cuando exista /api/score
    // if (matched_contact_id) {
    //   await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/score`, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify({
    //       contact_id: matched_contact_id,
    //       project_id,
    //       trigger: 'quiz_completed',
    //       quiz_type,
    //     }),
    //   })
    // }

    // ── Respuesta ─────────────────────────────────────────────────────────────
    return NextResponse.json({
      success: true,
      quiz_id: quizRecord.id,
      phone_normalized: normalizedPhone,
      matched_contact_id,
      contact_matched: !!matched_contact_id,
    })

  } catch (err) {
    console.error('[KANSHI] Error inesperado en /api/quiz:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
