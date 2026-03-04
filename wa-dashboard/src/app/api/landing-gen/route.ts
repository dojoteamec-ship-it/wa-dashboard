import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

export async function POST(req: NextRequest) {
  try {
    const { contact_id, project_id, force_regenerate = false } = await req.json()

    if (!contact_id || !project_id) {
      return NextResponse.json({ error: 'contact_id y project_id requeridos' }, { status: 400 })
    }

    // ── 1. Verificar si ya existe landing activa (no regenerar si ya hay una)
    if (!force_regenerate) {
      const { data: existing } = await supabase
        .from('landing_pages')
        .select('id, token, status')
        .eq('contact_id', contact_id)
        .eq('project_id', project_id)
        .in('status', ['draft', 'active'])
        .maybeSingle()

      if (existing) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wa-dashboard-five.vercel.app'
        return NextResponse.json({
          success: true,
          landing_id: existing.id,
          token: existing.token,
          url: `${baseUrl}/l/${existing.token}`,
          status: existing.status,
          cached: true,
        })
      }
    }

    // ── 2. Cargar datos del lead
    const { data: contact, error: contactError } = await supabase
      .from('wa_contacts')
      .select(`
        id, name, phone_number, kanshi_score, kanshi_segment,
        dolor_declarado, dolor_profundo, sueno_declarado,
        situacion_actual, objecion_probable, objecion_financiera,
        estilo_decision, nivel_compromiso, urgencia_financiera,
        resumen_perfil, agent_stage
      `)
      .eq('id', contact_id)
      .single()

    if (contactError || !contact) {
      return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })
    }

    // ── 3. Cargar proyecto + hormozi_config
    const { data: project, error: projectError } = await supabase
      .from('kanshi_projects')
      .select('id, name, product_name, hormozi_config, logo_url, cart_close, color')
      .eq('id', project_id)
      .single()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    const config = project.hormozi_config || {}

    // ── 4. Cargar quiz responses del lead
    const { data: quizResponses } = await supabase
      .from('lead_quiz_responses')
      .select('quiz_type, responses, submitted_at')
      .eq('contact_id', contact_id)
      .order('submitted_at', { ascending: false })
      .limit(5)

    // ── 5. Cargar últimos mensajes SAM (contexto conversacional)
    const { data: messages } = await supabase
      .from('wa_messages')
      .select('body, direction, created_at')
      .eq('phone_number', contact.phone_number)
      .order('created_at', { ascending: false })
      .limit(20)

    const samHistory = (messages || [])
      .reverse()
      .map((m: any) => `${m.direction === 'inbound' ? contact.name : 'SAM'}: ${m.body}`)
      .join('\n')

    // ── 6. Construir prompt para Claude
    const productName = project.product_name || project.name
    const authorName = config.letter_author_name || 'el fundador'
    const authorTitle = config.letter_author_title || `Fundador de ${productName}`
    const dreamOutcome = config.dream_outcome || `lograr resultados extraordinarios con ${productName}`
    const timeDelay = config.time_delay || '90 días'
    const effortSacrifice = config.effort_sacrifice || 'sin necesitar experiencia previa'
    const guaranteeDays = config.guarantee_days || 30
    const guaranteeText = config.guarantee_text || `Si no ves resultados en ${guaranteeDays} días, devuelvo el 100%`
    const urgencyReason = config.urgency_reason || 'Cupos limitados'
    const methodology = config.methodology_name || productName

    const plansJson = JSON.stringify(config.plans || [], null, 2)
    const offerStackJson = JSON.stringify(config.offer_stack || [], null, 2)
    const testimonialsJson = JSON.stringify(config.testimonials || [], null, 2)
    const quizJson = JSON.stringify(quizResponses || [], null, 2)

    const systemPrompt = `Eres un copywriter de clase mundial especializado en ofertas irresistibles al estilo de Alex Hormozi.
Tu trabajo es generar el copy de una landing page de ventas ultra-personalizada basada en el perfil psicológico real del lead.

REGLAS CRÍTICAS:
1. SIEMPRE usa el nombre real del lead en el copy
2. Referencia SU dolor específico declarado, no uno genérico
3. Conecta SU sueño declarado con el dream outcome del producto
4. La carta del autor debe sentirse íntima y personal, como si ${authorName} escribiera solo para esta persona
5. Los FAQs deben responder las objeciones ESPECÍFICAS del perfil del lead
6. Devuelve SOLO JSON válido, sin backticks, sin comentarios, sin texto fuera del JSON

ESTRUCTURA JSON ESPERADA:
{
  "headline": "string — headline principal ultra personalizado, máx 12 palabras, con nombre del lead",
  "subheadline": "string — subheadline que conecta su situación actual con el dream outcome, máx 20 palabras",
  "body_dolor": "string — 2-3 párrafos hablando de SU dolor específico, empatía profunda, usa sus palabras exactas si están disponibles",
  "body_solucion": "string — 2-3 párrafos presentando ${methodology} como la solución directa a ESE dolor",
  "carta_autor": "string — carta personal de ${authorName} de 150-200 palabras, tono íntimo, toca los sueños y aspiraciones del lead, le dice que está más cerca de lo que cree, firma: ${authorName} · ${authorTitle}",
  "pain_point": "string — el dolor principal identificado en máx 15 palabras",
  "dream_state": "string — el sueño principal identificado en máx 15 palabras",
  "lead_objecion": "string — la objeción más probable identificada en máx 10 palabras",
  "recommended_plan_id": "string — el id del plan más adecuado para este lead basado en su perfil (plan_a o plan_b)",
  "faq": [
    {"q": "string — pregunta basada en objeción real del lead", "a": "string — respuesta que elimina esa objeción"},
    {"q": "string", "a": "string"},
    {"q": "string", "a": "string"},
    {"q": "string", "a": "string"}
  ]
}`

    const userPrompt = `Genera el copy de landing page para este lead:

DATOS DEL LEAD:
- Nombre: ${contact.name}
- KANSHI Score: ${contact.kanshi_score || 'N/A'} / 100
- Segmento: ${contact.kanshi_segment || 'N/A'}
- Situación actual: ${contact.situacion_actual || 'No disponible'}
- Dolor declarado: ${contact.dolor_declarado || 'No disponible'}
- Dolor profundo: ${contact.dolor_profundo || 'No disponible'}
- Sueño declarado: ${contact.sueno_declarado || 'No disponible'}
- Objeción probable: ${contact.objecion_probable || 'No disponible'}
- Objeción financiera: ${contact.objecion_financiera || 'No disponible'}
- Estilo de decisión: ${contact.estilo_decision || 'No disponible'}
- Nivel de compromiso: ${contact.nivel_compromiso || 'No disponible'}
- Urgencia financiera: ${contact.urgencia_financiera || 'No disponible'}
- Resumen de perfil: ${contact.resumen_perfil || 'No disponible'}

RESPUESTAS DEL QUIZ:
${quizJson}

HISTORIAL CONVERSACIÓN CON SAM (últimos mensajes):
${samHistory || 'Sin historial disponible'}

DATOS DEL PRODUCTO — ${productName}:
- Dream Outcome: ${dreamOutcome}
- Time Delay: ${timeDelay}
- Effort & Sacrifice: ${effortSacrifice}
- Metodología: ${methodology}
- Urgencia: ${urgencyReason}
- Garantía: ${guaranteeText}

PLANES DISPONIBLES:
${plansJson}

OFFER STACK (lo que se llevan):
${offerStackJson}

TESTIMONIOS:
${testimonialsJson}

Genera el copy JSON ahora. Recuerda: hyper-personalizado, solo para ${contact.name}, referenciando SU situación real.`

    // ── 7. Llamar Open AI
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 4000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
    })

    const rawText = response.choices[0].message.content || ''

    // ── 8. Parsear JSON de Claude
    let generated: any
    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      generated = JSON.parse(clean)
    } catch {
      console.error('Claude parse error:', rawText.slice(0, 200))
      return NextResponse.json({ error: 'Error parseando respuesta de Claude', raw: rawText.slice(0, 500) }, { status: 500 })
    }

    // ── 9. Guardar en landing_pages
    const { data: landing, error: insertError } = await supabase
      .from('landing_pages')
      .insert({
        project_id,
        contact_id,
        status: 'draft',
        headline: generated.headline,
        subheadline: generated.subheadline,
        body_dolor: generated.body_dolor,
        body_solucion: generated.body_solucion,
        carta_autor: generated.carta_autor,
        faq: generated.faq || [],
        pain_point: generated.pain_point,
        dream_state: generated.dream_state,
        lead_objecion: generated.lead_objecion,
        plans: config.plans || [],
        recommended_plan_id: generated.recommended_plan_id || 'plan_a',
        generated_at: new Date().toISOString(),
      })
      .select('id, token')
      .single()

    if (insertError || !landing) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Error guardando landing' }, { status: 500 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wa-dashboard-five.vercel.app'
    const landingUrl = `${baseUrl}/l/${landing.token}`

    return NextResponse.json({
      success: true,
      landing_id: landing.id,
      token: landing.token,
      url: landingUrl,
      status: 'draft',
      cached: false,
      preview: {
        headline: generated.headline,
        pain_point: generated.pain_point,
        dream_state: generated.dream_state,
        recommended_plan: generated.recommended_plan_id,
      }
    })

  } catch (err: any) {
    console.error('landing-gen error:', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
