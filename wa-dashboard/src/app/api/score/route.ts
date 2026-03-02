/**
 * KANSHI Score — Motor de cálculo
 * Versión: 1
 * 
 * Score compuesto 0-100 en 4 dimensiones.
 * Se recalcula en cada interacción del lead.
 * 
 * Triggers:
 *  - POST /api/score  (llamado desde /api/quiz y desde SAM vía n8n)
 *  - Recálculo manual desde el dashboard
 */

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ─── Constantes de versión ────────────────────────────────────────────────────
// Si cambias los pesos del modelo, incrementa la versión para trazabilidad.
export const SCORE_MODEL_VERSION = 1

// ─── Umbrales para Meta CAPI (Día 10) ────────────────────────────────────────
export const SCORE_THRESHOLDS = {
  WARM: 40,    // → evento Meta "WarmLead"
  HOT: 60,     // → evento Meta "HotLead"
  READY: 75,   // → evento Meta "ReadyLead"
  BUYER: 90,   // → evento Meta "BuyerProfile"
} as const

// ─── Segmentos ────────────────────────────────────────────────────────────────
export type KanshiSegment = 'frio' | 'templado' | 'caliente' | 'listo'

export function getSegment(score: number): KanshiSegment {
  if (score >= 76) return 'listo'
  if (score >= 51) return 'caliente'
  if (score >= 26) return 'templado'
  return 'frio'
}

export const SEGMENT_CONFIG: Record<KanshiSegment, { label: string; color: string; emoji: string }> = {
  frio:      { label: 'Frío',      color: '#00b0f6', emoji: '🔵' },
  templado:  { label: 'Templado',  color: '#FFB800', emoji: '🟡' },
  caliente:  { label: 'Caliente',  color: '#FF6B35', emoji: '🟠' },
  listo:     { label: 'Listo',     color: '#00FF94', emoji: '🔴' },
}

// ─── Resultado del cálculo ────────────────────────────────────────────────────
export interface KanshiScoreResult {
  score_total: number
  score_fit: number
  score_engagement: number
  score_intencion: number
  score_fuente: number
  segment: KanshiSegment
  thresholds_crossed: string[]   // Para disparar Meta CAPI en Día 10
}

// ─── DIMENSIÓN 1: FIT DEL PERFIL (0-25) ──────────────────────────────────────
// Fuente: quiz de registro (quiz_type = 'registro')
function calcScoreFit(quizResponses: Record<string, string> | null): number {
  if (!quizResponses) return 0

  let score = 0
  const r = quizResponses

  // Objetivo principal
  const objetivo = findValue(r, ['objetivo_principal', 'objetivo', 'goal'])
  if (objetivo) {
    const obj = objetivo.toLowerCase()
    if (obj.includes('negocio') || obj.includes('emprendimiento') || obj.includes('empresa')) {
      score += 15
    } else if (obj.includes('carrera') || obj.includes('empleo') || obj.includes('trabajo')) {
      score += 10
    } else if (obj.includes('curiosidad') || obj.includes('aprender') || obj.includes('conocer')) {
      score += 3
    }
  }

  // Nivel de IA / experiencia previa
  const nivel = findValue(r, ['nivel_ia', 'nivel', 'experiencia', 'experience', 'nivel_inteligencia'])
  if (nivel) {
    const n = nivel.toLowerCase()
    if (n.includes('ninguno') || n.includes('básico') || n.includes('basico') || n.includes('cero')) {
      score += 10  // Necesita el producto → mejor fit
    } else if (n.includes('intermedio') || n.includes('avanzado')) {
      score += 5
    }
  }

  return Math.min(score, 25)
}

// ─── DIMENSIÓN 2: ENGAGEMENT ACTIVO (0-35) ───────────────────────────────────
// Fuente: engagement_score de wa_contacts + cantidad de quizzes completados
function calcScoreEngagement(
  engagementScore: number,       // 1-10 desde wa_contacts
  quizCount: number,             // total de quizzes completados
  quizTypes: string[]            // tipos de quiz para diferenciar post-live vs post-clase
): number {
  let score = 0

  // SAM engagement_score (1-10) × 2.5 → hasta 25 pts
  score += Math.round((engagementScore || 0) * 2.5)

  // Quizzes post-live: +3 pts c/u (max 9 pts)
  const postLiveCount = quizTypes.filter(t => t.startsWith('post_live')).length
  score += Math.min(postLiveCount * 3, 9)

  // Quizzes post-clase: +1 pt c/u (max 1 pt)
  const postClaseCount = quizTypes.filter(t => t.startsWith('post_clase')).length
  score += Math.min(postClaseCount * 1, 1)

  return Math.min(score, 35)
}

// ─── DIMENSIÓN 3: INTENCIÓN DECLARADA (0-25) ─────────────────────────────────
// Fuente: respuestas de quizzes (cualquier quiz donde el lead declara intención)
function calcScoreIntencion(allResponses: Record<string, string>[]): number {
  let score = 0
  let maxIntencion = 0
  let hasObjecionPrecio = false
  let hasUrgencia = false

  for (const r of allResponses) {
    // Intención de compra
    const intencion = findValue(r, [
      'intencion_compra', 'intencion', 'intention', 'probabilidad_compra',
      'vas_a_comprar', 'comprar', 'decision'
    ])
    if (intencion) {
      const i = intencion.toLowerCase()
      let pts = 0
      if (i.includes('definitivamente') || i.includes('seguro') || i.includes('voy a comprar')) pts = 25
      else if (i.includes('muy probable') || i.includes('probablemente sí') || i.includes('probablemente si')) pts = 18
      else if (i.includes('dudas') || i.includes('no sé') || i.includes('no se') || i.includes('tal vez')) pts = 10
      else if (i.includes('probablemente no') || i.includes('no creo')) pts = 2
      maxIntencion = Math.max(maxIntencion, pts)
    }

    // Objeción de precio
    const objecion = findValue(r, ['objecion', 'barrera', 'problema', 'dificultad'])
    if (objecion) {
      const o = objecion.toLowerCase()
      if (o.includes('precio') || o.includes('caro') || o.includes('dinero') || o.includes('costo')) {
        hasObjecionPrecio = true
      }
    }

    // Urgencia / deadline personal
    const urgencia = findValue(r, ['urgencia', 'cuando', 'plazo', 'deadline', 'tiempo'])
    if (urgencia) {
      const u = urgencia.toLowerCase()
      if (u.includes('ya') || u.includes('ahora') || u.includes('urgente') ||
          u.includes('este mes') || u.includes('pronto')) {
        hasUrgencia = true
      }
    }
  }

  score = maxIntencion
  if (hasObjecionPrecio) score -= 5
  if (hasUrgencia) score += 8

  return Math.max(0, Math.min(score, 25))
}

// ─── DIMENSIÓN 4: CALIDAD DE LA FUENTE (0-15) ────────────────────────────────
// Fuente: utm_data del contacto
function calcScoreFuente(utmData: Record<string, string> | null): number {
  if (!utmData) return 5  // Orgánico sin UTM

  const source = (utmData.utm_source || '').toLowerCase()
  const medium = (utmData.utm_medium || '').toLowerCase()

  // Referido u orgánico con registro completo
  if (source === 'referido' || source === 'referral') return 15

  // Paid social / search (segmentado)
  if (
    source === 'facebook' || source === 'fb' ||
    source === 'instagram' || source === 'ig' ||
    medium === 'cpc' || medium === 'paid' || medium === 'paid_social'
  ) return 10

  // YouTube orgánico, email, etc.
  if (source === 'youtube' || medium === 'email' || medium === 'social') return 7

  // Orgánico sin más info
  return 5
}

// ─── Helper: buscar valor por claves parciales en un objeto ──────────────────
// Funciona aunque las preguntas vengan en distintos idiomas o formatos
function findValue(obj: Record<string, string>, keys: string[]): string | null {
  for (const [k, v] of Object.entries(obj)) {
    const kLower = k.toLowerCase()
    if (keys.some(key => kLower.includes(key))) {
      return String(v)
    }
  }
  return null
}

// ─── FUNCIÓN PRINCIPAL ────────────────────────────────────────────────────────

export interface CalculateScoreInput {
  contact_id: string
  project_id?: string | null
}

export async function calculateKanshiScore(
  input: CalculateScoreInput
): Promise<KanshiScoreResult | null> {
  const { contact_id, project_id } = input

  try {
    // ── 1. Leer datos del contacto ─────────────────────────────────────────
    const { data: contact, error: contactError } = await supabase
      .from('wa_contacts')
      .select('id, phone_number, engagement_score, utm_data, kanshi_score')
      .eq('id', contact_id)
      .single()

    if (contactError || !contact) {
      console.error('[KanshiScore] Contacto no encontrado:', contact_id, contactError)
      return null
    }

    // ── 2. Leer todos los quizzes del contacto ─────────────────────────────
    const { data: quizzes } = await supabase
      .from('lead_quiz_responses')
      .select('quiz_type, responses, answered_at')
      .eq('phone_number', contact.phone_number)
      .order('answered_at', { ascending: true })

    const quizRegistro = quizzes?.find(q => q.quiz_type === 'registro')?.responses || null
    const quizTypes = quizzes?.map(q => q.quiz_type) || []
    const allResponses = quizzes?.map(q => q.responses as Record<string, string>) || []

    // ── 3. Calcular las 4 dimensiones ─────────────────────────────────────
    const score_fit        = calcScoreFit(quizRegistro as Record<string, string> | null)
    const score_engagement = calcScoreEngagement(
      contact.engagement_score || 0,
      quizzes?.length || 0,
      quizTypes
    )
    const score_intencion  = calcScoreIntencion(allResponses)
    const score_fuente     = calcScoreFuente(contact.utm_data as Record<string, string> | null)

    const score_total = score_fit + score_engagement + score_intencion + score_fuente
    const segment     = getSegment(score_total)

    // ── 4. Detectar umbrales cruzados (para Meta CAPI en Día 10) ──────────
    const prevScore = contact.kanshi_score || 0
    const thresholds_crossed: string[] = []

    for (const [level, threshold] of Object.entries(SCORE_THRESHOLDS)) {
      if (prevScore < threshold && score_total >= threshold) {
        thresholds_crossed.push(level)
      }
    }

    const result: KanshiScoreResult = {
      score_total,
      score_fit,
      score_engagement,
      score_intencion,
      score_fuente,
      segment,
      thresholds_crossed,
    }

    // ── 5. Upsert en kanshi_score_breakdown ────────────────────────────────
    await supabase
      .from('kanshi_score_breakdown')
      .upsert(
        {
          contact_id,
          project_id: project_id || null,
          phone_number: contact.phone_number,
          score_fit,
          score_engagement,
          score_intencion,
          score_fuente,
          score_total,
          calculation_version: SCORE_MODEL_VERSION,
          calculated_at: new Date().toISOString(),
        },
        { onConflict: 'contact_id' }
      )

    // ── 6. Actualizar wa_contacts con score y segmento ─────────────────────
    await supabase
      .from('wa_contacts')
      .update({
        kanshi_score: score_total,
        kanshi_segment: segment,
        score_calculated_at: new Date().toISOString(),
      })
      .eq('id', contact_id)

    return result

  } catch (err) {
    console.error('[KanshiScore] Error inesperado:', err)
    return null
  }
}

// ─── Recálculo masivo (para uso futuro desde dashboard) ───────────────────────
// Recalcula el score de todos los contactos de un proyecto.
// Útil al cambiar el modelo (incrementar SCORE_MODEL_VERSION).
export async function recalculateAllScores(project_id: string): Promise<{
  processed: number
  errors: number
}> {
  let processed = 0
  let errors = 0

  const { data: contacts } = await supabase
    .from('wa_contacts')
    .select('id')
    .eq('project_id', project_id)

  if (!contacts) return { processed: 0, errors: 0 }

  // Procesar en lotes de 20 para no saturar la DB
  const BATCH_SIZE = 20
  for (let i = 0; i < contacts.length; i += BATCH_SIZE) {
    const batch = contacts.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(
      batch.map(async (c) => {
        const res = await calculateKanshiScore({ contact_id: c.id, project_id })
        if (res) processed++
        else errors++
      })
    )
  }

  return { processed, errors }
}
