'use client'

import { useEffect, useState, useMemo } from 'react'
import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { supabase } from '@/lib/supabase'
import { format } from 'date-fns'
import {
  Wifi, WifiOff, CheckCircle, XCircle, AlertTriangle,
  Clock, Users, TrendingUp, MessageSquare, Globe, Zap,
  Bot, FileText, RefreshCw,
} from 'lucide-react'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Project {
  id: string
  name: string
  status: string
  captation_start: string | null
  captation_end: string | null
  cart_open: string | null
  cart_close: string | null
  class_dates: string[] | null
  leads_goal: number | null
  sales_goal: number | null
  product_price: number | null
  emoji: string | null
}

interface Lead {
  created_at: string
  kanshi_score: number
  segmento: string
  agent_stage: string
}

interface KPI {
  uniqueContacts: number
  totalMessages: number
  inbound: number
  profilingComplete: number
}

interface RecentMsg {
  contact_name: string
  body: string
  created_at: string
  direction: string
}

interface ChartPoint {
  hour: string
  inbound: number
  outbound: number
}

interface KanshiAlert {
  id: string
  message: string
  severity: 'high' | 'medium' | 'low'
  created_at: string
  read_at: string | null
}

// ─── PROPS ────────────────────────────────────────────────────────────────────

interface LaunchResumenPanelProps {
  project: Project | null
  leads: Lead[]
  kpi: KPI | null
  recentMsgs: RecentMsg[]
  connected: boolean
  chartData: ChartPoint[]
  activeProjectId: string | null
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function daysDiff(a: Date, b: Date) {
  return Math.ceil((b.getTime() - a.getTime()) / 86400000)
}

function parseDate(d: string | null): Date | null {
  if (!d) return null
  const p = new Date(d)
  return isNaN(p.getTime()) ? null : p
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function LaunchResumenPanel({
  project,
  leads,
  kpi,
  recentMsgs,
  connected,
  chartData,
  activeProjectId,
}: LaunchResumenPanelProps) {
  const [alerts, setAlerts] = useState<KanshiAlert[]>([])
  const [loadingAlerts, setLoadingAlerts] = useState(false)
  const [now] = useState(new Date())

  // ── Fetch alerts ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeProjectId) return
    setLoadingAlerts(true)
    supabase
      .from('kanshi_alerts')
      .select('id, message, severity, created_at, read_at')
      .eq('project_id', activeProjectId)
      .is('read_at', null)
      .order('created_at', { ascending: false })
      .limit(8)
      .then(({ data }) => {
        setAlerts((data as KanshiAlert[]) || [])
        setLoadingAlerts(false)
      })
  }, [activeProjectId])

  // ── Countdown KPIs ────────────────────────────────────────────────────────
  const captStart  = parseDate(project?.captation_start ?? null)
  const captEnd    = parseDate(project?.captation_end ?? null)
  const cartOpen   = parseDate(project?.cart_open ?? null)
  const classDates = (project?.class_dates ?? [])
    .map(d => parseDate(d))
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())

  const diasCaptacion = captEnd ? Math.max(0, daysDiff(now, captEnd)) : null
  const diasCarrito   = cartOpen ? Math.max(0, daysDiff(now, cartOpen)) : null
  const diasLive      = classDates[0] ? Math.max(0, daysDiff(now, classDates[0])) : null

  const leadsHoy = useMemo(() => {
    const todayStr = now.toISOString().slice(0, 10)
    return leads.filter(l => l.created_at.slice(0, 10) === todayStr).length
  }, [leads, now])

  const scorePromedio = useMemo(() => {
    const withScore = leads.filter(l => l.kanshi_score > 0)
    if (withScore.length === 0) return 0
    return Math.round(withScore.reduce((s, l) => s + l.kanshi_score, 0) / withScore.length)
  }, [leads])

  // ── Fase del lanzamiento ──────────────────────────────────────────────────
  const phases = [
    {
      key: 'pre',
      label: 'Pre-captación',
      date: captStart,
      active: !captStart || now < captStart,
      done: !!(captStart && now >= captStart),
      color: 'var(--accent)',
    },
    {
      key: 'captacion',
      label: 'Captación',
      date: captStart,
      active: !!(captStart && captEnd && now >= captStart && now < captEnd),
      done: !!(captEnd && now >= captEnd),
      color: 'var(--accent)',
    },
    {
      key: 'lives',
      label: 'Lives',
      date: classDates[0] ?? null,
      active: !!(classDates[0] && now >= classDates[0] && (!cartOpen || now < cartOpen)),
      done: !!(classDates[0] && cartOpen && now >= cartOpen),
      color: '#C084FC',
    },
    {
      key: 'carrito',
      label: 'Carrito',
      date: cartOpen,
      active: !!(cartOpen && parseDate(project?.cart_close ?? null) && now >= cartOpen && now < (parseDate(project?.cart_close ?? null) as Date)),
      done: !!(parseDate(project?.cart_close ?? null) && now >= (parseDate(project?.cart_close ?? null) as Date)),
      color: 'var(--success)',
    },
    {
      key: 'cierre',
      label: 'Cierre',
      date: parseDate(project?.cart_close ?? null),
      active: false,
      done: !!(parseDate(project?.cart_close ?? null) && now >= (parseDate(project?.cart_close ?? null) as Date)),
      color: 'var(--warning)',
    },
  ]

  const currentPhaseIdx = phases.reduce((acc, p, i) => (p.active ? i : acc), 0)

  // ── Health checks ─────────────────────────────────────────────────────────
  const lastInboundMs = useMemo(() => {
    const inbound = recentMsgs.filter(m => m.direction === 'inbound')
    if (inbound.length === 0) return null
    return new Date(inbound[0].created_at).getTime()
  }, [recentMsgs])

  const nexoOk   = lastInboundMs ? (now.getTime() - lastInboundMs < 3600000 * 4) : false
  const leadsHoyOk = leadsHoy > 0

  const healthItems = [
    {
      label: 'WA Conexión',
      icon: connected ? <Wifi size={12} /> : <WifiOff size={12} />,
      ok: connected,
      detail: connected ? 'LIVE' : 'OFFLINE',
    },
    {
      label: 'Agente NEXO',
      icon: <Bot size={12} />,
      ok: nexoOk,
      detail: nexoOk ? 'ACTIVO' : 'SIN ACTIVIDAD',
    },
    {
      label: 'Leads hoy',
      icon: <Users size={12} />,
      ok: leadsHoyOk,
      detail: leadsHoyOk ? `${leadsHoy} nuevos` : 'Sin leads',
    },
    {
      label: 'Templates WA',
      icon: <FileText size={12} />,
      ok: true,
      detail: 'OK',
    },
    {
      label: 'Vercel Deploy',
      icon: <Globe size={12} />,
      ok: true,
      detail: 'ONLINE',
    },
  ]

  const healthScore = Math.round((healthItems.filter(h => h.ok).length / healthItems.length) * 100)

  // ── Mini sparkline — leads por hora ───────────────────────────────────────
  const sparkData = useMemo(() => {
    const todayStr = now.toISOString().slice(0, 10)
    const todayLeads = leads.filter(l => l.created_at.slice(0, 10) === todayStr)
    return Array.from({ length: 24 }, (_, h) => {
      const count = todayLeads.filter(l => new Date(l.created_at).getHours() === h).length
      return { h: `${h}h`, leads: count }
    })
  }, [leads, now])

  // ── Leads goal progress ───────────────────────────────────────────────────
  const leadsGoal    = project?.leads_goal ?? 0
  const leadsTotal   = kpi?.uniqueContacts ?? 0
  const leadsPct     = leadsGoal > 0 ? Math.min(100, Math.round((leadsTotal / leadsGoal) * 100)) : 0

  // ── Alert severity sort ───────────────────────────────────────────────────
  const sortedAlerts = useMemo(() => {
    const order = { high: 0, medium: 1, low: 2 }
    return [...alerts].sort((a, b) => order[a.severity] - order[b.severity])
  }, [alerts])

  // ─────────────────────────────────────────────────────────────────────────

  if (!project) {
    return (
      <div className="k-card p-8 text-center">
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          Selecciona un proyecto para ver el panel de lanzamiento.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── 1. KPI Countdown Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>

        <CountdownCard
          label="DÍAS CAPTACIÓN"
          value={diasCaptacion}
          suffix="días"
          fallback="—"
          accent="var(--accent)"
          detail={captEnd ? `Cierra ${format(captEnd, 'dd MMM')}` : 'Sin fecha'}
        />
        <CountdownCard
          label="DÍAS PARA CARRITO"
          value={diasCarrito}
          suffix="días"
          fallback="—"
          accent="var(--success)"
          detail={cartOpen ? `Abre ${format(cartOpen, 'dd MMM')}` : 'Sin fecha'}
        />
        <CountdownCard
          label="LEADS HOY"
          value={leadsHoy}
          suffix=""
          fallback="0"
          accent="var(--warning)"
          detail={`${leadsTotal.toLocaleString()} total`}
        />
        <CountdownCard
          label="SCORE PROMEDIO"
          value={scorePromedio}
          suffix=""
          fallback="0"
          accent={scorePromedio >= 70 ? 'var(--success)' : scorePromedio >= 40 ? 'var(--warning)' : 'var(--danger)'}
          detail={`${kpi?.profilingComplete ?? 0} perfilados`}
        />
      </div>

      {/* ── 2. Fase del lanzamiento ── */}
      <div className="k-card" style={{ padding: '16px' }}>
        <p className="k-section-title">FASE DEL LANZAMIENTO</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          {phases.map((phase, i) => {
            const isActive  = i === currentPhaseIdx
            const isDone    = phase.done && !isActive
            const isLast    = i === phases.length - 1

            return (
              <div key={phase.key} style={{ display: 'flex', alignItems: 'center', flex: isLast ? 'none' : 1 }}>
                {/* Node */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isActive
                        ? phase.color
                        : isDone
                        ? `${phase.color}30`
                        : 'var(--bg-card-2)',
                      border: `1.5px solid ${isActive ? phase.color : isDone ? phase.color : 'var(--border-default)'}`,
                      boxShadow: isActive ? `0 0 10px ${phase.color}60` : 'none',
                      transition: 'all var(--duration-normal) var(--ease-out)',
                    }}
                  >
                    {isDone
                      ? <CheckCircle size={12} style={{ color: phase.color }} />
                      : isActive
                      ? <Zap size={12} style={{ color: '#fff' }} />
                      : <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--border-default)' }} />
                    }
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontSize: 'var(--text-xs)',
                      fontWeight: isActive ? 700 : 400,
                      color: isActive ? phase.color : isDone ? 'var(--text-secondary)' : 'var(--text-muted)',
                      letterSpacing: 'var(--tracking-wide)',
                      whiteSpace: 'nowrap',
                    }}>
                      {phase.label}
                    </div>
                    {phase.date && (
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {format(phase.date, 'dd MMM')}
                      </div>
                    )}
                  </div>
                </div>
                {/* Connector */}
                {!isLast && (
                  <div style={{
                    flex: 1,
                    height: '1.5px',
                    background: isDone
                      ? `linear-gradient(90deg, ${phase.color}, ${phases[i + 1].color}40)`
                      : 'var(--border-subtle)',
                    margin: '0 4px',
                    marginBottom: '28px',
                  }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 3 + 4. Health score + Sala de Control ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* Health score */}
        <div className="k-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p className="k-section-title" style={{ marginBottom: 0 }}>HEALTH SCORE</p>
            <span
              className={`k-badge ${healthScore >= 80 ? 'k-badge-success' : healthScore >= 60 ? 'k-badge-warning' : 'k-badge-danger'}`}
            >
              {healthScore}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="k-progress" style={{ marginBottom: '14px' }}>
            <div
              className="k-progress-fill"
              style={{
                width: `${healthScore}%`,
                background: healthScore >= 80
                  ? 'var(--success)'
                  : healthScore >= 60
                  ? 'var(--warning)'
                  : 'var(--danger)',
              }}
            />
          </div>

          {/* Health items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {healthItems.map(item => (
              <div
                key={item.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-card-2)',
                }}
              >
                <span className={`k-dot ${item.ok ? 'k-dot-success' : 'k-dot-danger'}`} />
                <span style={{ color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                  {item.icon}
                </span>
                <span style={{ flex: 1, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  {item.label}
                </span>
                <span
                  style={{
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    letterSpacing: 'var(--tracking-wide)',
                    color: item.ok ? 'var(--success)' : 'var(--danger)',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {item.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Sala de control fusionada */}
        <div className="k-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p className="k-section-title" style={{ marginBottom: 0 }}>ALERTAS URGENTES</p>
            {loadingAlerts && <RefreshCw size={11} style={{ color: 'var(--text-muted)', animation: 'spin 1s linear infinite' }} />}
          </div>

          {sortedAlerts.length === 0 ? (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-card-2)',
            }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: 'var(--tracking-wide)' }}>
                SIN ALERTAS PENDIENTES ✓
              </span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, overflowY: 'auto', maxHeight: '120px' }}>
              {sortedAlerts.map(alert => (
                <div
                  key={alert.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: alert.severity === 'high'
                      ? 'var(--danger-bg)'
                      : alert.severity === 'medium'
                      ? 'var(--warning-bg)'
                      : 'var(--info-bg)',
                    borderLeft: `2px solid ${
                      alert.severity === 'high'
                        ? 'var(--danger)'
                        : alert.severity === 'medium'
                        ? 'var(--warning)'
                        : 'var(--info)'
                    }`,
                  }}
                >
                  <span style={{
                    fontSize: '11px',
                    flexShrink: 0,
                    marginTop: '1px',
                    color: alert.severity === 'high'
                      ? 'var(--danger)'
                      : alert.severity === 'medium'
                      ? 'var(--warning)'
                      : 'var(--info)',
                  }}>
                    {alert.severity === 'high' ? '🔴' : alert.severity === 'medium' ? '🟡' : '🔵'}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                      {alert.message}
                    </p>
                    <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {format(new Date(alert.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actividad reciente WA */}
          <div>
            <p className="k-section-title">ACTIVIDAD RECIENTE WA</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {recentMsgs.length === 0 ? (
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
                  Sin mensajes recientes
                </p>
              ) : (
                recentMsgs.slice(0, 3).map((m, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      className={`k-dot ${m.direction === 'inbound' ? 'k-dot-success' : 'k-dot-accent'}`}
                      style={{ flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {m.contact_name || 'Desconocido'}
                      </span>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                        {m.body.slice(0, 40)}{m.body.length > 40 ? '…' : ''}
                      </span>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                      {format(new Date(m.created_at), 'HH:mm')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Leads goal + Mini sparkline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>

        {/* Leads goal */}
        <div className="k-card" style={{ padding: '16px' }}>
          <p className="k-kpi-label">LEADS CAPTADOS</p>
          <p className="k-kpi-value" style={{ color: 'var(--accent)' }}>
            {leadsTotal.toLocaleString()}
          </p>
          {leadsGoal > 0 && (
            <>
              <p className="k-kpi-sub">
                Meta: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{leadsGoal.toLocaleString()}</span>
                <span style={{ marginLeft: '6px', color: leadsPct >= 100 ? 'var(--success)' : 'var(--text-muted)' }}>
                  ({leadsPct}%)
                </span>
              </p>
              <div className="k-progress">
                <div
                  className="k-progress-fill"
                  style={{
                    width: `${leadsPct}%`,
                    background: leadsPct >= 100
                      ? 'var(--success)'
                      : leadsPct >= 70
                      ? 'var(--accent)'
                      : 'var(--warning)',
                  }}
                />
              </div>
            </>
          )}
        </div>

        {/* Mini sparkline — leads por hora */}
        <div className="k-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <p className="k-section-title" style={{ marginBottom: 0 }}>LEADS POR HORA (HOY)</p>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              {leadsHoy} leads
            </span>
          </div>
          <ResponsiveContainer width="100%" height={40}>
            <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00A8F0" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00A8F0" stopOpacity={0}   />
                </linearGradient>
              </defs>
              <Area
                type="monotone"
                dataKey="leads"
                stroke="var(--accent)"
                strokeWidth={1.5}
                fill="url(#sparkGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}

// ─── COUNTDOWN CARD ───────────────────────────────────────────────────────────

function CountdownCard({
  label,
  value,
  suffix,
  fallback,
  accent,
  detail,
}: {
  label: string
  value: number | null
  suffix: string
  fallback: string
  accent: string
  detail: string
}) {
  const display = value === null
    ? fallback
    : value === 0
    ? 'HOY'
    : `${value}${suffix ? ` ${suffix}` : ''}`

  return (
    <div className="k-kpi">
      <p className="k-kpi-label">{label}</p>
      <p
        className="k-kpi-value"
        style={{ color: value === 0 ? 'var(--success)' : accent }}
      >
        {display}
      </p>
      <p className="k-kpi-sub">{detail}</p>
    </div>
  )
}
