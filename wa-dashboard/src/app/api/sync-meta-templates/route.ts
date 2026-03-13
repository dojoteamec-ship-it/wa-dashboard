import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// SERVICE_ROLE para escritura sin RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const META_API_VERSION = 'v19.0'

// ─── Mapeo automático de categoría Meta → stage NEXO ─────────────────────────
// El usuario puede sobreescribir este mapeo desde la UI después del sync
function inferStage(templateName: string): string {
  const n = templateName.toLowerCase()
  if (n.includes('bienvenida') || n.includes('welcome'))   return 'registered'
  if (n.includes('grupo') || n.includes('group'))          return 'confirming'
  if (n.includes('encuesta') || n.includes('survey'))      return 'profiling'
  if (n.includes('live_hoy') || n.includes('live_today'))  return 'live_tracking'
  if (n.includes('quiz_live') || n.includes('postlive'))   return 'post_live'
  if (n.includes('clase') || n.includes('class'))          return 'classes'
  if (n.includes('vip'))                                   return 'vip'
  if (n.includes('cierre') || n.includes('closing'))       return 'closing'
  if (n.includes('feedback') || n.includes('post_sale'))   return 'post_sale'
  if (n.includes('reengagement') || n.includes('reactivar')) return 'warming'
  return 'registered' // fallback
}

// ─── Extraer body text del template Meta ─────────────────────────────────────
// Los componentes de Meta tienen estructura: [{ type: 'BODY', text: '...' }, ...]
function extractBodyText(components: MetaComponent[]): string {
  const body = components?.find(c => c.type === 'BODY')
  return body?.text || ''
}

interface MetaComponent {
  type: string
  text?: string
  format?: string
  buttons?: unknown[]
  example?: unknown
}

interface MetaTemplate {
  id: string
  name: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED' | 'PAUSED' | 'DISABLED'
  language: string
  category: string
  components: MetaComponent[]
}

interface MetaAPIResponse {
  data: MetaTemplate[]
  paging?: {
    cursors?: { after?: string; before?: string }
    next?: string
  }
  error?: { message: string; code: number }
}

// ─── POST /api/sync-meta-templates ───────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { project_id } = await req.json()

    if (!project_id) {
      return NextResponse.json({ error: 'project_id requerido' }, { status: 400 })
    }

    // 1. Obtener credenciales del proyecto
    const { data: cred, error: credError } = await supabase
      .from('kanshi_credentials')
      .select('credentials')
      .eq('project_id', project_id)
      .eq('is_active', true)
      .maybeSingle()

    if (credError || !cred) {
      return NextResponse.json(
        { error: 'No se encontraron credenciales activas para este proyecto' },
        { status: 404 }
      )
    }

    const { waba_id, access_token } = cred.credentials as {
      waba_id?: string
      access_token?: string
    }

    if (!waba_id || !access_token) {
      return NextResponse.json(
        { error: 'Credenciales incompletas: se requieren waba_id y access_token' },
        { status: 400 }
      )
    }

    // 2. Obtener templates de Meta (paginado, hasta 250 templates)
    const allTemplates: MetaTemplate[] = []
    let url: string | null =
      `https://graph.facebook.com/${META_API_VERSION}/${waba_id}/message_templates` +
      `?limit=250&access_token=${access_token}` +
      `&fields=id,name,status,language,category,components`

    let pages = 0
    while (url && pages < 5) {
      const res = await fetch(url)
      const data: MetaAPIResponse = await res.json()

      if (data.error) {
        return NextResponse.json(
          { error: `Meta API error: ${data.error.message}` },
          { status: 400 }
        )
      }

      allTemplates.push(...(data.data || []))
      url = data.paging?.next || null
      pages++
    }

    if (allTemplates.length === 0) {
      return NextResponse.json({
        synced: 0,
        updated: 0,
        message: 'No se encontraron templates en esta cuenta de Meta'
      })
    }

    // 3. Upsert en sam_templates
    // Estrategia: usar meta_template_name como clave de unicidad por proyecto
    let synced = 0
    let updated = 0
    const errors: string[] = []

    for (const mt of allTemplates) {
      const bodyText = extractBodyText(mt.components)

      // Verificar si ya existe en sam_templates para este proyecto
      const { data: existing } = await supabase
        .from('sam_templates')
        .select('id, stage, scenario, content')
        .eq('project_id', project_id)
        .eq('meta_template_name', mt.name)
        .eq('language', mt.language)
        .maybeSingle()

      const approved = mt.status === 'APPROVED'

      if (existing) {
        // Actualizar solo status y body — NO sobreescribir stage/scenario si ya fue configurado
        const { error: upErr } = await supabase
          .from('sam_templates')
          .update({
            meta_template_approved: approved,
            is_active: approved,
            // Actualizar content si el body cambió en Meta
            content: bodyText || existing.content,
          })
          .eq('id', existing.id)

        if (upErr) errors.push(`${mt.name}: ${upErr.message}`)
        else updated++
      } else {
        // Crear nuevo registro con stage inferido automáticamente
        const { error: insErr } = await supabase
          .from('sam_templates')
          .insert({
            project_id,
            name: mt.name,
            stage: inferStage(mt.name),
            scenario: 'system_initiated',
            content: bodyText,
            meta_template_name: mt.name,
            meta_template_approved: approved,
            language: mt.language,
            is_active: approved,
          })

        if (insErr) errors.push(`${mt.name}: ${insErr.message}`)
        else synced++
      }
    }

    return NextResponse.json({
      synced,
      updated,
      total: allTemplates.length,
      errors: errors.length > 0 ? errors : undefined,
      message: `${synced} nuevos · ${updated} actualizados de ${allTemplates.length} templates encontrados en Meta`
    })

  } catch (err) {
    console.error('[sync-meta-templates]', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

// ─── GET /api/sync-meta-templates?project_id= ────────────────────────────────
// Retorna los templates ya sincronizados en sam_templates
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const project_id = searchParams.get('project_id')

  if (!project_id) {
    return NextResponse.json({ error: 'project_id requerido' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('sam_templates')
    .select('*')
    .eq('project_id', project_id)
    .order('stage')
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ templates: data || [] })
}

// ─── PATCH /api/sync-meta-templates ──────────────────────────────────────────
// Actualiza el stage/scenario de un template (desde la UI)
export async function PATCH(req: NextRequest) {
  try {
    const { id, stage, scenario, trigger_condition, is_active } = await req.json()

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    const updatePayload: Record<string, unknown> = {}
    if (stage !== undefined)             updatePayload.stage = stage
    if (scenario !== undefined)          updatePayload.scenario = scenario
    if (trigger_condition !== undefined) updatePayload.trigger_condition = trigger_condition
    if (is_active !== undefined)         updatePayload.is_active = is_active

    const { error } = await supabase
      .from('sam_templates')
      .update(updatePayload)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
