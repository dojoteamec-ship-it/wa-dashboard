import { NextRequest, NextResponse } from 'next/server'
import { calculateKanshiScore, recalculateAllScores } from '@/lib/kanshi-score'

// ─── POST /api/score ──────────────────────────────────────────────────────────
// Recalcula el KANSHI Score de un contacto individual.
// Llamado desde:
//   - /api/quiz (hook automático al completar un quiz)
//   - n8n SAM (después de cada conversación)
//   - Dashboard (manual desde perfil del lead)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { contact_id, project_id } = body

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
