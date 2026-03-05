import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateKanshiScore, recalculateAllScores } from '@/lib/kanshi-score'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── POST /api/score ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { contact_id, project_id, phone_number } = body

    if (!contact_id) {
      return NextResponse.json(
        { error: 'contact_id es requerido' },
        { status: 400 }
      )
    }

    const result = await calculateKanshiScore({ contact_id, project_id })

    if (!result) {
      return NextResponse.json(
        { error: 'No se pudo calcular el score. Verifica que el contact_id existe.' },
        { status: 404 }
      )
    }

    // ── QualifiedLead Signal → Meta CAPI ──────────────────────────────────────
    // Dispara solo cuando el score CRUZA un umbral por primera vez
    // thresholds_crossed viene de calculateKanshiScore comparando score previo vs nuevo
    if (result.thresholds_crossed?.length > 0 && phone_number) {
      const thresholdEventMap: Record<string, string> = {
        warm:   'WarmLead',
        hot:    'HotLead',
        ready:  'ReadyLead',
        buyer:  'BuyerProfile',
      }

      // Fire-and-forget — no bloquea la respuesta al lead
      Promise.all(
        result.thresholds_crossed.map((threshold: string) => {
          const event_type = thresholdEventMap[threshold]
          if (!event_type) return Promise.resolve()

          return fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'https://wa-dashboard-five.vercel.app'}/api/meta-capi`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event_type,
              contact_id,
              phone_number,
              value: result.score_total,
              currency: 'USD',
            }),
          }).then(r => r.json()).then(res => {
            console.log(`[score→capi] ${event_type} para ${phone_number}:`, res.success ? '✅' : '❌')
          }).catch(e => {
            console.error(`[score→capi] Error ${event_type}:`, e.message)
          })
        })
      )
    }
    // ─────────────────────────────────────────────────────────────────────────

    // ── Alertas al equipo — Día 14 ────────────────────────────────────────────
    // Se dispara cuando score cruza umbral 'ready' (≥75) o 'buyer' (≥90)
    // El UNIQUE INDEX en (contact_id, alert_type) garantiza idempotencia en DB
    const alertThresholdMap: Record<string, 'score_75' | 'score_90'> = {
      ready:  'score_75',
      buyer:  'score_90',
    }

    const alertThresholds = (result.thresholds_crossed ?? []).filter(
      (t: string) => t === 'ready' || t === 'buyer'
    )

    if (alertThresholds.length > 0) {
      // Fetch nombre del lead — no bloquea la respuesta
      const fetchNameAndInsert = async () => {
        try {
          const { data: contactData } = await supabase
            .from('wa_contacts')
            .select('name, phone_number')
            .eq('id', contact_id)
            .maybeSingle()

          const alertRows = alertThresholds.map((threshold: string) => ({
            project_id:   project_id || null,
            contact_id:   contact_id,
            alert_type:   alertThresholdMap[threshold],
            lead_name:    contactData?.name || null,
            lead_phone:   contactData?.phone_number || phone_number || null,
            kanshi_score: result.score_total,
            metadata: {
              segment:    result.segment,
              trigger:    body.trigger || 'manual',
              threshold:  threshold,
            },
          }))

          const { error: alertError } = await supabase
            .from('kanshi_alerts')
            .upsert(alertRows, {
              onConflict:        'contact_id,alert_type',
              ignoreDuplicates:  true,   // si ya existe → no error, no sobreescribe
            })

          if (alertError) {
            console.error('[score→alerts] Error insertando alerta:', alertError.message)
          } else {
            console.log(`[score→alerts] ✅ ${alertRows.length} alerta(s) insertadas para contact ${contact_id}`)
          }
        } catch (e: any) {
          console.error('[score→alerts] Error inesperado:', e.message)
        }
      }

      // Fire-and-forget — igual que CAPI
      fetchNameAndInsert()
    }
   // ─────────────────────────────────────────────────────────────────────────

    // ── LP5: Landing personalizada — fire-and-forget ──────────────────────────
    // Se dispara cuando score cruza 'ready' (≥75) por primera vez.
    // Verifica idempotencia antes de llamar: solo genera si no existe landing.
    if ((result.thresholds_crossed ?? []).includes('ready')) {
      const triggerLandingGen = async () => {
        try {
          const { data: existingLanding } = await supabase
            .from('landing_pages')
            .select('id')
            .eq('contact_id', contact_id)
            .maybeSingle()

          if (!existingLanding) {
            await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL || 'https://wa-dashboard-five.vercel.app'}/api/landing-gen`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contact_id, project_id: project_id || null }),
              }
            )
            console.log(`[score→landing-gen] ✅ Landing encolada para contact ${contact_id}`)
          } else {
            console.log(`[score→landing-gen] ⏭️  Landing ya existe para contact ${contact_id}, skip`)
          }
        } catch (e: any) {
          console.error('[score→landing-gen] Error:', e.message)
        }
      }
      triggerLandingGen() // fire-and-forget — no await
    }
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      contact_id,
      score: result.score_total,
      segment: result.segment,
      breakdown: {
        fit:        result.score_fit,
        engagement: result.score_engagement,
        intencion:  result.score_intencion,
        fuente:     result.score_fuente,
      },
      thresholds_crossed: result.thresholds_crossed,
      capi_signals_fired: result.thresholds_crossed?.length ?? 0,
    })

  } catch (err) {
    console.error('[KANSHI /api/score] Error:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ─── PUT /api/score ───────────────────────────────────────────────────────────
// Recalcula el score de TODOS los contactos de un proyecto.
// Usar cuando se cambia el modelo (SCORE_MODEL_VERSION).
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { project_id } = body

    if (!project_id) {
      return NextResponse.json(
        { error: 'project_id es requerido' },
        { status: 400 }
      )
    }

    const result = await recalculateAllScores(project_id)

    return NextResponse.json({
      success: true,
      project_id,
      ...result,
    })

  } catch (err) {
    console.error('[KANSHI /api/score] Error en recálculo masivo:', err)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    endpoint: 'KANSHI Score Engine',
    version: 1,
    status: 'active',
    routes: {
      'POST /api/score': 'Recalcular score de un contacto — { contact_id, project_id }',
      'PUT /api/score':  'Recalcular todos los contactos de un proyecto — { project_id }',
    }
  })
}
