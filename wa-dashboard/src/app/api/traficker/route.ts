import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')
    if (!projectId) return NextResponse.json({ error: 'project_id required' }, { status: 400 })

    // ── 1. Proyecto (para ad_budget y calcular CPL) ──────────────────────────
    const { data: project } = await supabase
      .from('kanshi_projects')
      .select('ad_budget, leads_goal')
      .eq('id', projectId)
      .single()

    // ── 2. UTM tracking del proyecto ─────────────────────────────────────────
    const { data: utmRows } = await supabase
      .from('utm_tracking')
      .select('id, utm_content, utm_source, utm_campaign, phone_number, registered_at, matched_contact_id')
      .eq('project_id', projectId)
      .order('registered_at', { ascending: true })

    if (!utmRows || utmRows.length === 0) {
      return NextResponse.json({ rows: [], total_leads: 0, ad_budget: project?.ad_budget ?? null })
    }

    // ── 3. Contactos relacionados ────────────────────────────────────────────
    const contactIds = utmRows
      .map(r => r.matched_contact_id)
      .filter((id): id is string => !!id)

    const phones = utmRows.map(r => r.phone_number).filter(Boolean)

    let contactMap: Record<string, {
      kanshi_score: number; kanshi_segment: string
      engagement_score: number; agent_stage: string
      dolor_declarado: string | null; sueno_declarado: string | null
    }> = {}

    if (contactIds.length > 0) {
      const { data: contacts } = await supabase
        .from('wa_contacts')
        .select('id, kanshi_score, kanshi_segment, engagement_score, agent_stage, dolor_declarado, sueno_declarado')
        .in('id', contactIds)

      for (const c of contacts ?? []) {
        contactMap[c.id] = c
      }
    }

    // ── 4. Mensajes inbound (respuestas) ─────────────────────────────────────
    // Verificar si un lead respondió: tiene mensajes inbound en wa_messages
    let respondedPhones = new Set<string>()
    let firstResponseTime: Record<string, number> = {} // phone → minutos hasta 1ra resp

    if (phones.length > 0) {
      const { data: inboundMsgs } = await supabase
        .from('wa_messages')
        .select('contact_phone, created_at')
        .in('contact_phone', phones)
        .eq('direction', 'inbound')
        .order('created_at', { ascending: true })

      // 1ra respuesta por phone
      const firstMsg: Record<string, string> = {}
      for (const msg of inboundMsgs ?? []) {
        if (!firstMsg[msg.contact_phone]) firstMsg[msg.contact_phone] = msg.created_at
      }

      for (const phone of Object.keys(firstMsg)) {
        respondedPhones.add(phone)
      }

      // Calcular tiempo hasta 1ra respuesta vs registro
      for (const row of utmRows) {
        if (firstMsg[row.phone_number] && row.registered_at) {
          const reg = new Date(row.registered_at).getTime()
          const resp = new Date(firstMsg[row.phone_number]).getTime()
          const mins = Math.round((resp - reg) / 60000)
          if (mins >= 0 && mins < 10080) { // max 7 días
            firstResponseTime[row.phone_number] = mins
          }
        }
      }
    }

    // ── 5. Quiz completados ──────────────────────────────────────────────────
    let quizPhones = new Set<string>()
    let quizMap: Record<string, Record<string, string>> = {}

    if (phones.length > 0) {
      const { data: quizRows } = await supabase
        .from('lead_quiz_responses')
        .select('phone_number, responses, quiz_type')
        .in('phone_number', phones)
        .eq('project_id', projectId)

      for (const q of quizRows ?? []) {
        quizPhones.add(q.phone_number)
        if (!quizMap[q.phone_number]) quizMap[q.phone_number] = {}
        if (q.responses && typeof q.responses === 'object') {
          Object.assign(quizMap[q.phone_number], q.responses)
        }
      }
    }

    // ── 6. Agrupar por utm_content ───────────────────────────────────────────
    type AdGroup = {
      utm_content: string
      utm_source: string | null
      utm_campaign: string | null
      leads: typeof utmRows
    }

    const grouped: Record<string, AdGroup> = {}

    for (const row of utmRows) {
      const key = row.utm_content || '(sin anuncio)'
      if (!grouped[key]) {
        grouped[key] = {
          utm_content: key,
          utm_source: row.utm_source,
          utm_campaign: row.utm_campaign,
          leads: []
        }
      }
      grouped[key].leads.push(row)
    }

    // ── 7. Calcular métricas por grupo ───────────────────────────────────────
    const totalLeads = utmRows.length
    const adBudget = project?.ad_budget ?? null

    const rows = Object.values(grouped).map(group => {
      const n = group.leads.length
      const responded = group.leads.filter(l => respondedPhones.has(l.phone_number)).length
      const respRate = n > 0 ? Math.round((responded / n) * 100) : 0

      // Tiempo promedio 1ra respuesta
      const respTimes = group.leads
        .map(l => firstResponseTime[l.phone_number])
        .filter(t => t !== undefined) as number[]
      const avgRespTime = respTimes.length > 0
        ? Math.round(respTimes.reduce((a, b) => a + b, 0) / respTimes.length)
        : null

      // KANSHI Score promedio
      const scores = group.leads
        .map(l => l.matched_contact_id ? contactMap[l.matched_contact_id]?.kanshi_score : undefined)
        .filter((s): s is number => typeof s === 'number' && s > 0)
      const avgScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null

      // Engagement promedio
      const engScores = group.leads
        .map(l => l.matched_contact_id ? contactMap[l.matched_contact_id]?.engagement_score : undefined)
        .filter((s): s is number => typeof s === 'number')
      const avgEngagement = engScores.length > 0
        ? Math.round((engScores.reduce((a, b) => a + b, 0) / engScores.length) * 10) / 10
        : null

      // Distribución segmentos
      const segments: Record<string, number> = { frio: 0, templado: 0, caliente: 0, listo: 0, sin_datos: 0 }
      for (const lead of group.leads) {
        const contact = lead.matched_contact_id ? contactMap[lead.matched_contact_id] : null
        if (!contact || !contact.kanshi_segment) { segments.sin_datos++; continue }
        const seg = contact.kanshi_segment
        if (seg === 'listo') segments.listo++
        else if (seg === 'caliente') segments.caliente++
        else if (seg === 'templado') segments.templado++
        else segments.frio++
      }

      // Leads calificados (score >= 60)
      const qualifiedLeads = scores.filter(s => s >= 60).length

      // Quiz completados
      const quizCompleted = group.leads.filter(l => quizPhones.has(l.phone_number)).length
      const quizRate = n > 0 ? Math.round((quizCompleted / n) * 100) : 0

      // Dolor más frecuente
      const dolorTally: Record<string, number> = {}
      for (const lead of group.leads) {
        const contact = lead.matched_contact_id ? contactMap[lead.matched_contact_id] : null
        const dolor = contact?.dolor_declarado
        if (dolor && dolor.length > 2) {
          const key = dolor.slice(0, 50)
          dolorTally[key] = (dolorTally[key] || 0) + 1
        }
        // También revisar quiz
        const qr = quizMap[lead.phone_number]
        if (qr) {
          const qDolor = qr['dolor'] || qr['pain'] || qr['problema'] || qr['challenge']
          if (qDolor && qDolor.length > 2) {
            const key = qDolor.slice(0, 50)
            dolorTally[key] = (dolorTally[key] || 0) + 1
          }
        }
      }
      const topDolor = Object.entries(dolorTally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null

      // CPL (presupuesto distribuido proporcionalmente por leads)
      const cpl = adBudget && totalLeads > 0
        ? Math.round((adBudget / totalLeads) * n * 100) / 100
        : null

      // CPL Lead Calificado
      const cplQualified = cpl && qualifiedLeads > 0
        ? Math.round((cpl / qualifiedLeads) * 100) / 100
        : null

      // ── SEÑAL: ESCALAR / MANTENER / PAUSAR ──────────────────────────────
      // Lógica basada en tasa respuesta + score promedio
      let signal: 'ESCALAR' | 'MANTENER' | 'PAUSAR' = 'MANTENER'
      let signalReason = ''

      if (n < 3) {
        signal = 'MANTENER'
        signalReason = 'Pocos datos (<3 leads)'
      } else if (respRate >= 60 && (avgScore ?? 0) >= 55) {
        signal = 'ESCALAR'
        signalReason = `Resp ${respRate}% · Score ${avgScore}`
      } else if (respRate < 25 || (avgScore !== null && avgScore < 25)) {
        signal = 'PAUSAR'
        signalReason = `Resp ${respRate}% · Score ${avgScore ?? 'N/A'}`
      } else {
        signal = 'MANTENER'
        signalReason = `Resp ${respRate}% · Score ${avgScore ?? 'N/A'}`
      }

      return {
        utm_content: group.utm_content,
        utm_source: group.utm_source,
        utm_campaign: group.utm_campaign,
        total_leads: n,
        responded,
        resp_rate: respRate,
        avg_resp_time_mins: avgRespTime,
        avg_score: avgScore,
        avg_engagement: avgEngagement,
        qualified_leads: qualifiedLeads,
        quiz_completed: quizCompleted,
        quiz_rate: quizRate,
        segments,
        top_dolor: topDolor,
        cpl,
        cpl_qualified: cplQualified,
        signal,
        signal_reason: signalReason,
      }
    })

    // Ordenar por total_leads desc
    rows.sort((a, b) => b.total_leads - a.total_leads)

    return NextResponse.json({
      rows,
      total_leads: totalLeads,
      ad_budget: adBudget,
    })

  } catch (err) {
    console.error('[/api/traficker]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
