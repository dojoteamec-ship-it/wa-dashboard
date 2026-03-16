'use client'

import { useState } from 'react'
import {
  Rocket, Brain, Radio, MessageSquare, Users,
  DollarSign, Settings, ChevronDown, ChevronRight,
  Bell, RefreshCw, Wifi, WifiOff, LogOut
} from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type CategoryKey = 'lanzamiento' | 'inteligencia' | 'trafico' | 'nexo' | 'grupos' | 'ventas' | 'sistema'

export type SubTabKey =
  | 'lanzamiento.resumen' | 'lanzamiento.timeline' | 'lanzamiento.guia'
  | 'inteligencia.leads' | 'inteligencia.pipeline' | 'inteligencia.score' | 'inteligencia.psicologia'
  | 'trafico.metaads' | 'trafico.fuentes' | 'trafico.landings'
  | 'nexo.agente' | 'nexo.campanias'
  | 'grupos.grupos'
  | 'ventas.hotmart' | 'ventas.revenue'
  | 'sistema.config' | 'sistema.reportes' | 'sistema.testing'

// ─── NAVIGATION STRUCTURE ────────────────────────────────────────────────────

interface SubItem {
  key: SubTabKey
  label: string
  badge?: string
  badgeType?: 'success' | 'warning' | 'danger' | 'info' | 'new'
}

interface Category {
  key: CategoryKey
  label: string
  icon: React.ReactNode
  color: string
  items: SubItem[]
}

const CATEGORIES: Category[] = [
  {
    key: 'lanzamiento',
    label: 'Lanzamiento',
    icon: <Rocket size={15} />,
    color: 'var(--cat-launch)',
    items: [
      { key: 'lanzamiento.resumen',  label: 'Resumen' },
      { key: 'lanzamiento.timeline', label: 'Timeline' },
      { key: 'lanzamiento.guia',     label: 'Guía', badge: '!', badgeType: 'info' },
    ],
  },
  {
    key: 'inteligencia',
    label: 'Inteligencia',
    icon: <Brain size={15} />,
    color: 'var(--cat-intel)',
    items: [
      { key: 'inteligencia.leads',       label: 'Leads' },
      { key: 'inteligencia.pipeline',    label: 'Pipeline' },
      { key: 'inteligencia.score',       label: 'Score' },
      { key: 'inteligencia.psicologia',  label: 'Psicología' },
    ],
  },
  {
    key: 'trafico',
    label: 'Tráfico',
    icon: <Radio size={15} />,
    color: 'var(--cat-traffic)',
    items: [
      { key: 'trafico.metaads',  label: 'Meta Ads' },
      { key: 'trafico.fuentes',  label: 'Fuentes' },
      { key: 'trafico.landings', label: 'Landings' },
    ],
  },
  {
    key: 'nexo',
    label: 'NEXO',
    icon: <MessageSquare size={15} />,
    color: 'var(--cat-nexo)',
    items: [
      { key: 'nexo.agente',    label: 'Agente' },
      { key: 'nexo.campanias', label: 'Campañas' },
    ],
  },
  {
    key: 'grupos',
    label: 'Grupos',
    icon: <Users size={15} />,
    color: 'var(--cat-groups)',
    items: [
      { key: 'grupos.grupos', label: 'Grupos WA' },
    ],
  },
  {
    key: 'ventas',
    label: 'Ventas',
    icon: <DollarSign size={15} />,
    color: 'var(--cat-sales)',
    items: [
      { key: 'ventas.hotmart', label: 'Hotmart' },
      { key: 'ventas.revenue', label: 'Revenue' },
    ],
  },
  {
    key: 'sistema',
    label: 'Sistema',
    icon: <Settings size={15} />,
    color: 'var(--cat-system)',
    items: [
      { key: 'sistema.config',   label: 'Config' },
      { key: 'sistema.reportes', label: 'Reportes', badge: 'NEW', badgeType: 'new' },
      { key: 'sistema.testing',  label: 'Testing',  badge: 'NEW', badgeType: 'new' },
    ],
  },
]

// ─── PROPS ───────────────────────────────────────────────────────────────────

interface SidebarProps {
  activeSubTab: SubTabKey
  onNavigate: (subTab: SubTabKey) => void
  projectName?: string
  projectStatus?: string
  daysToCaption?: number
  connected?: boolean
  unreadCount?: number
  onAlertsClick?: () => void
  onRefresh?: () => void
  onLogout?: () => void
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export function Sidebar({
  activeSubTab,
  onNavigate,
  projectName = 'SamurAI 2026',
  projectStatus = 'ACTIVO',
  daysToCaption = 7,
  connected = true,
  unreadCount = 0,
  onAlertsClick,
  onRefresh,
  onLogout,
}: SidebarProps) {
  const activeCategoryKey = activeSubTab.split('.')[0] as CategoryKey
  const [collapsed, setCollapsed] = useState<Set<CategoryKey>>(new Set())

  const toggleCollapse = (cat: CategoryKey) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const badgeStyle = (type: SubItem['badgeType']): React.CSSProperties => {
    const styles: Record<string, React.CSSProperties> = {
      success: { background: 'var(--success-bg)', color: 'var(--success)' },
      warning: { background: 'var(--warning-bg)', color: 'var(--warning)' },
      danger:  { background: 'var(--danger-bg)',  color: 'var(--danger)' },
      info:    { background: 'var(--info-bg)',     color: 'var(--info)' },
      new:     { background: 'var(--accent-subtle)', color: 'var(--accent)' },
    }
    return styles[type ?? 'info'] ?? styles.info
  }

  return (
    <aside
      style={{
        width: 'var(--sidebar-width)',
        minHeight: '100vh',
        background: 'var(--bg-surface)',
        borderRight: '0.5px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 40,
        overflowY: 'auto',
        scrollbarWidth: 'none',
      }}
    >
      {/* ── Logo ── */}
      <div
        style={{
          padding: '16px',
          borderBottom: '0.5px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #0014AD, #00A8F0)',
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 138.99 139" width={18} height={18}>
            <defs><linearGradient id="k-logo-g" y1="69.5" x2="138.99" y2="69.5" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#fff"/><stop offset="1" stopColor="rgba(255,255,255,0.7)"/></linearGradient></defs>
            <path fill="url(#k-logo-g)" d="M139,69.5a24.13,24.13,0,0,1-7.13,17.19L86.68,131.88A24.14,24.14,0,0,1,69.49,139H30l10.41-10.42,4.28-4.27,7.37-7.37L91.73,77.3a7.14,7.14,0,0,0,0-10.1l-.29-.29a7,7,0,0,0-1.61-1.21,7.18,7.18,0,0,0-8.49,1.21l-4,4h0l-11,11a20.21,20.21,0,0,1-28.59,0l-.29-.3a20.24,20.24,0,0,1,0-28.59L74.71,15.75,77.49,13l2.56-2.55H69.49a13.8,13.8,0,0,0-9.82,4.07L14.48,59.67a13.9,13.9,0,0,0,0,19.66l16,16a13.9,13.9,0,0,0-7.42,7.33l-16-16a24.34,24.34,0,0,1,0-34.38L52.3,7.12A24.14,24.14,0,0,1,69.49,0H109L94.26,14.69l-7.37,7.38L46.77,62.17a7.16,7.16,0,0,0,0,10.1l.3.3a7.16,7.16,0,0,0,10.1,0L72.9,56.84l0,0a20.19,20.19,0,0,1,27.74.8l.3.3a20.24,20.24,0,0,1,0,28.59L61.5,126,59,128.58H69.49a13.82,13.82,0,0,0,9.82-4.07L124.5,79.33a13.9,13.9,0,0,0,0-19.66l-16-16a13.88,13.88,0,0,0,7.32-7.42l16,16A24.13,24.13,0,0,1,139,69.5Z"/>
          </svg>
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '0.15em', fontFamily: 'monospace' }}>
            KANSHI
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--accent)', letterSpacing: 'var(--tracking-wide)' }}>
            OS · GPC
          </div>
        </div>
        <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
          {connected
            ? <Wifi size={12} style={{ color: 'var(--success)' }} />
            : <WifiOff size={12} style={{ color: 'var(--danger)' }} />
          }
        </div>
      </div>

      {/* ── Navegación ── */}
      <nav style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {CATEGORIES.map(cat => {
          const isActiveCategory = activeCategoryKey === cat.key
          const isCollapsed = collapsed.has(cat.key)

          return (
            <div key={cat.key}>
              {/* Category header */}
              <button
                onClick={() => {
                  toggleCollapse(cat.key)
                  if (!isActiveCategory) {
                    onNavigate(cat.items[0].key)
                  }
                }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 8px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  cursor: 'pointer',
                  background: isActiveCategory ? `${cat.color}14` : 'transparent',
                  color: isActiveCategory ? cat.color : 'var(--text-muted)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: isActiveCategory ? 600 : 400,
                  transition: `all var(--duration-fast) var(--ease-out)`,
                  textAlign: 'left',
                }}
              >
                <span style={{ color: isActiveCategory ? cat.color : 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
                  {cat.icon}
                </span>
                <span style={{ flex: 1 }}>{cat.label}</span>
                <span style={{ color: 'var(--text-disabled)', display: 'flex' }}>
                  {isCollapsed
                    ? <ChevronRight size={12} />
                    : <ChevronDown size={12} />
                  }
                </span>
              </button>

              {/* Sub-items */}
              {!isCollapsed && (
                <div style={{ paddingLeft: '12px', marginTop: '2px', display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  {cat.items.map(item => {
                    const isActive = activeSubTab === item.key
                    return (
                      <button
                        key={item.key}
                        onClick={() => onNavigate(item.key)}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '5px 8px',
                          borderRadius: 'var(--radius-sm)',
                          border: 'none',
                          cursor: 'pointer',
                          background: isActive ? 'var(--bg-card-2)' : 'transparent',
                          color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                          fontSize: 'var(--text-sm)',
                          fontWeight: isActive ? 500 : 400,
                          transition: `all var(--duration-fast) var(--ease-out)`,
                          textAlign: 'left',
                        }}
                      >
                        <div style={{ width: '2px', height: '12px', background: isActive ? cat.color : 'transparent', borderRadius: '1px', flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {item.badge && (
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 600,
                              padding: '1px 5px',
                              borderRadius: '4px',
                              ...badgeStyle(item.badgeType),
                            }}
                          >
                            {item.badge}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* ── Footer ── */}
      <div style={{ borderTop: '0.5px solid var(--border-subtle)', padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>

        {/* Proyecto activo */}
        <div
          style={{
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-md)',
            padding: '10px',
            border: '0.5px solid var(--border-default)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span className="k-dot k-dot-success k-dot-pulse" />
            <span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--success)', letterSpacing: 'var(--tracking-wider)', textTransform: 'uppercase' }}>
              {projectStatus}
            </span>
          </div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--text-primary)' }}>{projectName}</div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
            Captación en {daysToCaption} días
          </div>
        </div>

        {/* Actions row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ThemeToggle />
          <div style={{ flex: 1 }} />
          {unreadCount > 0 && (
            <button
              onClick={onAlertsClick}
              style={{
                position: 'relative',
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)',
              }}
            >
              <Bell size={14} />
              <span style={{
                position: 'absolute', top: '2px', right: '2px',
                width: '8px', height: '8px', borderRadius: '50%',
                background: 'var(--danger)', border: '1.5px solid var(--bg-surface)',
              }} />
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              title="Refresh"
              style={{
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)',
              }}
            >
              <RefreshCw size={13} />
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              title="Salir"
              style={{
                width: '28px', height: '28px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', borderRadius: 'var(--radius-sm)',
              }}
            >
              <LogOut size={13} />
            </button>
          )}
        </div>

      </div>
    </aside>
  )
}
