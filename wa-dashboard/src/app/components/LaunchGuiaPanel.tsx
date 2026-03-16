'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  CheckCircle, Circle, ChevronDown, ChevronRight,
  Rocket, Radio, Zap, BookOpen, ShoppingCart,
} from 'lucide-react'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type Urgency = 'alta' | 'media' | 'baja'

interface ChecklistItem {
  id: string
  title: string
  desc: string
  urgency: Urgency
  tag?: string   // e.g. 'DOC1', 'NEXO', 'META'
}

interface LaunchPhase {
  key: string
  label: string
  dateRange: string
  color: string
  icon: React.ReactNode
  items: ChecklistItem[]
}

// ─── CHECKLIST DATA ───────────────────────────────────────────────────────────

const PHASES: LaunchPhase[] = [
  {
    key: 'pre',
    label: 'Pre-captación',
    dateRange: 'Ahora',
    color: 'var(--accent)',
    icon: <Rocket size={14} />,
    items: [
      {
        id: 'pre-doc1',
        title: 'Templates WA aprobados en Meta',
        desc: 'Todos los templates en estado APROBADO, idioma es_EC, sin markdown.',
        urgency: 'alta',
        tag: 'DOC1',
      },
      {
        id: 'pre-doc2',
        title: 'Script de bienvenida configurado',
        desc: 'Mensaje inicial de Andreti personalizado con nombre y contexto del producto.',
        urgency: 'alta',
        tag: 'DOC2',
      },
      {
        id: 'pre-doc3',
        title: 'Flujo de quiz configurado',
        desc: '7 preguntas de perfilado activas, score calculando correctamente en Supabase.',
        urgency: 'alta',
        tag: 'DOC3',
      },
      {
        id: 'pre-doc4',
        title: 'Andreti entrenado con contexto SamurAI',
        desc: 'Prompt del agente incluye metodología, precio, objeciones frecuentes y tono.',
        urgency: 'alta',
        tag: 'DOC4',
      },
      {
        id: 'pre-doc5',
        title: 'Landing page publicada y con UTMs',
        desc: 'URL pública activa, pixel disparando, formulario enviando a Supabase.',
        urgency: 'alta',
        tag: 'DOC5',
      },
      {
        id: 'pre-doc6',
        title: 'Meta Pixel + CAPI configurado',
        desc: 'ViewContent y Lead llegando a Events Manager. Test Event Tool: verde.',
        urgency: 'alta',
        tag: 'DOC6',
      },
      {
        id: 'pre-doc7',
        title: 'Grupos WA creados y configurados',
        desc: 'Al menos 1 grupo activo, bot como admin, mensaje de bienvenida listo.',
        urgency: 'media',
        tag: 'DOC7',
      },
      {
        id: 'pre-nexo',
        title: 'Tests NEXO completados (flujo end-to-end)',
        desc: 'Lead entra → quiz → score → segmento → respuesta < 2 min. Verificado en staging.',
        urgency: 'alta',
        tag: 'NEXO',
      },
      {
        id: 'pre-utm',
        title: 'UTM tracking verificado end-to-end',
        desc: 'utm_source / utm_medium / utm_campaign llegan a wa_contacts en Supabase.',
        urgency: 'alta',
        tag: 'UTM',
      },
      {
        id: 'pre-rls',
        title: 'Supabase RLS y variables de entorno en Vercel',
        desc: 'Row Level Security activo en tablas sensibles. Env vars de producción verificadas.',
        urgency: 'media',
        tag: 'INFRA',
      },
      {
        id: 'pre-dashboard',
        title: 'Dashboard KANSHI verificado en producción',
        desc: 'Login funciona, datos cargan, sidebar v2 navega correctamente.',
        urgency: 'media',
        tag: 'KANSHI',
      },
    ],
  },
  {
    key: 'captacion',
    label: 'Captación',
    dateRange: '23 Mar',
    color: 'var(--cat-traffic)',
    icon: <Radio size={14} />,
    items: [
      {
        id: 'cap-meta',
        title: 'Primera campaña Meta Ads activa',
        desc: 'Ad Set con audiencia LAL o intereses. Budget diario asignado. A/B de creativos.',
        urgency: 'alta',
        tag: 'META',
      },
      {
        id: 'cap-nexo-speed',
        title: 'NEXO respondiendo en < 2 min',
        desc: 'Monitorear tiempo de respuesta del agente durante las primeras 24h.',
        urgency: 'alta',
        tag: 'NEXO',
      },
      {
        id: 'cap-grupos',
        title: 'Grupos WA monitoreados y activos',
        desc: 'Leads entrando a grupos. Bienvenida automática funcionando. Sin spam.',
        urgency: 'media',
        tag: 'GRUPOS',
      },
      {
        id: 'cap-score',
        title: 'Kanshi Score calculando en tiempo real',
        desc: 'Leads completando quiz → score en wa_contacts actualizado. Panel muestra datos.',
        urgency: 'alta',
        tag: 'SCORE',
      },
      {
        id: 'cap-alertas',
        title: 'Alertas de leads calientes configuradas',
        desc: 'Notificación cuando score ≥ 80 o segmento = "caliente".',
        urgency: 'media',
        tag: 'NEXO',
      },
      {
        id: 'cap-verificar',
        title: 'Verificar leads hoy > 0 en dashboard',
        desc: 'Panel Lanzamiento > Resumen muestra leads del día. Sparkline activo.',
        urgency: 'alta',
        tag: 'KANSHI',
      },
    ],
  },
  {
    key: 'lives',
    label: 'Lives',
    dateRange: '14–16 Abr',
    color: '#C084FC',
    icon: <Zap size={14} />,
    items: [
      {
        id: 'live-keywords',
        title: 'Keyword tracking activado en chats',
        desc: 'Palabras clave (PRECIO, QUIERO, LISTO, etc.) registran stage en Supabase.',
        urgency: 'alta',
        tag: 'NEXO',
      },
      {
        id: 'live-codigos',
        title: 'Códigos secretos de grupos configurados',
        desc: 'Cada live tiene su código. Andreti los reconoce y actualiza el stage del lead.',
        urgency: 'alta',
        tag: 'NEXO',
      },
      {
        id: 'live-broadcast',
        title: 'Broadcast de recordatorio programado',
        desc: 'Mensaje 1h antes del live. Template aprobado. Audiencia segmentada.',
        urgency: 'media',
        tag: 'WA',
      },
      {
        id: 'live-segmento',
        title: 'Segmento "caliente" listo para follow-up',
        desc: 'Leads con score ≥ 70 en lista separada. Andreti con prompt de cierre activo.',
        urgency: 'alta',
        tag: 'INTEL',
      },
      {
        id: 'live-capi',
        title: 'Evento ViewContent de live en CAPI',
        desc: 'Disparar evento de asistencia al live hacia Meta Events. Verificar recepción.',
        urgency: 'media',
        tag: 'META',
      },
    ],
  },
  {
    key: 'clases',
    label: 'Clases',
    dateRange: '20–22 Abr',
    color: 'var(--warning)',
    icon: <BookOpen size={14} />,
    items: [
      {
        id: 'clase-broadcast',
        title: 'Broadcasts de engagement enviados',
        desc: 'Secuencia de 3 mensajes: expectativa → valor → llamada a acción.',
        urgency: 'alta',
        tag: 'WA',
      },
      {
        id: 'clase-followup',
        title: 'Follow-up a leads sin actividad reciente',
        desc: 'Leads sin mensajes en 48h reciben reactivación. Andreti con nuevo contexto.',
        urgency: 'media',
        tag: 'NEXO',
      },
      {
        id: 'clase-pipeline',
        title: 'Pipeline actualizado: leads en "calentando"',
        desc: 'Stage actualizado manualmente o por keyword. Revisar en panel Pipeline.',
        urgency: 'media',
        tag: 'INTEL',
      },
      {
        id: 'clase-testimonios',
        title: 'Testimonios de alumnos recopilados',
        desc: 'Mínimo 3 testimonios con resultado cuantificable para la página de ventas.',
        urgency: 'media',
        tag: 'COPY',
      },
      {
        id: 'clase-urgencia',
        title: 'Mensaje de urgencia previa al carrito',
        desc: 'Broadcast 24h antes de apertura: "mañana abre el carrito". Template listo.',
        urgency: 'alta',
        tag: 'WA',
      },
    ],
  },
  {
    key: 'carrito',
    label: 'Carrito',
    dateRange: '23 Abr – 10 May',
    color: 'var(--success)',
    icon: <ShoppingCart size={14} />,
    items: [
      {
        id: 'cart-capi',
        title: 'CAPI Purchase activo en Meta',
        desc: 'Evento Purchase con value, currency, email hasheado llegando a Events Manager.',
        urgency: 'alta',
        tag: 'META',
      },
      {
        id: 'cart-hotmart',
        title: 'Hotmart webhook sincronizado',
        desc: 'Compra en Hotmart → evento en kanshi_sales → dashboard actualiza en tiempo real.',
        urgency: 'alta',
        tag: 'HOTMART',
      },
      {
        id: 'cart-tag',
        title: 'Tag compradores en WA activo',
        desc: 'Al comprar: stage → "comprador", Andreti cambia tono a onboarding.',
        urgency: 'alta',
        tag: 'NEXO',
      },
      {
        id: 'cart-postcopa',
        title: 'Secuencia post-compra configurada',
        desc: 'Bienvenida + acceso + expectativas. Template aprobado. Timing: < 5 min.',
        urgency: 'media',
        tag: 'WA',
      },
      {
        id: 'cart-dashboard',
        title: 'Dashboard ventas en tiempo real verificado',
        desc: 'Sala de Control mostrando ventas, revenue acumulado y velocidad por hora.',
        urgency: 'alta',
        tag: 'KANSHI',
      },
      {
        id: 'cart-cierre',
        title: 'Notificación de cierre de carrito programada',
        desc: 'Broadcast 2h antes del cierre. Urgencia máxima. Última oportunidad.',
        urgency: 'alta',
        tag: 'WA',
      },
    ],
  },
]

// ─── STORAGE KEY ─────────────────────────────────────────────────────────────

const storageKey = (id: string) => `kanshi_guide_${id}`

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function LaunchGuiaPanel() {
  const [checked, setChecked] = useState<Record<string, boolean>>({})
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  // Load from localStorage
  useEffect(() => {
    const state: Record<string, boolean> = {}
    PHASES.forEach(phase =>
      phase.items.forEach(item => {
        const val = localStorage.getItem(storageKey(item.id))
        if (val === 'true') state[item.id] = true
      })
    )
    setChecked(state)
  }, [])

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] }
      localStorage.setItem(storageKey(id), String(next[id]))
      return next
    })
  }

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Overall progress
  const totalItems    = PHASES.reduce((s, p) => s + p.items.length, 0)
  const totalChecked  = PHASES.reduce((s, p) => s + p.items.filter(i => checked[i.id]).length, 0)
  const overallPct    = Math.round((totalChecked / totalItems) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Overall progress ── */}
      <div className="k-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <div>
            <p className="k-section-title" style={{ marginBottom: '2px' }}>PROGRESO TOTAL DEL LANZAMIENTO</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {totalChecked} de {totalItems} ítems completados
            </p>
          </div>
          <span
            className="k-kpi-value"
            style={{
              color: overallPct >= 80 ? 'var(--success)' : overallPct >= 50 ? 'var(--warning)' : 'var(--accent)',
              fontSize: 'clamp(24px, 2vw, 32px)',
            }}
          >
            {overallPct}%
          </span>
        </div>
        <div className="k-progress">
          <div
            className="k-progress-fill"
            style={{
              width: `${overallPct}%`,
              background: overallPct >= 80
                ? 'var(--success)'
                : overallPct >= 50
                ? 'var(--warning)'
                : 'var(--accent)',
            }}
          />
        </div>
      </div>

      {/* ── Phases ── */}
      {PHASES.map(phase => {
        const phaseChecked = phase.items.filter(i => checked[i.id]).length
        const phasePct     = Math.round((phaseChecked / phase.items.length) * 100)
        const isCollapsed  = collapsed[phase.key]
        const isComplete   = phasePct === 100

        return (
          <div key={phase.key} className="k-card" style={{ overflow: 'hidden' }}>

            {/* Phase header */}
            <button
              onClick={() => toggleCollapse(phase.key)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                borderBottom: isCollapsed ? 'none' : '0.5px solid var(--border-subtle)',
              }}
            >
              {/* Phase icon */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: isComplete ? `${phase.color}20` : 'var(--bg-card-2)',
                border: `1px solid ${isComplete ? phase.color : 'var(--border-default)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isComplete ? phase.color : 'var(--text-muted)',
                flexShrink: 0,
              }}>
                {phase.icon}
              </div>

              {/* Phase info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: 'var(--text-base)',
                    fontWeight: 600,
                    color: isComplete ? phase.color : 'var(--text-primary)',
                  }}>
                    {phase.label}
                  </span>
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: 'var(--tracking-wide)',
                  }}>
                    {phase.dateRange}
                  </span>
                  {isComplete && (
                    <span className="k-badge k-badge-success">COMPLETO</span>
                  )}
                </div>
                {/* Mini progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                  <div style={{
                    flex: 1,
                    height: '3px',
                    background: 'var(--border-subtle)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${phasePct}%`,
                      background: isComplete ? phase.color : `${phase.color}99`,
                      borderRadius: '2px',
                      transition: 'width 600ms var(--ease-out)',
                    }} />
                  </div>
                  <span style={{
                    fontSize: '10px',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-mono)',
                    flexShrink: 0,
                  }}>
                    {phaseChecked}/{phase.items.length}
                  </span>
                </div>
              </div>

              {/* Chevron */}
              <span style={{ color: 'var(--text-disabled)', flexShrink: 0 }}>
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
              </span>
            </button>

            {/* Items */}
            {!isCollapsed && (
              <div style={{ padding: '8px' }}>
                {phase.items.map((item, idx) => {
                  const isDone = checked[item.id]

                  return (
                    <button
                      key={item.id}
                      onClick={() => toggle(item.id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        padding: '10px 8px',
                        borderRadius: 'var(--radius-md)',
                        background: isDone ? 'var(--bg-card-2)' : 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background var(--duration-fast) var(--ease-out)',
                        borderBottom: idx < phase.items.length - 1
                          ? '0.5px solid var(--border-subtle)'
                          : 'none',
                      }}
                    >
                      {/* Checkbox icon */}
                      <span style={{
                        flexShrink: 0,
                        marginTop: '1px',
                        color: isDone ? phase.color : 'var(--text-disabled)',
                        transition: 'color var(--duration-fast) var(--ease-out)',
                      }}>
                        {isDone
                          ? <CheckCircle size={16} />
                          : <Circle size={16} />
                        }
                      </span>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{
                            fontSize: 'var(--text-sm)',
                            fontWeight: 500,
                            color: isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                            textDecoration: isDone ? 'line-through' : 'none',
                            transition: 'all var(--duration-fast) var(--ease-out)',
                          }}>
                            {item.title}
                          </span>
                          {item.tag && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              background: 'var(--accent-subtle)',
                              color: 'var(--accent)',
                              fontFamily: 'var(--font-mono)',
                              letterSpacing: 'var(--tracking-wide)',
                            }}>
                              {item.tag}
                            </span>
                          )}
                          <UrgencyBadge urgency={item.urgency} done={isDone} />
                        </div>
                        <p style={{
                          fontSize: 'var(--text-xs)',
                          color: isDone ? 'var(--text-disabled)' : 'var(--text-muted)',
                          marginTop: '3px',
                          lineHeight: 'var(--leading-relaxed)',
                          transition: 'color var(--duration-fast) var(--ease-out)',
                        }}>
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── URGENCY BADGE ────────────────────────────────────────────────────────────

function UrgencyBadge({ urgency, done }: { urgency: Urgency; done: boolean }) {
  if (done) return null
  if (urgency === 'baja') return null

  const styles = {
    alta:  { bg: 'var(--danger-bg)',  color: 'var(--danger)',  label: 'URGENTE' },
    media: { bg: 'var(--warning-bg)', color: 'var(--warning)', label: 'PRONTO'  },
    baja:  { bg: 'var(--info-bg)',    color: 'var(--info)',    label: 'OK'       },
  }

  const s = styles[urgency]
  return (
    <span style={{
      fontSize: '10px',
      fontWeight: 600,
      padding: '1px 5px',
      borderRadius: '4px',
      background: s.bg,
      color: s.color,
      letterSpacing: 'var(--tracking-wide)',
      fontFamily: 'var(--font-mono)',
    }}>
      {s.label}
    </span>
  )
}
