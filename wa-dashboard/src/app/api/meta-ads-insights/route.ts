import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// ─── TIPOS ───────────────────────────────────────────────────────────────────

interface MetaCampaignInsight {
  campaign_id: string
  campaign_name: string
  spend: number
  impressions: number
  clicks: number
  reach: number
  leads: number
  cpm: number
  cpc: number
  ctr: number
  cost_per_lead: number
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function safeNum(v: string | undefined): number {
  const n = parseFloat(v || '0')
  return isNaN(n) ? 0 : n
}

function extractLeads(actions: Array<{ action_type: string; value: string }> | undefined): number {
  if (!actions) return 0
  const leadAction = actions.find(a =>
    ['lead', 'onsite_conversion.lead_grouped', 'omni_complete_registration'].includes(a.action_type)
  )
  return leadAction ? parseInt(leadAction.value || '0') : 0
}

function extractCPL(costPerAction: Array<{ action_type: string; value: string }> | undefined): number {
  if (!costPerAction) return 0
  const cpl = costPerAction.find(a =>
    ['lead', 'onsite_conversion.lead_grouped', 'omni_complete_registration'].includes(a.action_type)
  )
  return cpl ? safeNum(cpl.value) : 0
}

// ─── GET /api/meta-ads-insights ──────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const projectId = searchParams.get('project_id')
    const dateRange = searchParams.get('date_range') || 'last_30d'
    const forceRefresh = searchParams.get('refresh') === 'true'

    // ── 1. Buscar en caché (< 1 hora) ─────────────────────────────────────────
    if (!forceRefresh) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
      let cacheQuery = supabase
        .from('meta_ads_insights')
        .select('*')
        .eq('date_range', dateRange)
        .gte('fetched_at', oneHourAgo)
        .order('fetched_at', { ascending: false })
        .limit(1)

      if (projectId) cacheQuery = cacheQuery.eq('project_id', projectId)

      const { data: cached } = await cacheQuery
      if (cached && cached.length > 0) {
        return NextResponse.json({
          success: true,
          source: 'cache',
          fetched_at: cached[0].fetched_at,
          data: cached[0],
        })
      }
    }

    // ── 2. Leer credenciales Meta Ads ─────────────────────────────────────────
    const { data: credRow } = await supabase
      .from('kanshi_credentials')
      .select('credentials')
      .eq('type', 'meta_ads')
      .limit(1)
      .maybeSingle()

    if (!credRow) {
      return NextResponse.json({ error: 'Credenciales Meta Ads no configuradas' }, { status: 400 })
    }

    const { ad_account_id, marketing_api_token } = credRow.credentials

    if (!ad_account_id || !marketing_api_token) {
      return NextResponse.json({ error: 'ad_account_id o marketing_api_token faltantes' }, { status: 400 })
    }

    // Normalizar: remover "act_" si ya lo tiene para luego añadirlo
    const cleanAccountId = String(ad_account_id).replace(/^act_/, '')

    // ── 3. Fetch Meta Marketing API v19.0 ─────────────────────────────────────
    const fields = [
      'campaign_id',
      'campaign_name',
      'spend',
      'impressions',
      'clicks',
      'reach',
      'cpm',
      'cpc',
      'ctr',
      'actions',
      'cost_per_action_type',
    ].join(',')

    const metaUrl = new URL(`https://graph.facebook.com/v19.0/act_${cleanAccountId}/insights`)
    metaUrl.searchParams.set('fields', fields)
    metaUrl.searchParams.set('level', 'campaign')
    metaUrl.searchParams.set('date_preset', dateRange)
    metaUrl.searchParams.set('access_token', marketing_api_token)

    const metaRes = await fetch(metaUrl.toString())
    const metaJson = await metaRes.json()

    if (!metaRes.ok || metaJson.error) {
      console.error('[KANSHI Meta Ads] Error API:', metaJson.error)
      return NextResponse.json(
        { error: metaJson.error?.message || 'Error al consultar Meta Marketing API' },
        { status: 502 }
      )
    }

    const rawData: any[] = metaJson.data || []

    // ── 4. Procesar datos por campaña ─────────────────────────────────────────
    const campaigns: MetaCampaignInsight[] = rawData.map(row => ({
      campaign_id: row.campaign_id || '',
      campaign_name: row.campaign_name || '(sin nombre)',
      spend: safeNum(row.spend),
      impressions: parseInt(row.impressions || '0'),
      clicks: parseInt(row.clicks || '0'),
      reach: parseInt(row.reach || '0'),
      leads: extractLeads(row.actions),
      cpm: safeNum(row.cpm),
      cpc: safeNum(row.cpc),
      ctr: safeNum(row.ctr),
      cost_per_lead: extractCPL(row.cost_per_action_type),
    }))

    // ── 5. Totales agregados ──────────────────────────────────────────────────
    const totalSpend = campaigns.reduce((s, c) => s + c.spend, 0)
    const totalImpressions = campaigns.reduce((s, c) => s + c.impressions, 0)
    const totalClicks = campaigns.reduce((s, c) => s + c.clicks, 0)
    const totalReach = campaigns.reduce((s, c) => s + c.reach, 0)
    const totalLeads = campaigns.reduce((s, c) => s + c.leads, 0)
    const avgCPM = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
    const avgCPC = totalClicks > 0 ? totalSpend / totalClicks : 0
    const avgCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
    const costPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0

    // ── 6. Guardar / actualizar en caché Supabase ─────────────────────────────
    const insightRecord = {
      project_id: projectId || null,
      fetched_at: new Date().toISOString(),
      date_range: dateRange,
      date_start: metaJson.data?.[0]?.date_start || null,
      date_stop: metaJson.data?.[0]?.date_stop || null,
      total_spend: Math.round(totalSpend * 100) / 100,
      total_impressions: totalImpressions,
      total_clicks: totalClicks,
      total_reach: totalReach,
      total_leads: totalLeads,
      cpm: Math.round(avgCPM * 100) / 100,
      cpc: Math.round(avgCPC * 100) / 100,
      ctr: Math.round(avgCTR * 100) / 100,
      cost_per_lead: Math.round(costPerLead * 100) / 100,
      campaigns,
      raw_response: { paging: metaJson.paging },
    }

    // Delete old cache for this project+date_range before inserting fresh
    if (projectId) {
      await supabase
        .from('meta_ads_insights')
        .delete()
        .eq('project_id', projectId)
        .eq('date_range', dateRange)
    } else {
      await supabase
        .from('meta_ads_insights')
        .delete()
        .is('project_id', null)
        .eq('date_range', dateRange)
    }

    const { data: saved, error: saveErr } = await supabase
      .from('meta_ads_insights')
      .insert(insightRecord)
      .select()
      .single()

    if (saveErr) {
      console.error('[KANSHI Meta Ads] Error guardando caché:', saveErr)
    }

    return NextResponse.json({
      success: true,
      source: 'api',
      fetched_at: insightRecord.fetched_at,
      data: saved || insightRecord,
    })

  } catch (err) {
    console.error('[KANSHI Meta Ads] Error inesperado:', err)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
