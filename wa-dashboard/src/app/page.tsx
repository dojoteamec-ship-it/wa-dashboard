'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'
import {
  MessageSquare, Users, Send, CheckCheck, TrendingUp, Zap,
  RefreshCw, Wifi, WifiOff, X, ChevronRight, Brain, AlertCircle,
  Heart, Flame, Snowflake, Thermometer, Activity, Star, User,
  Plus, ChevronLeft, Calendar, Clock, Filter, Eye, Rocket, Lock, EyeOff,
  Pause, Square, CheckCircle, Info, Search, DollarSign, Target, BookOpen,
  LayoutDashboard, GitBranch, Radio, Settings, Bell, LogOut, Upload,
  BarChart2, Sliders, TrendingDown, ArrowUp, Minus
} from 'lucide-react'
import { format } from 'date-fns'
import GruposTab from '@/app/components/GruposTab'
import { Sidebar as SidebarV2, SubTabKey } from '@/app/components/Sidebar'
import { LaunchResumenPanel } from '@/app/components/LaunchResumenPanel'
import { LaunchGuiaPanel } from '@/app/components/LaunchGuiaPanel'
import { TestingPanel } from '@/app/components/TestingPanel'

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Lead {
  id: string; phone_number: string; name: string; agent_stage: string
  engagement_score: number; segmento: string; situacion_actual: string
  dolor_declarado: string; dolor_profundo: string; sueno_declarado: string
  nivel_compromiso: string; urgencia_financiera: string; estilo_decision: string
  objecion_probable: string; resumen_perfil: string; preguntas_respondidas: number
  created_at: string; updated_at: string
  kanshi_score: number; kanshi_segment: string
  landing_pages?: Array<{ token: string; status: string }> | null
}
interface Template {
  id: string; name: string; display_name: string; language: string
  body_text: string; status: string; category: string
}
interface Campaign {
  id: string; name: string; status: string; sent_count: number
  delivered_count: number; read_count: number; reply_count: number
  scheduled_at: string; template_name: string; total_contacts: number
}
interface KPI {
  totalMessages: number; inbound: number; outbound: number
  uniqueContacts: number; totalSent: number; totalDelivered: number
  totalRead: number; deliveryRate: number; readRate: number; replyRate: number
  avgEngagement: number; profilingComplete: number; profilingRate: number
}
interface ChartPoint { hour: string; inbound: number; outbound: number }
interface RecentMsg { contact_name: string; body: string; created_at: string; direction: string }
interface Toast { id: string; type: 'success'|'error'|'warning'|'info'; message: string }

interface HormoziPlan {
  id: string
  name: string
  badge: string | null
  price_anchor: number
  price_real: number
  billing: string
  cta_text: string
  cta_url: string
  highlight: boolean
  features: string[]
}

interface OfferStackItem {
  name: string
  value: number
}

interface Testimonial {
  name: string
  text: string
  result: string
}

interface HormoziConfig {
  dream_outcome?: string
  time_delay?: string
  effort_sacrifice?: string
  methodology_name?: string
  guarantee_days?: number
  guarantee_text?: string
  urgency_reason?: string
  letter_author_name?: string
  letter_author_title?: string
  plans?: HormoziPlan[]
  offer_stack?: OfferStackItem[]
  testimonials?: Testimonial[]
}

interface Project {
  id: string
  name: string
  product_name: string | null
  product_price: number | null
  status: string
  captation_start: string | null
  captation_end: string | null
  cart_open: string | null
  cart_close: string | null
  class_dates: string[] | null
  sales_goal: number | null
  leads_goal: number | null
  ad_budget: number | null
  agent_context: string | null
  color: string | null
  emoji: string | null
  credential_id: string | null
  logo_url: string | null
  hormozi_config: HormoziConfig | null
}

// ─── STAGE & HELPERS ─────────────────────────────────────────────────────────

const STAGES = [
  { key: 'nuevo',           label: 'Nuevo',           color: '#4A4A6A' },
  { key: 'descubrimiento',  label: 'Descubrimiento',  color: '#4A4A6A' },
  { key: 'perfilando_1',    label: 'Perfilando P1',   color: '#00b0f6' },
  { key: 'perfilando_2',    label: 'Perfilando P2',   color: '#00b0f6' },
  { key: 'perfilando_3',    label: 'Perfilando P3',   color: '#00b0f6' },
  { key: 'perfil_completo', label: 'Perfil Completo', color: '#0014ad' },
  { key: 'calentando',      label: 'Calentando',      color: '#FFB800' },
  { key: 'lives',           label: 'En Lives',        color: '#00FF94' },
  { key: 'clases',          label: 'En Clases',       color: '#00FF94' },
  { key: 'VIP',             label: 'VIP',             color: '#C084FC' },
  { key: 'comprador',       label: 'Comprador',       color: '#00FF94' },
]
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

const segColor  = (s: string) => s==='caliente'?'#FF6B35':s==='templado'?'#FFB800':'#00b0f6'
const urgColor  = (u: string) => u==='alta'?'#FF6B35':u==='media'?'#FFB800':'#4A4A6A'
const comColor  = (c: string) => c==='alto'?'#00FF94':c==='medio'?'#FFB800':'#4A4A6A'
const scoreColor= (n: number) => n>=8?'#00FF94':n>=5?'#FFB800':'#FF6B35'
const segIcon   = (s: string) => s==='caliente'
  ? <Flame size={10} className="text-[var(--danger)]"/>
  : s==='templado' ? <Thermometer size={10} className="text-[var(--warning)]"/>
  : <Snowflake size={10} style={{color:'var(--accent)'}}/>

const statusColor = (s: string) =>
  s==='completed'?'text-[var(--success)]':s==='running'?'text-[var(--accent)]':s==='scheduled'?'text-[var(--warning)]':s==='paused'?'text-[var(--warning)]':'text-[var(--text-muted)]'
const statusLabel = (s: string) =>
  ({completed:'COMPLETADA',running:'EN CURSO',scheduled:'PROGRAMADA',draft:'BORRADOR',paused:'PAUSADA',cancelled:'CANCELADA'}[s]||s.toUpperCase())

const PAGE_SIZE = 50

// ─── KANSHI LOGO ──────────────────────────────────────────────────────────────

function KanshiLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 138.99 139" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="kanshi-grad" y1="69.5" x2="138.99" y2="69.5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0014ac"/><stop offset="1" stopColor="#0099d3"/>
        </linearGradient>
      </defs>
      <g>
        <path fill="url(#kanshi-grad)" d="M139,69.5a24.13,24.13,0,0,1-7.13,17.19L86.68,131.88A24.14,24.14,0,0,1,69.49,139H30l10.41-10.42,4.28-4.27,7.37-7.37L91.73,77.3a7.14,7.14,0,0,0,0-10.1l-.29-.29a7,7,0,0,0-1.61-1.21,7.18,7.18,0,0,0-8.49,1.21l-4,4h0l-11,11a20.21,20.21,0,0,1-28.59,0l-.29-.3a20.24,20.24,0,0,1,0-28.59L74.71,15.75,77.49,13l2.56-2.55H69.49a13.8,13.8,0,0,0-9.82,4.07L14.48,59.67a13.9,13.9,0,0,0,0,19.66l16,16a13.9,13.9,0,0,0-7.42,7.33l-16-16a24.34,24.34,0,0,1,0-34.38L52.3,7.12A24.14,24.14,0,0,1,69.49,0H109L94.26,14.69l-7.37,7.38L46.77,62.17a7.16,7.16,0,0,0,0,10.1l.3.3a7.16,7.16,0,0,0,10.1,0L72.9,56.84l0,0a20.19,20.19,0,0,1,27.74.8l.3.3a20.24,20.24,0,0,1,0,28.59L61.5,126,59,128.58H69.49a13.82,13.82,0,0,0,9.82-4.07L124.5,79.33a13.9,13.9,0,0,0,0-19.66l-16-16a13.88,13.88,0,0,0,7.32-7.42l16,16A24.13,24.13,0,0,1,139,69.5Z"/>
        <path fill="#0d1c9f" d="M103.08,20.18a10.53,10.53,0,0,0-2.93.41,10.67,10.67,0,0,0-4.64,2.68c-.07.05-.12.12-.19.18a10.86,10.86,0,0,0-2.62,4.43A10.63,10.63,0,0,0,92.23,31a10.85,10.85,0,0,0,10.85,10.85,10.58,10.58,0,0,0,3.15-.47,10.87,10.87,0,0,0,7.3-7.44,10.55,10.55,0,0,0,.41-2.94A10.87,10.87,0,0,0,103.08,20.18Zm0,14.47A3.62,3.62,0,1,1,106.7,31,3.61,3.61,0,0,1,103.08,34.65Z"/>
        <path fill="#0d1c9f" d="M35.79,97.26a10.69,10.69,0,0,0-3,.41A10.85,10.85,0,0,0,25.4,105a10.5,10.5,0,0,0-.47,3.13,10.86,10.86,0,0,0,14,10.4,10.7,10.7,0,0,0,4.16-2.37l.73-.73a10.94,10.94,0,0,0,2.83-7.3A10.86,10.86,0,0,0,35.79,97.26Zm0,14.47a3.62,3.62,0,1,1,3.61-3.63A3.64,3.64,0,0,1,35.79,111.73Z"/>
      </g>
    </svg>
  )
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────

type TabType = 'overview' | 'pipeline' | 'psico' | 'campaigns' | 'fuentes' | 'ventas' | 'traficker' | 'sala' | 'grupos' | 'config'

const SIDEBAR_ITEMS: {
  key: TabType
  label: string
  icon: React.ReactNode
}[] = [
  { key: 'overview',   label: 'Overview',  icon: <LayoutDashboard size={16}/> },
  { key: 'psico',      label: 'Leads',     icon: <Users size={16}/> },
  { key: 'pipeline',   label: 'Pipeline',  icon: <GitBranch size={16}/> },
  { key: 'ventas',     label: 'Ventas',    icon: <DollarSign size={16}/> },
  { key: 'fuentes',    label: 'Fuentes',   icon: <Radio size={16}/> },
  { key: 'campaigns',  label: 'Campañas',  icon: <Send size={16}/> },
  { key: 'traficker',  label: 'Traficker', icon: <BarChart2 size={16}/> },
  { key: 'sala',       label: 'Sala Control', icon: <Zap size={16}/> },
  { key: 'grupos',     label: 'Grupos',       icon: <MessageSquare size={16}/> },
]

const STATUS_COLOR = (s: string) =>
  s === 'active' ? 'var(--success)' : s === 'planning' ? 'var(--warning)' : 'var(--text-muted)'
const STATUS_LABEL = (s: string) =>
  s === 'active' ? 'ACTIVO' : s === 'planning' ? 'PLANIF.' : 'CERRADO'

function Sidebar({
  activeTab,
  onTabChange,
  activeProject,
  connected,
  onLogout,
  onRefresh,
  lastUpdate,
  unreadCount,
  onAlertsClick,
}: {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  activeProject: Project | null
  connected: boolean
  onLogout: () => void
  onRefresh: () => void
  lastUpdate: Date
  unreadCount: number
  onAlertsClick: () => void
}) {
  return (
    <aside
      className="flex flex-col flex-shrink-0 h-screen sticky top-0 z-40"
      style={{
        width: '220px',
        background: 'var(--bg-base)',
        borderRight: '1px solid var(--border-default)',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid var(--border-default)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,var(--primary),#00a7e3)' }}
        >
          <KanshiLogo size={22} />
        </div>
        <div>
          <p className="font-bold text-white tracking-[0.18em] text-[13px]" style={{ fontFamily: 'monospace' }}>
            KANSHI
          </p>
          <p className="mono text-xs tracking-widest" style={{ color: 'var(--accent)' }}>
            OS · GPC
          </p>
        </div>
      </div>

      {/* ── Navegación principal ── */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {SIDEBAR_ITEMS.map(item => {
          const isActive = activeTab === item.key
          return (
            <button
              key={item.key}
              onClick={() => onTabChange(item.key)}
              className="w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-left"
              style={{
                padding: '10px 14px',
                background: isActive ? '#1a1a2e' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                }
              }}
            >
              <span
                style={{
                  color: isActive ? 'var(--accent)' : 'currentColor',
                  flexShrink: 0,
                  transition: 'color 0.15s',
                }}
              >
                {item.icon}
              </span>
              <span
                className="font-medium"
                style={{
                  fontSize: '15px',
                  letterSpacing: '0.01em',
                  lineHeight: 1,
                }}
              >
                {item.label}
              </span>
            </button>
          )
        })}

        {/* ── Separador ── */}
        <div className="my-3" style={{ height: '1px', background: 'var(--border-default)' }} />

        {/* Config */}
        {(['config'] as const).map(key => {
          const isActive = activeTab === key
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className="w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-left"
              style={{
                padding: '10px 14px',
                background: isActive ? '#1a1a2e' : 'transparent',
                borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
                }
              }}
            >
              <span style={{ color: isActive ? 'var(--accent)' : 'currentColor', flexShrink: 0 }}>
                <Settings size={16} />
              </span>
              <span className="font-medium" style={{ fontSize: '15px' }}>Config</span>
            </button>
          )
        })}

        {/* Alertas — Día 14 ✅ */}
        <button
          onClick={onAlertsClick}
          className="w-full flex items-center gap-3 rounded-xl transition-all duration-150 text-left relative"
          style={{ padding: '10px 14px', background: 'transparent', borderLeft: '2px solid transparent', color: 'var(--text-muted)' }}
          onMouseEnter={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'var(--bg-card)'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            ;(e.currentTarget as HTMLElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'
          }}
        >
          <span style={{ color: 'currentColor', flexShrink: 0 }}>
            <Bell size={16} />
          </span>
          <span className="font-medium" style={{ fontSize: '15px' }}>Alertas</span>
          {unreadCount > 0 && (
            <span
              className="ml-auto mono font-bold"
              style={{
                fontSize: '9px',
                color: 'var(--bg-base)',
                background: 'var(--danger)',
                borderRadius: '999px',
                padding: '1px 6px',
                minWidth: '18px',
                textAlign: 'center',
                animation: 'pulse 2s infinite',
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </nav>

      {/* ── Footer: proyecto activo ── */}
      <div style={{ borderTop: '1px solid var(--border-default)' }}>
        {activeProject ? (
          <div className="px-4 py-4">
            <p className="mono tracking-widest mb-2" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              PROYECTO ACTIVO
            </p>
            <div className="flex items-center gap-2.5">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0"
                style={{
                  background: `${STATUS_COLOR(activeProject.status)}18`,
                  border: `1px solid ${STATUS_COLOR(activeProject.status)}30`,
                }}
              >
                {activeProject.emoji || '🚀'}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="font-semibold truncate"
                  style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.2 }}
                >
                  {activeProject.name}
                </p>
                <span
                  className="mono inline-block mt-0.5"
                  style={{
                    fontSize: '9px',
                    color: STATUS_COLOR(activeProject.status),
                    letterSpacing: '0.08em',
                  }}
                >
                  ● {STATUS_LABEL(activeProject.status)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4">
            <p className="mono tracking-widest mb-1" style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
              SIN PROYECTO
            </p>
            <p style={{ fontSize: '12px', color: '#2E2E4E' }}>Selecciona uno arriba</p>
          </div>
        )}

        {/* ── Controles sistema ── */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-default)' }}
        >
          {/* Status live */}
          <div className="flex items-center gap-1.5">
            {connected ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent)' }} />
                <span className="mono" style={{ fontSize: '10px', color: 'var(--accent)' }}>LIVE</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--text-muted)' }} />
                <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>OFFLINE</span>
              </>
            )}
          </div>
          {/* Acciones */}
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border-default)' }}
              title="Actualizar datos"
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            >
              <RefreshCw size={11} style={{ color: 'var(--text-muted)' }} />
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg transition-colors"
              style={{ border: '1px solid var(--border-default)' }}
              title="Cerrar sesión"
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--danger)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-default)')}
            >
              <LogOut size={11} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        <p className="mono text-center pb-3" style={{ fontSize: '9px', color: '#2E2E4E' }}>
          {format(lastUpdate, 'HH:mm:ss')}
        </p>
      </div>
    </aside>
  )
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────

const KANSHI_PASSWORD = 'Kanshiteam2026*-*dojo'
const AUTH_KEY = 'kanshi_auth'

function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState(false)
  const [shaking, setShaking] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === KANSHI_PASSWORD) {
      localStorage.setItem(AUTH_KEY, 'true'); onAuth()
    } else {
      setError(true); setShaking(true)
      setTimeout(() => setShaking(false), 600)
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#090c4c' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, var(--accent) 0%, transparent 70%)' }}/>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, var(--primary) 0%, transparent 70%)' }}/>
      </div>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(var(--accent) 1px, transparent 1px), linear-gradient(90deg, var(--accent) 1px, transparent 1px)', backgroundSize: '40px 40px' }}/>
      <div className={`relative z-10 w-full max-w-sm mx-4 rounded-2xl border p-8 transition-all ${shaking ? 'animate-bounce' : ''}`}
        style={{ background: 'rgba(9,12,76,0.8)', backdropFilter: 'blur(24px)', borderColor: error ? 'var(--danger)' : 'rgba(0,176,246,0.3)', boxShadow: error ? '0 0 40px rgba(255,107,53,0.2)' : '0 0 60px rgba(0,176,246,0.15)' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 p-4 rounded-2xl" style={{ background: 'rgba(0,176,246,0.1)', border: '1px solid rgba(0,176,246,0.2)' }}><KanshiLogo size={56} /></div>
          <h1 className="text-2xl font-bold tracking-[0.2em] text-white mb-1" style={{ fontFamily: 'monospace' }}>KANSHI</h1>
          <p className="mono text-xs tracking-widest" style={{ color: 'var(--accent)' }}>MONITORING SYSTEM · GPC</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mono text-xs tracking-widest block mb-2" style={{ color: 'var(--accent)' }}>ACCESO</label>
            <div className="relative">
              <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}/>
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña del equipo" autoFocus
                className="w-full rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
                style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${error ? 'var(--danger)' : 'rgba(0,176,246,0.3)'}` }}/>
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: showPwd ? 'var(--accent)' : 'var(--text-muted)' }}>
                {showPwd ? <Eye size={13}/> : <EyeOff size={13}/>}
              </button>
            </div>
            {error && <p className="mono text-xs text-[var(--danger)] mt-2 tracking-widest">✕ ACCESO DENEGADO</p>}
          </div>
          <button type="submit" disabled={!password}
            className="w-full rounded-xl py-3 font-bold mono text-[12px] tracking-widest text-white transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', boxShadow: '0 4px 20px rgba(0,176,246,0.3)' }}>
            INGRESAR AL SISTEMA
          </button>
        </form>
        <p className="mono text-xs text-center mt-6 tracking-widest" style={{ color: '#2E3E6E' }}>SANTIAGO JIMÉNEZ · GROWTH PARTNER · 2026</p>
      </div>
    </div>
  )
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────────────────────

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return <>{text.slice(0, idx)}<span style={{color:'var(--accent)',fontWeight:'bold'}}>{text.slice(idx, idx+query.length)}</span>{text.slice(idx+query.length)}</>
}

function GlobalSearch({ leads, onSelect }: { leads: Lead[]; onSelect: (lead: Lead) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    if (!query.trim() || query.length < 2) return []
    const q = query.toLowerCase()
    return leads.filter(l =>
      (l.name||'').toLowerCase().includes(q) || l.phone_number.includes(q) ||
      (l.segmento||'').toLowerCase().includes(q) || (l.situacion_actual||'').toLowerCase().includes(q) ||
      (l.dolor_declarado||'').toLowerCase().includes(q)
    ).slice(0, 8)
  }, [query, leads])

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); setOpen(true) }
      if (e.key === 'Escape') { setOpen(false); setQuery(''); inputRef.current?.blur() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-default)] hover:border-[#2E2E4E] transition-colors" style={{background:'var(--bg-card)',width:'220px'}}>
        <Search size={12} className="text-[var(--text-muted)] flex-shrink-0"/>
        <input ref={inputRef} value={query} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
          placeholder="Buscar lead... ⌘K" className="flex-1 bg-transparent text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"/>
        {query && <button onClick={()=>{setQuery('');setOpen(false)}} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"><X size={10}/></button>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-[320px] rounded-xl border border-[var(--border-default)] overflow-hidden z-[200]"
          style={{background:'#0D0D14',boxShadow:'0 16px 48px rgba(0,0,0,0.6)'}}>
          <div className="px-4 py-2 border-b border-[var(--border-default)]">
            <span className="mono text-xs text-[var(--text-muted)] tracking-widest">{results.length} RESULTADO{results.length>1?'S':''}</span>
          </div>
          <div className="divide-y divide-[var(--border-default)]">
            {results.map((lead,i) => (
              <button key={i} onClick={()=>{onSelect(lead);setOpen(false);setQuery('')}}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[var(--border-default)] transition-colors text-left">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:`${segColor(lead.segmento)}20`}}>
                  <User size={11} style={{color:segColor(lead.segmento)}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[var(--text-primary)] truncate">{highlightMatch(lead.name||lead.phone_number,query)}</p>
                  <p className="mono text-xs text-[var(--text-muted)] truncate">{lead.phone_number}</p>
                </div>
                <div className="flex-shrink-0"><StagePill stage={lead.agent_stage}/></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PROJECT TIMELINE ─────────────────────────────────────────────────────────

function ProjectTimeline({ project }: { project: Project }) {
  const today = new Date(); today.setHours(0,0,0,0)
  const parseDate = (d: string|null): Date|null => { if(!d) return null; const p=new Date(d); return isNaN(p.getTime())?null:p }
  const daysDiff = (a: Date, b: Date) => Math.round((b.getTime()-a.getTime())/86400000)

  const captStart = parseDate(project.captation_start)
  const captEnd   = parseDate(project.captation_end)
  const cartOpen  = parseDate(project.cart_open)
  const cartClose = parseDate(project.cart_close)
  const classDates: Date[] = (project.class_dates??[]).map((d:string)=>parseDate(d)).filter((d):d is Date=>d!==null).sort((a,b)=>a.getTime()-b.getTime())

  const allDates = [captStart,captEnd,...classDates,cartOpen,cartClose].filter((d):d is Date=>d!==null)
  if (allDates.length===0) return (
    <div className="rounded-2xl border border-[var(--border-default)] p-5" style={{background:'var(--bg-card)'}}>
      <div className="flex items-center gap-3">
        <Calendar size={14} style={{color:'var(--text-muted)'}}/>
        <p className="mono text-xs text-[var(--text-muted)] tracking-widest">{project.name} — Sin fechas configuradas. Edita el proyecto para agregar el calendario.</p>
      </div>
    </div>
  )

  const minDate = new Date(Math.min(...allDates.map(d=>d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d=>d.getTime())))
  const totalSpan = Math.max(daysDiff(minDate,maxDate),1)
  const pct = (d:Date|null) => d===null?-1:Math.min(100,Math.max(0,(daysDiff(minDate,d)/totalSpan)*100))
  const todayPct = Math.min(100,Math.max(0,(daysDiff(minDate,today)/totalSpan)*100))

  const getPhase = () => {
    if (cartClose&&today>cartClose) return {label:'LANZAMIENTO CERRADO',color:'var(--text-muted)'}
    if (cartOpen&&today>=cartOpen)  return {label:'CARRITO ABIERTO',color:'var(--success)'}
    if (classDates.length>0&&today>=classDates[0]) return {label:'EN LIVES/CLASES',color:'var(--warning)'}
    if (captEnd&&today>captEnd)    return {label:'CAPTACIÓN TERMINADA',color:'var(--danger)'}
    if (captStart&&today>=captStart) return {label:'EN CAPTACIÓN',color:'var(--accent)'}
    return {label:'PRE-LANZAMIENTO',color:'var(--text-muted)'}
  }
  const phase = getPhase()

  const nextMilestone = (() => {
    const up = [
      captStart&&today<captStart?{label:'Inicio captación',date:captStart}:null,
      captEnd&&today<captEnd?{label:'Fin captación',date:captEnd}:null,
      classDates[0]&&today<classDates[0]?{label:'Primer live',date:classDates[0]}:null,
      cartOpen&&today<cartOpen?{label:'Carrito abre',date:cartOpen}:null,
      cartClose&&today<cartClose?{label:'Carrito cierra',date:cartClose}:null,
    ].filter(Boolean) as {label:string;date:Date}[]
    return up.length?up.sort((a,b)=>a.date.getTime()-b.date.getTime())[0]:null
  })()

  const fmtDate = (d:Date) => d.toLocaleDateString('es-EC',{day:'2-digit',month:'short'}).toUpperCase()

  const milestones = [
    captStart ?{label:'INICIO CAPTACIÓN',date:captStart, color:'var(--accent)'}:null,
    captEnd   ?{label:'FIN CAPTACIÓN',   date:captEnd,   color:'var(--warning)'}:null,
    ...classDates.map((d,i)=>({label:i===0?'PRIMER LIVE':`LIVE ${i+1}`,date:d,color:'#C084FC'})),
    cartOpen  ?{label:'CARRITO ABRE',    date:cartOpen,  color:'var(--success)'}:null,
    cartClose ?{label:'CARRITO CIERRA',  date:cartClose, color:'var(--danger)'}:null,
  ].filter(Boolean) as {label:string;date:Date;color:string}[]

  return (
    <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden" style={{background:'var(--bg-card)'}}>
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{background:`${project.color||'var(--accent)'}20`,border:`1px solid ${project.color||'var(--accent)'}30`}}>
            {project.emoji||'🚀'}
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-sm">{project.name}</p>
            {project.product_name && (
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">
                {project.product_name}{project.product_price?` · $${project.product_price.toLocaleString()}`:''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="mono text-xs px-3 py-1.5 rounded-full font-bold tracking-widest"
            style={{color:phase.color,background:`${phase.color}18`,border:`1px solid ${phase.color}30`}}>
            {phase.label}
          </span>
          {nextMilestone && (
            <span className="mono text-xs text-[var(--text-muted)] tracking-widest">
              <span style={{color:'var(--accent)'}}>{daysDiff(today,nextMilestone.date)}</span> días para {nextMilestone.label.toLowerCase()}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pt-5 pb-6">
        <div className="relative h-1.5 rounded-full mb-8" style={{background:'var(--border-default)'}}>
          <div className="absolute h-full rounded-full" style={{width:`${todayPct}%`,background:'linear-gradient(90deg,var(--primary),var(--accent))'}}/>
          {todayPct>=0&&todayPct<=100&&(
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{left:`${todayPct}%`}}>
              <div className="w-3 h-3 rounded-full border-2 border-[var(--accent)] z-10" style={{background:'var(--bg-base)',boxShadow:'0 0 8px var(--accent)'}}/>
              <span className="mono text-[8px] text-[var(--accent)] mt-6 whitespace-nowrap tracking-widest">HOY</span>
            </div>
          )}
          {milestones.map((m,i)=>{
            const p=pct(m.date); if(p<0) return null
            const isPast=m.date<=today
            return (
              <div key={i} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group" style={{left:`${p}%`}}>
                <div className="w-3 h-3 rounded-full border-2 z-10 transition-all"
                  style={{borderColor:isPast?'#2A2A4A':m.color,background:isPast?'var(--border-default)':m.color,boxShadow:isPast?'none':`0 0 6px ${m.color}80`}}/>
                <div className="absolute bottom-6 bg-[#0D0D14] border border-[var(--border-default)] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap"
                  style={{boxShadow:'0 4px 16px rgba(0,0,0,0.6)'}}>
                  <p className="mono text-xs font-bold tracking-widest" style={{color:m.color}}>{m.label}</p>
                  <p className="mono text-xs text-[var(--text-muted)]">{fmtDate(m.date)}</p>
                </div>
              </div>
            )
          })}
        </div>

        <div className="relative">
          {milestones.map((m,i)=>{
            const p=pct(m.date); if(p<0) return null
            const isPast=m.date<=today; const daysTo=daysDiff(today,m.date)
            return (
              <div key={i} className="absolute flex flex-col items-center" style={{left:`${p}%`, transform: p > 85 ? 'translateX(-100%)' : p < 15 ? 'translateX(0%)' : 'translateX(-50%)'}}>
                <span className="mono text-xs font-bold tracking-widest" style={{color:isPast?'#2A2A4A':m.color}}>{fmtDate(m.date)}</span>
                <span className="mono text-[8px] mt-0.5" style={{color:'var(--text-muted)'}}>
                  {isPast?`hace ${Math.abs(daysTo)}d`:daysTo===0?'HOY':`en ${daysTo}d`}
                </span>
              </div>
            )
          })}
        </div>
        <div className="h-8"/>

        <div className="flex gap-4 flex-wrap mt-2">
          {captStart&&captEnd&&(
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{background:'var(--accent)'}}/>
              <span className="mono text-xs text-[var(--text-muted)] tracking-widest">
                CAPTACIÓN · {fmtDate(captStart)} → {fmtDate(captEnd)}<span style={{color:'var(--accent)'}}> ({daysDiff(captStart,captEnd)}d)</span>
              </span>
            </div>
          )}
          {classDates.length>0&&(
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{background:'#C084FC'}}/>
              <span className="mono text-xs text-[var(--text-muted)] tracking-widest">LIVES · {classDates.length} clase{classDates.length>1?'s':''}</span>
            </div>
          )}
          {cartOpen&&cartClose&&(
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{background:'var(--success)'}}/>
              <span className="mono text-xs text-[var(--text-muted)] tracking-widest">
                CARRITO · {fmtDate(cartOpen)} → {fmtDate(cartClose)}<span style={{color:'var(--success)'}}> ({daysDiff(cartOpen,cartClose)}d)</span>
              </span>
            </div>
          )}
          {project.sales_goal&&(
            <div className="flex items-center gap-1.5">
              <DollarSign size={9} style={{color:'var(--warning)'}}/>
              <span className="mono text-xs text-[var(--text-muted)] tracking-widest">
                META · <span style={{color:'var(--warning)'}}>{project.sales_goal} ventas</span>
                {project.product_price?` · $${(project.sales_goal*project.product_price).toLocaleString()}`:''}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ─── PROJECT SELECTOR ─────────────────────────────────────────────────────────

function ProjectSelector({ projects, activeProjectId, onChange, onNewProject, onActivate }: {
  projects: Project[]; activeProjectId: string|null
  onChange: (id: string|null) => void; onNewProject: () => void; onActivate: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const activeProject = projects.find(p => p.id === activeProjectId)
  const psc = (s: string) => s==='active'?'var(--success)':s==='planning'?'var(--warning)':'var(--text-muted)'
  const psl = (s: string) => s==='active'?'ACTIVO':s==='planning'?'PLANIF.':'CERRADO'

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-default)] hover:border-[#2E2E4E] transition-colors"
        style={{background:'var(--bg-card)',minWidth:'180px',maxWidth:'220px'}}>
        <Rocket size={11} style={{color: activeProject ? psc(activeProject.status) : 'var(--text-muted)', flexShrink:0}}/>
        <span className="mono text-[11px] flex-1 text-left truncate" style={{color:activeProject?'var(--text-primary)':'var(--text-muted)'}}>
          {activeProject?activeProject.name:'SIN PROYECTO'}
        </span>
        {activeProject&&(
          <span className="mono text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{color:psc(activeProject.status),background:`${psc(activeProject.status)}15`}}>
            {psl(activeProject.status)}
          </span>
        )}
        <ChevronRight size={10} className="text-[var(--text-muted)] flex-shrink-0 transition-transform" style={{transform:open?'rotate(90deg)':'rotate(0deg)'}}/>
      </button>

      {open&&(
        <div className="absolute top-[calc(100%+8px)] left-0 w-[280px] rounded-xl border border-[var(--border-default)] overflow-hidden z-[200]"
          style={{background:'#0D0D14',boxShadow:'0 16px 48px rgba(0,0,0,0.6)'}}>
          <div className="px-4 py-2 border-b border-[var(--border-default)]">
            <span className="mono text-xs text-[var(--text-muted)] tracking-widest">PROYECTOS DISPONIBLES</span>
          </div>
          {projects.length===0?(
            <div className="px-4 py-5 text-center">
              <Rocket size={16} className="text-[#2A2A3A] mx-auto mb-2"/>
              <p className="mono text-xs text-[var(--text-muted)] mb-1">Sin proyectos creados</p>
            </div>
          ):(
            <div className="py-1">
              <button onClick={()=>{onChange(null);setOpen(false)}}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--border-default)] transition-colors text-left">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center border border-[var(--border-default)]"><Star size={10} className="text-[var(--text-muted)]"/></div>
                <span className="mono text-xs text-[var(--text-muted)] flex-1">TODOS LOS DATOS</span>
                {activeProjectId===null&&<CheckCircle size={10} style={{color:'var(--accent)'}}/>}
              </button>
              {projects.map(p=>(
                <button key={p.id} onClick={()=>{onChange(p.id);setOpen(false)}}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[var(--border-default)] transition-colors text-left">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:`${psc(p.status)}20`}}>
                    <Rocket size={10} style={{color:psc(p.status)}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="mono text-[11px] text-[var(--text-primary)] truncate">{p.name}</p>
                    {p.product_name&&<p className="mono text-xs text-[var(--text-muted)] truncate">{p.product_name}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="mono text-[8px] px-1.5 py-0.5 rounded-full" style={{color:psc(p.status),background:`${psc(p.status)}15`}}>{psl(p.status)}</span>
                    {p.id===activeProjectId&&<CheckCircle size={9} style={{color:'var(--accent)'}}/>}
                    {p.status==='planning'&&(
                      <button onClick={e=>{e.stopPropagation();onActivate(p.id);setOpen(false)}}
                        className="mono text-[8px] px-2 py-0.5 rounded-full font-bold hover:opacity-80 transition-opacity"
                        style={{background:'var(--success)20',color:'var(--success)',border:'1px solid var(--success)40'}}>
                        ACTIVAR
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-[var(--border-default)] p-2">
            <button onClick={()=>{setOpen(false);onNewProject()}}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:opacity-90 transition-all"
              style={{background:'linear-gradient(135deg,var(--primary),#00a7e3)'}}>
              <Plus size={11} className="text-white"/>
              <span className="mono text-xs text-white font-bold tracking-widest">NUEVO PROYECTO</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── PROJECT METRICS ─────────────────────────────────────────────────────────

function MetricBar({ label, current, goal, color, prefix='', suffix='' }: {
  label: string; current: number; goal: number; color: string; prefix?: string; suffix?: string
}) {
  const pct = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0
  const over = goal > 0 && current >= goal
  const barColor = over ? 'var(--success)' : color
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="mono text-xs tracking-widest text-[var(--text-muted)]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] font-bold" style={{color: barColor}}>
            {prefix}{current.toLocaleString()}{suffix}
          </span>
          <span className="mono text-xs text-[var(--text-muted)]">/ {prefix}{goal.toLocaleString()}{suffix}</span>
          <span className="mono text-xs px-1.5 py-0.5 rounded-full"
            style={{background:`${barColor}18`, color: barColor}}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{background:'var(--border-default)'}}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{width:`${pct}%`, background: over ? 'var(--success)' : `linear-gradient(90deg,${color}80,${color})`}}/>
      </div>
    </div>
  )
}

function ProjectMetrics({ project, leadsCount }: { project: Project; leadsCount: number }) {
  const hasMetas = (project.leads_goal??0) > 0 || (project.sales_goal??0) > 0
  if (!hasMetas) return null

  const projectColor = project.color || 'var(--accent)'
  const salesGoal    = project.sales_goal ?? 0
  const leadsGoal    = project.leads_goal ?? 0
  const price        = project.product_price ?? 0
  const adBudget     = project.ad_budget ?? 0
  const revenueGoal  = salesGoal * price
  const currentSales = 0
  const currentRevenue = currentSales * price
  const cpl = leadsCount > 0 && adBudget > 0
    ? (adBudget / leadsCount).toFixed(2)
    : null

  let diasRestantes: number | null = null
  let diasLabel = ''
  if (project.captation_end) {
    const today = new Date(); today.setHours(0,0,0,0)
    const end   = new Date(project.captation_end); end.setHours(0,0,0,0)
    const diff  = Math.ceil((end.getTime() - today.getTime()) / 86400000)
    diasRestantes = diff
    diasLabel = diff > 0 ? `${diff}D RESTANTES` : diff === 0 ? 'ÚLTIMO DÍA' : `${Math.abs(diff)}D VENCIDO`
  }

  const diasColor = diasRestantes === null ? projectColor
    : diasRestantes <= 0  ? 'var(--danger)'
    : diasRestantes <= 3  ? 'var(--warning)'
    : projectColor

  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden" style={{background:'var(--bg-card)'}}>
      <div className="h-0.5" style={{background:`linear-gradient(90deg,${projectColor},${projectColor}20)`}}/>
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{background:`${projectColor}15`,border:`1px solid ${projectColor}30`}}>
              {project.emoji || '🚀'}
            </div>
            <div>
              <p className="mono text-xs tracking-widest text-[var(--text-muted)] mb-0.5">MÉTRICAS VS METAS</p>
              <p className="text-sm font-semibold text-[var(--text-primary)]">{project.product_name || project.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {diasRestantes !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                style={{borderColor:`${diasColor}50`,background:`${diasColor}10`}}>
                <Clock size={10} style={{color:diasColor}}/>
                <span className="mono text-xs font-bold" style={{color:diasColor}}>
                  CAPTACIÓN · {diasLabel}
                </span>
              </div>
            )}
            {salesGoal > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--border-default)]">
                <Target size={10} style={{color:projectColor}}/>
                <span className="mono text-xs text-[var(--text-muted)]">
                  META: <span style={{color:projectColor}}>{salesGoal} ventas</span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4 mb-5">
          {leadsGoal > 0 && (
            <MetricBar label="LEADS CAPTADOS" current={leadsCount} goal={leadsGoal} color={projectColor}/>
          )}
          {salesGoal > 0 && (
            <MetricBar label="VENTAS" current={currentSales} goal={salesGoal} color="var(--success)"/>
          )}
          {salesGoal > 0 && price > 0 && (
            <MetricBar label="REVENUE" current={currentRevenue} goal={revenueGoal} color="#C084FC" prefix="$"/>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {leadsGoal > 0 && (
            <div className="rounded-xl border border-[var(--border-default)] px-4 py-3" style={{background:'var(--bg-base)'}}>
              <p className="mono text-xs tracking-widest text-[var(--text-muted)] mb-1.5">LEADS / META</p>
              <p className="mono text-xl font-bold leading-none" style={{color:projectColor}}>
                {leadsCount}<span className="text-[var(--text-muted)] text-xs font-normal ml-1">/ {leadsGoal}</span>
              </p>
            </div>
          )}
          {salesGoal > 0 && price > 0 && (
            <div className="rounded-xl border border-[var(--border-default)] px-4 py-3" style={{background:'var(--bg-base)'}}>
              <p className="mono text-xs tracking-widest text-[var(--text-muted)] mb-1.5">REVENUE PROYECTADO</p>
              <p className="mono text-xl font-bold leading-none text-[#C084FC]">
                ${revenueGoal.toLocaleString()}
              </p>
            </div>
          )}
          {cpl !== null && (
            <div className="rounded-xl border border-[var(--border-default)] px-4 py-3" style={{background:'var(--bg-base)'}}>
              <p className="mono text-xs tracking-widest text-[var(--text-muted)] mb-1.5">CPL ESTIMADO</p>
              <p className="mono text-xl font-bold leading-none text-[var(--warning)]">${cpl}</p>
            </div>
          )}
          {adBudget > 0 && (
            <div className="rounded-xl border border-[var(--border-default)] px-4 py-3" style={{background:'var(--bg-base)'}}>
              <p className="mono text-xs tracking-widest text-[var(--text-muted)] mb-1.5">PRESUPUESTO ADS</p>
              <p className="mono text-xl font-bold leading-none text-[var(--danger)]">
                ${adBudget.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


// ─── PROJECT WIZARD ───────────────────────────────────────────────────────────

function WInput({ label,value,onChange,placeholder,type='text' }: {
  label:string; value:string; onChange:(e:React.ChangeEvent<HTMLInputElement>)=>void; placeholder?:string; type?:string
}) {
  return (
    <div>
      <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"/>
    </div>
  )
}

interface WizardData {
  name:string; product_name:string; product_price:string; sales_goal:string; leads_goal:string
  ad_budget:string; captation_start:string; captation_end:string; cart_open:string; cart_close:string
  class_dates:string; agent_context:string
}
const WIZARD_STEPS = [
  {num:1,label:'Identidad'},{num:2,label:'Metas'},{num:3,label:'Fechas'},{num:4,label:'Contexto'},
]

function ProjectWizard({ onClose,onCreated }: { onClose:()=>void; onCreated:(p:Project)=>void }) {
  const [step,setStep] = useState(1)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [data,setData] = useState<WizardData>({
    name:'',product_name:'',product_price:'',sales_goal:'',leads_goal:'',
    ad_budget:'',captation_start:'',captation_end:'',cart_open:'',cart_close:'',
    class_dates:'',agent_context:'',
  })
  const set = (f:keyof WizardData) => (e:React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>) => setData(d=>({...d,[f]:e.target.value}))
  const canStep1 = data.name.trim().length>0

  const handleCreate = async () => {
    if(!data.name.trim()) return
    setSaving(true); setError('')
    try {
      const payload: Record<string,any> = {
        name:data.name.trim(), product_name:data.product_name.trim()||null,
        product_price:data.product_price?parseFloat(data.product_price):null,
        sales_goal:data.sales_goal?parseInt(data.sales_goal):null,
        leads_goal:data.leads_goal?parseInt(data.leads_goal):null,
        ad_budget:data.ad_budget?parseFloat(data.ad_budget):null,
        captation_start:data.captation_start||null, captation_end:data.captation_end||null,
        cart_open:data.cart_open?new Date(data.cart_open).toISOString():null,
        cart_close:data.cart_close?new Date(data.cart_close).toISOString():null,
        agent_context:data.agent_context.trim()||null, status:'planning',
      }
      if(data.class_dates.trim()) payload.class_dates=data.class_dates.trim().split('\n').filter(Boolean).map(d=>d.trim())
      const {data:np,error:err} = await supabase.from('kanshi_projects').insert(payload)
        .select('id,name,product_name,product_price,status,captation_start,captation_end,cart_open,cart_close,class_dates,sales_goal,leads_goal,ad_budget,agent_context,color,emoji,credential_id').single()
      if(err) throw err
      onCreated(np as Project)
    } catch(e:any) { setError(e?.message||'Error al crear el proyecto') }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-xl rounded-2xl border border-[var(--border-default)] overflow-hidden"
        style={{background:'#0D0D14',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,0.7)'}}>
        <div className="px-6 py-5 border-b border-[var(--border-default)] flex items-center justify-between sticky top-0 z-10" style={{background:'rgba(13,13,20,0.98)'}}>
          <div>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">NUEVO PROYECTO — PASO {step} DE 4</p>
            <p className="font-semibold text-[var(--text-primary)] text-sm mt-0.5">
              {step===1?'Identidad del lanzamiento':step===2?'Metas del lanzamiento':step===3?'Fechas del calendario':'Contexto para el agente SAM'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--danger)] transition-colors group">
            <X size={12} className="text-[var(--text-muted)] group-hover:text-[var(--danger)]"/>
          </button>
        </div>
        <div className="h-0.5 bg-[var(--border-default)]">
          <div className="h-full transition-all duration-500" style={{width:`${(step/4)*100}%`,background:'linear-gradient(90deg,var(--primary),#00a7e3)'}}/>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-default)]">
          {WIZARD_STEPS.map((s,i)=>(
            <div key={s.num} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center mono text-xs font-bold transition-all"
                  style={{background:step>s.num?'var(--success)':step===s.num?'linear-gradient(135deg,var(--primary),#00a7e3)':'var(--border-default)',color:step>=s.num?'white':'var(--text-muted)'}}>
                  {step>s.num?'✓':s.num}
                </div>
                <span className="mono text-xs tracking-widest hidden sm:block" style={{color:step===s.num?'var(--text-primary)':'var(--text-muted)'}}>{s.label.toUpperCase()}</span>
              </div>
              {i<WIZARD_STEPS.length-1&&<div className="w-6 h-px mx-1" style={{background:step>s.num?'var(--success)':'var(--border-default)'}}/>}
            </div>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {step===1&&<>
            <WInput label="NOMBRE DEL PROYECTO *" value={data.name} onChange={set('name')} placeholder="ej. SamurAI Abril 2026"/>
            <WInput label="NOMBRE DEL PRODUCTO" value={data.product_name} onChange={set('product_name')} placeholder="ej. SamurAI — Curso de IA"/>
            <WInput label="PRECIO DEL PRODUCTO (USD)" value={data.product_price} onChange={set('product_price')} type="number" placeholder="ej. 297"/>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-[var(--border-default)]" style={{background:'var(--bg-card)'}}>
              <Info size={12} style={{color:'var(--accent)',flexShrink:0,marginTop:1}}/>
              <p className="mono text-xs text-[var(--text-muted)] leading-relaxed">El nombre del proyecto aparecerá en el selector del header.</p>
            </div>
          </>}

          {step===2&&<>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border" style={{borderColor:'rgba(0,176,246,0.3)',background:'rgba(0,176,246,0.05)'}}>
              <Target size={12} style={{color:'var(--accent)',flexShrink:0,marginTop:1}}/>
              <p className="mono text-xs text-[var(--text-muted)] leading-relaxed">Todas las metas son opcionales pero KANSHI las usará para mostrar avance vs objetivo.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <WInput label="META DE VENTAS (unidades)" value={data.sales_goal} onChange={set('sales_goal')} type="number" placeholder="ej. 30"/>
              <WInput label="META DE LEADS" value={data.leads_goal} onChange={set('leads_goal')} type="number" placeholder="ej. 500"/>
            </div>
            <WInput label="PRESUPUESTO DE ADS (USD)" value={data.ad_budget} onChange={set('ad_budget')} type="number" placeholder="ej. 1500"/>
            {data.sales_goal&&data.product_price&&(
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[var(--border-default)]" style={{background:'var(--bg-card)'}}>
                <span className="mono text-xs text-[var(--text-muted)]">REVENUE PROYECTADO</span>
                <span className="mono text-sm font-bold" style={{color:'var(--success)'}}>${(parseFloat(data.sales_goal)*parseFloat(data.product_price)).toLocaleString('en-US')} USD</span>
              </div>
            )}
          </>}

          {step===3&&<>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border" style={{borderColor:'rgba(0,176,246,0.3)',background:'rgba(0,176,246,0.05)'}}>
              <Calendar size={12} style={{color:'var(--accent)',flexShrink:0,marginTop:1}}/>
              <p className="mono text-xs text-[var(--text-muted)] leading-relaxed">Las fechas permiten que SAM entienda en qué fase del lanzamiento está.</p>
            </div>
            <div>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-3">CAPTACIÓN DE LEADS</p>
              <div className="grid grid-cols-2 gap-4">
                <WInput label="INICIO CAPTACIÓN" value={data.captation_start} onChange={set('captation_start')} type="date"/>
                <WInput label="FIN CAPTACIÓN" value={data.captation_end} onChange={set('captation_end')} type="date"/>
              </div>
            </div>
            <div>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-3">CARRITO</p>
              <div className="grid grid-cols-2 gap-4">
                <WInput label="APERTURA CARRITO" value={data.cart_open} onChange={set('cart_open')} type="datetime-local"/>
                <WInput label="CIERRE CARRITO" value={data.cart_close} onChange={set('cart_close')} type="datetime-local"/>
              </div>
            </div>
            <div>
              <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">FECHAS DE CLASES / LIVES (una por línea)</label>
              <textarea value={data.class_dates} onChange={set('class_dates')}
                placeholder={'2026-04-07\n2026-04-09\n2026-04-11'} rows={4}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none resize-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"/>
            </div>
          </>}

          {step===4&&<>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border" style={{borderColor:'rgba(0,176,246,0.3)',background:'rgba(0,176,246,0.05)'}}>
              <Brain size={12} style={{color:'var(--accent)',flexShrink:0,marginTop:1}}/>
              <p className="mono text-xs text-[var(--text-muted)] leading-relaxed">Este texto se inyectará en el prompt de SAM para que conozca el producto y el avatar.</p>
            </div>
            <div>
              <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">CONTEXTO DEL AGENTE (opcional)</label>
              <textarea value={data.agent_context} onChange={set('agent_context')}
                placeholder="ej. SamurAI es un curso de 6 semanas para emprendedores latinoamericanos..." rows={8}
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none resize-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"/>
            </div>
            <div className="mono text-xs text-[var(--text-muted)] text-right">{data.agent_context.length} caracteres</div>
            <div className="rounded-xl border border-[var(--border-default)] p-4 space-y-2" style={{background:'var(--bg-card)'}}>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-3">RESUMEN DEL PROYECTO</p>
              <SummaryRow label="Nombre" value={data.name||'—'}/>
              {data.product_name&&<SummaryRow label="Producto" value={data.product_name}/>}
              {data.product_price&&<SummaryRow label="Precio" value={`$${data.product_price} USD`}/>}
              {data.sales_goal&&<SummaryRow label="Meta ventas" value={`${data.sales_goal} unidades`} highlight/>}
              {data.captation_start&&<SummaryRow label="Inicio captación" value={data.captation_start}/>}
              {data.cart_open&&<SummaryRow label="Apertura carrito" value={data.cart_open.replace('T',' ')}/>}
            </div>
          </>}
          {error&&<div className="rounded-xl border border-[var(--danger)] bg-[var(--danger)10] p-3"><p className="text-xs text-[var(--danger)]">{error}</p></div>}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-default)] flex items-center justify-between sticky bottom-0" style={{background:'rgba(13,13,20,0.98)'}}>
          <button onClick={()=>step>1?setStep(step-1):onClose()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-default)] mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2E2E4E] transition-all">
            <ChevronLeft size={12}/> {step===1?'CANCELAR':'ANTERIOR'}
          </button>
          {step<4?(
            <button onClick={()=>setStep(step+1)} disabled={step===1&&!canStep1}
              className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{background:'linear-gradient(135deg,var(--primary),#00a7e3)'}}>
              SIGUIENTE <ChevronRight size={12}/>
            </button>
          ):(
            <button onClick={handleCreate} disabled={!canStep1||saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{background:'linear-gradient(135deg,var(--primary),#00a7e3)'}}>
              {saving?<><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> CREANDO...</>:<><Rocket size={12}/> CREAR PROYECTO</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── ALERTS PANEL — Día 14 ───────────────────────────────────────────────────

interface KanshiAlert {
  id: string
  alert_type: 'score_75' | 'score_90' | 'sale'
  lead_name: string | null
  lead_phone: string | null
  kanshi_score: number | null
  sale_amount: number | null
  metadata: Record<string, any>
  read_at: string | null
  created_at: string
}

function AlertsPanel({
  projectId,
  onClose,
  onReadCountChange,
  onLeadClick,
}: {
  projectId: string | null
  onClose: () => void
  onReadCountChange: () => void
  onLeadClick: (phone: string) => void
}) {
  const [alerts, setAlerts] = useState<KanshiAlert[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAlerts = useCallback(async () => {
    if (!projectId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('kanshi_alerts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(50)
      setAlerts(data || [])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const markRead = async (alertId: string) => {
    await supabase
      .from('kanshi_alerts')
      .update({ read_at: new Date().toISOString() })
      .eq('id', alertId)
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, read_at: new Date().toISOString() } : a))
    onReadCountChange()
  }

  const markAllRead = async () => {
    if (!projectId) return
    const unreadIds = alerts.filter(a => !a.read_at).map(a => a.id)
    if (unreadIds.length === 0) return
    await supabase
      .from('kanshi_alerts')
      .update({ read_at: new Date().toISOString() })
      .in('id', unreadIds)
    setAlerts(prev => prev.map(a => ({ ...a, read_at: a.read_at ?? new Date().toISOString() })))
    onReadCountChange()
  }

  const alertConfig = {
    score_75: { label: 'READY LEAD',    color: 'var(--danger)', bg: 'var(--danger)15', icon: '🔥', desc: 'Score ≥ 75' },
    score_90: { label: 'BUYER PROFILE', color: 'var(--success)', bg: 'var(--success)15', icon: '⚡', desc: 'Score ≥ 90' },
    sale:     { label: 'VENTA',         color: '#C084FC', bg: '#C084FC15', icon: '💰', desc: 'Venta confirmada' },
  }

  const unreadCount = alerts.filter(a => !a.read_at).length

  return (
    <div className="fixed inset-0 z-[350] flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full border-l border-[var(--border-default)] flex flex-col"
        style={{ background: '#0D0D14', boxShadow: '-24px 0 80px rgba(0,0,0,0.7)', animation: 'slideInRight 0.2s ease' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border-default)] flex items-center justify-between flex-shrink-0"
          style={{ background: 'rgba(13,13,20,0.97)' }}>
          <div className="flex items-center gap-3">
            <Bell size={16} style={{ color: 'var(--danger)' }} />
            <div>
              <p className="font-bold text-[var(--text-primary)] text-sm">Alertas del Equipo</p>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">
                {unreadCount > 0 ? `${unreadCount} SIN LEER` : 'TODO AL DÍA ✓'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="mono text-xs px-2 py-1 rounded-lg border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2E2E4E] transition-all"
              >
                MARCAR TODAS
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--danger)] transition-colors">
              <X size={12} style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)' }} />
            </div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Bell size={24} style={{ color: '#2E2E4E' }} />
              <p className="mono text-[11px] text-[var(--text-muted)]">Sin alertas aún</p>
              <p className="mono text-xs text-[#2E2E4E] text-center px-8">
                Las alertas aparecen cuando un lead cruza score 75/90 o se confirma una venta
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border-default)]">
              {alerts.map(alert => {
                const cfg = alertConfig[alert.alert_type]
                const isUnread = !alert.read_at
                return (
                  <div
                    key={alert.id}
                    className="px-5 py-4 transition-colors"
                    style={{ background: isUnread ? 'var(--bg-card)' : 'transparent' }}
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Dot no leído */}
                        <div
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5"
                          style={{ background: isUnread ? cfg.color : 'transparent', border: isUnread ? 'none' : '1px solid #2E2E4E' }}
                        />
                        {/* Badge tipo */}
                        <span
                          className="mono text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.color}30` }}
                        >
                          {cfg.icon} {cfg.label}
                        </span>
                        {/* Nombre lead */}
                        <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                          {alert.lead_name || alert.lead_phone || '—'}
                        </span>
                      </div>
                      {/* Score o monto */}
                      {alert.alert_type !== 'sale' && alert.kanshi_score && (
                        <span className="mono text-xs font-bold flex-shrink-0" style={{ color: cfg.color }}>
                          {alert.kanshi_score} pts
                        </span>
                      )}
                      {alert.alert_type === 'sale' && alert.sale_amount && (
                        <span className="mono text-xs font-bold flex-shrink-0 text-[#C084FC]">
                          ${Number(alert.sale_amount).toLocaleString()}
                        </span>
                      )}
                    </div>

                    {/* Metadata row */}
                    <div className="flex items-center gap-3 mb-3 pl-5">
                      {alert.lead_phone && (
                        <span className="mono text-xs text-[var(--text-muted)]">{alert.lead_phone}</span>
                      )}
                      {alert.metadata?.utm_source && (
                        <span className="mono text-xs px-1.5 py-0.5 rounded border border-[var(--border-default)] text-[var(--text-muted)]">
                          {alert.metadata.utm_source}
                        </span>
                      )}
                      {alert.metadata?.utm_campaign && (
                        <span className="mono text-xs text-[var(--text-muted)] truncate max-w-[120px]">
                          {alert.metadata.utm_campaign}
                        </span>
                      )}
                      <span className="mono text-xs text-[#2E2E4E] ml-auto flex-shrink-0">
                        {format(new Date(alert.created_at), 'dd/MM HH:mm')}
                      </span>
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2 pl-5">
                      {alert.lead_phone && (
                        <button
                          onClick={() => {
                            onLeadClick(alert.lead_phone!)
                            if (isUnread) markRead(alert.id)
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg mono text-xs font-bold transition-all"
                          style={{ background: 'var(--primary)20', color: 'var(--accent)', border: '1px solid var(--primary)40' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--primary)40')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'var(--primary)20')}
                        >
                          <Eye size={10} /> VER JOURNEY
                        </button>
                      )}
                      {isUnread && (
                        <button
                          onClick={() => markRead(alert.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg mono text-xs transition-all border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2E2E4E]"
                        >
                          <CheckCheck size={10} /> LEÍDA
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

function subTabToLegacyTab(subTab: SubTabKey): TabType {
  const map: Record<SubTabKey, TabType> = {
    'lanzamiento.resumen':      'overview',
    'lanzamiento.timeline':     'overview',
    'lanzamiento.guia':         'overview',
    'inteligencia.leads':       'psico',
    'inteligencia.pipeline':    'pipeline',
    'inteligencia.score':       'psico',
    'inteligencia.psicologia':  'psico',
    'trafico.metaads':          'traficker',
    'trafico.fuentes':          'fuentes',
    'trafico.landings':         'overview',
    'nexo.agente':              'campaigns',
    'nexo.campanias':           'campaigns',
    'grupos.grupos':            'grupos',
    'ventas.hotmart':           'ventas',
    'ventas.revenue':           'ventas',
    'sistema.config':           'config',
    'sistema.reportes':         'overview',
    'sistema.testing':          'overview',
  }
  return map[subTab] ?? 'overview'
}

export default function Dashboard() {
  const [authenticated,setAuthenticated] = useState<boolean|null>(null)
  const [kpi,setKpi] = useState<KPI|null>(null)
  const [leads,setLeads] = useState<Lead[]>([])
  const [templates,setTemplates] = useState<Template[]>([])
  const [campaigns,setCampaigns] = useState<Campaign[]>([])
  const [chartData,setChartData] = useState<ChartPoint[]>([])
  const [recentMsgs,setRecentMsgs] = useState<RecentMsg[]>([])
  const [selectedLead,setSelectedLead] = useState<Lead|null>(null)
  const [showCreator,setShowCreator] = useState(false)
  const [showProjectWizard,setShowProjectWizard] = useState(false)
  const [loading,setLoading] = useState(true)
  const [connected,setConnected] = useState(false)
  const [lastUpdate,setLastUpdate] = useState(new Date())
  const [activeTab,setActiveTab] = useState<TabType>('overview')
  const [activeSubTab, setActiveSubTab] = useState<SubTabKey>('lanzamiento.resumen')
  const [toasts,setToasts] = useState<Toast[]>([])
  const [leadsPage,setLeadsPage] = useState(1)
  const [campaignsPage,setCampaignsPage] = useState(1)
  const [projects,setProjects] = useState<Project[]>([])
  const [unreadAlerts, setUnreadAlerts] = useState(0)
  const [showAlerts, setShowAlerts] = useState(false)
  const [journeyPhone, setJourneyPhone] = useState<string | null>(null)
  const [activeProjectId,setActiveProjectId] = useState<string|null>(()=>{
    if(typeof window!=='undefined') return localStorage.getItem('kanshi_active_project')
    return null
  })

  const addToast = useCallback((type:Toast['type'],message:string)=>{
    const id=`${Date.now()}-${Math.random()}`
    setToasts(p=>[...p,{id,type,message}])
    setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),4500)
  },[])
  const removeToast = useCallback((id:string)=>setToasts(p=>p.filter(t=>t.id!==id)),[])

  const fetchUnreadAlerts = useCallback(async () => {
    if (!activeProjectId) return
    try {
      const { count } = await supabase
        .from('kanshi_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', activeProjectId)
        .is('read_at', null)
      setUnreadAlerts(count ?? 0)
    } catch {}
  }, [activeProjectId])

  useEffect(() => {
    if (!authenticated) return
    fetchUnreadAlerts()
    const iv = setInterval(fetchUnreadAlerts, 30000)
    return () => clearInterval(iv)
  }, [fetchUnreadAlerts, authenticated])
  
  useEffect(()=>{setLeadsPage(1);setCampaignsPage(1)},[activeTab])
  useEffect(()=>{ setActiveTab(subTabToLegacyTab(activeSubTab)) },[activeSubTab])
  useEffect(()=>{setLeadsPage(1);setCampaignsPage(1)},[activeProjectId])
  useEffect(()=>{const s=localStorage.getItem(AUTH_KEY);setAuthenticated(s==='true')},[])

  const fetchData = useCallback(async ()=>{
    try {
      let msgsQ = supabase.from('wa_messages').select('direction,created_at,body,contact_name').order('created_at',{ascending:false}).limit(200)
      let campsQ = supabase.from('wa_campaigns').select('*').order('created_at',{ascending:false}).limit(200)
      let leadsQ = supabase.from('wa_contacts').select('*, landing_pages(token,status)').order('updated_at',{ascending:false}).limit(500)
      let cntQ   = supabase.from('wa_contacts').select('id',{count:'exact',head:true})
      if(activeProjectId){
        msgsQ=msgsQ.eq('project_id',activeProjectId)
        campsQ=campsQ.eq('project_id',activeProjectId)
        leadsQ=leadsQ.eq('project_id',activeProjectId)
        cntQ=cntQ.eq('project_id',activeProjectId)
      }
      const [msgsR,convsR,cntR,campsR,leadsR,tplsR,projR] = await Promise.all([
        msgsQ, supabase.from('wa_conversations').select('status'), cntQ, campsQ, leadsQ,
        supabase.from('wa_templates').select('*').eq('status','APPROVED').order('name'),
        supabase.from('kanshi_projects').select('id,name,product_name,product_price,status,captation_start,captation_end,cart_open,cart_close,class_dates,sales_goal,leads_goal,ad_budget,agent_context,color,emoji,credential_id,logo_url,hormozi_config').order('created_at',{ascending:false}),
      ])
      const msgs=msgsR.data||[]; const leadsData:Lead[]=leadsR.data||[]
      const campData:Campaign[]=campsR.data||[]; const tplData:Template[]=tplsR.data||[]
      setLeads(leadsData); setCampaigns(campData); setTemplates(tplData)
      setRecentMsgs((msgs as RecentMsg[]).slice(0,10))
      if(projR.data) setProjects(projR.data)

      const inbound=msgs.filter((m:any)=>m.direction==='inbound').length
      const outbound=msgs.filter((m:any)=>m.direction==='outbound').length
      const totalSent=campData.reduce((s,c)=>s+(c.sent_count||0),0)
      const totalDelivered=campData.reduce((s,c)=>s+(c.delivered_count||0),0)
      const totalRead=campData.reduce((s,c)=>s+(c.read_count||0),0)
      const totalReplied=campData.reduce((s,c)=>s+(c.reply_count||0),0)
      const scored=leadsData.filter(l=>l.engagement_score>0)
      const avgEngagement=scored.length>0?Math.round(scored.reduce((s,l)=>s+l.engagement_score,0)/scored.length*10)/10:0
      const profilingComplete=leadsData.filter(l=>['perfil_completo','calentando','lives','clases','VIP','comprador'].includes(l.agent_stage)).length
      setKpi({
        totalMessages:msgs.length,inbound,outbound,uniqueContacts:cntR.count||0,
        totalSent,totalDelivered,totalRead,
        deliveryRate:totalSent>0?Math.round((totalDelivered/totalSent)*100):0,
        readRate:totalDelivered>0?Math.round((totalRead/totalDelivered)*100):0,
        replyRate:totalSent>0?Math.round((totalReplied/totalSent)*100):0,
        avgEngagement,profilingComplete,
        profilingRate:leadsData.length>0?Math.round((profilingComplete/leadsData.length)*100):0,
      })
      const hourly:Record<string,{inbound:number;outbound:number}>={}
      for(let i=23;i>=0;i--){const d=new Date();d.setHours(d.getHours()-i,0,0,0);hourly[format(d,'HH:00')]={inbound:0,outbound:0}}
      msgs.forEach((m:any)=>{const h=format(new Date(m.created_at),'HH:00');if(hourly[h]){if(m.direction==='inbound')hourly[h].inbound++;else hourly[h].outbound++}})
      setChartData(Object.entries(hourly).map(([hour,v])=>({hour,...v})))
      setLastUpdate(new Date()); setLoading(false)
    } catch(e){console.error(e);setLoading(false)}
  },[activeProjectId])

  const handleCampaignAction = useCallback(async(camp:Campaign,action:'paused'|'cancelled')=>{
    const {error}=await supabase.from('wa_campaigns').update({status:action}).eq('id',camp.id)
    if(error){addToast('error',`Error: ${error.message}`)}
    else{
      addToast(action==='paused'?'warning':'error',`"${camp.name}" ${action==='paused'?'pausada':'cancelada'}`)
      setCampaigns(prev=>prev.map(c=>c.id===camp.id?{...c,status:action}:c))
    }
  },[addToast])

  const handleProjectChange = useCallback((projectId:string|null)=>{
    setActiveProjectId(projectId)
    if(projectId) localStorage.setItem('kanshi_active_project',projectId)
    else localStorage.removeItem('kanshi_active_project')
  },[])

  const handleActivateProject = async (projectId: string) => {
    await supabase.from('kanshi_projects').update({status:'planning'}).eq('status','active')
    const {error} = await supabase.from('kanshi_projects').update({status:'active'}).eq('id',projectId)
    if(!error){
      setProjects(prev=>prev.map(p=>({...p,status:p.id===projectId?'active':p.status==='active'?'planning':p.status})))
      addToast('success',`Proyecto activado — SAM usará este contexto`)
    } else {
      addToast('error','Error al activar el proyecto')
    }
  }

  const handleProjectCreated = useCallback((newProject:Project)=>{
    setProjects(prev=>[newProject,...prev])
    setActiveProjectId(newProject.id)
    localStorage.setItem('kanshi_active_project',newProject.id)
    setShowProjectWizard(false)
    addToast('success',`Proyecto "${newProject.name}" creado — ahora está activo`)
  },[addToast])

  useEffect(()=>{
    if(!authenticated) return
    fetchData()
    const ch=supabase.channel('dash-v2')
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_messages'},fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_contacts'},fetchData)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'wa_campaigns'},(payload)=>{
        setCampaigns(prev=>prev.map(c=>c.id===(payload.new as Campaign).id?{...c,...(payload.new as Campaign)}:c))
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'wa_campaigns'},fetchData)
      .subscribe(s=>setConnected(s==='SUBSCRIBED'))
    const iv=setInterval(fetchData,30000)
    return ()=>{supabase.removeChannel(ch);clearInterval(iv)}
  },[fetchData,authenticated,activeProjectId])

  const segDist=['caliente','templado','frio'].map(s=>({name:s==='frio'?'Frío':s.charAt(0).toUpperCase()+s.slice(1),value:leads.filter(l=>l.segmento===s).length,color:segColor(s)})).filter(d=>d.value>0)
  const urgDist=['alta','media','baja'].map(u=>({name:u.charAt(0).toUpperCase()+u.slice(1),value:leads.filter(l=>l.urgencia_financiera===u).length,color:urgColor(u)})).filter(d=>d.value>0)
  const comDist=['alto','medio','bajo'].map(c=>({name:c.charAt(0).toUpperCase()+c.slice(1),value:leads.filter(l=>l.nivel_compromiso===c).length,color:comColor(c)})).filter(d=>d.value>0)
  const profiledLeads=useMemo(()=>leads.filter(l=>l.situacion_actual),[leads])
  const paginatedLeads=useMemo(()=>profiledLeads.slice((leadsPage-1)*PAGE_SIZE,leadsPage*PAGE_SIZE),[profiledLeads,leadsPage])
  const paginatedCampaigns=useMemo(()=>campaigns.slice((campaignsPage-1)*PAGE_SIZE,campaignsPage*PAGE_SIZE),[campaigns,campaignsPage])

  if(authenticated===null) return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#090c4c'}}>
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'var(--accent)',borderTopColor:'transparent'}}/>
    </div>
  )
  if(!authenticated) return <LoginScreen onAuth={()=>setAuthenticated(true)}/>
  if(loading) return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--bg-base)'}}>
      <div className="text-center">
        <div className="mx-auto mb-5 flex justify-center"><KanshiLogo size={40}/></div>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{borderColor:'var(--accent)',borderTopColor:'transparent'}}/>
        <p className="mono text-[var(--text-muted)] text-sm tracking-widest">CARGANDO DATOS</p>
      </div>
    </div>
  )


 const TAB_TITLES: Record<TabType, string> = {
    overview:   'Overview',
    pipeline:   'Pipeline',
    psico:      'Leads',
    campaigns:  'Campañas',
    fuentes:    'Fuentes',
    ventas:     'Ventas',
    traficker:  'Traficker — Calidad de Lead',
    sala:       'Sala de Control',
    grupos:     'Grupos WhatsApp',
    config:     'Configuración',
  }
  const activeProject = projects.find(p => p.id === activeProjectId) ?? null

  return(
    <div className="flex h-screen overflow-hidden" style={{background:'var(--bg-base)'}}>
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* ── SIDEBAR ── */}
      <SidebarV2
        activeSubTab={activeSubTab}
        onNavigate={setActiveSubTab}
        projectName={activeProject?.name ?? 'SamurAI 2026'}
        projectStatus={activeProject?.status === 'active' ? 'ACTIVO' : 'PLANIF.'}
        daysToCaption={7}
        connected={connected}
        unreadCount={unreadAlerts}
        onAlertsClick={() => setShowAlerts(true)}
        onRefresh={fetchData}
        onLogout={() => { localStorage.removeItem(AUTH_KEY); setAuthenticated(false) }}
      />

      {/* ── WORKSPACE ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Workspace Header */}
        <header className="flex items-center justify-between px-7 py-4 flex-shrink-0"
          style={{background:'rgba(10,10,15,0.97)',borderBottom:'1px solid var(--border-default)',backdropFilter:'blur(12px)'}}>
          <div>
            <h2 className="font-bold text-[var(--text-primary)]" style={{fontSize:'20px',letterSpacing:'-0.01em'}}>
              {TAB_TITLES[activeTab]}
            </h2>
            {activeProject && (
              <p className="mono text-xs mt-0.5 tracking-widest" style={{color:'var(--text-muted)'}}>
                {activeProject.emoji} {activeProject.name}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <ProjectSelector
              projects={projects}
              activeProjectId={activeProjectId}
              onChange={handleProjectChange}
              onNewProject={() => setShowProjectWizard(true)}
              onActivate={handleActivateProject}
            />
            <GlobalSearch leads={leads} onSelect={lead => setSelectedLead(lead)}/>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-[1400px] mx-auto space-y-6">

        {/* ══ LANZAMIENTO · RESUMEN ══ */}
        {activeSubTab==='lanzamiento.resumen'&&(
          <LaunchResumenPanel
            project={activeProject}
            leads={leads}
            kpi={kpi}
            recentMsgs={recentMsgs}
            connected={connected}
            chartData={chartData}
            activeProjectId={activeProjectId}
          />
        )}

        {/* ══ LANZAMIENTO · GUÍA ══ */}
        {activeSubTab==='lanzamiento.guia'&&(
          <LaunchGuiaPanel />
        )}

        {/* ══ SISTEMA · TESTING ══ */}
        {activeSubTab==='sistema.testing'&&(
          <TestingPanel />
        )}

        {/* ══ OVERVIEW (otras sub-tabs de lanzamiento + legacy) ══ */}
        {activeTab==='overview'&&activeSubTab!=='lanzamiento.resumen'&&activeSubTab!=='lanzamiento.guia'&&<>
          {activeProjectId&&projects.find(p=>p.id===activeProjectId)&&(
            <ProjectTimeline project={projects.find(p=>p.id===activeProjectId)!}/>
          )}
          {activeProjectId&&projects.find(p=>p.id===activeProjectId)&&(
            ((projects.find(p=>p.id===activeProjectId)!.leads_goal??0)>0||(projects.find(p=>p.id===activeProjectId)!.sales_goal??0)>0)&&(
              <ProjectMetrics project={projects.find(p=>p.id===activeProjectId)!} leadsCount={kpi?.uniqueContacts??0}/>
            )
          )}
          <Sec label="MENSAJES"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KCard icon={<MessageSquare size={14}/>} label="TOTAL" value={kpi?.totalMessages??0} color="var(--success)"/>
            <KCard icon={<TrendingUp size={14}/>} label="ENTRANTES" value={kpi?.inbound??0} color="var(--accent)"/>
            <KCard icon={<Send size={14}/>} label="SALIENTES" value={kpi?.outbound??0} color="var(--danger)"/>
            <KCard icon={<Users size={14}/>} label="CONTACTOS" value={kpi?.uniqueContacts??0} color="var(--success)"/>
          </div></Sec>
          <Sec label="INTELIGENCIA DE LEADS"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KCard icon={<Brain size={14}/>} label="PERFILES COMPLETOS" value={kpi?.profilingComplete??0} color="#C084FC"/>
            <KCard icon={<Activity size={14}/>} label="TASA PERFILADO" value={`${kpi?.profilingRate??0}%`} color="var(--warning)" isPercent/>
            <KCard icon={<Star size={14}/>} label="ENGAGEMENT PROM." value={kpi?.avgEngagement??0} color="var(--success)"/>
            <KCard icon={<Flame size={14}/>} label="LEADS CALIENTES" value={leads.filter(l=>l.segmento==='caliente').length} color="var(--danger)"/>
          </div></Sec>
          <KanshiScoreWidget leads={leads}/>
          <Sec label="CAMPAÑAS"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KCard icon={<Zap size={14}/>} label="ENVIADOS" value={kpi?.totalSent??0} color="var(--success)"/>
            <KCard icon={<CheckCheck size={14}/>} label="TASA ENTREGA" value={`${kpi?.deliveryRate??0}%`} color="var(--accent)" isPercent/>
            <KCard icon={<CheckCheck size={14}/>} label="TASA LECTURA" value={`${kpi?.readRate??0}%`} color="var(--danger)" isPercent/>
            <KCard icon={<MessageSquare size={14}/>} label="TASA RESPUESTA" value={`${kpi?.replyRate??0}%`} color="var(--success)" isPercent/>
          </div></Sec>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 rounded-xl border border-[var(--border-default)] p-5" style={{background:'var(--bg-card)'}}>
              <div className="flex items-center justify-between mb-5">
                <div><p className="mono text-xs text-[var(--text-muted)] tracking-widest">ACTIVIDAD</p><p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">Mensajes últimas 24h</p></div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[var(--success)]"/><span className="mono text-xs text-[var(--text-muted)]">ENTRANTE</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background:'var(--accent)'}}/><span className="mono text-xs text-[var(--text-muted)]">SALIENTE</span></div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{top:5,right:0,left:-30,bottom:0}}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00FF94" stopOpacity={0.3}/><stop offset="95%" stopColor="#00FF94" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00b0f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#00b0f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{fill:'var(--text-muted)',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false} interval={3}/>
                  <YAxis tick={{fill:'var(--text-muted)',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'var(--border-default)',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                  <Area type="monotone" dataKey="inbound" stroke="#00FF94" strokeWidth={1.5} fill="url(#gIn)"/>
                  <Area type="monotone" dataKey="outbound" stroke="#00b0f6" strokeWidth={1.5} fill="url(#gOut)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-[var(--border-default)] p-5" style={{background:'var(--bg-card)'}}>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-4">ACTIVIDAD RECIENTE</p>
              <div className="space-y-3">
                {recentMsgs.length===0?<p className="text-[var(--text-muted)] text-xs text-center mt-6">Sin mensajes</p>
                :recentMsgs.map((m,i)=>(
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{background:m.direction==='inbound'?'var(--success)':'var(--accent)'}}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate">{m.contact_name||'Desconocido'}</p>
                        <span className="mono text-xs text-[var(--text-muted)] flex-shrink-0">{format(new Date(m.created_at),'HH:mm')}</span>
                      </div>
                      <p className="text-[11px] text-[var(--text-muted)] truncate">{m.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        {/* ══ PIPELINE ══ */}
        {activeTab==='pipeline'&&(
          <div className="space-y-3">
            {STAGES.map(stage=>{
              const sl=leads.filter(l=>l.agent_stage===stage.key); if(sl.length===0) return null
              return(
                <div key={stage.key} className="rounded-xl border border-[var(--border-default)] overflow-hidden" style={{background:'var(--bg-card)'}}>
                  <div className="px-5 py-3 border-b border-[var(--border-default)] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{background:stage.color}}/>
                      <span className="mono text-[11px] tracking-widest font-bold" style={{color:stage.color}}>{stage.label.toUpperCase()}</span>
                    </div>
                    <span className="mono text-xs text-[var(--text-muted)]">{sl.length} leads</span>
                  </div>
                  <div className="divide-y divide-[var(--border-default)]">
                    {sl.slice(0,5).map((lead,i)=>(
                      <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-[var(--border-default)] transition-colors cursor-pointer" onClick={()=>setSelectedLead(lead)}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[var(--text-primary)] font-medium truncate">{lead.name||lead.phone_number}</p>
                            {lead.segmento&&<div className="flex items-center gap-1">{segIcon(lead.segmento)}</div>}
                          </div>
                          {lead.situacion_actual&&<p className="mono text-xs text-[var(--text-muted)] truncate">{lead.situacion_actual}</p>}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {lead.engagement_score>0&&<span className="mono text-[11px] font-bold" style={{color:scoreColor(lead.engagement_score)}}>★{lead.engagement_score}</span>}
                          {(lead.kanshi_score||0)>0&&(
                            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold mono text-xs flex-shrink-0"
                              style={{
                                borderColor: lead.kanshi_segment==='listo'?'var(--success)':lead.kanshi_segment==='caliente'?'var(--danger)':lead.kanshi_segment==='templado'?'var(--warning)':'var(--accent)',
                                color:       lead.kanshi_segment==='listo'?'var(--success)':lead.kanshi_segment==='caliente'?'var(--danger)':lead.kanshi_segment==='templado'?'var(--warning)':'var(--accent)',
                                background:  lead.kanshi_segment==='listo'?'var(--success)15':lead.kanshi_segment==='caliente'?'var(--danger)15':lead.kanshi_segment==='templado'?'var(--warning)15':'var(--accent)15',
                              }}>
                              {lead.kanshi_score}
                            </div>
                          )}
                          <ChevronRight size={12} className="text-[var(--text-muted)]"/>
                        </div>
                      </div>
                    ))}
                    {sl.length>5&&<div className="px-5 py-2 text-center"><span className="mono text-xs text-[var(--text-muted)]">+{sl.length-5} más en esta etapa</span></div>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ══ PSICOGRÁFICO ══ */}
        {activeTab==='psico'&&<>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <MiniDist title="SEGMENTO" data={segDist} total={leads.length}/>
            <MiniDist title="URGENCIA FINANCIERA" data={urgDist} total={leads.length}/>
            <MiniDist title="NIVEL COMPROMISO" data={comDist} total={leads.length}/>
          </div>
          <Sec label="ENGAGEMENT SCORE — DISTRIBUCIÓN">
            <div className="rounded-xl border border-[var(--border-default)] p-5" style={{background:'var(--bg-card)'}}>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={[1,2,3,4,5,6,7,8,9,10].map(n=>({score:n,count:leads.filter(l=>Math.round(l.engagement_score)===n).length}))} margin={{top:5,right:0,left:-30,bottom:0}}>
                  <XAxis dataKey="score" tick={{fill:'var(--text-muted)',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'var(--text-muted)',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'var(--border-default)',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                  <Bar dataKey="count" radius={[4,4,0,0]}>{[1,2,3,4,5,6,7,8,9,10].map((n,i)=><Cell key={i} fill={scoreColor(n)} fillOpacity={0.8}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Sec>
          <Sec label={`LEADS PERFILADOS — ${profiledLeads.length} TOTAL`}>
            <div className="rounded-xl border border-[var(--border-default)] overflow-hidden" style={{background:'var(--bg-card)'}}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-[var(--border-default)]">
                    {['CONTACTO','ETAPA','SEGMENTO','SCORE','COMPROMISO','URGENCIA','SITUACIÓN','DOLOR','LANDING'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left mono text-xs text-[var(--text-muted)] tracking-widest font-normal whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {profiledLeads.length===0
                      ?<tr><td colSpan={9} className="px-4 py-8 text-center text-[var(--text-muted)] text-xs">Sin leads perfilados aún</td></tr>
                      :paginatedLeads.map((lead,i)=>{
                        const lp = lead.landing_pages?.[0] ?? null
                        return (
                      <tr key={i} className="border-b border-[var(--border-default)] hover:bg-[var(--border-default)] transition-colors cursor-pointer" onClick={()=>setSelectedLead(lead)}>
                        <td className="px-4 py-3"><div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[var(--border-default)] flex items-center justify-center"><User size={10} className="text-[var(--text-muted)]"/></div>
                          <div><p className="text-xs font-medium text-[var(--text-primary)]">{lead.name||'—'}</p><p className="mono text-xs text-[var(--text-muted)]">{lead.phone_number}</p></div>
                        </div></td>
                        <td className="px-4 py-3"><StagePill stage={lead.agent_stage}/></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1">{segIcon(lead.segmento)}<span className="mono text-xs" style={{color:segColor(lead.segmento)}}>{lead.segmento||'—'}</span></div></td>
                        <td className="px-4 py-3"><span className="mono text-xs font-bold px-1.5 py-0.5 rounded" style={{color:scoreColor(lead.engagement_score),background:`${scoreColor(lead.engagement_score)}15`}}>{lead.engagement_score||'—'}</span></td>
                        <td className="px-4 py-3"><span className="mono text-xs" style={{color:comColor(lead.nivel_compromiso)}}>{lead.nivel_compromiso||'—'}</span></td>
                        <td className="px-4 py-3"><span className="mono text-xs" style={{color:urgColor(lead.urgencia_financiera)}}>{lead.urgencia_financiera||'—'}</span></td>
                        <td className="px-4 py-3 max-w-[180px]"><p className="text-[11px] text-[var(--text-primary)] truncate">{lead.situacion_actual||'—'}</p></td>
                        <td className="px-4 py-3 max-w-[200px]"><p className="text-[11px] text-[var(--text-muted)] truncate">{lead.dolor_declarado||'—'}</p></td>
                        <td className="px-4 py-3" onClick={e=>e.stopPropagation()}>
                          {(lead.kanshi_score||0)>=75
                            ? lp?.status==='active'
                              ? <a href={`/l/${lp.token}`} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-2 py-1 rounded-lg mono text-xs font-bold tracking-widest whitespace-nowrap transition-all hover:scale-105"
                                  style={{background:'var(--accent)15',color:'var(--accent)',border:'1px solid var(--accent)30'}}>
                                  <Zap size={9}/> VER LANDING
                                </a>
                              : lp?.status==='draft'
                                ? <span className="flex items-center gap-1 px-2 py-1 rounded-lg mono text-xs tracking-widest whitespace-nowrap"
                                    style={{background:'var(--warning)15',color:'var(--warning)',border:'1px solid var(--warning)30'}}>
                                    <RefreshCw size={9} className="animate-spin"/> GENERANDO
                                  </span>
                                : <span className="mono text-xs text-[var(--text-muted)]">PENDIENTE</span>
                            : null}
                        </td>
                      </tr>
                        )
                      })}
                  </tbody>
                </table>
              </div>
              {profiledLeads.length>PAGE_SIZE&&<Pagination total={profiledLeads.length} page={leadsPage} pageSize={PAGE_SIZE} onPage={setLeadsPage}/>}
            </div>
          </Sec>
        </>}

        {/* ══ CAMPAÑAS ══ */}
        {activeTab==='campaigns'&&<>
          <div className="flex items-center justify-between">
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">CAMPAÑAS — {campaigns.length} TOTAL</p>
            <button onClick={()=>setShowCreator(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold mono text-[11px] tracking-widest transition-all hover:scale-105"
              style={{background:'linear-gradient(135deg,var(--primary),#00a7e3)'}}>
              <Plus size={13}/> NUEVA CAMPAÑA
            </button>
          </div>
          <div className="rounded-xl border border-[var(--border-default)] overflow-hidden" style={{background:'var(--bg-card)'}}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[var(--border-default)]">
                  {['CAMPAÑA','TEMPLATE','ESTADO','CONTACTOS','ENVIADOS','ENTREGADOS','LEÍDOS','RESPUESTAS','FECHA',''].map(h=>(
                    <th key={h} className="px-4 py-3 text-left mono text-xs text-[var(--text-muted)] tracking-widest font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {campaigns.length===0
                    ?<tr><td colSpan={10} className="px-5 py-8 text-center text-[var(--text-muted)] text-xs">Sin campañas — crea una nueva</td></tr>
                    :paginatedCampaigns.map((c,i)=>(
                    <tr key={i} className="border-b border-[var(--border-default)] hover:bg-[var(--border-default)] transition-colors">
                      <td className="px-4 py-3 text-sm text-[var(--text-primary)] font-medium">{c.name}</td>
                      <td className="px-4 py-3"><span className="mono text-xs text-[var(--text-muted)]">{c.template_name||'—'}</span></td>
                      <td className="px-4 py-3"><span className={`mono text-xs tracking-widest ${statusColor(c.status)}`}>{statusLabel(c.status)}</span></td>
                      <td className="px-4 py-3 mono text-sm text-[var(--text-primary)]">{c.total_contacts||'—'}</td>
                      <td className="px-4 py-3 mono text-sm text-[var(--text-primary)]">{c.sent_count}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="mono text-sm text-[var(--text-primary)]">{c.delivered_count}</span>{c.sent_count>0&&<span className="mono text-xs" style={{color:'var(--accent)'}}>{Math.round((c.delivered_count/c.sent_count)*100)}%</span>}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="mono text-sm text-[var(--text-primary)]">{c.read_count}</span>{c.delivered_count>0&&<span className="mono text-xs text-[var(--danger)]">{Math.round((c.read_count/c.delivered_count)*100)}%</span>}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="mono text-sm text-[var(--text-primary)]">{c.reply_count}</span>{c.sent_count>0&&<span className="mono text-xs text-[var(--success)]">{Math.round((c.reply_count/c.sent_count)*100)}%</span>}</div></td>
                      <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">{c.scheduled_at?format(new Date(c.scheduled_at),'dd/MM HH:mm'):'—'}</td>
                      <td className="px-4 py-3">
                        {(c.status==='scheduled'||c.status==='running')&&(
                          <div className="flex items-center gap-1">
                            {c.status==='running'&&(
                              <button onClick={()=>handleCampaignAction(c,'paused')} title="Pausar"
                                className="p-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--warning)] transition-colors group">
                                <Pause size={10} className="text-[var(--text-muted)] group-hover:text-[var(--warning)]"/>
                              </button>
                            )}
                            <button onClick={()=>handleCampaignAction(c,'cancelled')} title="Cancelar"
                              className="p-1.5 rounded-lg border border-[var(--border-default)] hover:border-[var(--danger)] transition-colors group">
                              <Square size={10} className="text-[var(--text-muted)] group-hover:text-[var(--danger)]"/>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {campaigns.length>PAGE_SIZE&&<Pagination total={campaigns.length} page={campaignsPage} pageSize={PAGE_SIZE} onPage={setCampaignsPage}/>}
          </div>
        </>}

         {/* ══ FUENTES ══ */}
        {activeTab==='fuentes'&&(
          <FuentesTab
            activeProjectId={activeProjectId}
            leads={leads}
            projects={projects}
          />
        )}

         {/* ══ VENTAS ══ */}
        {activeTab==='ventas'&&(
          <VentasTab
            activeProjectId={activeProjectId}
            projects={projects}
            onToast={addToast}
          />
        )}

            {/* ══ TRAFICKER ══ */}
        {activeTab==='traficker'&&(
          <TrafickerTab
            activeProjectId={activeProjectId}
            projects={projects}
            leads={leads}
            onToast={addToast}
          />
        )}

        {activeTab === 'sala' && (
          <SalaDeControlTab
            activeProjectId={activeProjectId}
            projects={projects}
            leads={leads}
            onToast={addToast}
          />
        )}

        {/* ══ GRUPOS ══ */}
        {activeTab === 'grupos' && (
         <GruposTab
          activeProjectId={activeProjectId}
          projects={projects}
          onToast={(t) => addToast(t.type, t.message)}
        />
      )}
            
        {/* ══ CONFIG ══ */}
        {activeTab==='config'&&(
          <div className="space-y-6">
            <HormoziConfigPanel
              activeProjectId={activeProjectId}
              projects={projects}
              onToast={addToast}
              onProjectsUpdate={setProjects}
            />
            <CredentialsVault
              activeProjectId={activeProjectId}
              projects={projects}
              onToast={addToast}
              onProjectsUpdate={setProjects}
            />
             <NexoTemplatesPanel
              activeProjectId={activeProjectId}
              onToast={addToast}
            />
          </div>
        )}

       {/* Footer */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2"><KanshiLogo size={14}/><p className="mono text-xs text-[var(--text-muted)]">KANSHI v2.0 — SUPABASE REALTIME</p></div>
          <p className="mono text-xs text-[var(--text-muted)]">SANTIAGO JIMÉNEZ · GROWTH PARTNER © 2026</p>
        </div>
          </div>{/* /max-w wrapper */}
        </main>{/* /scrollable content */}
      </div>{/* /workspace */}

      {selectedLead&&<LeadPanel lead={selectedLead} onClose={()=>setSelectedLead(null)}/>}
      {showCreator&&<CampaignCreator leads={leads} templates={templates} onClose={()=>setShowCreator(false)}
        onCreated={()=>{setShowCreator(false);fetchData();setActiveTab('campaigns');addToast('success','Campaña creada — el scheduler la procesará en ~5 min')}}/>}
      {showProjectWizard&&<ProjectWizard onClose={()=>setShowProjectWizard(false)} onCreated={handleProjectCreated}/>}
      {showAlerts && (
        <AlertsPanel
          projectId={activeProjectId}
          onClose={() => setShowAlerts(false)}
          onReadCountChange={fetchUnreadAlerts}
          onLeadClick={(phone) => {
            setJourneyPhone(phone)
            setShowAlerts(false)
          }}
        />
      )}
      <LeadJourneyDrawer phone={journeyPhone} onClose={() => setJourneyPhone(null)} />
      <ToastContainer toasts={toasts} onRemove={removeToast}/>
    </div>
  )
}

// ─── HORMOZI CONFIG PANEL (LP2) ───────────────────────────────────────────────

const EMPTY_PLAN: HormoziPlan = {
  id: 'plan_a', name: '', badge: null, price_anchor: 0, price_real: 0,
  billing: 'pago único', cta_text: '', cta_url: '', highlight: true, features: ['']
}

function HormoziConfigPanel({
  activeProjectId, projects, onToast, onProjectsUpdate
}: {
  activeProjectId: string | null
  projects: Project[]
  onToast: (type: Toast['type'], msg: string) => void
  onProjectsUpdate: (projects: Project[]) => void
}) {
  const project = projects.find(p => p.id === activeProjectId) || null
  const [saving, setSaving] = useState(false)
  const [logoUrl, setLogoUrl] = useState('')
  const [dreamOutcome, setDreamOutcome] = useState('')
  const [timeDelay, setTimeDelay] = useState('')
  const [effortSacrifice, setEffortSacrifice] = useState('')
  const [methodologyName, setMethodologyName] = useState('')
  const [guaranteeDays, setGuaranteeDays] = useState('')
  const [guaranteeText, setGuaranteeText] = useState('')
  const [urgencyReason, setUrgencyReason] = useState('')
  const [authorName, setAuthorName] = useState('')
  const [authorTitle, setAuthorTitle] = useState('')
  const [plans, setPlans] = useState<HormoziPlan[]>([
    { id: 'plan_a', name: '', badge: 'MÁS POPULAR', price_anchor: 0, price_real: 0, billing: 'pago único', cta_text: '', cta_url: '', highlight: true, features: [''] },
    { id: 'plan_b', name: '', badge: null, price_anchor: 0, price_real: 0, billing: 'pago único', cta_text: '', cta_url: '', highlight: false, features: [''] },
  ])
  const [offerStack, setOfferStack] = useState<OfferStackItem[]>([{ name: '', value: 0 }])
  const [testimonials, setTestimonials] = useState<Testimonial[]>([{ name: '', text: '', result: '' }])
  const [activeSection, setActiveSection] = useState<'oferta'|'planes'|'autor'|'social'>('oferta')

  // Cargar datos del proyecto activo
  useEffect(() => {
    if (!project) return
    const c = project.hormozi_config || {}
    setLogoUrl(project.logo_url || '')
    setDreamOutcome(c.dream_outcome || '')
    setTimeDelay(c.time_delay || '')
    setEffortSacrifice(c.effort_sacrifice || '')
    setMethodologyName(c.methodology_name || '')
    setGuaranteeDays(c.guarantee_days?.toString() || '')
    setGuaranteeText(c.guarantee_text || '')
    setUrgencyReason(c.urgency_reason || '')
    setAuthorName(c.letter_author_name || '')
    setAuthorTitle(c.letter_author_title || '')
    if (c.plans?.length) setPlans(c.plans)
    if (c.offer_stack?.length) setOfferStack(c.offer_stack)
    if (c.testimonials?.length) setTestimonials(c.testimonials)
  }, [activeProjectId])

  const handleSave = async () => {
    if (!project) return
    setSaving(true)
    const config: HormoziConfig = {
      dream_outcome: dreamOutcome || undefined,
      time_delay: timeDelay || undefined,
      effort_sacrifice: effortSacrifice || undefined,
      methodology_name: methodologyName || undefined,
      guarantee_days: guaranteeDays ? parseInt(guaranteeDays) : undefined,
      guarantee_text: guaranteeText || undefined,
      urgency_reason: urgencyReason || undefined,
      letter_author_name: authorName || undefined,
      letter_author_title: authorTitle || undefined,
      plans: plans.filter(p => p.name.trim()),
      offer_stack: offerStack.filter(o => o.name.trim()),
      testimonials: testimonials.filter(t => t.name.trim()),
    }
    const { error } = await supabase
      .from('kanshi_projects')
      .update({ hormozi_config: config, logo_url: logoUrl || null })
      .eq('id', project.id)
    if (error) {
      onToast('error', 'Error al guardar configuración')
    } else {
      onToast('success', '✅ Configuración de oferta guardada')
      onProjectsUpdate(projects.map(p => p.id === project.id
        ? { ...p, hormozi_config: config, logo_url: logoUrl || null }
        : p
      ))
    }
    setSaving(false)
  }

  // helpers para offer stack
  const updateOfferItem = (i: number, field: keyof OfferStackItem, val: string | number) => {
    setOfferStack(prev => prev.map((o, idx) => idx === i ? { ...o, [field]: val } : o))
  }
  const addOfferItem = () => setOfferStack(prev => [...prev, { name: '', value: 0 }])
  const removeOfferItem = (i: number) => setOfferStack(prev => prev.filter((_, idx) => idx !== i))

  // helpers para planes
  const updatePlan = (planIdx: number, field: keyof HormoziPlan, val: string | number | boolean) => {
    setPlans(prev => prev.map((p, i) => i === planIdx ? { ...p, [field]: val } : p))
  }
  const updatePlanFeature = (planIdx: number, featIdx: number, val: string) => {
    setPlans(prev => prev.map((p, i) => i === planIdx
      ? { ...p, features: p.features.map((f, j) => j === featIdx ? val : f) }
      : p
    ))
  }
  const addPlanFeature = (planIdx: number) => {
    setPlans(prev => prev.map((p, i) => i === planIdx ? { ...p, features: [...p.features, ''] } : p))
  }
  const removePlanFeature = (planIdx: number, featIdx: number) => {
    setPlans(prev => prev.map((p, i) => i === planIdx
      ? { ...p, features: p.features.filter((_, j) => j !== featIdx) }
      : p
    ))
  }

  // helpers para testimonios
  const updateTestimonial = (i: number, field: keyof Testimonial, val: string) => {
    setTestimonials(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t))
  }
  const addTestimonial = () => setTestimonials(prev => [...prev, { name: '', text: '', result: '' }])
  const removeTestimonial = (i: number) => setTestimonials(prev => prev.filter((_, idx) => idx !== i))

  const totalValue = offerStack.reduce((sum, o) => sum + (Number(o.value) || 0), 0)

  const SECTIONS = [
    { key: 'oferta', label: 'LA OFERTA', icon: '🎯' },
    { key: 'planes', label: 'PLANES', icon: '💳' },
    { key: 'autor', label: 'AUTOR & GARANTÍA', icon: '✍️' },
    { key: 'social', label: 'PRUEBA SOCIAL', icon: '⭐' },
  ] as const

  const inputCls = "w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)] transition-colors"
  const labelCls = "mono text-xs text-[var(--text-muted)] tracking-widest block mb-2"

  if (!project) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border-default)] p-12 text-center">
        <p className="text-3xl mb-3">🎯</p>
        <p className="mono text-[11px] text-[var(--text-muted)]">Selecciona un proyecto para configurar la oferta</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🎯</span>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">OFERTA HORMOZI — {(project.product_name || project.name).toUpperCase()}</p>
          </div>
          <p className="text-xs text-[var(--text-muted)]">Configura los parámetros de tu oferta irresistible para la landing personalizada</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold text-[var(--bg-base)] disabled:opacity-40 transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,var(--success),var(--accent))' }}>
          {saving
            ? <div className="w-3 h-3 border-2 border-[var(--bg-base)] border-t-transparent rounded-full animate-spin"/>
            : <CheckCircle size={12}/>}
          {saving ? 'GUARDANDO...' : 'GUARDAR OFERTA'}
        </button>
      </div>

      {/* Logo del producto */}
      <div className="rounded-2xl border border-[var(--border-default)] p-5 space-y-4" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-center gap-2">
          <Rocket size={12} style={{ color: 'var(--accent)' }}/>
          <p className="mono text-xs tracking-widest text-[var(--text-muted)]">IDENTIDAD DEL PRODUCTO</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>URL DEL LOGO</label>
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)}
              placeholder="https://tu-dominio.com/logo.png"
              className={inputCls}/>
            <p className="mono text-xs text-[var(--text-muted)] mt-1.5">Se mostrará en el header de la landing (no el logo de KANSHI)</p>
          </div>
          <div>
            {logoUrl ? (
              <div className="rounded-xl border border-[var(--border-default)] p-3 flex items-center justify-center h-full" style={{ background: 'var(--bg-base)' }}>
                <img src={logoUrl} alt="preview" className="max-h-12 max-w-full object-contain"
                  onError={e => { (e.target as HTMLImageElement).style.display='none' }}/>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-[var(--border-default)] p-3 flex items-center justify-center h-full">
                <p className="mono text-xs text-[#2E2E4E]">Preview logo aquí</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Nav secciones */}
      <div className="flex gap-1 p-1 rounded-2xl border border-[var(--border-default)]" style={{ background: 'var(--bg-card)' }}>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl transition-all mono text-xs tracking-widest"
            style={{
              background: activeSection === s.key ? 'var(--primary)' : 'transparent',
              color: activeSection === s.key ? '#fff' : 'var(--text-muted)'
            }}>
            <span>{s.icon}</span>{s.label}
          </button>
        ))}
      </div>

      {/* SECCIÓN: LA OFERTA */}
      {activeSection === 'oferta' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-default)] p-5 space-y-4" style={{ background: 'var(--bg-card)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">GRAN SLAM OFFER — ECUACIÓN DE VALOR</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>DREAM OUTCOME 🏆</label>
                <input value={dreamOutcome} onChange={e => setDreamOutcome(e.target.value)}
                  placeholder="Generar $5,000/mes con IA en 90 días"
                  className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>NOMBRE DEL MÉTODO</label>
                <input value={methodologyName} onChange={e => setMethodologyName(e.target.value)}
                  placeholder="SamurAI"
                  className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>TIME DELAY ⏱</label>
                <input value={timeDelay} onChange={e => setTimeDelay(e.target.value)}
                  placeholder="90 días"
                  className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>EFFORT & SACRIFICE 💪</label>
                <input value={effortSacrifice} onChange={e => setEffortSacrifice(e.target.value)}
                  placeholder="Sin experiencia técnica previa"
                  className={inputCls}/>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>RAZÓN DE URGENCIA / ESCASEZ</label>
                <input value={urgencyReason} onChange={e => setUrgencyReason(e.target.value)}
                  placeholder="Cupos limitados a 200 estudiantes · carrito cierra el 25 de Abril"
                  className={inputCls}/>
              </div>
            </div>
          </div>

          {/* Offer Stack */}
          <div className="rounded-2xl border border-[var(--border-default)] p-5 space-y-4" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="mono text-xs text-[var(--text-muted)] tracking-widest">OFFER STACK — LO QUE SE LLEVAN</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--success)' }}>
                  Valor total percibido: <span className="font-bold">${totalValue.toLocaleString()}</span>
                </p>
              </div>
              <button onClick={addOfferItem}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-default)] mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2E2E4E] transition-all">
                <Plus size={10}/> AGREGAR
              </button>
            </div>
            <div className="space-y-2">
              {offerStack.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1">
                    <input value={item.name} onChange={e => updateOfferItem(i, 'name', e.target.value)}
                      placeholder={`Entregable ${i + 1} (ej: Módulo 0: Base IA)`}
                      className={inputCls + ' text-xs'}/>
                  </div>
                  <div className="w-28">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">$</span>
                      <input value={item.value || ''} onChange={e => updateOfferItem(i, 'value', parseInt(e.target.value) || 0)}
                        placeholder="197" type="number"
                        className={inputCls + ' text-xs pl-6'}/>
                    </div>
                  </div>
                  {offerStack.length > 1 && (
                    <button onClick={() => removeOfferItem(i)}
                      className="p-2 rounded-xl border border-[var(--border-default)] text-[var(--text-muted)] hover:text-[var(--danger)] hover:border-[var(--danger)] transition-all">
                      <X size={10}/>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN: PLANES */}
      {activeSection === 'planes' && (
        <div className="grid grid-cols-2 gap-4">
          {plans.map((plan, planIdx) => (
            <div key={plan.id}
              className="rounded-2xl border p-5 space-y-4"
              style={{
                background: 'var(--bg-card)',
                borderColor: plan.highlight ? 'var(--primary)' : 'var(--border-default)'
              }}>
              <div className="flex items-center justify-between">
                <p className="mono text-xs tracking-widest" style={{ color: plan.highlight ? 'var(--accent)' : 'var(--text-muted)' }}>
                  PLAN {planIdx === 0 ? 'A — PRINCIPAL' : 'B — ALTERNATIVO'}
                </p>
                <button
                  onClick={() => setPlans(prev => prev.map((p, i) => ({ ...p, highlight: i === planIdx })))}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg mono text-xs transition-all"
                  style={{
                    background: plan.highlight ? 'var(--success)20' : 'transparent',
                    color: plan.highlight ? 'var(--success)' : 'var(--text-muted)',
                    border: `1px solid ${plan.highlight ? 'var(--success)40' : 'var(--border-default)'}`
                  }}>
                  {plan.highlight ? '★ DESTACADO' : '☆ Destacar'}
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className={labelCls}>NOMBRE DEL PLAN</label>
                  <input value={plan.name} onChange={e => updatePlan(planIdx, 'name', e.target.value)}
                    placeholder={planIdx === 0 ? 'SamurAI Completo' : 'SamurAI Básico'}
                    className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>BADGE (opcional)</label>
                  <input value={plan.badge || ''} onChange={e => updatePlan(planIdx, 'badge', e.target.value)}
                    placeholder="MÁS POPULAR"
                    className={inputCls}/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={labelCls}>PRECIO TACHADO</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">$</span>
                      <input value={plan.price_anchor || ''} onChange={e => updatePlan(planIdx, 'price_anchor', parseInt(e.target.value) || 0)}
                        placeholder="997" type="number"
                        className={inputCls + ' pl-6'}/>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>PRECIO REAL</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs">$</span>
                      <input value={plan.price_real || ''} onChange={e => updatePlan(planIdx, 'price_real', parseInt(e.target.value) || 0)}
                        placeholder="497" type="number"
                        className={inputCls + ' pl-6'}/>
                    </div>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>FORMA DE PAGO</label>
                  <input value={plan.billing} onChange={e => updatePlan(planIdx, 'billing', e.target.value)}
                    placeholder="pago único / 3 cuotas de $197"
                    className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>TEXTO DEL BOTÓN CTA</label>
                  <input value={plan.cta_text} onChange={e => updatePlan(planIdx, 'cta_text', e.target.value)}
                    placeholder="Quiero el plan completo →"
                    className={inputCls}/>
                </div>
                <div>
                  <label className={labelCls}>URL DE PAGO (Hotmart/Stripe)</label>
                  <input value={plan.cta_url} onChange={e => updatePlan(planIdx, 'cta_url', e.target.value)}
                    placeholder="https://pay.hotmart.com/..."
                    className={inputCls}/>
                </div>
                {/* Features */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className={labelCls + ' mb-0'}>QUÉ INCLUYE</label>
                    <button onClick={() => addPlanFeature(planIdx)}
                      className="mono text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition-colors flex items-center gap-1">
                      <Plus size={9}/> add
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    {plan.features.map((feat, featIdx) => (
                      <div key={featIdx} className="flex items-center gap-2">
                        <span className="text-[var(--success)] text-xs flex-shrink-0">✓</span>
                        <input value={feat} onChange={e => updatePlanFeature(planIdx, featIdx, e.target.value)}
                          placeholder="Módulo 1: Fundamentos IA"
                          className="flex-1 bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)] transition-colors"/>
                        {plan.features.length > 1 && (
                          <button onClick={() => removePlanFeature(planIdx, featIdx)}
                            className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                            <X size={9}/>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SECCIÓN: AUTOR & GARANTÍA */}
      {activeSection === 'autor' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border-default)] p-5 space-y-4" style={{ background: 'var(--bg-card)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">AUTOR DE LA CARTA PERSONAL</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>NOMBRE DEL AUTOR</label>
                <input value={authorName} onChange={e => setAuthorName(e.target.value)}
                  placeholder="Andreti"
                  className={inputCls}/>
                <p className="mono text-xs text-[var(--text-muted)] mt-1.5">Claude firmará la carta con este nombre</p>
              </div>
              <div>
                <label className={labelCls}>TÍTULO / ROL</label>
                <input value={authorTitle} onChange={e => setAuthorTitle(e.target.value)}
                  placeholder="Fundador de SamurAI"
                  className={inputCls}/>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-[var(--border-default)] p-5 space-y-4" style={{ background: 'var(--bg-card)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">GARANTÍA</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>DÍAS DE GARANTÍA</label>
                <input value={guaranteeDays} onChange={e => setGuaranteeDays(e.target.value)}
                  placeholder="30" type="number"
                  className={inputCls}/>
              </div>
              <div>
                <label className={labelCls}>TEXTO DE GARANTÍA</label>
                <input value={guaranteeText} onChange={e => setGuaranteeText(e.target.value)}
                  placeholder="Si no ves resultados en 30 días, devuelvo el 100%"
                  className={inputCls}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECCIÓN: PRUEBA SOCIAL */}
      {activeSection === 'social' && (
        <div className="rounded-2xl border border-[var(--border-default)] p-5 space-y-4" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between">
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">TESTIMONIOS</p>
            <button onClick={addTestimonial}
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[var(--border-default)] mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
              <Plus size={10}/> AGREGAR
            </button>
          </div>
          <div className="space-y-4">
            {testimonials.map((t, i) => (
              <div key={i} className="rounded-xl border border-[var(--border-default)] p-4 space-y-3" style={{ background: 'var(--bg-base)' }}>
                <div className="flex items-center justify-between">
                  <p className="mono text-xs text-[var(--text-muted)]">TESTIMONIO {i + 1}</p>
                  {testimonials.length > 1 && (
                    <button onClick={() => removeTestimonial(i)}
                      className="text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors">
                      <X size={11}/>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>NOMBRE</label>
                    <input value={t.name} onChange={e => updateTestimonial(i, 'name', e.target.value)}
                      placeholder="Carlos M." className={inputCls}/>
                  </div>
                  <div>
                    <label className={labelCls}>RESULTADO OBTENIDO</label>
                    <input value={t.result} onChange={e => updateTestimonial(i, 'result', e.target.value)}
                      placeholder="$2,000 en 60 días" className={inputCls}/>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>TESTIMONIO</label>
                  <textarea value={t.text} onChange={e => updateTestimonial(i, 'text', e.target.value)}
                    placeholder="En 60 días generé mis primeros $2,000 siguiendo el método..."
                    rows={2}
                    className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)] transition-colors resize-none"/>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview resumen */}
      <div className="rounded-2xl border border-[var(--border-default)] p-4" style={{ background: 'var(--bg-card)' }}>
        <p className="mono text-xs text-[#2E2E4E] tracking-widest mb-3">RESUMEN DE OFERTA CONFIGURADA</p>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Dream Outcome', value: dreamOutcome || '—' },
            { label: 'Autor carta', value: authorName ? `${authorName} · ${authorTitle}` : '—' },
            { label: 'Garantía', value: guaranteeDays ? `${guaranteeDays} días` : '—' },
            { label: 'Valor percibido', value: totalValue > 0 ? `$${totalValue.toLocaleString()}` : '—' },
            { label: 'Planes', value: plans.filter(p => p.name).length > 0 ? plans.filter(p => p.name).map(p => p.name).join(' · ') : '—' },
            { label: 'Testimonios', value: testimonials.filter(t => t.name).length > 0 ? `${testimonials.filter(t => t.name).length} configurados` : '—' },
          ].map(item => (
            <div key={item.label}>
              <p className="mono text-xs text-[var(--text-muted)] mb-1">{item.label.toUpperCase()}</p>
              <p className="text-xs text-[var(--text-primary)] truncate">{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}


// ─── CAMPAIGN CREATOR ────────────────────────────────────────────────────────

interface CreatorProps { leads:Lead[]; templates:Template[]; onClose:()=>void; onCreated:()=>void }

function CampaignCreator({ leads,templates,onClose,onCreated }:CreatorProps) {
  const [step,setStep] = useState(1)
  const [saving,setSaving] = useState(false)
  const [error,setError] = useState('')
  const [campaignName,setCampaignName] = useState('')
  const [selectedTemplate,setSelectedTemplate] = useState<Template|null>(null)
  const [templateVars,setTemplateVars] = useState<{index:number;type:'field'|'fixed';value:string;fallback:string}[]>([])
  const [filterSegmento,setFilterSegmento] = useState<string[]>([])
  const [filterStage,setFilterStage] = useState<string[]>([])
  const [filterUrgencia,setFilterUrgencia] = useState<string[]>([])
  const [filterCompromiso,setFilterCompromiso] = useState<string[]>([])
  const [minScore,setMinScore] = useState(0)
  const [sendNow,setSendNow] = useState(true)
  const [scheduledDate,setScheduledDate] = useState('')
  const [scheduledTime,setScheduledTime] = useState('')

  const detectVars = (tpl:Template) => {
    const matches=(tpl.body_text||'').match(/\{\{\d+\}\}/g)||[]
    const count=new Set(matches).size
    setTemplateVars(Array.from({length:count},(_,i)=>({index:i+1,type:'field' as const,value:'name',fallback:'Amigo'})))
  }
  const FIELD_OPTIONS=[{value:'name',label:'Nombre del contacto'},{value:'contact_number',label:'Número de teléfono'}]

  const filteredLeads = useMemo(()=>leads.filter(l=>{
    if(filterSegmento.length>0&&!filterSegmento.includes(l.segmento)) return false
    if(filterStage.length>0&&!filterStage.includes(l.agent_stage)) return false
    if(filterUrgencia.length>0&&!filterUrgencia.includes(l.urgencia_financiera)) return false
    if(filterCompromiso.length>0&&!filterCompromiso.includes(l.nivel_compromiso)) return false
    if(minScore>0&&l.engagement_score<minScore) return false
    return true
  }),[leads,filterSegmento,filterStage,filterUrgencia,filterCompromiso,minScore])

  const toggleFilter=(arr:string[],setArr:(v:string[])=>void,val:string)=>
    setArr(arr.includes(val)?arr.filter(v=>v!==val):[...arr,val])

  const handleCreate = async () => {
    if(!campaignName.trim()||!selectedTemplate||filteredLeads.length===0) return
    setSaving(true); setError('')
    try {
      const scheduled_at=sendNow?new Date().toISOString():new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
      const {data:camp,error:campErr}=await supabase.from('wa_campaigns').insert({
        name:campaignName.trim(),status:'scheduled',scheduled_at,
        template_name:selectedTemplate.name,language_code:selectedTemplate.language,
        template_params:templateVars.map(v=>({type:v.type,value:v.value,fallback:v.fallback})),
        total_contacts:filteredLeads.length,sent_count:0,delivered_count:0,read_count:0,reply_count:0,
      }).select().single()
      if(campErr) throw campErr
      const contacts=filteredLeads.map(l=>({campaign_id:camp.id,contact_number:l.phone_number,contact_name:l.name||'',status:'pending'}))
      const {error:contErr}=await supabase.from('wa_campaign_contacts').insert(contacts)
      if(contErr) throw contErr
      onCreated()
    } catch(e:any){setError(e?.message||'Error al crear la campaña')}
    finally{setSaving(false)}
  }

  const canNext1=campaignName.trim().length>0&&selectedTemplate!==null
  const canNext2=filteredLeads.length>0
  const canConfirm=canNext1&&canNext2&&(sendNow||(scheduledDate&&scheduledTime))

  return(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-2xl rounded-2xl border border-[var(--border-default)] overflow-hidden" style={{background:'#0D0D14',maxHeight:'90vh',overflowY:'auto'}}>
        <div className="px-6 py-5 border-b border-[var(--border-default)] flex items-center justify-between sticky top-0 z-10" style={{background:'rgba(13,13,20,0.98)'}}>
          <div>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">NUEVA CAMPAÑA — PASO {step} DE 3</p>
            <p className="font-semibold text-[var(--text-primary)] text-sm mt-0.5">
              {step===1?'Template y nombre':step===2?'Segmentación de audiencia':'Programación y confirmación'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--danger)] transition-colors group"><X size={12} className="text-[var(--text-muted)] group-hover:text-[var(--danger)]"/></button>
        </div>
        <div className="h-0.5 bg-[var(--border-default)]">
          <div className="h-full transition-all duration-500" style={{width:`${(step/3)*100}%`,background:'linear-gradient(90deg,var(--primary),#00a7e3)'}}/>
        </div>

        <div className="p-6 space-y-5">
          {step===1&&<>
            <div>
              <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">NOMBRE DE LA CAMPAÑA</label>
              <input value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="ej. Live 1 — Leads Calientes"
                className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)]"/>
            </div>
            <div>
              <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">SELECCIONAR TEMPLATE</label>
              {templates.length===0
                ?<div className="rounded-xl border border-dashed border-[var(--border-default)] p-6 text-center"><p className="text-[var(--text-muted)] text-xs">No hay templates aprobados</p></div>
                :<div className="space-y-2">
                  {templates.map(t=>(
                    <div key={t.id} onClick={()=>{setSelectedTemplate(t);detectVars(t)}}
                      className="rounded-xl border p-4 cursor-pointer transition-all"
                      style={{borderColor:selectedTemplate?.id===t.id?'var(--accent)':'var(--border-default)',background:selectedTemplate?.id===t.id?'rgba(0,176,246,0.05)':'var(--bg-card)'}}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{background:selectedTemplate?.id===t.id?'var(--accent)':'#2A2A3A'}}/>
                          <span className="font-medium text-sm text-[var(--text-primary)]">{t.display_name||t.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="mono text-xs px-2 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-muted)]">{t.language}</span>
                          <span className="mono text-xs px-2 py-0.5 rounded-full border text-[var(--accent)]" style={{borderColor:'rgba(0,176,246,0.4)'}}>{t.category||'MARKETING'}</span>
                        </div>
                      </div>
                      <p className="mono text-xs text-[var(--text-muted)]">{t.name}</p>
                      {t.body_text&&<p className="text-[11px] text-[#6A6A8A] mt-2 leading-relaxed line-clamp-2">{t.body_text}</p>}
                    </div>
                  ))}
                </div>
              }
            </div>
            {selectedTemplate&&templateVars.length>0&&(
              <div>
                <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">VARIABLES — {templateVars.length} detectada{templateVars.length>1?'s':''}</label>
                <div className="space-y-2">
                  {templateVars.map((v,i)=>(
                    <div key={i} className="rounded-xl border border-[var(--border-default)] p-3 space-y-2" style={{background:'var(--bg-card)'}}>
                      <div className="flex items-center gap-2">
                        <span className="mono text-xs px-2 py-0.5 rounded-full border text-[var(--accent)]" style={{borderColor:'rgba(0,176,246,0.4)'}}>{'{{'}{v.index}{'}}'}</span>
                        <span className="mono text-xs text-[var(--text-muted)]">Parámetro {v.index}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="mono text-xs text-[var(--text-muted)] mb-1">TIPO</p>
                          <div className="flex gap-2">
                            {(['field','fixed'] as const).map(t=>(
                              <button key={t} onClick={()=>{const nv=[...templateVars];nv[i]={...nv[i],type:t};setTemplateVars(nv)}}
                                className="px-2 py-1 rounded-lg border mono text-xs transition-all"
                                style={{borderColor:v.type===t?'var(--accent)':'var(--border-default)',color:v.type===t?'var(--accent)':'var(--text-muted)',background:v.type===t?'rgba(0,176,246,0.1)':'transparent'}}>
                                {t==='field'?'CAMPO':'FIJO'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mono text-xs text-[var(--text-muted)] mb-1">{v.type==='field'?'CAMPO DEL CONTACTO':'TEXTO FIJO'}</p>
                          {v.type==='field'
                            ?<select value={v.value} onChange={e=>{const nv=[...templateVars];nv[i]={...nv[i],value:e.target.value};setTemplateVars(nv)}}
                                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none">
                                {FIELD_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            :<input value={v.value} onChange={e=>{const nv=[...templateVars];nv[i]={...nv[i],value:e.target.value};setTemplateVars(nv)}}
                                placeholder="Texto fijo..." className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"/>
                          }
                        </div>
                      </div>
                      {v.type==='field'&&(
                        <div>
                          <p className="mono text-xs text-[var(--text-muted)] mb-1">FALLBACK (si el campo está vacío)</p>
                          <input value={v.fallback} onChange={e=>{const nv=[...templateVars];nv[i]={...nv[i],fallback:e.target.value};setTemplateVars(nv)}}
                            placeholder="ej. Amigo" className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"/>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedTemplate&&templateVars.length===0&&(
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border-default)]" style={{background:'var(--bg-card)'}}>
                <div className="w-1.5 h-1.5 rounded-full" style={{background:'var(--accent)'}}/>
                <span className="mono text-xs text-[var(--text-muted)]">Template sin variables — se envía directo sin parámetros</span>
              </div>
            )}
          </>}

          {step===2&&<>
            <div className="flex items-center justify-between p-3 rounded-xl border" style={{borderColor:'rgba(0,176,246,0.4)',background:'rgba(0,176,246,0.05)'}}>
              <div className="flex items-center gap-2"><Filter size={12} style={{color:'var(--accent)'}}/><span className="mono text-xs tracking-widest" style={{color:'var(--accent)'}}>AUDIENCIA SELECCIONADA</span></div>
              <span className="mono text-lg font-bold" style={{color:'var(--accent)'}}>{filteredLeads.length} leads</span>
            </div>
            <FilterGroup label="SEGMENTO" options={['caliente','templado','frio']} selected={filterSegmento}
              onToggle={v=>toggleFilter(filterSegmento,setFilterSegmento,v)}
              colors={{'caliente':'var(--danger)','templado':'var(--warning)','frio':'var(--accent)'}}/>
            <FilterGroup label="ETAPA" options={STAGES.map(s=>s.key)} selected={filterStage}
              onToggle={v=>toggleFilter(filterStage,setFilterStage,v)}
              labels={Object.fromEntries(STAGES.map(s=>[s.key,s.label]))}/>
            <FilterGroup label="URGENCIA FINANCIERA" options={['alta','media','baja']} selected={filterUrgencia}
              onToggle={v=>toggleFilter(filterUrgencia,setFilterUrgencia,v)}
              colors={{'alta':'var(--danger)','media':'var(--warning)','baja':'var(--text-muted)'}}/>
            <FilterGroup label="NIVEL COMPROMISO" options={['alto','medio','bajo']} selected={filterCompromiso}
              onToggle={v=>toggleFilter(filterCompromiso,setFilterCompromiso,v)}
              colors={{'alto':'var(--success)','medio':'var(--warning)','bajo':'var(--text-muted)'}}/>
            <div>
              <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">ENGAGEMENT SCORE MÍNIMO — {minScore===0?'Sin filtro':`>= ${minScore}`}</label>
              <input type="range" min={0} max={10} value={minScore} onChange={e=>setMinScore(Number(e.target.value))}
                className="w-full h-1 bg-[var(--border-default)] rounded-full outline-none" style={{accentColor:'var(--accent)'}}/>
              <div className="flex justify-between mt-1">{[0,2,4,6,8,10].map(n=><span key={n} className="mono text-xs text-[var(--text-muted)]">{n}</span>)}</div>
            </div>
            {filteredLeads.length>0&&(
              <div>
                <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-2">PREVIEW — primeros {Math.min(5,filteredLeads.length)} leads</p>
                <div className="space-y-1.5">
                  {filteredLeads.slice(0,5).map((l,i)=>(
                    <div key={i} className="flex items-center justify-between rounded-xl border border-[var(--border-default)] px-3 py-2" style={{background:'var(--bg-card)'}}>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{background:segColor(l.segmento)}}/>
                        <span className="text-xs text-[var(--text-primary)]">{l.name||l.phone_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StagePill stage={l.agent_stage}/>
                        <span className="mono text-xs font-bold" style={{color:scoreColor(l.engagement_score)}}>{l.engagement_score||'—'}</span>
                      </div>
                    </div>
                  ))}
                  {filteredLeads.length>5&&<p className="mono text-xs text-[var(--text-muted)] text-center">+{filteredLeads.length-5} más</p>}
                </div>
              </div>
            )}
          </>}

          {step===3&&<>
            <div>
              <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-3">CUÁNDO ENVIAR</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setSendNow(true)} className="rounded-xl border p-4 text-left transition-all"
                  style={{borderColor:sendNow?'var(--accent)':'var(--border-default)',background:sendNow?'rgba(0,176,246,0.05)':'transparent'}}>
                  <div className="flex items-center gap-2 mb-1"><Rocket size={12} style={{color:sendNow?'var(--accent)':'var(--text-muted)'}}/><span className="mono text-xs tracking-widest" style={{color:sendNow?'var(--accent)':'var(--text-muted)'}}>AHORA MISMO</span></div>
                  <p className="text-xs text-[#6A6A8A]">El scheduler lo enviará en el próximo ciclo de 5 min</p>
                </button>
                <button onClick={()=>setSendNow(false)} className="rounded-xl border p-4 text-left transition-all"
                  style={{borderColor:!sendNow?'var(--accent)':'var(--border-default)',background:!sendNow?'rgba(0,176,246,0.05)':'transparent'}}>
                  <div className="flex items-center gap-2 mb-1"><Calendar size={12} style={{color:!sendNow?'var(--accent)':'var(--text-muted)'}}/><span className="mono text-xs tracking-widest" style={{color:!sendNow?'var(--accent)':'var(--text-muted)'}}>PROGRAMAR</span></div>
                  <p className="text-xs text-[#6A6A8A]">Elige fecha y hora específica</p>
                </button>
              </div>
            </div>
            {!sendNow&&(
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">FECHA</label>
                  <input type="date" value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors"/>
                </div>
                <div>
                  <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">HORA</label>
                  <input type="time" value={scheduledTime} onChange={e=>setScheduledTime(e.target.value)}
                    className="w-full bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors"/>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-[var(--border-default)] p-4 space-y-3" style={{background:'var(--bg-card)'}}>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">RESUMEN DE CAMPAÑA</p>
              <SummaryRow label="Nombre" value={campaignName}/>
              <SummaryRow label="Template" value={selectedTemplate?.name||'—'}/>
              <SummaryRow label="Idioma" value={selectedTemplate?.language||'—'}/>
              <SummaryRow label="Contactos" value={`${filteredLeads.length} leads seleccionados`} highlight/>
              <SummaryRow label="Envío" value={sendNow?'Inmediato (próx. ciclo ~5min)':`${scheduledDate} a las ${scheduledTime}`}/>
            </div>
            {error&&<div className="rounded-xl border border-[var(--danger)] bg-[var(--danger)10] p-3"><p className="text-xs text-[var(--danger)]">{error}</p></div>}
          </>}
        </div>

        <div className="px-6 py-4 border-t border-[var(--border-default)] flex items-center justify-between sticky bottom-0" style={{background:'rgba(13,13,20,0.98)'}}>
          <button onClick={()=>step>1?setStep(step-1):onClose()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-default)] mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2E2E4E] transition-all">
            <ChevronLeft size={12}/> {step===1?'CANCELAR':'ANTERIOR'}
          </button>
          {step<3
            ?<button onClick={()=>setStep(step+1)} disabled={step===1?!canNext1:!canNext2}
                className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{background:'linear-gradient(135deg,var(--primary),#00a7e3)'}}>
                SIGUIENTE <ChevronRight size={12}/>
              </button>
            :<button onClick={handleCreate} disabled={!canConfirm||saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{background:'linear-gradient(135deg,var(--primary),#00a7e3)'}}>
                {saving?<><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> CREANDO...</>:<><Rocket size={12}/> CREAR CAMPAÑA</>}
              </button>
          }
        </div>
      </div>
    </div>
  )
}

// ─── KANSHI SCORE WIDGET ──────────────────────────────────────────────────────

const KANSHI_SEGMENTS = [
  { key: 'frio',     label: 'Frío',     color: 'var(--accent)', range: '0–25'  },
  { key: 'templado', label: 'Templado', color: 'var(--warning)', range: '26–50' },
  { key: 'caliente', label: 'Caliente', color: 'var(--danger)', range: '51–75' },
  { key: 'listo',    label: 'Listo',    color: 'var(--success)', range: '76–100'},
]

function KanshiScoreWidget({ leads }: { leads: Lead[] }) {
  const scored = leads.filter(l => l.kanshi_score > 0)

  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((s, l) => s + (l.kanshi_score || 0), 0) / scored.length)
    : 0

  const segCounts = KANSHI_SEGMENTS.map(seg => ({
    ...seg,
    count: leads.filter(l => (l.kanshi_segment || 'frio') === seg.key).length,
  }))

  const total = leads.length
  const donutData = segCounts.map(s => ({ name: s.label, value: s.count, color: s.color }))

  const gaugeColor = avgScore >= 76 ? 'var(--success)'
    : avgScore >= 51 ? 'var(--danger)'
    : avgScore >= 26 ? 'var(--warning)'
    : 'var(--accent)'

  const listos = leads.filter(l => (l.kanshi_segment || 'frio') === 'listo').length

  return (
    <div className="rounded-xl border border-[var(--border-default)] p-5" style={{ background: 'var(--bg-card)' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest">KANSHI SCORE</p>
          <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">Calificación de leads 0–100</p>
        </div>
        {listos > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[var(--success)40] bg-[var(--success)10]">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-[var(--success)]"/>
            <span className="mono text-xs font-bold text-[var(--success)]">{listos} LISTOS</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Gauge numérico */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--border-default)" strokeWidth="10"/>
              <circle cx="50" cy="50" r="38" fill="none" stroke={gaugeColor} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - avgScore / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
            </svg>
            <div className="text-center z-10">
              <p className="mono text-2xl font-bold leading-none" style={{ color: gaugeColor }}>{avgScore}</p>
              <p className="mono text-[8px] text-[var(--text-muted)] tracking-widest mt-0.5">PROM</p>
            </div>
          </div>
          <p className="mono text-xs text-[var(--text-muted)] mt-2">{scored.length} evaluados</p>
        </div>

        {/* Donut + leyenda */}
        <div className="flex-1 flex items-center gap-4">
          {total > 0 ? (
            <ResponsiveContainer width={100} height={100}>
              <PieChart>
                <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={28} outerRadius={46} paddingAngle={2}>
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={d.value === 0 ? 0.15 : 0.85}/>)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-[100px] h-[100px] flex items-center justify-center">
              <div className="w-[72px] h-[72px] rounded-full border-[10px] border-[var(--border-default)]"/>
            </div>
          )}

          <div className="flex-1 space-y-2">
            {segCounts.map(seg => (
              <div key={seg.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }}/>
                  <span className="mono text-xs text-[var(--text-primary)]">{seg.label}</span>
                  <span className="mono text-xs text-[var(--text-muted)]">{seg.range}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono text-[11px] font-bold" style={{ color: seg.color }}>{seg.count}</span>
                  <span className="mono text-xs text-[var(--text-muted)] w-8 text-right">
                    {total > 0 ? `${Math.round((seg.count / total) * 100)}%` : '0%'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────

function SummaryRow({label,value,highlight}:{label:string;value:string;highlight?:boolean}) {
  return(
    <div className="flex items-center justify-between">
      <span className="mono text-xs text-[var(--text-muted)]">{label}</span>
      <span className="mono text-[11px]" style={{color:highlight?'var(--accent)':'var(--text-primary)',fontWeight:highlight?'bold':'normal'}}>{value}</span>
    </div>
  )
}

interface FGProps {label:string;options:string[];selected:string[];onToggle:(v:string)=>void;colors?:Record<string,string>;labels?:Record<string,string>}
function FilterGroup({label,options,selected,onToggle,colors={},labels={}}:FGProps) {
  return(
    <div>
      <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o=>{
          const active=selected.includes(o); const color=colors[o]||'var(--text-muted)'
          const lbl=labels[o]||o.charAt(0).toUpperCase()+o.slice(1)
          return(
            <button key={o} onClick={()=>onToggle(o)}
              className="px-3 py-1.5 rounded-full border mono text-xs transition-all"
              style={{borderColor:active?color:`${color}40`,background:active?`${color}20`:'transparent',color:active?color:'var(--text-muted)'}}>
              {lbl}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Sec({label,children}:{label:string;children:React.ReactNode}){
  return <div><p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-3">{label}</p>{children}</div>
}

function KCard({icon,label,value,color,isPercent}:{icon:React.ReactNode;label:string;value:number|string;color:string;isPercent?:boolean}){
  return(
    <div className="rounded-xl border border-[var(--border-default)] p-4 hover:border-[#2E2E4E] transition-all" style={{background:'var(--bg-card)'}}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:`${color}18`,color}}>{icon}</div>
        {isPercent&&<div className="w-1.5 h-1.5 rounded-full" style={{background:color}}/>}
      </div>
      <p className="mono text-[28px] font-bold leading-none" style={{color}}>{value}</p>
      <p className="mono text-xs text-[var(--text-muted)] tracking-widest mt-2">{label}</p>
    </div>
  )
}

function StagePill({stage}:{stage:string}){
  const s=STAGE_MAP[stage]||{label:stage,color:'var(--text-muted)'}
  return <span className="mono text-xs tracking-widest px-2 py-0.5 rounded-full border" style={{color:s.color,borderColor:`${s.color}40`,background:`${s.color}10`}}>{s.label.toUpperCase()}</span>
}

function MiniDist({title,data,total}:{title:string;data:{name:string;value:number;color:string}[];total:number}){
  return(
    <div className="rounded-xl border border-[var(--border-default)] p-5" style={{background:'var(--bg-card)'}}>
      <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-4">{title}</p>
      {data.length===0?<p className="text-[var(--text-muted)] text-xs text-center mt-6">Sin datos</p>:<>
        <div className="flex items-center justify-center mb-4">
          <ResponsiveContainer width={120} height={120}>
            <PieChart><Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
              {data.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.85}/>)}
            </Pie></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">{data.map((d,i)=>(
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:d.color}}/><span className="mono text-xs text-[var(--text-primary)]">{d.name}</span></div>
            <div className="flex items-center gap-2">
              <span className="mono text-xs" style={{color:d.color}}>{d.value}</span>
              <span className="mono text-xs text-[var(--text-muted)]">{total>0?`${Math.round((d.value/total)*100)}%`:'0%'}</span>
            </div>
          </div>
        ))}</div>
      </>}
    </div>
  )
}

function LeadPanel({lead,onClose}:{lead:Lead;onClose:()=>void}){
  const stage=STAGE_MAP[lead.agent_stage]||{label:lead.agent_stage,color:'var(--text-muted)'}
  return(
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-[460px] border-l border-[var(--border-default)] overflow-y-auto flex-shrink-0" style={{background:'#0D0D14'}}>
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-[var(--border-default)] flex items-center justify-between" style={{background:'rgba(13,13,20,0.97)'}}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${stage.color}20`}}><User size={16} style={{color:stage.color}}/></div>
            <div><p className="font-semibold text-[var(--text-primary)] text-sm">{lead.name||'Sin nombre'}</p><p className="mono text-xs text-[var(--text-muted)]">{lead.phone_number}</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--danger)] transition-colors group"><X size={12} className="text-[var(--text-muted)] group-hover:text-[var(--danger)]"/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <StagePill stage={lead.agent_stage}/>
            {lead.segmento&&<div className="flex items-center gap-1 px-2 py-0.5 rounded-full border" style={{borderColor:`${segColor(lead.segmento)}40`,background:`${segColor(lead.segmento)}10`}}>{segIcon(lead.segmento)}<span className="mono text-xs" style={{color:segColor(lead.segmento)}}>{lead.segmento}</span></div>}
            {lead.engagement_score>0&&<div className="flex items-center gap-1"><Star size={10} style={{color:scoreColor(lead.engagement_score)}}/><span className="mono text-xs font-bold" style={{color:scoreColor(lead.engagement_score)}}>{lead.engagement_score}/10</span></div>}
          </div>
          <div className="space-y-2">
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">PERFIL PSICOGRÁFICO</p>
            <PField label="SITUACIÓN ACTUAL" value={lead.situacion_actual} icon={<User size={11}/>}/>
            <PField label="DOLOR DECLARADO" value={lead.dolor_declarado} icon={<AlertCircle size={11}/>} color="var(--danger)"/>
            <PField label="DOLOR PROFUNDO" value={lead.dolor_profundo} icon={<Heart size={11}/>} color="#C084FC"/>
            <PField label="SUEÑO DECLARADO" value={lead.sueno_declarado} icon={<Star size={11}/>} color="var(--success)"/>
            <PField label="OBJECIÓN PROBABLE" value={lead.objecion_probable} icon={<AlertCircle size={11}/>} color="var(--warning)"/>
            <PField label="ESTILO DE DECISIÓN" value={lead.estilo_decision} icon={<Brain size={11}/>} color="var(--accent)"/>
          </div>
          <div className="space-y-2">
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">MÉTRICAS</p>
            <div className="grid grid-cols-2 gap-2">
              <MPin label="URGENCIA" value={lead.urgencia_financiera} color={urgColor(lead.urgencia_financiera)}/>
              <MPin label="COMPROMISO" value={lead.nivel_compromiso} color={comColor(lead.nivel_compromiso)}/>
              <MPin label="PREGUNTAS" value={lead.preguntas_respondidas?.toString()} color="var(--text-muted)"/>
              <MPin label="ACTUALIZADO" value={lead.updated_at?format(new Date(lead.updated_at),'dd/MM HH:mm'):'—'} color="var(--text-muted)"/>
            </div>
          </div>
          {(lead.kanshi_score||0)>0&&(
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="mono text-xs text-[var(--text-muted)] tracking-widest">KANSHI SCORE</p>
                <span className="mono text-sm font-bold"
                  style={{color:lead.kanshi_segment==='listo'?'var(--success)':lead.kanshi_segment==='caliente'?'var(--danger)':lead.kanshi_segment==='templado'?'var(--warning)':'var(--accent)'}}>
                  {lead.kanshi_score}/100
                </span>
              </div>
              <div className="rounded-xl border border-[var(--border-default)] p-4 space-y-3" style={{background:'var(--bg-card)'}}>
                {[
                  {label:'FIT DEL PERFIL',    value: (lead as any).score_fit        ?? 0, max:25, color:'#C084FC'},
                  {label:'ENGAGEMENT ACTIVO', value: (lead as any).score_engagement ?? 0, max:35, color:'var(--accent)'},
                  {label:'INTENCIÓN DECLARADA',value:(lead as any).score_intencion  ?? 0, max:25, color:'var(--danger)'},
                  {label:'CALIDAD DE FUENTE', value: (lead as any).score_fuente     ?? 0, max:15, color:'var(--warning)'},
                ].map(dim=>(
                  <div key={dim.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="mono text-xs text-[var(--text-muted)] tracking-widest">{dim.label}</span>
                      <span className="mono text-xs font-bold" style={{color:dim.color}}>{dim.value}<span className="text-[var(--text-muted)] font-normal">/{dim.max}</span></span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{background:'var(--border-default)'}}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{width:`${Math.round((dim.value/dim.max)*100)}%`,background:dim.color,opacity:0.8}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lead.resumen_perfil&&<div className="space-y-2">
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">RESUMEN</p>
            <div className="rounded-xl border border-[var(--border-default)] p-4" style={{background:'var(--bg-card)'}}><p className="text-xs text-[var(--text-primary)] leading-relaxed">{lead.resumen_perfil}</p></div>
          </div>}
        </div>
      </div>
    </div>
  )
}

function PField({label,value,icon,color='var(--text-primary)'}:{label:string;value:string;icon:React.ReactNode;color?:string}){
  if(!value) return null
  return(
    <div className="rounded-xl border border-[var(--border-default)] p-3" style={{background:'var(--bg-card)'}}>
      <div className="flex items-center gap-1.5 mb-1.5"><span style={{color}}>{icon}</span><span className="mono text-xs tracking-widest" style={{color:`${color}99`}}>{label}</span></div>
      <p className="text-xs text-[var(--text-primary)] leading-relaxed">{value}</p>
    </div>
  )
}

function MPin({label,value,color}:{label:string;value:string|undefined;color:string}){
  return(
    <div className="rounded-xl border border-[var(--border-default)] px-3 py-2" style={{background:'var(--bg-card)'}}>
      <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-0.5">{label}</p>
      <p className="mono text-xs font-bold" style={{color}}>{value||'—'}</p>
    </div>
  )
}

// ─── PAGINATION ───────────────────────────────────────────────────────────────

function Pagination({total,page,pageSize,onPage}:{total:number;page:number;pageSize:number;onPage:(p:number)=>void}){
  const totalPages=Math.ceil(total/pageSize)
  if(totalPages<=1) return null
  const from=(page-1)*pageSize+1; const to=Math.min(page*pageSize,total)
  const pages:(number|'…')[]= []
  if(totalPages<=7){for(let i=1;i<=totalPages;i++) pages.push(i)}
  else{
    pages.push(1)
    if(page>4) pages.push('…')
    const start=Math.max(2,page-2); const end=Math.min(totalPages-1,page+2)
    for(let i=start;i<=end;i++) pages.push(i)
    if(page<totalPages-3) pages.push('…')
    pages.push(totalPages)
  }
  return(
    <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border-default)]">
      <span className="mono text-xs text-[var(--text-muted)]">{from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={()=>onPage(page-1)} disabled={page===1}
          className="p-1.5 rounded-lg border border-[var(--border-default)] disabled:opacity-30 hover:border-[var(--accent)] transition-colors group disabled:cursor-not-allowed">
          <ChevronLeft size={11} className="text-[var(--text-muted)] group-hover:text-[var(--accent)]"/>
        </button>
        {pages.map((p,i)=>
          p==='…'
            ?<span key={`e-${i}`} className="mono text-xs text-[var(--text-muted)] px-1">…</span>
            :<button key={p} onClick={()=>onPage(p as number)}
                className="min-w-[28px] h-7 rounded-lg border mono text-xs transition-all"
                style={{borderColor:page===p?'var(--accent)':'var(--border-default)',background:page===p?'rgba(0,176,246,0.12)':'transparent',color:page===p?'var(--accent)':'var(--text-muted)'}}>
                {p}
              </button>
        )}
        <button onClick={()=>onPage(page+1)} disabled={page===totalPages}
          className="p-1.5 rounded-lg border border-[var(--border-default)] disabled:opacity-30 hover:border-[var(--accent)] transition-colors group disabled:cursor-not-allowed">
          <ChevronRight size={11} className="text-[var(--text-muted)] group-hover:text-[var(--accent)]"/>
        </button>
      </div>
    </div>
  )
}

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────

function ToastContainer({toasts,onRemove}:{toasts:Toast[];onRemove:(id:string)=>void}){
  const icons:Record<Toast['type'],React.ReactNode>={
    success:<CheckCircle size={13} style={{color:'var(--success)'}}/>,
    error:<AlertCircle size={13} style={{color:'var(--danger)'}}/>,
    warning:<AlertCircle size={13} style={{color:'var(--warning)'}}/>,
    info:<Info size={13} style={{color:'var(--accent)'}}/>,
  }
  const borders:Record<Toast['type'],string>={success:'var(--success)',error:'var(--danger)',warning:'var(--warning)',info:'var(--accent)'}
  if(toasts.length===0) return null
  return(
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t=>(
        <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border pointer-events-auto"
          style={{background:'var(--bg-card)',borderColor:`${borders[t.type]}40`,boxShadow:`0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${borders[t.type]}20`,minWidth:'260px',maxWidth:'380px',animation:'slideInRight 0.25s ease'}}>
          {icons[t.type]}
          <span className="text-xs text-[var(--text-primary)] flex-1 leading-snug">{t.message}</span>
          <button onClick={()=>onRemove(t.id)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0 ml-1"><X size={11}/></button>
        </div>
      ))}
    </div>
  )
}


// ─── CREDENTIALS VAULT ────────────────────────────────────────────────────────

interface Credential {
  id: string
  name: string
  type: string
  credentials: {
    phone_number_id?: string
    waba_id?: string
    access_token?: string
    display_phone_number?: string
    quality_rating?: string
    messaging_limit_tier?: string
    last_verified?: string
  }
  is_active: boolean
  created_at: string
}

// ─── CREDENTIAL CARD ──────────────────────────────────────────────────────────

function CredentialCard({ cred, onToast, onRefresh, qrColor, tierLabel }: {
  cred: Credential
  onToast: (type: Toast['type'], msg: string) => void
  onRefresh: () => void
  qrColor: (r?: string) => string
  tierLabel: (t?: string) => string
}) {
  const [verifying, setVerifying] = useState(false)

  const handleVerify = async () => {
    setVerifying(true)
    try {
      const res = await fetch('/api/validate-wa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number_id: cred.credentials.phone_number_id,
          access_token: cred.credentials.access_token,
        })
      })
      const result = await res.json()
      if (result.error) {
        onToast('error', `Error: ${result.error}`)
      } else {
        const updated = {
          ...cred.credentials,
          display_phone_number: result.display_phone_number,
          quality_rating: result.quality_rating,
          messaging_limit_tier: result.messaging_limit_tier,
          last_verified: new Date().toISOString(),
        }
        await supabase.from('kanshi_credentials').update({ credentials: updated }).eq('id', cred.id)
        onToast('success', `✓ ${result.display_phone_number} — ${result.quality_rating}`)
        onRefresh()
      }
    } catch {
      onToast('error', 'Error de conexión')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="rounded-xl border border-[var(--border-default)] overflow-hidden" style={{ background: 'var(--bg-card)' }}>
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,176,246,0.1)', border: '1px solid rgba(0,176,246,0.2)' }}>
            <MessageSquare size={14} style={{ color: 'var(--accent)' }}/>
          </div>
          <div>
            <p className="font-semibold text-[var(--text-primary)] text-sm">{cred.name}</p>
            <p className="mono text-xs text-[var(--text-muted)]">
              {cred.credentials.display_phone_number || `ID: ${cred.credentials.phone_number_id?.slice(0,8)}...`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {cred.credentials.quality_rating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: `${qrColor(cred.credentials.quality_rating)}15`, border: `1px solid ${qrColor(cred.credentials.quality_rating)}40` }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: qrColor(cred.credentials.quality_rating) }}/>
              <span className="mono text-xs font-bold tracking-widest" style={{ color: qrColor(cred.credentials.quality_rating) }}>
                {cred.credentials.quality_rating}
              </span>
            </div>
          )}
          {cred.credentials.messaging_limit_tier && (
            <span className="mono text-xs text-[var(--text-muted)] px-2 py-1 rounded-lg border border-[var(--border-default)]">
              {tierLabel(cred.credentials.messaging_limit_tier)}
            </span>
          )}
          {cred.credentials.last_verified && (
            <span className="mono text-xs text-[#2E2E4E]">
              verificado {format(new Date(cred.credentials.last_verified), 'dd/MM HH:mm')}
            </span>
          )}
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] mono text-xs text-[var(--text-muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {verifying
              ? <><div className="w-3 h-3 border border-[var(--accent)] border-t-transparent rounded-full animate-spin"/> VERIFICANDO</>
              : <><Activity size={11}/> VERIFICAR</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PROJECT CREDENTIAL ROW (F5) ─────────────────────────────────────────────

function ProjectCredentialRow({ project, credentials, onToast, onUpdate }: {
  project: Project
  credentials: Credential[]
  onToast: (type: Toast['type'], msg: string) => void
  onUpdate: (projectId: string, credentialId: string | null) => void
}) {
  const [value, setValue] = useState<string>(project.credential_id || '')
  const [saving, setSaving] = useState(false)

  const handleChange = async (newId: string) => {
    setValue(newId)
    setSaving(true)
    const { error } = await supabase
      .from('kanshi_projects')
      .update({ credential_id: newId || null })
      .eq('id', project.id)
    setSaving(false)
    if (error) {
      onToast('error', 'Error al asignar credencial')
    } else {
      onUpdate(project.id, newId || null)
      onToast('success', `Credencial asignada a ${project.name}`)
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg" style={{ background: 'var(--bg-base)' }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base">{project.emoji || '🚀'}</span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[var(--text-primary)] truncate">{project.name}</p>
          <p className="mono text-xs text-[var(--text-muted)]">{project.status.toUpperCase()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {saving && <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}/>}
        <select
          value={value}
          onChange={e => handleChange(e.target.value)}
          className="mono text-xs rounded-lg px-2 py-1.5 border outline-none text-[var(--text-primary)]"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-default)', minWidth: '180px' }}>
          <option value="">— Sin asignar —</option>
          {credentials.map(c => (
            <option key={c.id} value={c.id}>
              {c.credentials.display_phone_number || c.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

// ─── CREDENTIALS VAULT ────────────────────────────────────────────────────────

function CredentialsVault({
  activeProjectId, projects, onToast, onProjectsUpdate
}: {
  activeProjectId: string|null
  projects: Project[]
  onToast: (type: Toast['type'], msg: string) => void
  onProjectsUpdate: (projects: Project[]) => void
}) {
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const fetchCredentials = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('kanshi_credentials')
      .select('*')
      .eq('type', 'whatsapp')
      .order('created_at', { ascending: false })
    if (!error && data) setCredentials(data as Credential[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCredentials() }, [fetchCredentials])

  const qrColor = (r?: string) =>
    r === 'GREEN' ? 'var(--success)' : r === 'YELLOW' ? 'var(--warning)' : r === 'RED' ? 'var(--danger)' : 'var(--text-muted)'
  const tierLabel = (t?: string) =>
    ({ TIER_50:'50/día', TIER_250:'250/día', TIER_1K:'1K/día', TIER_10K:'10K/día', TIER_100K:'100K/día' }[t||''] || t || '—')

  const handleProjectUpdate = (projectId: string, credentialId: string | null) => {
    onProjectsUpdate(projects.map(p => p.id === projectId ? { ...p, credential_id: credentialId } : p))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest">CREDENCIALES — WHATSAPP BUSINESS</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">{credentials.length} número{credentials.length!==1?'s':''} registrado{credentials.length!==1?'s':''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold mono text-[11px] tracking-widest transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,var(--primary),#00a7e3)' }}>
          <Plus size={13}/> AGREGAR NÚMERO
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}/>
        </div>
      ) : credentials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border-default)] p-12 text-center">
          <div className="w-12 h-12 rounded-xl border border-[var(--border-default)] flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={20} className="text-[var(--text-muted)]"/>
          </div>
          <p className="text-sm text-[var(--text-muted)] mb-1">Sin números registrados</p>
          <p className="mono text-xs text-[#2E2E4E] tracking-widest">Agrega tu Phone ID, Token y WABA ID de Meta</p>
        </div>
      ) : (
        <div className="space-y-3">
          {credentials.map(cred => (
            <CredentialCard
              key={cred.id}
              cred={cred}
              onToast={onToast}
              onRefresh={fetchCredentials}
              qrColor={qrColor}
              tierLabel={tierLabel}
            />
          ))}
        </div>
      )}


      {/* Meta Ads CAPI */}
      <MetaAdsCard onToast={onToast} />
      
      {/* ── F5: ASIGNAR NÚMERO A PROYECTO ── */}
      {projects.length > 0 && credentials.length > 0 && (
        <div className="rounded-xl border border-[var(--border-default)] p-4 space-y-3" style={{ background: 'var(--bg-card)' }}>
          <div className="flex items-center gap-2">
            <Rocket size={12} style={{ color: 'var(--accent)' }}/>
            <p className="mono text-xs tracking-widest text-[var(--text-muted)]">ASIGNAR NÚMERO A PROYECTO</p>
          </div>
          <div className="space-y-2">
            {projects.map(proj => (
              <ProjectCredentialRow
                key={proj.id}
                project={proj}
                credentials={credentials}
                onToast={onToast}
                onUpdate={handleProjectUpdate}
              />
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <AddCredentialModal
          onClose={() => setShowForm(false)}
          onCreated={() => { setShowForm(false); fetchCredentials(); onToast('success', 'Credencial guardada') }}
          onToast={onToast}
        />
      )}
    </div>
  )
}

// ─── ADD CREDENTIAL MODAL ─────────────────────────────────────────────────────

function CInput({ label, value, onChange, placeholder, type='text', masked=false }: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; type?: string; masked?: boolean
}) {
  const [show, setShow] = useState(false)
  return (
    <div>
      <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">{label}</label>
      <div className="relative">
        <input
          type={masked ? (show ? 'text' : 'password') : type}
          value={value} onChange={onChange} placeholder={placeholder}
          className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--primary)]"
          style={{ paddingRight: masked ? '40px' : undefined }}
        />
        {masked && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            {show ? <EyeOff size={13}/> : <Eye size={13}/>}
          </button>
        )}
      </div>
    </div>
  )
}

function AddCredentialModal({
  onClose, onCreated, onToast
}: {
  onClose: () => void
  onCreated: () => void
  onToast: (type: Toast['type'], msg: string) => void
}) {
  const [name, setName] = useState('')
  const [phoneId, setPhoneId] = useState('')
  const [wabaId, setWabaId] = useState('')
  const [token, setToken] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const canSave = name.trim() && phoneId.trim() && token.trim()

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true); setError('')
    try {
      const { error: err } = await supabase.from('kanshi_credentials').insert({
        name: name.trim(),
        type: 'whatsapp',
        is_active: true,
        credentials: {
          phone_number_id: phoneId.trim(),
          waba_id: wabaId.trim() || null,
          access_token: token.trim(),
        }
      })
      if (err) throw err
      onCreated()
    } catch (e: any) {
      setError(e?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--border-default)] overflow-hidden"
        style={{ background: '#0D0D14', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="px-6 py-5 border-b border-[var(--border-default)] flex items-center justify-between">
          <div>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">NUEVO NÚMERO WHATSAPP</p>
            <p className="font-semibold text-[var(--text-primary)] text-sm mt-0.5">Credenciales de Meta Business</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--danger)] transition-colors group">
            <X size={12} className="text-[var(--text-muted)] group-hover:text-[var(--danger)]"/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border"
            style={{ borderColor: 'rgba(0,176,246,0.3)', background: 'rgba(0,176,246,0.05)' }}>
            <Info size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}/>
            <p className="mono text-xs text-[var(--text-muted)] leading-relaxed">
              Encontrarás estos datos en Meta Business Manager → WhatsApp → Configuración del número
            </p>
          </div>
          <CInput label="NOMBRE / ALIAS *" value={name} onChange={e=>setName(e.target.value)} placeholder="ej. SamurAI Principal"/>
          <CInput label="PHONE NUMBER ID *" value={phoneId} onChange={e=>setPhoneId(e.target.value)} placeholder="ej. 123456789012345"/>
          <CInput label="WABA ID (WhatsApp Business Account)" value={wabaId} onChange={e=>setWabaId(e.target.value)} placeholder="ej. 987654321098765"/>
          <CInput label="ACCESS TOKEN *" value={token} onChange={e=>setToken(e.target.value)} placeholder="EAAxxxxxxx..." masked/>
          {error && (
            <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger)10] px-4 py-3">
              <p className="text-xs text-[var(--danger)]">{error}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[var(--border-default)] flex items-center justify-between"
          style={{ background: 'rgba(13,13,20,0.98)' }}>
          <button onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border-default)] mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2E2E4E] transition-all">
            <X size={12}/> CANCELAR
          </button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,var(--primary),#00a7e3)' }}>
            {saving
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> GUARDANDO...</>
              : <><CheckCircle size={12}/> GUARDAR CREDENCIAL</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════
// INSTRUCCIONES DE INSERCIÓN — SP7 NEXO TEMPLATES PANEL
// ═══════════════════════════════════════════════════════════════════════
//
// CAMBIO 1: En el bloque activeTab==='config' (línea ~1967)
// Agrega <NexoTemplatesPanel> DESPUÉS de <CredentialsVault>:
//
//   {activeTab==='config'&&(
//     <div className="space-y-6">
//       <HormoziConfigPanel ... />
//       <CredentialsVault ... />
//       <NexoTemplatesPanel                     ← AGREGAR ESTO
//         activeProjectId={activeProjectId}
//         onToast={addToast}
//       />
//     </div>
//   )}
//
// CAMBIO 2: Pegar el componente NexoTemplatesPanel después de la línea 3550
// (justo antes del comentario "// ─── META ADS CREDENTIAL CARD")
// ═══════════════════════════════════════════════════════════════════════

// ─── NEXO TEMPLATES PANEL (SP7) ───────────────────────────────────────────────

interface SamTemplate {
  id: string
  project_id: string
  name: string
  stage: string
  scenario: string
  trigger_condition: string | null
  content: string
  meta_template_name: string
  meta_template_approved: boolean
  language: string
  is_active: boolean
  created_at: string
}

const STAGE_OPTIONS = [
  'registered','confirming','profiling','warming',
  'live_tracking','post_live','classes','vip','closing','post_sale'
]

const STAGE_LABELS: Record<string, string> = {
  registered: 'Registrado', confirming: 'Confirmando', profiling: 'Perfilando',
  warming: 'Calentamiento', live_tracking: 'LIVE Tracking', post_live: 'Post LIVE',
  classes: 'Clases', vip: 'VIP', closing: 'Cierre', post_sale: 'Post Venta'
}

const STATUS_CFG = {
  approved:   { label: 'APROBADO',  bg: 'rgba(0,255,148,0.1)',  border: 'rgba(0,255,148,0.3)',  color: 'var(--success)' },
  pending:    { label: 'PENDIENTE', bg: 'rgba(255,184,0,0.1)',  border: 'rgba(255,184,0,0.3)',  color: 'var(--warning)' },
  rejected:   { label: 'RECHAZADO', bg: 'rgba(255,107,53,0.1)', border: 'rgba(255,107,53,0.3)', color: 'var(--danger)' },
  inactive:   { label: 'INACTIVO',  bg: 'rgba(74,74,106,0.15)', border: 'rgba(74,74,106,0.4)', color: 'var(--text-muted)' },
}

function templateStatus(t: SamTemplate) {
  if (!t.meta_template_approved) return 'pending'
  if (!t.is_active) return 'inactive'
  return 'approved'
}

function NexoTemplatesPanel({
  activeProjectId,
  onToast,
}: {
  activeProjectId: string | null
  onToast: (type: Toast['type'], msg: string) => void
}) {
  const [templates, setTemplates] = useState<SamTemplate[]>([])
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editStage, setEditStage] = useState('')
  const [editScenario, setEditScenario] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    if (!activeProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/sync-meta-templates?project_id=${activeProjectId}`)
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch {
      onToast('error', 'Error cargando templates')
    } finally {
      setLoading(false)
    }
  }, [activeProjectId, onToast])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleSync = async () => {
    if (!activeProjectId) return
    setSyncing(true)
    try {
      const res = await fetch('/api/sync-meta-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: activeProjectId }),
      })
      const data = await res.json()
      if (data.error) {
        onToast('error', data.error)
      } else {
        onToast('success', data.message)
        await fetchTemplates()
      }
    } catch {
      onToast('error', 'Error al sincronizar con Meta')
    } finally {
      setSyncing(false)
    }
  }

  const startEdit = (t: SamTemplate) => {
    setEditingId(t.id)
    setEditStage(t.stage)
    setEditScenario(t.scenario)
  }

  const saveEdit = async (id: string) => {
    try {
      const res = await fetch('/api/sync-meta-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, stage: editStage, scenario: editScenario }),
      })
      const data = await res.json()
      if (data.error) {
        onToast('error', data.error)
      } else {
        onToast('success', 'Template actualizado')
        setEditingId(null)
        await fetchTemplates()
      }
    } catch {
      onToast('error', 'Error guardando cambios')
    }
  }

  const toggleActive = async (t: SamTemplate) => {
    // Solo permitir desactivar templates aprobados — nunca activar uno no aprobado
    if (!t.meta_template_approved && !t.is_active) {
      onToast('warning', 'Este template no está aprobado por Meta — no se puede activar')
      return
    }
    try {
      await fetch('/api/sync-meta-templates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id, is_active: !t.is_active }),
      })
      await fetchTemplates()
    } catch {
      onToast('error', 'Error actualizando template')
    }
  }

  // Agrupar por stage para mostrar organizado
  const byStage = STAGE_OPTIONS.reduce<Record<string, SamTemplate[]>>((acc, s) => {
    const items = templates.filter(t => t.stage === s)
    if (items.length) acc[s] = items
    return acc
  }, {})

  const approvedCount = templates.filter(t => t.meta_template_approved).length
  const pendingCount  = templates.filter(t => !t.meta_template_approved).length

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--bg-card)', borderColor: 'rgba(0,176,246,0.2)' }}>

      {/* Header */}
      <div className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(0,176,246,0.15)', background: 'rgba(0,176,246,0.04)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base flex-shrink-0"
            style={{ background: 'rgba(0,176,246,0.1)', border: '1px solid rgba(0,176,246,0.3)' }}>
            🤖
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>NEXO — Templates Meta</p>
            <p className="mono text-xs tracking-widest mt-0.5" style={{ color: 'var(--text-muted)' }}>
              SINCRONIZACIÓN AUTOMÁTICA · WHATSAPP BUSINESS API
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Counters */}
          {templates.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-mono"
                style={{ background: 'rgba(0,255,148,0.1)', color: 'var(--success)', border: '1px solid rgba(0,255,148,0.3)' }}>
                {approvedCount} aprobados
              </span>
              {pendingCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono"
                  style={{ background: 'rgba(255,184,0,0.1)', color: 'var(--warning)', border: '1px solid rgba(255,184,0,0.3)' }}>
                  {pendingCount} pendientes
                </span>
              )}
            </div>
          )}
          {/* Sync button */}
          <button
            onClick={handleSync}
            disabled={syncing || !activeProjectId}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
            style={{
              background: syncing ? 'rgba(0,176,246,0.1)' : 'rgba(0,176,246,0.15)',
              border: '1px solid rgba(0,176,246,0.4)',
              color: 'var(--accent)',
            }}
          >
            <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Sincronizando...' : 'Sync desde Meta'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {!activeProjectId ? (
          <p className="text-center text-sm py-8" style={{ color: 'var(--text-muted)' }}>
            Selecciona un proyecto para ver sus templates
          </p>
        ) : loading ? (
          <div className="flex items-center justify-center py-10 gap-3">
            <RefreshCw size={14} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Cargando templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-3">📋</p>
            <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>Sin templates sincronizados</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
              Haz clic en "Sync desde Meta" para importar tus templates aprobados
            </p>
            <p className="text-xs px-4 py-3 rounded-xl inline-block"
              style={{ background: 'rgba(255,184,0,0.07)', border: '1px solid rgba(255,184,0,0.2)', color: 'var(--warning)' }}>
              ⚠️ Asegúrate de tener el WABA ID y Access Token configurados en Credenciales
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(byStage).map(([stage, stageTemplates]) => (
              <div key={stage}>
                {/* Stage header */}
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
                  <span className="px-2 py-0.5 rounded text-xs font-mono tracking-wider"
                    style={{ background: '#1A1A2E', color: 'var(--text-muted)', border: '1px solid var(--border-default)' }}>
                    {STAGE_LABELS[stage] || stage.toUpperCase()}
                  </span>
                  <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
                </div>

                {/* Templates del stage */}
                <div className="space-y-2">
                  {stageTemplates.map(t => {
                    const status = templateStatus(t)
                    const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG]
                    const isEditing = editingId === t.id
                    const isExpanded = expandedId === t.id

                    return (
                      <div key={t.id} className="rounded-xl border overflow-hidden"
                        style={{ background: '#0D0D14', borderColor: 'var(--border-default)' }}>

                        {/* Template row */}
                        <div className="px-4 py-3 flex items-center gap-3">
                          {/* Status badge */}
                          <span className="px-2 py-0.5 rounded text-xs font-mono flex-shrink-0"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                            {cfg.label}
                          </span>

                          {/* Name */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                              {t.meta_template_name}
                            </p>
                            <p className="text-[11px] mono" style={{ color: 'var(--text-muted)' }}>
                              {t.language.toUpperCase()} · {t.scenario}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {/* Expand body */}
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : t.id)}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ color: 'var(--text-muted)', background: isExpanded ? '#1A1A2E' : 'transparent' }}
                              title="Ver contenido"
                            >
                              <Eye size={13} />
                            </button>

                            {/* Edit stage */}
                            {!isEditing ? (
                              <button
                                onClick={() => startEdit(t)}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--text-muted)' }}
                                title="Editar stage"
                              >
                                <Settings size={13} />
                              </button>
                            ) : (
                              <button
                                onClick={() => saveEdit(t.id)}
                                className="p-1.5 rounded-lg transition-all"
                                style={{ color: 'var(--success)' }}
                                title="Guardar"
                              >
                                <CheckCircle size={13} />
                              </button>
                            )}

                            {/* Toggle active */}
                            <button
                              onClick={() => toggleActive(t)}
                              className="p-1.5 rounded-lg transition-all"
                              style={{ color: t.is_active ? 'var(--success)' : 'var(--text-muted)' }}
                              title={t.is_active ? 'Desactivar' : 'Activar'}
                            >
                              {t.is_active ? <CheckCheck size={13} /> : <Pause size={13} />}
                            </button>
                          </div>
                        </div>

                        {/* Edit row */}
                        {isEditing && (
                          <div className="px-4 pb-3 flex items-center gap-3 border-t"
                            style={{ borderColor: 'var(--border-default)' }}>
                            <div className="flex-1">
                              <p className="text-xs mono mb-1" style={{ color: 'var(--text-muted)' }}>STAGE</p>
                              <select
                                value={editStage}
                                onChange={e => setEditStage(e.target.value)}
                                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                                style={{ background: '#1A1A2E', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                              >
                                {STAGE_OPTIONS.map(s => (
                                  <option key={s} value={s}>{STAGE_LABELS[s]} ({s})</option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <p className="text-xs mono mb-1" style={{ color: 'var(--text-muted)' }}>SCENARIO</p>
                              <select
                                value={editScenario}
                                onChange={e => setEditScenario(e.target.value)}
                                className="w-full text-xs px-2 py-1.5 rounded-lg outline-none"
                                style={{ background: '#1A1A2E', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                              >
                                <option value="system_initiated">system_initiated</option>
                                <option value="user_initiated">user_initiated</option>
                              </select>
                            </div>
                            <button
                              onClick={() => setEditingId(null)}
                              className="mt-4 p-1.5 rounded-lg"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        )}

                        {/* Expanded body */}
                        {isExpanded && t.content && (
                          <div className="px-4 pb-3 border-t" style={{ borderColor: 'var(--border-default)' }}>
                            <p className="text-xs mono mb-2 mt-2" style={{ color: 'var(--text-muted)' }}>CONTENIDO</p>
                            <p className="text-xs leading-relaxed p-3 rounded-lg whitespace-pre-wrap"
                              style={{ background: 'var(--bg-base)', color: '#A0A0C0', border: '1px solid var(--border-default)' }}>
                              {t.content}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}

            {/* Templates sin stage reconocido */}
            {templates.filter(t => !STAGE_OPTIONS.includes(t.stage)).length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
                  <span className="px-2 py-0.5 rounded text-xs font-mono"
                    style={{ background: '#1A1A2E', color: 'var(--danger)', border: '1px solid rgba(255,107,53,0.3)' }}>
                    SIN STAGE ASIGNADO
                  </span>
                  <div className="h-px flex-1" style={{ background: 'var(--border-default)' }} />
                </div>
                {templates.filter(t => !STAGE_OPTIONS.includes(t.stage)).map(t => (
                  <div key={t.id} className="rounded-xl border px-4 py-3 flex items-center gap-3 mb-2"
                    style={{ background: '#0D0D14', borderColor: 'rgba(255,107,53,0.2)' }}>
                    <span className="text-xs flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{t.meta_template_name}</span>
                    <button onClick={() => startEdit(t)}
                      className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: 'rgba(255,107,53,0.1)', color: 'var(--danger)', border: '1px solid rgba(255,107,53,0.3)' }}>
                      Asignar stage
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Note */}
            <p className="text-xs mono text-center pt-1" style={{ color: '#2E2E4E' }}>
              EL SYNC PRESERVA TUS ASIGNACIONES DE STAGE · SOLO ACTUALIZA STATUS Y CONTENIDO
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── META ADS CREDENTIAL CARD ─────────────────────────────────────────────────

function MetaAdsCard({ onToast }: { onToast: (type: Toast['type'], msg: string) => void }) {
  const [cred, setCred] = useState<{ id: string; credentials: any } | null>(null)
  const [editing, setEditing] = useState(false)
  const [pixelId, setPixelId] = useState('')
  const [capiToken, setCapiToken] = useState('')
  const [adAccountId, setAdAccountId] = useState('')
  const [marketingToken, setMarketingToken] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchMeta = useCallback(async () => {
    const { data } = await supabase
      .from('kanshi_credentials')
      .select('id, credentials')
      .eq('type', 'meta_ads')
      .limit(1)
      .maybeSingle()
    if (data) {
      setCred(data)
      setPixelId(data.credentials.pixel_id || '')
      setCapiToken(data.credentials.capi_token || '')
      setAdAccountId(data.credentials.ad_account_id || '')
      setMarketingToken(data.credentials.marketing_api_token || '')
    }
  }, [])

  useEffect(() => { fetchMeta() }, [fetchMeta])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = {
        name: 'Meta Ads CAPI',
        type: 'meta_ads',
        is_active: true,
        credentials: {
          pixel_id: pixelId.trim(),
          capi_token: capiToken.trim(),
          ad_account_id: adAccountId.trim(),
          marketing_api_token: marketingToken.trim(),
        }
      }
      if (cred) {
        await supabase.from('kanshi_credentials').update({ credentials: payload.credentials }).eq('id', cred.id)
      } else {
        await supabase.from('kanshi_credentials').insert(payload)
      }
      await fetchMeta()
      setEditing(false)
      onToast('success', 'Meta Ads actualizado')
    } catch (e: any) {
      onToast('error', e?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const isCAPIConfigured = cred && cred.credentials.pixel_id && cred.credentials.capi_token
  const isAdsConfigured = cred && cred.credentials.ad_account_id && cred.credentials.marketing_api_token

  return (
    <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden" style={{ background: 'var(--bg-card)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[var(--border-default)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{ background: 'rgba(0,176,246,0.1)', border: '1px solid rgba(0,176,246,0.2)' }}>
            📡
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Meta Ads — CAPI + Marketing API</p>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest mt-0.5">
              {isCAPIConfigured ? `Pixel: ${cred.credentials.pixel_id}` : 'CAPI sin configurar'}
              {isAdsConfigured ? ` · Ads: ${cred.credentials.ad_account_id}` : ' · Marketing API sin configurar'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            {isCAPIConfigured && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"/>
                <span className="mono text-[8px] text-[var(--success)] tracking-widest">CAPI</span>
              </div>
            )}
            {isAdsConfigured && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(0,20,173,0.15)', border: '1px solid rgba(0,20,173,0.4)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse"/>
                <span className="mono text-[8px] text-[var(--accent)] tracking-widest">ADS API</span>
              </div>
            )}
          </div>
          <button onClick={() => setEditing(e => !e)}
            className="px-3 py-1.5 rounded-lg border border-[var(--border-default)] mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2E2E4E] transition-all">
            {editing ? 'CANCELAR' : (isCAPIConfigured || isAdsConfigured) ? 'EDITAR' : 'CONFIGURAR'}
          </button>
        </div>
      </div>

      {/* Form */}
      {editing && (
        <div className="p-5 space-y-5">
          {/* CAPI section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-[var(--border-default)]"/>
              <span className="mono text-xs text-[var(--success)] tracking-widest">CONVERSIONS API (CAPI)</span>
              <div className="h-px flex-1 bg-[var(--border-default)]"/>
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border"
              style={{ borderColor: 'rgba(0,176,246,0.3)', background: 'rgba(0,176,246,0.05)' }}>
              <Info size={12} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: 1 }}/>
              <p className="mono text-xs text-[var(--text-muted)] leading-relaxed">
                Events Manager → Pixel → Configuración → API de conversiones → Generar token
              </p>
            </div>
            <CInput label="PIXEL ID" value={pixelId} onChange={e => setPixelId(e.target.value)} placeholder="ej. 120057833094582"/>
            <CInput label="CAPI ACCESS TOKEN" value={capiToken} onChange={e => setCapiToken(e.target.value)} placeholder="EAAxxxxx..." masked/>
          </div>

          {/* Marketing API section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-px flex-1 bg-[var(--border-default)]"/>
              <span className="mono text-xs text-[var(--primary)] tracking-widest">MARKETING API (COSTOS REALES)</span>
              <div className="h-px flex-1 bg-[var(--border-default)]"/>
            </div>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border"
              style={{ borderColor: 'rgba(0,20,173,0.3)', background: 'rgba(0,20,173,0.05)' }}>
              <Info size={12} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }}/>
              <p className="mono text-xs text-[var(--text-muted)] leading-relaxed">
                Meta Business Manager → Administrador de anuncios → ID de cuenta publicitaria (formato: 123456789)
              </p>
            </div>
            <CInput label="AD ACCOUNT ID" value={adAccountId} onChange={e => setAdAccountId(e.target.value)} placeholder="ej. 123456789012345"/>
            <CInput label="MARKETING API TOKEN" value={marketingToken} onChange={e => setMarketingToken(e.target.value)} placeholder="EAAxxxxx..." masked/>
          </div>

          <button onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,var(--primary),#00a7e3)' }}>
            {saving
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> GUARDANDO...</>
              : <><CheckCircle size={12}/> GUARDAR META ADS</>
            }
          </button>
        </div>
      )}
    </div>
  )
}

// ─── META ADS INTELLIGENCE PANEL ─────────────────────────────────────────────

interface MetaInsight {
  id: string
  project_id: string | null
  fetched_at: string
  date_range: string
  date_start: string | null
  date_stop: string | null
  total_spend: number
  total_impressions: number
  total_clicks: number
  total_reach: number
  total_leads: number
  cpm: number | null
  cpc: number | null
  ctr: number | null
  cost_per_lead: number | null
  campaigns: Array<{
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
    objective: string
  }>
}

function MetaAdsIntelligencePanel({
  activeProjectId,
  groups,
}: {
  activeProjectId: string | null
  groups: Array<{ campaign: string; compradores: number; totalLeads: number }>
}) {
  const [insight, setInsight] = useState<MetaInsight | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adsConfigured, setAdsConfigured] = useState<boolean | null>(null)
  const [dateRange, setDateRange] = useState('last_30d')
  const [objectiveFilter, setObjectiveFilter] = useState<string>('all')

  const OBJECTIVE_LABELS: Record<string, string> = {
    'LEAD_GENERATION': 'Lead Ads',
    'MESSAGES': 'WhatsApp',
    'CONVERSIONS': 'Conversiones',
    'LINK_CLICKS': 'Tráfico',
    'OUTCOME_LEADS': 'Leads (new)',
    'OUTCOME_TRAFFIC': 'Tráfico (new)',
    'OUTCOME_ENGAGEMENT': 'Engagement',
    'REACH': 'Alcance',
    'BRAND_AWARENESS': 'Branding',
    'VIDEO_VIEWS': 'Video',
    'POST_ENGAGEMENT': 'Engagement',
  }
  const objLabel = (o: string) => OBJECTIVE_LABELS[o] || o || '—'

  // Check if Marketing API is configured
  useEffect(() => {
    supabase
      .from('kanshi_credentials')
      .select('credentials')
      .eq('type', 'meta_ads')
      .maybeSingle()
      .then(({ data }) => {
        setAdsConfigured(!!(data?.credentials?.ad_account_id && data?.credentials?.marketing_api_token))
      })
  }, [])

  const fetchInsights = useCallback(async (forceRefresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ date_range: dateRange })
      if (activeProjectId) params.set('project_id', activeProjectId)
      if (forceRefresh) params.set('refresh', 'true')
      const res = await fetch(`/api/meta-ads-insights?${params}`)
      const json = await res.json()
      if (json.success) {
        setInsight(json.data)
      } else {
        setError(json.error || 'Error al cargar datos')
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }, [activeProjectId, dateRange])

  useEffect(() => {
    if (adsConfigured) fetchInsights()
  }, [adsConfigured, fetchInsights])

  // Build compradores map from UTM groups for CPB calculation
  const compradorMap = useMemo(() => {
    const m: Record<string, number> = {}
    for (const g of groups) {
      const key = (g.campaign || '').toLowerCase().trim()
      if (key) m[key] = (m[key] || 0) + g.compradores
    }
    return m
  }, [groups])

  const fmt$ = (n: number) => n === 0 ? '$0' : n < 1 ? `$${n.toFixed(3)}` : `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const fmtK = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toString()

  // Not configured state
  if (adsConfigured === false) {
    return (
      <div className="rounded-2xl border border-[var(--border-default)] p-6" style={{ background: 'var(--bg-card)' }}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
            style={{ background: 'rgba(0,20,173,0.1)', border: '1px solid rgba(0,20,173,0.3)' }}>
            📊
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Meta Ads Intelligence</p>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest mt-1">
              Configura tu Ad Account ID y Marketing API Token en Configuración → Credenciales para ver costos reales.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (adsConfigured === null) return null

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: 'var(--bg-card)', borderColor: 'rgba(0,20,173,0.3)' }}>

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b flex items-center justify-between"
        style={{ borderColor: 'rgba(0,20,173,0.2)', background: 'rgba(0,20,173,0.05)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'rgba(0,20,173,0.2)' }}>
            📊
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Meta Ads Intelligence</p>
            {insight && (
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest mt-0.5">
                {insight.date_start && insight.date_stop
                  ? `${insight.date_start} → ${insight.date_stop}`
                  : dateRange.replace('last_', 'ÚLTIMOS ').replace('d', ' DÍAS')}
                {' · '}
                <span style={{ color: 'var(--text-muted)' }}>actualizado {new Date(insight.fetched_at).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Objective filter */}
          {insight && insight.campaigns.length > 0 && (() => {
            const objectives = Array.from(new Set(insight.campaigns.map(c => c.objective).filter(Boolean)))
            if (objectives.length < 2) return null
            return (
              <select
                value={objectiveFilter}
                onChange={e => setObjectiveFilter(e.target.value)}
                className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 mono text-xs text-[var(--text-muted)] outline-none hover:border-[#2E2E4E] transition-colors"
              >
                <option value="all">Todos los objetivos</option>
                {objectives.map(o => (
                  <option key={o} value={o}>{objLabel(o)}</option>
                ))}
              </select>
            )
          })()}
          {/* Date range selector */}
         <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            className="bg-[var(--bg-base)] border border-[var(--border-default)] rounded-lg px-2 py-1.5 mono text-xs text-[var(--text-muted)] outline-none hover:border-[#2E2E4E] transition-colors"
          >
            <option value="last_7d">7 días</option>
            <option value="last_14d">14 días</option>
            <option value="last_28d">28 días</option>
            <option value="last_30d">30 días</option>
            <option value="last_90d">90 días</option>
            <option value="last_quarter">Trimestre</option>
            <option value="last_year">Último año</option>
            <option value="maximum">Máximo</option>
          </select>
          {/* MA5: Botón Actualizar */}
          <button
            onClick={() => fetchInsights(true)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2E2E4E] transition-all disabled:opacity-40"
          >
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''}/>
            ACTUALIZAR
          </button>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="mx-5 mt-4 px-4 py-3 rounded-xl border border-[var(--danger)] bg-[var(--danger)10]">
          <p className="mono text-xs text-[var(--danger)]">⚠ {error}</p>
        </div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && !insight && (
        <div className="p-5 grid grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="rounded-xl border border-[var(--border-default)] p-4 h-20 animate-pulse" style={{ background: 'var(--bg-base)' }}/>
          ))}
        </div>
      )}

      {insight && (
        <>
          {/* ── KPIs ── */}
          <div className="p-5 grid grid-cols-4 gap-4">
            {[
              { label: 'SPEND TOTAL', value: fmt$(insight.total_spend), color: 'var(--danger)', icon: '💸' },
              { label: 'LEADS META', value: fmtK(insight.total_leads), color: 'var(--accent)', icon: '🎯' },
              { label: 'COSTO POR LEAD', value: insight.cost_per_lead ? fmt$(insight.cost_per_lead) : '—', color: 'var(--warning)', icon: '📍' },
              { label: 'CPC', value: insight.cpc ? fmt$(insight.cpc) : '—', color: 'var(--success)', icon: '🖱️' },
            ].map(kpi => (
              <div key={kpi.label} className="rounded-xl border border-[var(--border-default)] p-4" style={{ background: 'var(--bg-base)' }}>
                <div className="flex items-center justify-between mb-2">
                  <p className="mono text-xs text-[var(--text-muted)] tracking-widest">{kpi.label}</p>
                  <span className="text-sm">{kpi.icon}</span>
                </div>
                <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              </div>
            ))}
          </div>

          {/* ── Top Campañas spend (barras CSS) ── */}
          {(() => {
            const filteredCampaigns = objectiveFilter === 'all'
              ? insight.campaigns
              : insight.campaigns.filter(c => c.objective === objectiveFilter)
            const top10 = [...filteredCampaigns].sort((a, b) => b.spend - a.spend).slice(0, 10)
            const maxSpend = top10[0]?.spend || 1
            return top10.length > 0 && (
              <div className="px-5 pb-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="mono text-xs text-[var(--text-muted)] tracking-widest">TOP CAMPAÑAS POR SPEND</p>
                  {filteredCampaigns.length > 10 && (
                    <p className="mono text-xs text-[var(--text-muted)]">mostrando 10 de {filteredCampaigns.length}</p>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {top10.map((c, i) => {
                    const pct = (c.spend / maxSpend) * 100
                    const barColor = i === 0 ? 'var(--primary)' : i === 1 ? 'var(--accent)' : i === 2 ? 'var(--warning)' : '#2A2A4A'
                    const objColor = c.objective === 'LEAD_GENERATION' || c.objective === 'OUTCOME_LEADS' ? 'var(--accent)'
                      : c.objective === 'MESSAGES' ? 'var(--success)'
                      : c.objective === 'CONVERSIONS' ? 'var(--warning)'
                      : 'var(--text-muted)'
                    return (
                      <div key={i} className="group">
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="mono text-xs text-[var(--text-muted)] w-4 flex-shrink-0">{i + 1}</span>
                            <span className="text-[11px] text-[var(--text-primary)] truncate max-w-[280px]" title={c.campaign_name}>
                              {c.campaign_name}
                            </span>
                            <span className="mono text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                              style={{ color: objColor, background: objColor + '15', border: `1px solid ${objColor}30` }}>
                              {objLabel(c.objective)}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                            {c.leads > 0 && (
                              <span className="mono text-xs text-[var(--accent)]">{c.leads} leads</span>
                            )}
                            <span className="mono text-[11px] font-bold" style={{ color: 'var(--danger)' }}>
                              ${c.spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full w-full" style={{ background: 'var(--border-default)' }}>
                          <div className="h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: barColor }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* ── Tabla embudo completo ── */}
          {(() => {
            const filteredCampaigns = objectiveFilter === 'all'
              ? insight.campaigns
              : insight.campaigns.filter(c => c.objective === objectiveFilter)
          return filteredCampaigns.length > 0 && (
            <div className="border-t border-[var(--border-default)] overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between">
                <p className="mono text-xs text-[var(--text-muted)] tracking-widest">EMBUDO DE COSTOS — CAMPAÑA A COMPRADOR</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                       {['CAMPAÑA','OBJETIVO','SPEND','IMPRESIONES','CLICKS','CPM','CPC','LEADS','CPL','COMPRADORES KANSHI','CPB REAL'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left mono text-[8px] text-[var(--text-muted)] tracking-widest whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCampaigns.map((c, i) => {
                      const matchKey = c.campaign_name.toLowerCase().trim()
                      const compradores = compradorMap[matchKey] || 0
                      const cpb = compradores > 0 ? c.spend / compradores : null
                      return (
                        <tr key={i} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-base)] transition-colors">
                          <td className="px-4 py-3">
                            <p className="text-xs text-[var(--text-primary)] max-w-[160px] truncate">{c.campaign_name}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className="mono text-xs px-2 py-0.5 rounded-full border"
                              style={{
                                color: c.objective === 'LEAD_GENERATION' || c.objective === 'OUTCOME_LEADS' ? 'var(--accent)'
                                  : c.objective === 'MESSAGES' ? 'var(--success)'
                                  : c.objective === 'CONVERSIONS' ? 'var(--warning)'
                                  : 'var(--text-muted)',
                                borderColor: c.objective === 'LEAD_GENERATION' || c.objective === 'OUTCOME_LEADS' ? 'var(--accent)30'
                                  : c.objective === 'MESSAGES' ? 'var(--success)30'
                                  : c.objective === 'CONVERSIONS' ? 'var(--warning)30'
                                  : 'var(--border-default)',
                                background: c.objective === 'LEAD_GENERATION' || c.objective === 'OUTCOME_LEADS' ? 'var(--accent)10'
                                  : c.objective === 'MESSAGES' ? 'var(--success)10'
                                  : c.objective === 'CONVERSIONS' ? 'var(--warning)10'
                                  : 'transparent',
                              }}>
                              {objLabel(c.objective)}
                            </span>
                          </td>
                          <td className="px-4 py-3 mono text-[11px] font-bold" style={{ color: 'var(--danger)' }}>
                            {fmt$(c.spend)}
                          </td>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">
                            {fmtK(c.impressions)}
                          </td>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">
                            {fmtK(c.clicks)}
                          </td>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">
                            {fmt$(c.cpm)}
                          </td>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">
                            {fmt$(c.cpc)}
                          </td>
                          <td className="px-4 py-3 mono text-[11px] font-bold" style={{ color: 'var(--accent)' }}>
                            {c.leads > 0 ? c.leads : '—'}
                          </td>
                          <td className="px-4 py-3 mono text-xs" style={{ color: c.cost_per_lead > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                            {c.cost_per_lead > 0 ? fmt$(c.cost_per_lead) : '—'}
                          </td>
                          <td className="px-4 py-3 mono text-[11px] font-bold" style={{ color: compradores > 0 ? 'var(--success)' : 'var(--text-muted)' }}>
                            {compradores > 0 ? compradores : '—'}
                          </td>
                          <td className="px-4 py-3 mono text-[11px] font-bold" style={{ color: cpb ? 'var(--success)' : 'var(--text-muted)' }}>
                            {cpb ? fmt$(cpb) : '—'}
                          </td>
                        </tr>
                      )
                    })}
                    {/* Totals row */}
                    {(() => {
                      const isFiltered = objectiveFilter !== 'all'
                      const totSpend = isFiltered ? filteredCampaigns.reduce((s, c) => s + c.spend, 0) : insight.total_spend
                      const totImpressions = isFiltered ? filteredCampaigns.reduce((s, c) => s + c.impressions, 0) : insight.total_impressions
                      const totClicks = isFiltered ? filteredCampaigns.reduce((s, c) => s + c.clicks, 0) : insight.total_clicks
                      const totLeads = isFiltered ? filteredCampaigns.reduce((s, c) => s + c.leads, 0) : insight.total_leads
                      const totCPL = totLeads > 0 ? totSpend / totLeads : null
                      const totCPM = totImpressions > 0 ? (totSpend / totImpressions) * 1000 : null
                      const totCPC = totClicks > 0 ? totSpend / totClicks : null
                      return (
                        <tr style={{ background: 'rgba(0,20,173,0.05)' }}>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)] tracking-widest">
                            {isFiltered ? `SUBTOTAL (${objLabel(objectiveFilter)})` : 'TOTALES'}
                          </td>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">—</td>
                          <td className="px-4 py-3 mono text-[11px] font-bold" style={{ color: 'var(--danger)' }}>{fmt$(totSpend)}</td>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">{fmtK(totImpressions)}</td>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">{fmtK(totClicks)}</td>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">{totCPM ? fmt$(totCPM) : '—'}</td>
                          <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">{totCPC ? fmt$(totCPC) : '—'}</td>
                          <td className="px-4 py-3 mono text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{totLeads}</td>
                          <td className="px-4 py-3 mono text-xs" style={{ color: 'var(--warning)' }}>{totCPL ? fmt$(totCPL) : '—'}</td>
                          <td colSpan={2} className="px-4 py-3 mono text-xs text-[var(--text-muted)]">—</td>
                        </tr>
                      )
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )})()}

          {insight.campaigns.length === 0 && (
            <div className="px-5 pb-5 flex items-center gap-2">
              <AlertCircle size={12} className="text-[var(--text-muted)]"/>
              <p className="mono text-xs text-[var(--text-muted)]">
                Sin campañas activas en el período seleccionado.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── LEAD JOURNEY DRAWER (AT3b) ──────────────────────────────────────────────

interface LeadJourneyData {
  contact: {
    id: string; name: string; phone_number: string; agent_stage: string
    engagement_score: number; kanshi_score: number; kanshi_segment: string
    segmento: string; created_at: string; updated_at: string
    resumen_perfil: string; dolor_declarado: string; sueno_declarado: string
  } | null
  utmRows: Array<{
    id: string; utm_source: string|null; utm_medium: string|null
    utm_campaign: string|null; utm_content: string|null; utm_term: string|null
    landing_url: string|null; registered_at: string; source_platform: string|null
  }>
  quizRows: Array<{
    id: string; quiz_type: string; quiz_name: string|null
    responses: Record<string, string>; submitted_at: string
  }>
  scoreBreakdown: {
    kanshi_score: number
    profile_fit: number; active_engagement: number
    declared_intention: number; source_quality: number
    capi_warm_sent_at: string|null; capi_hot_sent_at: string|null
    capi_ready_sent_at: string|null; capi_buyer_sent_at: string|null
    updated_at: string
  } | null
  sales: Array<{
    id: string; amount: number; currency: string
    product_name: string|null; sale_source: string
    transaction_id: string|null; sale_date: string
    utm_campaign: string|null; capi_purchase_sent_at: string|null
  }>
}

// Helper visual para cada sección del journey — definido a nivel módulo
function JourneySection({
  icon, label, date, color, children,
}: {
  icon: string; label: string; date: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="flex items-stretch gap-3 py-0.5">
      <div className="flex flex-col items-center flex-shrink-0 w-8">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-sm"
          style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
          {icon}
        </div>
        <div className="w-px flex-1 mt-1" style={{ background: 'var(--border-default)', minHeight: '8px' }}/>
      </div>
      <div className="flex-1 pb-4 min-w-0">
        <div className="flex items-center justify-between mb-2 gap-2">
          <span className="mono text-xs font-bold tracking-widest flex-shrink-0" style={{ color }}>{label}</span>
          <span className="mono text-xs text-[#2E2E4E] flex-shrink-0">{date}</span>
        </div>
        <div className="rounded-xl border border-[var(--border-default)] p-3" style={{ background: 'var(--bg-card)' }}>
          {children}
        </div>
      </div>
    </div>
  )
}

// Drawer de journey completo del lead — definido a nivel módulo
function LeadJourneyDrawer({ phone, onClose }: { phone: string | null; onClose: () => void }) {
  const [data, setData] = useState<LeadJourneyData | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!phone) { setData(null); return }
    setLoading(true)
    setData(null)

    const fetchAll = async () => {
      const [utmRes, contactRes, quizRes, salesRes] = await Promise.all([
        supabase.from('utm_tracking')
          .select('id,utm_source,utm_medium,utm_campaign,utm_content,utm_term,landing_url,registered_at,source_platform')
          .eq('phone_number', phone).order('registered_at', { ascending: true }).limit(5),
        supabase.from('wa_contacts')
          .select('id,name,phone_number,agent_stage,engagement_score,kanshi_score,kanshi_segment,segmento,created_at,updated_at,resumen_perfil,dolor_declarado,sueno_declarado')
          .eq('phone_number', phone).limit(1),
        supabase.from('lead_quiz_responses')
          .select('id,quiz_type,quiz_name,responses,submitted_at')
          .eq('phone_number', phone).order('submitted_at', { ascending: true }),
        supabase.from('kanshi_sales')
          .select('id,amount,currency,product_name,sale_source,transaction_id,sale_date,utm_campaign,capi_purchase_sent_at')
          .eq('phone_number', phone).order('sale_date', { ascending: true }),
      ])

      const contact = contactRes.data?.[0] || null

      let scoreBreakdown: LeadJourneyData['scoreBreakdown'] = null
      if (contact?.id) {
        const { data: sb } = await supabase
          .from('kanshi_score_breakdown')
          .select('kanshi_score,profile_fit,active_engagement,declared_intention,source_quality,capi_warm_sent_at,capi_hot_sent_at,capi_ready_sent_at,capi_buyer_sent_at,updated_at')
          .eq('contact_id', contact.id)
          .maybeSingle()
        scoreBreakdown = sb
      }

      setData({
        contact: contact as LeadJourneyData['contact'],
        utmRows: (utmRes.data || []) as LeadJourneyData['utmRows'],
        quizRows: (quizRes.data || []) as LeadJourneyData['quizRows'],
        scoreBreakdown,
        sales: (salesRes.data || []) as LeadJourneyData['sales'],
      })
      setLoading(false)
    }

    fetchAll().catch(() => setLoading(false))
  }, [phone])

  if (!phone) return null

  const segC = (s: string) => s === 'caliente' ? 'var(--danger)' : s === 'templado' ? 'var(--warning)' : 'var(--accent)'
  const scoreC = (n: number) => n >= 76 ? 'var(--success)' : n >= 51 ? 'var(--danger)' : n >= 26 ? 'var(--warning)' : 'var(--accent)'

  const initials = (data?.contact?.name || phone || '?')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  const fmtDate = (d: string) => {
    try { return format(new Date(d), 'dd/MM/yy HH:mm') } catch { return d }
  }

  const capiEvents: Array<{ label: string; ts: string; color: string }> = []
  if (data?.scoreBreakdown) {
    const sb = data.scoreBreakdown
    if (sb.capi_warm_sent_at)  capiEvents.push({ label: 'WarmLead → Meta',    ts: sb.capi_warm_sent_at,  color: 'var(--accent)' })
    if (sb.capi_hot_sent_at)   capiEvents.push({ label: 'HotLead → Meta',     ts: sb.capi_hot_sent_at,   color: 'var(--warning)' })
    if (sb.capi_ready_sent_at) capiEvents.push({ label: 'ReadyLead → Meta',   ts: sb.capi_ready_sent_at, color: 'var(--danger)' })
    if (sb.capi_buyer_sent_at) capiEvents.push({ label: 'BuyerProfile → Meta',ts: sb.capi_buyer_sent_at, color: '#C084FC' })
    capiEvents.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime())
  }

  const hasData = data && (
    data.contact || data.utmRows.length > 0 || data.quizRows.length > 0 || data.sales.length > 0
  )

  return (
    <div className="fixed inset-0 z-[300] flex justify-end" onClick={onClose}>
      <div
        className="w-full max-w-md h-full border-l border-[var(--border-default)] overflow-y-auto flex flex-col"
        style={{ background: 'var(--bg-base)', boxShadow: '-32px 0 80px rgba(0,0,0,0.85)', animation: 'slideInRight 0.2s ease' }}
        onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="px-6 py-5 border-b border-[var(--border-default)] sticky top-0 z-10 flex-shrink-0"
          style={{ background: 'rgba(10,10,15,0.97)' }}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mono text-[11px] font-bold"
                style={{
                  background: data?.contact ? `${segC(data.contact.segmento)}20` : 'var(--border-default)',
                  color: data?.contact ? segC(data.contact.segmento) : 'var(--text-muted)',
                  border: `1px solid ${data?.contact ? segC(data.contact.segmento) + '40' : '#2A2A3A'}`,
                }}>
                {loading ? '…' : initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-[var(--text-primary)] text-sm truncate">
                  {data?.contact?.name || phone}
                </p>
                <p className="mono text-xs text-[var(--text-muted)]">{phone}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="p-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--danger)] transition-colors group ml-3 flex-shrink-0">
              <X size={12} className="text-[var(--text-muted)] group-hover:text-[var(--danger)]"/>
            </button>
          </div>

          {data?.contact && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {data.contact.kanshi_score > 0 && (
                <span className="mono text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ color: scoreC(data.contact.kanshi_score), background: `${scoreC(data.contact.kanshi_score)}15`, border: `1px solid ${scoreC(data.contact.kanshi_score)}30` }}>
                  ⚡ {data.contact.kanshi_score} KANSHI
                </span>
              )}
              {data.contact.kanshi_segment && (
                <span className="mono text-xs px-2 py-0.5 rounded-full"
                  style={{ color: scoreC(data.contact.kanshi_score), background: `${scoreC(data.contact.kanshi_score)}10` }}>
                  {data.contact.kanshi_segment.toUpperCase()}
                </span>
              )}
              {data.contact.agent_stage && <StagePill stage={data.contact.agent_stage}/>}
              {data.sales.length > 0 && (
                <span className="mono text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{ color: 'var(--success)', background: 'var(--success)15', border: '1px solid var(--success)30' }}>
                  💰 COMPRADOR
                </span>
              )}
            </div>
          )}

          <p className="mono text-xs text-[var(--text-muted)] tracking-widest mt-3">LEAD JOURNEY COMPLETO</p>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div className="flex items-center justify-center flex-1 py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}/>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">CARGANDO JOURNEY...</p>
            </div>
          </div>
        )}

        {/* ── Timeline ── */}
        {!loading && data && (
          <div className="px-5 py-5 space-y-0">

            {/* 1. Primer clic UTM */}
            {data.utmRows.length > 0 && (
              <JourneySection icon="🎯" label="PRIMER CLIC UTM" date={fmtDate(data.utmRows[0].registered_at)} color="var(--accent)">
                <div className="space-y-2">
                  {[
                    { k: 'CAMPAÑA',    v: data.utmRows[0].utm_campaign },
                    { k: 'FUENTE',     v: data.utmRows[0].utm_source },
                    { k: 'MEDIO',      v: data.utmRows[0].utm_medium },
                    { k: 'ANUNCIO',    v: data.utmRows[0].utm_content },
                    { k: 'PLATAFORMA', v: data.utmRows[0].source_platform },
                    { k: 'URL',        v: data.utmRows[0].landing_url
                        ? data.utmRows[0].landing_url.replace(/^https?:\/\//, '').slice(0, 55)
                        : null },
                  ].filter(x => x.v).map(x => (
                    <div key={x.k} className="flex items-start gap-2">
                      <span className="mono text-[8px] text-[var(--text-muted)] tracking-widest w-20 flex-shrink-0 pt-0.5">{x.k}</span>
                      <span className="text-[11px] text-[var(--text-primary)] break-all leading-relaxed">{x.v}</span>
                    </div>
                  ))}
                  {data.utmRows.length > 1 && (
                    <p className="mono text-xs text-[var(--text-muted)] pt-1">
                      +{data.utmRows.length - 1} clic{data.utmRows.length > 2 ? 's' : ''} adicional{data.utmRows.length > 2 ? 'es' : ''}
                    </p>
                  )}
                </div>
              </JourneySection>
            )}

            {/* 2. Perfil SAM */}
            {data.contact && (data.contact.dolor_declarado || data.contact.sueno_declarado || data.contact.engagement_score > 0) && (
              <JourneySection icon="💬" label="INTERACCIONES SAM" date={fmtDate(data.contact.updated_at)} color="var(--primary)">
                <div className="space-y-2">
                  {[
                    { k: 'ENGAGEMENT', v: data.contact.engagement_score > 0 ? `${data.contact.engagement_score} / 14 pts` : null },
                    { k: 'SEGMENTO',   v: data.contact.segmento },
                    { k: 'DOLOR',      v: data.contact.dolor_declarado?.slice(0, 90) },
                    { k: 'SUEÑO',      v: data.contact.sueno_declarado?.slice(0, 90) },
                    { k: 'RESUMEN',    v: data.contact.resumen_perfil?.slice(0, 110) },
                  ].filter(x => x.v).map(x => (
                    <div key={x.k} className="flex items-start gap-2">
                      <span className="mono text-[8px] text-[var(--text-muted)] tracking-widest w-20 flex-shrink-0 pt-0.5">{x.k}</span>
                      <span className="text-[11px] text-[var(--text-primary)] leading-relaxed">{x.v}</span>
                    </div>
                  ))}
                </div>
              </JourneySection>
            )}

            {/* 3. Quiz(es) */}
            {data.quizRows.map(qr => (
              <JourneySection
                key={qr.id}
                icon="📋"
                label={`QUIZ: ${(qr.quiz_name || qr.quiz_type).toUpperCase()}`}
                date={fmtDate(qr.submitted_at)}
                color="#C084FC">
                <div className="space-y-2">
                  {Object.entries(qr.responses).slice(0, 7).map(([k, v]) => (
                    <div key={k} className="flex items-start gap-2">
                      <span className="mono text-[8px] text-[var(--text-muted)] tracking-widest w-28 flex-shrink-0 pt-0.5 truncate">
                        {k.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[11px] text-[var(--text-primary)] leading-relaxed break-words">
                        {String(v).slice(0, 90)}
                      </span>
                    </div>
                  ))}
                  {Object.keys(qr.responses).length > 7 && (
                    <p className="mono text-xs text-[var(--text-muted)]">+{Object.keys(qr.responses).length - 7} campos más</p>
                  )}
                </div>
              </JourneySection>
            ))}

            {/* 4. Score breakdown */}
            {data.scoreBreakdown && (
              <JourneySection icon="📈" label="KANSHI SCORE BREAKDOWN" date={fmtDate(data.scoreBreakdown.updated_at)} color="var(--warning)">
                <div className="space-y-2.5">
                  {[
                    { k: 'FIT PERFIL', v: data.scoreBreakdown.profile_fit,        max: 25 },
                    { k: 'ENGAGEMENT', v: data.scoreBreakdown.active_engagement,   max: 35 },
                    { k: 'INTENCIÓN',  v: data.scoreBreakdown.declared_intention,  max: 25 },
                    { k: 'FUENTE',     v: data.scoreBreakdown.source_quality,      max: 15 },
                  ].map(d => {
                    const pct = d.max > 0 ? (d.v / d.max) * 100 : 0
                    const c = pct >= 70 ? 'var(--success)' : pct >= 40 ? 'var(--warning)' : 'var(--danger)'
                    return (
                      <div key={d.k} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="mono text-xs text-[var(--text-muted)] tracking-widest">{d.k}</span>
                          <span className="mono text-xs font-bold" style={{ color: c }}>{d.v} / {d.max}</span>
                        </div>
                        <div className="h-1 rounded-full" style={{ background: 'var(--border-default)' }}>
                          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: c }}/>
                        </div>
                      </div>
                    )
                  })}
                  {/* Total */}
                  <div className="pt-2 border-t border-[var(--border-default)] flex items-center justify-between">
                    <span className="mono text-xs text-[var(--text-muted)] tracking-widest">TOTAL KANSHI</span>
                    <span className="mono text-sm font-bold" style={{ color: scoreC(data.scoreBreakdown.kanshi_score) }}>
                      {data.scoreBreakdown.kanshi_score}
                    </span>
                  </div>
                  {/* CAPI events */}
                  {capiEvents.length > 0 && (
                    <div className="pt-2 border-t border-[var(--border-default)] space-y-1.5">
                      <p className="mono text-[8px] text-[var(--text-muted)] tracking-widest mb-2">SEÑALES ENVIADAS A META CAPI</p>
                      {capiEvents.map(ev => (
                        <div key={ev.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ background: ev.color }}/>
                            <span className="mono text-xs" style={{ color: ev.color }}>{ev.label}</span>
                          </div>
                          <span className="mono text-xs text-[var(--text-muted)]">{fmtDate(ev.ts)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </JourneySection>
            )}

            {/* 5. Venta */}
            {data.sales.map(sale => (
              <JourneySection key={sale.id} icon="💰" label="VENTA CONFIRMADA" date={fmtDate(sale.sale_date)} color="var(--success)">
                <div className="space-y-2">
                  {[
                    { k: 'MONTO',    v: `$${sale.amount.toLocaleString()} ${sale.currency}` },
                    { k: 'PRODUCTO', v: sale.product_name },
                    { k: 'FUENTE',   v: sale.sale_source },
                    { k: 'CAMPAÑA',  v: sale.utm_campaign },
                    { k: 'TX ID',    v: sale.transaction_id },
                    { k: 'CAPI',     v: sale.capi_purchase_sent_at
                        ? `✓ Enviado ${fmtDate(sale.capi_purchase_sent_at)}`
                        : '⏳ Pendiente' },
                  ].filter(x => x.v).map(x => (
                    <div key={x.k} className="flex items-start gap-2">
                      <span className="mono text-[8px] text-[var(--text-muted)] tracking-widest w-20 flex-shrink-0 pt-0.5">{x.k}</span>
                      <span className="text-[11px] font-medium break-all"
                        style={{ color: x.k === 'MONTO' ? 'var(--success)' : 'var(--text-primary)' }}>
                        {x.v}
                      </span>
                    </div>
                  ))}
                </div>
              </JourneySection>
            ))}

            {/* Empty state */}
            {!hasData && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-3xl">🔍</span>
                <p className="mono text-[11px] text-[var(--text-muted)]">Sin datos disponibles para este lead</p>
                <p className="mono text-xs text-[#2E2E4E]">{phone}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── SALA DE CONTROL TAB ─────────────────────────────────────────────────────

interface SalaSale {
  id: string
  phone_number: string
  amount: number
  currency: string
  sale_date: string
  sale_source: string
  utm_campaign: string | null
  project_id: string | null
  wa_contacts?: { name: string; kanshi_score: number; kanshi_segment: string } | null
}

function SalaDeControlTab({
  activeProjectId,
  projects,
  leads,
  onToast,
}: {
  activeProjectId: string | null
  projects: Project[]
  leads: Lead[]
  onToast: (type: Toast['type'], message: string) => void
}) {
  const [sales, setSales] = useState<SalaSale[]>([])
  const [loading, setLoading] = useState(false)
  const [now, setNow] = useState(new Date())

  const project = projects.find(p => p.id === activeProjectId) || null

  // Tick cada segundo para countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  // Fetch ventas del proyecto
  const fetchSales = useCallback(async () => {
    if (!activeProjectId) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('kanshi_sales')
        .select('*, wa_contacts(name, kanshi_score, kanshi_segment)')
        .eq('project_id', activeProjectId)
        .order('sale_date', { ascending: false })
      setSales(data || [])
    } catch (e) {
      console.error('SalaDeControl fetch error:', e)
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => { fetchSales() }, [fetchSales])

  // Realtime — escucha INSERT en kanshi_sales
  useEffect(() => {
    if (!activeProjectId) return
    const channel = supabase
      .channel('sala-control-sales')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'kanshi_sales', filter: `project_id=eq.${activeProjectId}` },
        (payload) => {
          const newSale = payload.new as SalaSale
          setSales(prev => [newSale, ...prev])
          onToast('success', `🎉 ¡Nueva venta! $${newSale.amount.toLocaleString()}`)
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [activeProjectId, onToast])

  // ── Cart timing ──
  const cartOpen  = project?.cart_open  ? new Date(project.cart_open)  : null
  const cartClose = project?.cart_close ? new Date(project.cart_close) : null
  const isCartOpen   = !!(cartOpen && cartClose && now >= cartOpen && now <= cartClose)
  const isCartFuture = !!(cartOpen && now < cartOpen)

  const formatCountdown = (target: Date) => {
    const diff = target.getTime() - now.getTime()
    if (diff <= 0) return '00:00:00'
    const totalSecs = Math.floor(diff / 1000)
    const d = Math.floor(totalSecs / 86400)
    const h = Math.floor((totalSecs % 86400) / 3600)
    const m = Math.floor((totalSecs % 3600) / 60)
    const s = totalSecs % 60
    if (d > 0) return `${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m`
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
  }

  // ── KPIs ──
  const totalRevenue = sales.reduce((sum, s) => sum + s.amount, 0)
  const totalSales   = sales.length
  const salesGoal    = project?.sales_goal || 0
  const revenueGoal  = salesGoal * (project?.product_price || 0)
  const progressPct  = salesGoal > 0 ? Math.min((totalSales / salesGoal) * 100, 100) : 0

  // ── Velocity por hora ──
  const velocityData = useMemo(() => {
    if (!cartOpen || !isCartOpen) return []
    const hoursElapsed = Math.max(1, Math.ceil((now.getTime() - cartOpen.getTime()) / 3600000))
    return Array.from({ length: Math.min(hoursElapsed, 48) }, (_, i) => {
      const slotStart = new Date(cartOpen.getTime() + i * 3600000)
      const slotEnd   = new Date(slotStart.getTime() + 3600000)
      const slotSales = sales.filter(s => {
        const sd = new Date(s.sale_date)
        return sd >= slotStart && sd < slotEnd
      })
      return {
        hour:    `${String(slotStart.getHours()).padStart(2,'0')}h`,
        ventas:  slotSales.length,
        revenue: slotSales.reduce((sum, s) => sum + s.amount, 0),
      }
    })
  }, [sales, cartOpen, isCartOpen, now])

  // ── Velocity actual (últimos 60 min) ──
  const currentVelocity = useMemo(() => {
    const cutoff = new Date(now.getTime() - 3600000)
    return sales.filter(s => new Date(s.sale_date) >= cutoff).length
  }, [sales, now])

  // ── Proyección al cierre ──
  const projectedSales = useMemo(() => {
    if (!cartOpen || !cartClose || !isCartOpen || totalSales === 0) return 0
    const elapsed = (now.getTime() - cartOpen.getTime()) / 3600000
    const total   = (cartClose.getTime() - cartOpen.getTime()) / 3600000
    if (elapsed <= 0) return 0
    return Math.round((totalSales / elapsed) * total)
  }, [sales, cartOpen, cartClose, isCartOpen, now, totalSales])

  // ── Leads listos sin comprar ──
  const buyerPhones = useMemo(() => new Set(sales.map(s => s.phone_number)), [sales])
  const leadsReady  = useMemo(() =>
    leads
      .filter(l => (l.kanshi_score || 0) >= 75 && !buyerPhones.has(l.phone_number))
      .sort((a, b) => (b.kanshi_score || 0) - (a.kanshi_score || 0)),
    [leads, buyerPhones]
  )

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Sin proyecto
  // ─────────────────────────────────────────────────────────────────────────────
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <span className="text-5xl">🏯</span>
        <p className="mono text-[11px] text-[var(--text-muted)]">Selecciona un proyecto para activar la Sala de Control</p>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Carrito futuro — STANDBY
  // ─────────────────────────────────────────────────────────────────────────────
  if (isCartFuture && cartOpen) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-8">
        <div className="text-center space-y-3">
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest">CARRITO ABRE EN</p>
          <p className="text-6xl font-bold tabular-nums tracking-tight" style={{ color: 'var(--accent)', fontFamily: 'monospace' }}>
            {formatCountdown(cartOpen)}
          </p>
          <p className="mono text-xs text-[var(--text-muted)]">
            {format(cartOpen, "dd 'de' MMMM yyyy · HH:mm")}
          </p>
        </div>
        <div className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--warning)]/30"
          style={{ background: 'rgba(255,184,0,0.06)' }}>
          <div className="w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse"/>
          <span className="mono text-xs text-[var(--warning)] tracking-widest">SALA EN STANDBY — LISTA PARA ACTIVARSE</span>
        </div>
        {/* Meta preview */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
          <div className="rounded-xl border border-[var(--border-default)] p-4 text-center" style={{ background: 'var(--bg-card)' }}>
            <p className="mono text-[8px] text-[var(--text-muted)] tracking-widest mb-1">META VENTAS</p>
            <p className="text-xl font-bold text-[var(--text-primary)]">{salesGoal > 0 ? salesGoal : '—'}</p>
          </div>
          <div className="rounded-xl border border-[var(--border-default)] p-4 text-center" style={{ background: 'var(--bg-card)' }}>
            <p className="mono text-[8px] text-[var(--text-muted)] tracking-widest mb-1">LEADS LISTOS</p>
            <p className="text-xl font-bold" style={{ color: leadsReady.length > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
              {leadsReady.length}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Sin fechas configuradas
  // ─────────────────────────────────────────────────────────────────────────────
  if (!cartOpen && !cartClose) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Lock size={12} className="text-[var(--text-muted)]"/>
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest">SALA DE CONTROL — SIN FECHAS CONFIGURADAS</p>
        </div>
        <div className="rounded-2xl border border-[var(--border-default)] p-10 flex flex-col items-center gap-4" style={{ background: 'var(--bg-card)' }}>
          <span className="text-4xl">🔒</span>
          <p className="mono text-[11px] text-[var(--text-muted)] text-center">
            Configura <span className="text-[var(--accent)]">Cart Open</span> y <span className="text-[var(--accent)]">Cart Close</span> en el proyecto para activar la Sala de Control
          </p>
          <p className="mono text-xs text-[#2E2E4E]">Configuración del proyecto → Fechas de carrito</p>
        </div>
        {/* Resumen si hay ventas de todos modos */}
        {totalSales > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'VENTAS TOTALES', value: totalSales, color: 'var(--success)' },
              { label: 'INGRESOS', value: `$${totalRevenue.toLocaleString()}`, color: 'var(--accent)' },
              { label: 'TICKET PROM.', value: totalSales > 0 ? `$${Math.round(totalRevenue/totalSales).toLocaleString()}` : '—', color: 'var(--warning)' },
            ].map(k => (
              <div key={k.label} className="rounded-2xl border border-[var(--border-default)] p-5" style={{ background: 'var(--bg-card)' }}>
                <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-2">{k.label}</p>
                <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: Post-carrito (cerrado)
  // ─────────────────────────────────────────────────────────────────────────────
  if (!isCartOpen && !isCartFuture) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--text-muted)]"/>
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest">SALA DE CONTROL — CARRITO CERRADO</p>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'VENTAS FINALES', value: totalSales, sub: `meta ${salesGoal}`, color: 'var(--success)' },
            { label: 'INGRESOS', value: `$${totalRevenue.toLocaleString()}`, sub: `meta $${revenueGoal.toLocaleString()}`, color: 'var(--accent)' },
            { label: 'TICKET PROM.', value: totalSales > 0 ? `$${Math.round(totalRevenue/totalSales).toLocaleString()}` : '—', sub: `precio: $${project.product_price?.toLocaleString() || '—'}`, color: 'var(--warning)' },
            { label: 'CUMPLIMIENTO', value: `${Math.round(progressPct)}%`, sub: salesGoal > 0 ? (progressPct >= 100 ? '🎉 Meta alcanzada' : 'de meta') : 'sin meta', color: progressPct >= 100 ? 'var(--success)' : 'var(--warning)' },
          ].map(k => (
            <div key={k.label} className="rounded-2xl border border-[var(--border-default)] p-5" style={{ background: 'var(--bg-card)' }}>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-2">{k.label}</p>
              <p className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</p>
              <p className="mono text-xs text-[var(--text-muted)] mt-1">{k.sub}</p>
            </div>
          ))}
        </div>
        {velocityData.length > 0 && (
          <div className="rounded-2xl border border-[var(--border-default)] p-5" style={{ background: 'var(--bg-card)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-4">VELOCIDAD DE VENTAS — HISTORIAL DEL CARRITO</p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={velocityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'monospace' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' }}
                  itemStyle={{ color: 'var(--success)', fontSize: 10, fontFamily: 'monospace' }}
                  formatter={(v: number) => [`${v} ventas`, '']}/>
                <Bar dataKey="ventas" fill="#00FF94" radius={[4,4,0,0]} maxBarSize={32} opacity={0.6}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER: ★ CARRITO ABIERTO — SALA ACTIVA ★
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Header LIVE */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-[var(--success)] animate-pulse"/>
          <p className="mono text-[11px] text-[var(--text-primary)] tracking-widest font-bold">SALA DE CONTROL</p>
          <span className="mono text-xs px-2.5 py-0.5 rounded-full border border-[var(--success)]/30 text-[var(--success)]"
            style={{ background: 'rgba(0,255,148,0.08)' }}>
            CARRITO ABIERTO · EN VIVO
          </span>
        </div>
        {cartClose && (
          <div className="flex items-center gap-2">
            <Clock size={12} className="text-[var(--danger)]"/>
            <p className="mono text-xs text-[var(--text-muted)]">CIERRA EN</p>
            <p className="mono text-sm font-bold tabular-nums tracking-tight" style={{ color: 'var(--danger)', fontFamily: 'monospace' }}>
              {formatCountdown(cartClose)}
            </p>
          </div>
        )}
      </div>

      {/* KPIs 5 columnas */}
      <div className="grid grid-cols-5 gap-3">
        {[
          {
            label: 'VENTAS',
            value: `${totalSales}${salesGoal > 0 ? ` / ${salesGoal}` : ''}`,
            sub: salesGoal > 0 ? `${Math.round(progressPct)}% completado` : 'sin meta',
            color: 'var(--success)', icon: '🎯', progress: salesGoal > 0 ? progressPct : null,
          },
          {
            label: 'INGRESOS',
            value: `$${totalRevenue.toLocaleString()}`,
            sub: revenueGoal > 0 ? `meta $${revenueGoal.toLocaleString()}` : '',
            color: 'var(--success)', icon: '💰', progress: null,
          },
          {
            label: 'TICKET PROM.',
            value: totalSales > 0 ? `$${Math.round(totalRevenue / totalSales).toLocaleString()}` : '—',
            sub: project.product_price ? `precio $${project.product_price.toLocaleString()}` : '',
            color: 'var(--warning)', icon: '🎫', progress: null,
          },
          {
            label: 'VELOCIDAD',
            value: `${currentVelocity}/h`,
            sub: 'última hora',
            color: currentVelocity > 0 ? 'var(--accent)' : 'var(--text-muted)', icon: '⚡', progress: null,
          },
          {
            label: 'PROYECCIÓN',
            value: projectedSales > 0 ? `~${projectedSales}` : '—',
            sub: 'ventas al cierre',
            color: (salesGoal > 0 && projectedSales >= salesGoal) ? 'var(--success)' : 'var(--warning)', icon: '🔮', progress: null,
          },
        ].map(kpi => (
          <div key={kpi.label} className="rounded-2xl border border-[var(--border-default)] p-4 relative overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between mb-1">
              <p className="mono text-[8px] text-[var(--text-muted)] tracking-widest">{kpi.label}</p>
              <span className="text-sm">{kpi.icon}</span>
            </div>
            <p className="text-xl font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</p>
            {kpi.sub && <p className="mono text-[8px] text-[var(--text-muted)] mt-0.5">{kpi.sub}</p>}
            {kpi.progress !== null && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--border-default)]">
                <div className="h-full transition-all duration-1000" style={{ width: `${kpi.progress}%`, background: 'var(--success)' }}/>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Velocity + Feed */}
      <div className="grid grid-cols-2 gap-5">

        {/* Velocity chart */}
        <div className="rounded-2xl border border-[var(--border-default)] p-5" style={{ background: 'var(--bg-card)' }}>
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-4">VENTAS POR HORA</p>
          {velocityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={velocityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'monospace' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)', fontFamily: 'monospace' }} axisLine={false} tickLine={false} allowDecimals={false}/>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8 }}
                  labelStyle={{ color: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' }}
                  itemStyle={{ color: 'var(--success)', fontSize: 10, fontFamily: 'monospace' }}
                  formatter={(v: number) => [`${v} ventas`, '']}
                />
                <Bar dataKey="ventas" radius={[4,4,0,0]} maxBarSize={32}>
                  {velocityData.map((_, i) => (
                    <Cell
                      key={i}
                      fill={i === velocityData.length - 1 ? 'var(--accent)' : 'var(--success)'}
                      opacity={i === velocityData.length - 1 ? 1 : 0.65}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"/>
              <p className="mono text-xs text-[var(--text-muted)]">Esperando primera venta...</p>
            </div>
          )}
        </div>

        {/* Feed realtime */}
        <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">ÚLTIMAS VENTAS</p>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse"/>
              <span className="mono text-[8px] text-[var(--success)]">LIVE</span>
            </div>
          </div>
          <div className="divide-y divide-[var(--border-default)] overflow-y-auto" style={{ maxHeight: 200 }}>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-4 h-4 border-2 border-[var(--success)] border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : sales.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <span className="text-2xl">⏳</span>
                <p className="mono text-xs text-[var(--text-muted)]">Esperando ventas en tiempo real...</p>
              </div>
            ) : sales.slice(0, 12).map(sale => (
              <div key={sale.id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-base)] transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--border-default)', color: 'var(--text-primary)' }}>
                    {(sale.wa_contacts?.name || sale.phone_number || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-primary)]">{sale.wa_contacts?.name || sale.phone_number}</p>
                    <p className="mono text-[8px] text-[var(--text-muted)]">{format(new Date(sale.sale_date), 'HH:mm:ss')}</p>
                  </div>
                </div>
                <p className="mono text-sm font-bold" style={{ color: 'var(--success)' }}>
                  ${sale.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel: Leads listos sin comprar */}
      {leadsReady.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,184,0,0.25)' }}>
          <div className="px-5 py-4 border-b flex items-center gap-3"
            style={{ background: 'rgba(255,184,0,0.06)', borderColor: 'rgba(255,184,0,0.15)' }}>
            <Flame size={14} className="text-[var(--warning)]"/>
            <p className="mono text-xs text-[var(--warning)] tracking-widest font-bold">
              {leadsReady.length} LEADS LISTOS — SIN COMPRAR AÚN
            </p>
            <span className="mono text-[8px] text-[var(--text-muted)]">score ≥ 75 · actuar ahora</span>
          </div>
          <div className="divide-y divide-[var(--border-default)]" style={{ background: 'var(--bg-card)' }}>
            {leadsReady.slice(0, 8).map(lead => (
              <div key={lead.id} className="px-5 py-3 flex items-center justify-between hover:bg-[var(--bg-base)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--border-default)', color: 'var(--text-primary)' }}>
                    {(lead.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs text-[var(--text-primary)]">{lead.name || lead.phone_number}</p>
                    <p className="mono text-[8px] text-[var(--text-muted)]">{lead.agent_stage} · {lead.kanshi_segment}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="mono text-xs font-bold px-2.5 py-0.5 rounded-full border"
                    style={{
                      borderColor: lead.kanshi_score >= 90 ? 'var(--danger)' : 'var(--warning)',
                      color:       lead.kanshi_score >= 90 ? 'var(--danger)' : 'var(--warning)',
                      background:  lead.kanshi_score >= 90 ? 'rgba(255,107,53,0.1)' : 'rgba(255,184,0,0.1)',
                    }}>
                    {lead.kanshi_score}
                  </span>
                  <span className="mono text-[8px] text-[var(--text-muted)]">
                    {lead.kanshi_score >= 90 ? '🔴 LISTO' : '🟠 CALIENTE'}
                  </span>
                </div>
              </div>
            ))}
            {leadsReady.length > 8 && (
              <div className="px-5 py-3 text-center">
                <span className="mono text-xs text-[var(--text-muted)]">+{leadsReady.length - 8} leads más con score ≥ 75</span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

// ─── TRAFICKER TAB ───────────────────────────────────────────────────────────

interface TrafickerUtmRow {
  id: string; utm_content: string | null; utm_source: string | null
  utm_campaign: string | null; phone_number: string
  registered_at: string; matched_contact_id: string | null
}

interface TrafickerAdRow {
  utm_content: string
  utm_source: string | null
  utm_campaign: string | null
  total_leads: number
  responded: number
  resp_rate: number
  avg_score: number | null
  avg_engagement: number | null
  qualified_leads: number
  quiz_completed: number
  quiz_rate: number
  seg_frio: number; seg_templado: number; seg_caliente: number; seg_listo: number
  top_dolor: string | null
  signal: 'ESCALAR' | 'MANTENER' | 'PAUSAR'
  signal_reason: string
  cpl: number | null
}

const SIGNAL_CFG = {
  ESCALAR:  { color: 'var(--success)', bg: 'var(--success)15', icon: '🟢' },
  MANTENER: { color: 'var(--warning)', bg: 'var(--warning)15', icon: '🟡' },
  PAUSAR:   { color: 'var(--danger)', bg: 'var(--danger)15', icon: '🔴' },
}

function exportTrafickerCSV(rows: TrafickerAdRow[]) {
  const headers = ['ANUNCIO','FUENTE','CAMPAÑA','LEADS','RESPONDIERON','RESP%','SCORE PROM','ENG PROM','CALIFICADOS','QUIZ%','FRÍO','TEMPLADO','CALIENTE','LISTO','TOP DOLOR','SEÑAL','CPL']
  const lines = rows.map(r => [
    r.utm_content, r.utm_source ?? '', r.utm_campaign ?? '',
    r.total_leads, r.responded, r.resp_rate,
    r.avg_score ?? '', r.avg_engagement ?? '',
    r.qualified_leads, r.quiz_rate,
    r.seg_frio, r.seg_templado, r.seg_caliente, r.seg_listo,
    r.top_dolor ?? '', r.signal, r.cpl ?? ''
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv = [headers.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `traficker_${new Date().toISOString().slice(0,10)}.csv`
  a.click(); URL.revokeObjectURL(url)
}

function TrafickerTab({
  activeProjectId, projects, leads, onToast,
}: {
  activeProjectId: string | null
  projects: Project[]
  leads: Lead[]
  onToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void
}) {
  const [utmData, setUtmData]       = useState<TrafickerUtmRow[]>([])
  const [quizPhones, setQuizPhones] = useState<Set<string>>(new Set())
  const [loading, setLoading]       = useState(true)
  const [filterSignal, setFilterSignal] = useState<'TODOS'|'ESCALAR'|'MANTENER'|'PAUSAR'>('TODOS')
  const [filterMinLeads, setFilterMinLeads] = useState(1)
  const [sortCol, setSortCol] = useState<keyof TrafickerAdRow>('total_leads')
  const [sortDir, setSortDir] = useState<'asc'|'desc'>('desc')

  const project  = projects.find(p => p.id === activeProjectId)
  const adBudget = project?.ad_budget ?? null

  useEffect(() => {
    if (!activeProjectId) return
    setLoading(true)
    const fetchAll = async () => {
      try {
        const [utmRes, quizRes] = await Promise.all([
          supabase
            .from('utm_tracking')
            .select('id,utm_content,utm_source,utm_campaign,phone_number,registered_at,matched_contact_id')
            .eq('project_id', activeProjectId)
            .order('registered_at', { ascending: true }),
          supabase
            .from('lead_quiz_responses')
            .select('phone_number')
            .eq('project_id', activeProjectId),
        ])
        setUtmData(utmRes.data || [])
        setQuizPhones(new Set((quizRes.data || []).map((q: { phone_number: string }) => q.phone_number)))
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [activeProjectId])

  // Maps para cruzar leads
  const leadByPhone = useMemo(() => {
    const m: Record<string, Lead> = {}
    for (const l of leads) m[l.phone_number] = l
    return m
  }, [leads])

  const leadById = useMemo(() => {
    const m: Record<string, Lead> = {}
    for (const l of leads) m[l.id] = l
    return m
  }, [leads])

  // T2 — Agregación por utm_content
  const allRows = useMemo<TrafickerAdRow[]>(() => {
    if (utmData.length === 0) return []
    const grouped: Record<string, TrafickerUtmRow[]> = {}
    for (const row of utmData) {
      const key = row.utm_content || '(sin anuncio)'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(row)
    }
    const totalLeads = utmData.length

    return Object.entries(grouped).map(([content, rows]) => {
      const n = rows.length
      const enriched = rows.map(r => ({
        utm: r,
        lead: r.matched_contact_id ? leadById[r.matched_contact_id] : leadByPhone[r.phone_number],
      }))

      // Respondieron = engagement_score > 0 (interactuaron con SAM)
      const responded   = enriched.filter(e => (e.lead?.engagement_score ?? 0) > 0).length
      const respRate    = n > 0 ? Math.round((responded / n) * 100) : 0

      const scores      = enriched.map(e => e.lead?.kanshi_score).filter((s): s is number => typeof s === 'number' && s > 0)
      const avgScore    = scores.length > 0 ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null

      const engs        = enriched.map(e => e.lead?.engagement_score).filter((s): s is number => typeof s === 'number')
      const avgEng      = engs.length > 0 ? Math.round((engs.reduce((a,b)=>a+b,0)/engs.length)*10)/10 : null

      const qualifiedLeads = scores.filter(s => s >= 60).length

      // Segmentos
      let seg_frio=0, seg_templado=0, seg_caliente=0, seg_listo=0
      for (const e of enriched) {
        const s = e.lead?.kanshi_segment
        if (s==='listo') seg_listo++
        else if (s==='caliente') seg_caliente++
        else if (s==='templado') seg_templado++
        else seg_frio++
      }

      const quizCompleted = rows.filter(r => quizPhones.has(r.phone_number)).length
      const quizRate      = n > 0 ? Math.round((quizCompleted/n)*100) : 0

      // Top dolor
      const dolorTally: Record<string, number> = {}
      for (const e of enriched) {
        const d = e.lead?.dolor_declarado
        if (d && d.length > 2) { const k=d.slice(0,55); dolorTally[k]=(dolorTally[k]||0)+1 }
      }
      const topDolor = Object.entries(dolorTally).sort((a,b)=>b[1]-a[1])[0]?.[0] ?? null

      const cpl = adBudget && totalLeads > 0
        ? Math.round((adBudget / totalLeads) * n * 100) / 100
        : null

      // T5 — Señal
      let signal: 'ESCALAR'|'MANTENER'|'PAUSAR' = 'MANTENER'
      let signal_reason = ''
      if (n < 3) {
        signal = 'MANTENER'; signal_reason = 'Pocos datos (<3 leads)'
      } else if (respRate >= 55 && (avgScore ?? 0) >= 50) {
        signal = 'ESCALAR'; signal_reason = `Resp ${respRate}% · Score ${avgScore}`
      } else if (respRate < 20 || (avgScore !== null && avgScore < 20)) {
        signal = 'PAUSAR'; signal_reason = `Resp ${respRate}% · Score ${avgScore ?? 'N/A'}`
      } else {
        signal = 'MANTENER'; signal_reason = `Resp ${respRate}% · Score ${avgScore ?? 'N/A'}`
      }

      return {
        utm_content: content, utm_source: rows[0].utm_source, utm_campaign: rows[0].utm_campaign,
        total_leads: n, responded, resp_rate: respRate,
        avg_score: avgScore, avg_engagement: avgEng, qualified_leads: qualifiedLeads,
        quiz_completed: quizCompleted, quiz_rate: quizRate,
        seg_frio, seg_templado, seg_caliente, seg_listo,
        top_dolor: topDolor, signal, signal_reason, cpl,
      }
    }).sort((a,b) => b.total_leads - a.total_leads)
  }, [utmData, quizPhones, leadById, leadByPhone, adBudget])

  // T4 — Filtros client-side
  const filteredRows = useMemo(() => {
    let r = allRows
    if (filterSignal !== 'TODOS') r = r.filter(row => row.signal === filterSignal)
    r = r.filter(row => row.total_leads >= filterMinLeads)
    return [...r].sort((a, b) => {
      const av = a[sortCol] ?? 0
      const bv = b[sortCol] ?? 0
      if (typeof av === 'string' && typeof bv === 'string')
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av)
    })
  }, [allRows, filterSignal, filterMinLeads, sortCol, sortDir])

  const toggleSort = (col: keyof TrafickerAdRow) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('desc') }
  }

  // T6 — Resumen ejecutivo (calculado desde datos)
  const summary = useMemo(() => {
    if (allRows.length === 0) return null
    const totalLeads   = allRows.reduce((a,r) => a+r.total_leads, 0)
    const totalResp    = allRows.reduce((a,r) => a+r.responded, 0)
    const avgRespRate  = totalLeads > 0 ? Math.round((totalResp/totalLeads)*100) : 0
    const scores       = allRows.filter(r => r.avg_score !== null).map(r => r.avg_score!)
    const avgScore     = scores.length > 0 ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : null
    const totalQual    = allRows.reduce((a,r) => a+r.qualified_leads, 0)
    const escalar      = allRows.filter(r => r.signal==='ESCALAR').length
    const pausar       = allRows.filter(r => r.signal==='PAUSAR').length
    const topAd        = [...allRows].sort((a,b) => (b.avg_score??0)-(a.avg_score??0))[0]
    return { totalLeads, avgRespRate, avgScore, totalQual, escalar, pausar, topAd }
  }, [allRows])

  const SortIcon = ({ col }: { col: keyof TrafickerAdRow }) => (
    <span className="ml-1 opacity-40" style={{ color: sortCol===col ? 'var(--accent)' : undefined, opacity: sortCol===col ? 1 : 0.3 }}>
      {sortCol===col ? (sortDir==='asc' ? '↑' : '↓') : '↕'}
    </span>
  )

  if (!activeProjectId) return (
    <div className="flex items-center justify-center h-64">
      <p className="mono text-[11px] text-[var(--text-muted)]">Selecciona un proyecto para ver la tabla Traficker</p>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest">OPTIMIZACIÓN POR CALIDAD DE LEAD</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">Tabla Traficker</p>
        </div>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)' }}/>
          )}
          <button
            onClick={() => exportTrafickerCSV(filteredRows)}
            disabled={filteredRows.length === 0}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-default)] mono text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-[#2E2E4E] transition-all disabled:opacity-30"
            style={{ background: 'var(--bg-card)' }}
          >
            <TrendingDown size={11}/> EXPORTAR CSV
          </button>
        </div>
      </div>

      {/* ── T6: Resumen ejecutivo ── */}
      {summary && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          {[
            { label: 'TOTAL LEADS',       value: summary.totalLeads,       color: 'var(--accent)', fmt: (v: number) => v.toString() },
            { label: 'TASA RESPUESTA',    value: summary.avgRespRate,      color: summary.avgRespRate >= 40 ? 'var(--success)' : 'var(--warning)', fmt: (v: number) => `${v}%` },
            { label: 'SCORE PROMEDIO',    value: summary.avgScore ?? 0,    color: (summary.avgScore??0)>=50?'var(--success)':(summary.avgScore??0)>=30?'var(--warning)':'var(--danger)', fmt: (v: number) => v > 0 ? v.toString() : '—' },
            { label: 'LEADS CALIFICADOS', value: summary.totalQual,        color: '#C084FC', fmt: (v: number) => v.toString() },
            { label: 'ANUNCIOS ESCALAR',  value: summary.escalar,          color: 'var(--success)', fmt: (v: number) => `${v} 🟢` },
            { label: 'ANUNCIOS PAUSAR',   value: summary.pausar,           color: 'var(--danger)', fmt: (v: number) => `${v} 🔴` },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-xl border border-[var(--border-default)] p-4" style={{ background: 'var(--bg-card)' }}>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-1">{kpi.label}</p>
              <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.fmt(kpi.value)}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── T4: Filtros ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--border-default)]" style={{ background: 'var(--bg-card)' }}>
          {(['TODOS','ESCALAR','MANTENER','PAUSAR'] as const).map(opt => (
            <button key={opt} onClick={() => setFilterSignal(opt)}
              className="px-3 py-1.5 rounded-lg mono text-xs font-bold transition-all"
              style={{
                background: filterSignal===opt ? (opt==='TODOS'?'var(--border-default)':SIGNAL_CFG[opt as 'ESCALAR'|'MANTENER'|'PAUSAR']?.bg ?? 'var(--border-default)') : 'transparent',
                color: filterSignal===opt ? (opt==='TODOS'?'var(--text-primary)':SIGNAL_CFG[opt as 'ESCALAR'|'MANTENER'|'PAUSAR']?.color ?? 'var(--text-primary)') : 'var(--text-muted)',
              }}>
              {opt}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border-default)]" style={{ background: 'var(--bg-card)' }}>
          <span className="mono text-xs text-[var(--text-muted)]">MIN LEADS</span>
          <select value={filterMinLeads} onChange={e => setFilterMinLeads(Number(e.target.value))}
            className="bg-transparent mono text-xs text-[var(--text-primary)] outline-none">
            {[1,3,5,10,20].map(n => <option key={n} value={n} style={{ background: 'var(--bg-card)' }}>{n}+</option>)}
          </select>
        </div>
        <span className="mono text-xs text-[var(--text-muted)]">
          {filteredRows.length} de {allRows.length} anuncios
        </span>
      </div>

      {/* ── T3: Tabla dinámica ── */}
      {loading ? (
        <div className="rounded-2xl border border-[var(--border-default)] flex items-center justify-center py-20" style={{ background: 'var(--bg-card)' }}>
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--accent)' }}/>
            <p className="mono text-[11px] text-[var(--text-muted)] tracking-widest">CARGANDO DATOS DE ANUNCIOS...</p>
          </div>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border-default)] flex flex-col items-center justify-center py-20 gap-4" style={{ background: 'var(--bg-card)' }}>
          <BarChart2 size={28} style={{ color: '#2E2E4E' }}/>
          <p className="mono text-[11px] text-[var(--text-muted)]">
            {allRows.length === 0 ? 'Sin datos UTM para este proyecto' : 'Sin anuncios con los filtros actuales'}
          </p>
          {allRows.length === 0 && (
            <p className="mono text-xs text-[#2E2E4E] text-center max-w-xs">
              Los leads deben llegar con utm_content en la URL para aparecer aquí
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden" style={{ background: 'var(--bg-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ minWidth: '900px' }}>
              <thead>
                <tr className="border-b border-[var(--border-default)]" style={{ background: 'var(--bg-base)' }}>
                  {[
                    { label: 'SEÑAL',         col: 'signal' as keyof TrafickerAdRow },
                    { label: 'ANUNCIO',        col: 'utm_content' as keyof TrafickerAdRow },
                    { label: 'LEADS',          col: 'total_leads' as keyof TrafickerAdRow },
                    { label: 'RESP%',          col: 'resp_rate' as keyof TrafickerAdRow },
                    { label: 'SCORE',          col: 'avg_score' as keyof TrafickerAdRow },
                    { label: 'ENGAGEMENT',     col: 'avg_engagement' as keyof TrafickerAdRow },
                    { label: 'CALIFICADOS',    col: 'qualified_leads' as keyof TrafickerAdRow },
                    { label: 'QUIZ%',          col: 'quiz_rate' as keyof TrafickerAdRow },
                    { label: 'SEGMENTOS',      col: null },
                    { label: 'DOLOR TOP',      col: null },
                    { label: 'CPL EST.',       col: 'cpl' as keyof TrafickerAdRow },
                  ].map((h, i) => (
                    <th key={i}
                      onClick={h.col ? () => toggleSort(h.col!) : undefined}
                      className={`px-4 py-3 text-left mono text-xs text-[var(--text-muted)] tracking-widest font-normal whitespace-nowrap ${h.col ? 'cursor-pointer hover:text-[var(--text-primary)] select-none' : ''}`}
                      style={{ color: h.col && sortCol===h.col ? 'var(--accent)' : undefined }}>
                      {h.label}{h.col && <SortIcon col={h.col}/>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row, i) => {
                  const sig = SIGNAL_CFG[row.signal]
                  const segTotal = row.seg_frio + row.seg_templado + row.seg_caliente + row.seg_listo || 1
                  return (
                    <tr key={i} className="border-b border-[var(--border-default)] hover:bg-[#0D0D14] transition-colors">

                      {/* Señal */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="mono text-xs font-bold px-2 py-1 rounded-lg whitespace-nowrap"
                            style={{ color: sig.color, background: sig.bg, border: `1px solid ${sig.color}30` }}>
                            {sig.icon} {row.signal}
                          </span>
                          <span className="mono text-[8px] text-[var(--text-muted)] max-w-[90px] leading-tight">{row.signal_reason}</span>
                        </div>
                      </td>

                      {/* Anuncio */}
                      <td className="px-4 py-3 max-w-[180px]">
                        <p className="text-xs font-medium text-[var(--text-primary)] truncate" title={row.utm_content}>{row.utm_content}</p>
                        <p className="mono text-xs text-[var(--text-muted)] truncate">{row.utm_source ?? '—'} · {row.utm_campaign ?? '—'}</p>
                      </td>

                      {/* Leads */}
                      <td className="px-4 py-3">
                        <p className="mono text-sm font-bold text-[var(--text-primary)]">{row.total_leads}</p>
                      </td>

                      {/* Tasa respuesta */}
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="mono text-sm font-bold" style={{ color: row.resp_rate>=50?'var(--success)':row.resp_rate>=25?'var(--warning)':'var(--danger)' }}>
                            {row.resp_rate}%
                          </p>
                          <div className="h-1 w-14 rounded-full bg-[var(--border-default)]">
                            <div className="h-full rounded-full" style={{ width:`${row.resp_rate}%`, background: row.resp_rate>=50?'var(--success)':row.resp_rate>=25?'var(--warning)':'var(--danger)' }}/>
                          </div>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="px-4 py-3">
                        {row.avg_score !== null ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center border-2 mono text-xs font-bold"
                              style={{
                                borderColor: row.avg_score>=76?'var(--success)':row.avg_score>=51?'var(--danger)':row.avg_score>=26?'var(--warning)':'var(--accent)',
                                color:       row.avg_score>=76?'var(--success)':row.avg_score>=51?'var(--danger)':row.avg_score>=26?'var(--warning)':'var(--accent)',
                              }}>
                              {row.avg_score}
                            </div>
                          </div>
                        ) : <span className="mono text-xs text-[#2E2E4E]">—</span>}
                      </td>

                      {/* Engagement */}
                      <td className="px-4 py-3">
                        <span className="mono text-sm font-bold" style={{ color: (row.avg_engagement??0)>=5?'var(--success)':(row.avg_engagement??0)>=3?'var(--warning)':'var(--text-muted)' }}>
                          {row.avg_engagement !== null ? `★${row.avg_engagement}` : '—'}
                        </span>
                      </td>

                      {/* Calificados */}
                      <td className="px-4 py-3">
                        <p className="mono text-sm font-bold" style={{ color: '#C084FC' }}>{row.qualified_leads}</p>
                        <p className="mono text-xs text-[var(--text-muted)]">score ≥ 60</p>
                      </td>

                      {/* Quiz */}
                      <td className="px-4 py-3">
                        <p className="mono text-sm font-bold" style={{ color: row.quiz_rate>=50?'var(--success)':row.quiz_rate>=25?'var(--warning)':'var(--text-muted)' }}>
                          {row.quiz_rate}%
                        </p>
                        <p className="mono text-xs text-[var(--text-muted)]">{row.quiz_completed} leads</p>
                      </td>

                      {/* Segmentos mini-bar */}
                      <td className="px-4 py-3">
                        <div className="flex h-2 w-20 rounded-full overflow-hidden gap-px">
                          {row.seg_listo    > 0 && <div style={{ flex: row.seg_listo,    background: 'var(--success)' }} title={`Listo: ${row.seg_listo}`}/>}
                          {row.seg_caliente > 0 && <div style={{ flex: row.seg_caliente, background: 'var(--danger)' }} title={`Caliente: ${row.seg_caliente}`}/>}
                          {row.seg_templado > 0 && <div style={{ flex: row.seg_templado, background: 'var(--warning)' }} title={`Templado: ${row.seg_templado}`}/>}
                          {row.seg_frio     > 0 && <div style={{ flex: row.seg_frio,     background: 'var(--accent)' }} title={`Frío: ${row.seg_frio}`}/>}
                        </div>
                        <p className="mono text-[8px] text-[var(--text-muted)] mt-1">
                          {row.seg_listo > 0 && <span style={{ color: 'var(--success)' }}>{row.seg_listo}L </span>}
                          {row.seg_caliente > 0 && <span style={{ color: 'var(--danger)' }}>{row.seg_caliente}C </span>}
                          {row.seg_templado > 0 && <span style={{ color: 'var(--warning)' }}>{row.seg_templado}T </span>}
                          {row.seg_frio > 0 && <span style={{ color: 'var(--accent)' }}>{row.seg_frio}F</span>}
                        </p>
                      </td>

                      {/* Dolor top */}
                      <td className="px-4 py-3 max-w-[160px]">
                        {row.top_dolor ? (
                          <p className="text-[11px] text-[var(--text-primary)] truncate" title={row.top_dolor}>{row.top_dolor}</p>
                        ) : (
                          <span className="mono text-xs text-[#2E2E4E]">sin datos</span>
                        )}
                      </td>

                      {/* CPL estimado */}
                      <td className="px-4 py-3">
                        {row.cpl !== null ? (
                          <p className="mono text-sm font-bold text-[var(--warning)]">${row.cpl}</p>
                        ) : (
                          <span className="mono text-xs text-[#2E2E4E]">sin presupuesto</span>
                        )}
                      </td>

                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Footer de tabla */}
          <div className="px-5 py-3 border-t border-[var(--border-default)] flex items-center justify-between"
               style={{ background: 'var(--bg-base)' }}>
            <p className="mono text-xs text-[var(--text-muted)]">
              {filteredRows.reduce((a,r) => a+r.total_leads, 0)} leads · {filteredRows.length} anuncios
              {adBudget && ` · Presupuesto $${adBudget.toLocaleString()}`}
            </p>
            <div className="flex items-center gap-4">
              {(['listo','caliente','templado','frio'] as const).map(s => (
                <div key={s} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full" style={{ background: s==='listo'?'var(--success)':s==='caliente'?'var(--danger)':s==='templado'?'var(--warning)':'var(--accent)' }}/>
                  <span className="mono text-xs text-[var(--text-muted)] capitalize">{s}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FUENTES TAB ─────────────────────────────────────────────────────────────

interface UtmRow {
  id: string; project_id: string|null; phone_number: string
  utm_source: string|null; utm_medium: string|null; utm_campaign: string|null
  utm_content: string|null; utm_term: string|null; landing_url: string|null
  registered_at: string; matched_contact_id: string|null
  first_name: string|null; last_name: string|null; source_platform: string|null
  matched_at: string|null
}

interface CampaignGroup {
  campaign: string; source: string; content: string
  rows: UtmRow[]; totalLeads: number
  calientes: number; calPct: number
  compradores: number; convPct: number
  avgKanshiScore: number
}

// AT3a: helper para tiempo relativo
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d`
  return `${Math.floor(d / 30)}mes`
}

// AT3a: Mini-timeline de leads por grupo de campaña — definido a nivel módulo
function LeadMiniTimeline({
  rows,
  leadMap,
  quizPhones,
  onLeadClick,
}: {
  rows: UtmRow[]
  leadMap: Record<string, Lead>
  quizPhones: Set<string>
  onLeadClick?: (phone: string) => void
}) {
  const STAGE_LABELS: Record<string, string> = {
    nuevo: 'Nuevo', descubrimiento: 'Desc.', perfilando_1: 'Perf.1',
    perfilando_2: 'Perf.2', perfilando_3: 'Perf.3', perfil_completo: 'Completo',
    calentando: 'Calent.', lives: 'Lives', clases: 'Clases', VIP: 'VIP', comprador: 'Comprador',
  }
  const STAGE_COLOR: Record<string, string> = {
    nuevo: 'var(--text-muted)', descubrimiento: 'var(--text-muted)', perfilando_1: 'var(--accent)',
    perfilando_2: 'var(--accent)', perfilando_3: 'var(--accent)', perfil_completo: 'var(--primary)',
    calentando: 'var(--warning)', lives: 'var(--success)', clases: 'var(--success)', VIP: '#C084FC', comprador: 'var(--success)',
  }

  const sorted = [...rows]
    .sort((a, b) => new Date(b.registered_at).getTime() - new Date(a.registered_at).getTime())
    .slice(0, 6)

  if (sorted.length === 0) return null

  return (
    <div>
      <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-3">
        ACTIVIDAD RECIENTE — {rows.length} LEADS
      </p>
      <div className="space-y-0">
        {sorted.map((row, idx) => {
          const lead = row.matched_contact_id ? leadMap[row.matched_contact_id] : null
          const hasQuiz = quizPhones.has(row.phone_number)
          const score = lead?.kanshi_score || 0
          const scoreColor = score >= 76 ? '#00FF94' : score >= 51 ? '#FF6B35' : score >= 26 ? '#FFB800' : '#00b0f6'
          const stage = lead?.agent_stage || ''
          const initials = (lead?.name || row.phone_number || '?')
            .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
          const isLast = idx === sorted.length - 1

          return (
            <div
              key={row.phone_number + row.registered_at}
              className={`flex items-stretch gap-3 rounded-xl transition-colors${onLeadClick ? ' cursor-pointer hover:bg-[#16161F] px-1 -mx-1' : ''}`}
              onClick={onLeadClick ? () => onLeadClick(row.phone_number) : undefined}>
              {/* Línea de tiempo */}
              <div className="flex flex-col items-center flex-shrink-0 w-6 pt-1.5">
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ background: lead ? 'var(--accent)' : '#2A2A3A', border: '1px solid var(--border-default)' }}/>
                {!isLast && <div className="w-px flex-1 mt-1" style={{ background: 'var(--border-default)', minHeight: '16px' }}/>}
              </div>

              {/* Contenido del evento */}
              <div className={`flex items-center gap-2 flex-1 py-1.5 ${!isLast ? 'pb-2' : ''}`}>
                {/* Avatar */}
                <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mono text-[8px] font-bold"
                  style={{ background: lead ? 'var(--primary)20' : 'var(--border-default)', color: lead ? 'var(--accent)' : 'var(--text-muted)', border: `1px solid ${lead ? 'var(--primary)40' : '#2A2A3A'}` }}>
                  {initials}
                </div>

                {/* Nombre / teléfono */}
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-medium text-[var(--text-primary)] truncate block">
                    {lead?.name || row.phone_number}
                  </span>
                  {lead?.name && (
                    <span className="mono text-xs text-[#2E2E4E] truncate block">{row.phone_number}</span>
                  )}
                </div>

                {/* Tiempo relativo */}
                <span className="mono text-xs text-[var(--text-muted)] flex-shrink-0">
                  {timeAgo(row.registered_at)}
                </span>

                {/* Badge Quiz */}
                <span className="mono text-[8px] px-1.5 py-0.5 rounded flex-shrink-0"
                  style={hasQuiz
                    ? { color: 'var(--success)', background: 'var(--success)15', border: '1px solid var(--success)30' }
                    : { color: '#2E2E4E', background: 'var(--border-default)', border: '1px solid #2A2A3A' }}>
                  {hasQuiz ? 'QUIZ ✓' : 'sin quiz'}
                </span>

                {/* Badge Score */}
                {score > 0 && (
                  <span className="mono text-xs font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ color: scoreColor, background: `${scoreColor}15`, border: `1px solid ${scoreColor}30` }}>
                    {score}
                  </span>
                )}

                {/* Badge Stage */}
                {stage && (
                  <span className="mono text-[8px] px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ color: STAGE_COLOR[stage] || 'var(--text-muted)', background: `${STAGE_COLOR[stage] || 'var(--text-muted)'}15` }}>
                    {STAGE_LABELS[stage] || stage}
                  </span>
                )}

                {/* Sin match SAM */}
                {!lead && (
                  <span className="mono text-[8px] text-[#2E2E4E] flex-shrink-0">sin match</span>
                )}
              </div>
            </div>
          )
        })}
        {rows.length > 6 && (
          <p className="mono text-xs text-[#2E2E4E] pl-9 pt-1">
            +{rows.length - 6} leads más en esta campaña
          </p>
        )}
      </div>
    </div>
  )
}

function FuentesTab({
  activeProjectId, leads, projects
}: {
  activeProjectId: string|null; leads: Lead[]; projects: Project[]
}) {
  const [utmData, setUtmData] = useState<UtmRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<CampaignGroup|null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [selectedLeadPhone, setSelectedLeadPhone] = useState<string|null>(null)
  const [quizResponses, setQuizResponses] = useState<Array<{
    phone_number: string
    responses: Record<string, string>
  }>>([])
  // AT2: mapa campaign_name.toLowerCase() → objective (desde meta_ads_insights caché)
  const [metaCampaignMap, setMetaCampaignMap] = useState<Record<string, string>>({})

  useEffect(() => {
    const fetchQuizData = async () => {
      let q = supabase
        .from('lead_quiz_responses')
        .select('phone_number, responses')
        .eq('quiz_type', 'registro')
      if (activeProjectId) q = q.eq('project_id', activeProjectId)
      const { data } = await q
      setQuizResponses(data || [])
    }
    fetchQuizData()
  }, [activeProjectId])

  // AT2: Cargar caché de meta_ads_insights para cruzar campaign_name → objective
  useEffect(() => {
    const fetchMetaCampaigns = async () => {
      let q = supabase
        .from('meta_ads_insights')
        .select('campaigns')
        .order('fetched_at', { ascending: false })
        .limit(1)
      if (activeProjectId) q = q.eq('project_id', activeProjectId)
      const { data } = await q
      if (data && data.length > 0 && data[0].campaigns) {
        const campaigns = data[0].campaigns as Array<{ campaign_name: string; objective: string }>
        const map: Record<string, string> = {}
        for (const c of campaigns) {
          if (c.campaign_name && c.objective) {
            map[c.campaign_name.toLowerCase().trim()] = c.objective
          }
        }
        setMetaCampaignMap(map)
      }
    }
    fetchMetaCampaigns()
  }, [activeProjectId])

  const toggleExpand = (key: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const activeProject = projects.find(p => p.id === activeProjectId)
  const adBudget = activeProject?.ad_budget || null

  const leadMap = useMemo(() => {
    const m: Record<string, Lead> = {}
    for (const l of leads) m[l.id] = l
    return m
  }, [leads])

  const fetchUtmData = useCallback(async () => {
    setLoading(true)
    try {
      let q = supabase.from('utm_tracking').select('*').order('registered_at', { ascending: false })
      if (activeProjectId) q = q.eq('project_id', activeProjectId)
      const { data } = await q
      setUtmData(data || [])
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => { fetchUtmData() }, [fetchUtmData])

  const groups = useMemo<CampaignGroup[]>(() => {
    // Group by campaign → then by source+content within each campaign
    const map: Record<string, UtmRow[]> = {}
    for (const row of utmData) {
      const key = [
        row.utm_campaign || '(sin campaña)',
        row.utm_source || '',
        row.utm_content || ''
      ].join('||')
      if (!map[key]) map[key] = []
      map[key].push(row)
    }
    return Object.entries(map).map(([key, rows]) => {
      const [campaign, source, content] = key.split('||')
      const matchedLeads = rows
        .filter(r => r.matched_contact_id)
        .map(r => leadMap[r.matched_contact_id!])
        .filter(Boolean) as Lead[]
      const calientes = matchedLeads.filter(l => l.segmento === 'caliente').length
      const compradores = matchedLeads.filter(l => l.agent_stage === 'comprador').length
      const totalLeads = rows.length
      const scoredLeads = matchedLeads.filter(l => (l.kanshi_score || 0) > 0)
      const avgKanshiScore = scoredLeads.length > 0
        ? Math.round(scoredLeads.reduce((s, l) => s + (l.kanshi_score || 0), 0) / scoredLeads.length)
        : 0
      return {
        campaign, source, content, rows, totalLeads,
        calientes, calPct: totalLeads > 0 ? Math.round((calientes / totalLeads) * 100) : 0,
        compradores, convPct: totalLeads > 0 ? Math.round((compradores / totalLeads) * 100) : 0,
        avgKanshiScore,
      }
    }).sort((a, b) => b.totalLeads - a.totalLeads)
  }, [utmData, leadMap])

  const totals = useMemo(() => ({
    leads: groups.reduce((s, g) => s + g.totalLeads, 0),
    calientes: groups.reduce((s, g) => s + g.calientes, 0),
    compradores: groups.reduce((s, g) => s + g.compradores, 0),
  }), [groups])

  const cpl = (group: CampaignGroup) => {
    if (!adBudget || groups.length === 0 || group.totalLeads === 0) return '—'
    // Distribuir budget proporcionalmente por leads (estimado hasta Meta Ads API)
    const share = (group.totalLeads / Math.max(totals.leads, 1)) * adBudget
    return `$${(share / group.totalLeads).toFixed(1)}`
  }

  const cpv = (group: CampaignGroup) => {
    if (!adBudget || groups.length === 0 || group.compradores === 0) return '—'
    const share = (group.totalLeads / Math.max(totals.leads, 1)) * adBudget
    return `$${(share / group.compradores).toFixed(0)}`
  }

  const sourcePlatformColor = (p: string|null) =>
    p === 'facebook' || p === 'ghl' ? 'var(--accent)' : p === 'instagram' ? '#C084FC' : 'var(--text-muted)'

  // AT3a: Set de teléfonos con quiz completado (O(1) lookup en LeadMiniTimeline)
  const quizPhones = useMemo(() => new Set(quizResponses.map(q => q.phone_number)), [quizResponses])

  // AT2: badge de objetivo Meta con mismo color system que MetaAdsIntelligencePanel
  const OBJECTIVE_LABELS_F: Record<string, string> = {
    'LEAD_GENERATION': 'Lead Ads', 'MESSAGES': 'WhatsApp', 'CONVERSIONS': 'Conversiones',
    'LINK_CLICKS': 'Tráfico', 'OUTCOME_LEADS': 'Leads (new)', 'OUTCOME_TRAFFIC': 'Tráfico (new)',
    'OUTCOME_ENGAGEMENT': 'Engagement', 'REACH': 'Alcance', 'BRAND_AWARENESS': 'Branding',
    'VIDEO_VIEWS': 'Video', 'POST_ENGAGEMENT': 'Engagement',
  }
  const objBadgeInFuentes = (campaign: string) => {
    const key = campaign.toLowerCase().trim()
    const objective = metaCampaignMap[key]
    if (!objective) {
      return (
        <span className="mono text-xs px-2 py-0.5 rounded-full"
          style={{ color: 'var(--text-muted)', background: 'var(--text-muted)18', border: '1px solid var(--text-muted)30' }}>
          Orgánico
        </span>
      )
    }
    const color = objective === 'LEAD_GENERATION' || objective === 'OUTCOME_LEADS' ? 'var(--accent)'
      : objective === 'MESSAGES' ? 'var(--success)'
      : objective === 'CONVERSIONS' ? 'var(--warning)'
      : 'var(--accent)'
    const label = OBJECTIVE_LABELS_F[objective] || objective
    return (
      <span className="mono text-xs px-2 py-0.5 rounded-full"
        style={{ color, background: `${color}10`, border: `1px solid ${color}30` }}>
        {label}
      </span>
    )
  }

// Construye distribución de respuestas de quiz para un grupo de campaña
  const buildQuizDistribution = (group: CampaignGroup) => {
    const phones = new Set(group.rows.map(r => r.phone_number))
    const relevant = quizResponses.filter(q => phones.has(q.phone_number))
    if (relevant.length === 0) return []

    // Agrupa por pregunta → cuenta respuestas
    const questionMap: Record<string, Record<string, number>> = {}
    for (const q of relevant) {
      const responses = q.responses as Record<string, string>
      for (const [key, val] of Object.entries(responses)) {
        if (!val || typeof val !== 'string') continue
        if (!questionMap[key]) questionMap[key] = {}
        const v = val.trim().toLowerCase().slice(0, 60)
        questionMap[key][v] = (questionMap[key][v] || 0) + 1
      }
    }

    // Convertir a formato para Recharts — máx 4 preguntas más relevantes
    return Object.entries(questionMap)
      .filter(([, answers]) => Object.keys(answers).length > 1) // solo preguntas con variedad
      .slice(0, 4)
      .map(([question, answers]) => ({
        question: question.replace(/_/g, ' ').toUpperCase().slice(0, 40),
        data: Object.entries(answers)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, value]) => ({
            name: name.slice(0, 35),
            value,
            pct: Math.round((value / relevant.length) * 100),
          })),
        total: relevant.length,
      }))
  }
  
  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}/>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL LEADS', value: totals.leads, color: 'var(--accent)' },
          { label: 'LEADS CALIENTES', value: totals.calientes, sub: totals.leads > 0 ? `${Math.round((totals.calientes/totals.leads)*100)}%` : '0%', color: 'var(--danger)' },
          { label: 'COMPRADORES', value: totals.compradores, sub: totals.leads > 0 ? `${Math.round((totals.compradores/totals.leads)*100)}% conv.` : '—', color: 'var(--success)' },
          { label: 'FUENTES ACTIVAS', value: groups.length, color: 'var(--warning)' },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-[var(--border-default)] p-4" style={{ background: 'var(--bg-card)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-1">{m.label}</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
              {m.sub && <p className="mono text-xs text-[var(--text-muted)] mb-1">{m.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[var(--border-default)] overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <div>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">FUENTES DE TRÁFICO</p>
            {activeProject && <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5">{activeProject.name}</p>}
          </div>
          {!adBudget && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--warning)30] bg-[var(--warning)08]">
              <AlertCircle size={10} style={{ color: 'var(--warning)' }}/>
              <span className="mono text-xs text-[var(--text-muted)]">CPL/CPV disponible con presupuesto de ads configurado</span>
            </div>
          )}
        </div>
        {groups.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <TrendingUp size={24} className="text-[#2A2A3A] mx-auto mb-3"/>
            <p className="text-[var(--text-muted)] text-sm">Sin datos UTM registrados aún</p>
            <p className="mono text-xs text-[#2A2A4A] mt-1">Los UTMs se capturan cuando un lead llega desde una landing con parámetros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  {['CAMPAÑA','FUENTE','ANUNCIO','LEADS','CALIENTES','COMPRADORES','SCORE PROM','CPL EST.','CPV EST.','OBJETIVO',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left mono text-xs text-[var(--text-muted)] tracking-widest font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => {
                  const key = `${g.campaign}||${g.source}||${g.content}`
                  const isExpanded = expandedGroups.has(key)
                  const samActivos = g.rows.filter(r => r.matched_contact_id).length
                  const calificados = g.rows.filter(r => {
                    const lead = r.matched_contact_id ? leadMap[r.matched_contact_id] : null
                    return lead && (lead.kanshi_score || 0) >= 50
                  }).length
                  const scoreAlto = g.rows.filter(r => {
                    const lead = r.matched_contact_id ? leadMap[r.matched_contact_id] : null
                    return lead && (lead.kanshi_score || 0) >= 70
                  }).length
                  const total = g.totalLeads

                  const FunnelBar = ({ label, value, color }: { label: string; value: number; color: string }) => (
                    <div className="flex items-center gap-3">
                      <span className="mono text-xs text-[var(--text-muted)] w-28 flex-shrink-0 tracking-widest">{label}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border-default)' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: total > 0 ? `${Math.round((value / total) * 100)}%` : '0%', background: color }}/>
                      </div>
                      <span className="mono text-xs font-bold w-6 text-right" style={{ color }}>{value}</span>
                      <span className="mono text-xs text-[var(--text-muted)] w-8 text-right">
                        {total > 0 ? `${Math.round((value / total) * 100)}%` : '0%'}
                      </span>
                    </div>
                  )

                  return (
                    <>
                      {/* ── Fila principal ── */}
                      <tr key={`row-${i}`}
                        className="border-b border-[var(--border-default)] hover:bg-[#16161F] transition-colors cursor-pointer"
                        onClick={() => toggleExpand(key)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                              style={{ background: 'var(--border-default)' }}>
                              <ChevronRight size={9} className="text-[var(--text-muted)]"/>
                            </div>
                            <p className="text-sm font-medium text-[var(--text-primary)]">{g.campaign}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="mono text-xs px-2 py-0.5 rounded-full"
                            style={{ color: sourcePlatformColor(g.source), background: `${sourcePlatformColor(g.source)}15` }}>
                            {g.source || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="mono text-xs text-[var(--text-muted)]">{g.content || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="mono text-sm font-bold text-[var(--text-primary)]">{g.totalLeads}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="mono text-sm text-[var(--text-primary)]">{g.calientes}</span>
                            <span className="mono text-xs" style={{ color: g.calPct >= 40 ? 'var(--success)' : g.calPct >= 20 ? 'var(--warning)' : 'var(--danger)' }}>
                              {g.calPct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="mono text-sm text-[var(--text-primary)]">{g.compradores}</span>
                            {g.compradores > 0 && (
                              <span className="mono text-xs" style={{ color: 'var(--success)' }}>{g.convPct}%</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {g.avgKanshiScore > 0 ? (
                            <span className="mono text-sm font-bold"
                              style={{ color: g.avgKanshiScore>=76?'var(--success)':g.avgKanshiScore>=51?'var(--danger)':g.avgKanshiScore>=26?'var(--warning)':'var(--accent)' }}>
                              {g.avgKanshiScore}
                            </span>
                          ) : <span className="mono text-xs text-[#2E2E4E]">—</span>}
                        </td>
                        <td className="px-4 py-3 mono text-sm" style={{ color: adBudget ? 'var(--text-primary)' : 'var(--text-muted)' }}>{cpl(g)}</td>
                        <td className="px-4 py-3 mono text-sm" style={{ color: adBudget && g.compradores > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{cpv(g)}</td>
                        {/* AT2: Columna OBJETIVO — match utm_campaign vs meta_ads_insights */}
                        <td className="px-4 py-3">
                          {objBadgeInFuentes(g.campaign)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedGroup(g) }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--border-default)] hover:border-[var(--accent)] transition-colors group">
                            <Eye size={10} className="text-[var(--text-muted)] group-hover:text-[var(--accent)]"/>
                            <span className="mono text-xs text-[var(--text-muted)] group-hover:text-[var(--accent)]">leads</span>
                          </button>
                        </td>
                      </tr>

                      {/* ── Panel expandible ── */}
                      {isExpanded && (
                        <tr key={`funnel-${i}`} className="border-b border-[var(--border-default)]">
                          <td colSpan={11} className="px-6 py-5" style={{ background: '#0D0D14' }}>
                            <div className="space-y-5">

                              {/* Funnel + métricas */}
                              <div className="flex items-start gap-8">
                                <div className="flex-1 space-y-2.5">
                                  <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-3">EMBUDO DE CONVERSIÓN</p>
                                  <FunnelBar label="REGISTRADOS"  value={total}         color="var(--accent)"/>
                                  <FunnelBar label="SAM ACTIVOS"  value={samActivos}    color="var(--primary)"/>
                                  <FunnelBar label="CALIFICADOS"  value={calificados}   color="var(--warning)"/>
                                  <FunnelBar label="SCORE ≥ 70"   value={scoreAlto}     color="var(--danger)"/>
                                  <FunnelBar label="COMPRADORES"  value={g.compradores} color="var(--success)"/>
                                </div>
                                <div className="w-48 space-y-2 flex-shrink-0">
                                  <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-3">MÉTRICAS</p>
                                  {[
                                    { label: 'ACTIVACIÓN SAM', value: total>0?`${Math.round((samActivos/total)*100)}%`:'—', color: 'var(--accent)' },
                                    { label: 'TASA CALIDAD',   value: total>0?`${Math.round((calificados/total)*100)}%`:'—', color: 'var(--warning)' },
                                    { label: 'CPL EST.',       value: cpl(g), color: 'var(--text-primary)' },
                                    { label: 'CPV EST.',       value: cpv(g), color: g.compradores>0?'var(--success)':'var(--text-muted)' },
                                    { label: 'SCORE PROM.',    value: g.avgKanshiScore>0?`${g.avgKanshiScore}`:'—',
                                      color: g.avgKanshiScore>=76?'var(--success)':g.avgKanshiScore>=51?'var(--danger)':g.avgKanshiScore>=26?'var(--warning)':'var(--accent)' },
                                  ].map(m => (
                                    <div key={m.label} className="flex items-center justify-between py-1.5 border-b border-[var(--border-default)]">
                                      <span className="mono text-xs text-[var(--text-muted)] tracking-widest">{m.label}</span>
                                      <span className="mono text-[11px] font-bold" style={{ color: m.color }}>{m.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* F4c — Distribución quiz de registro */}
                              {(() => {
                                const dist = buildQuizDistribution(g)
                                if (dist.length === 0) return (
                                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[var(--border-default)]" style={{ background: 'var(--bg-card)' }}>
                                    <BookOpen size={11} style={{ color: 'var(--text-muted)' }}/>
                                    <span className="mono text-xs text-[var(--text-muted)] tracking-widest">
                                      SIN DATOS DE QUIZ — los gráficos aparecen cuando lleguen respuestas del quiz de registro
                                    </span>
                                  </div>
                                )
                                return (
                                  <div>
                                    <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-3">
                                      DISTRIBUCIÓN QUIZ DE REGISTRO — {dist[0]?.total} respuestas
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                      {dist.map((q, qi) => (
                                        <div key={qi} className="rounded-xl border border-[var(--border-default)] p-4" style={{ background: 'var(--bg-card)' }}>
                                          <p className="mono text-xs text-[var(--accent)] tracking-widest mb-3 truncate">{q.question}</p>
                                          <div className="space-y-2">
                                            {q.data.map((d, di) => (
                                              <div key={di} className="flex items-center gap-2">
                                                <span className="mono text-xs text-[var(--text-muted)] w-32 truncate flex-shrink-0">{d.name}</span>
                                                <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border-default)' }}>
                                                  <div className="h-full rounded-full transition-all duration-700"
                                                    style={{ width:`${d.pct}%`, background: di===0?'var(--accent)':di===1?'var(--warning)':di===2?'var(--danger)':'var(--text-muted)' }}/>
                                                </div>
                                                <span className="mono text-xs font-bold w-7 text-right"
                                                  style={{ color: di===0?'var(--accent)':di===1?'var(--warning)':di===2?'var(--danger)':'var(--text-muted)' }}>
                                                  {d.pct}%
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )
                              })()}

                              {/* AT3a: Mini-timeline de leads del grupo */}
                              <LeadMiniTimeline
                                rows={g.rows}
                                leadMap={leadMap}
                                quizPhones={quizPhones}
                                onLeadClick={setSelectedLeadPhone}
                              />

                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══ META ADS INTELLIGENCE (MA4) ══ */}
      <MetaAdsIntelligencePanel
        activeProjectId={activeProjectId}
        groups={groups}
      />

      {/* Lead panel for selected campaign */}
      {selectedGroup && (
        <CampaignLeadPanel group={selectedGroup} leadMap={leadMap} onClose={() => setSelectedGroup(null)} onLeadClick={setSelectedLeadPhone}/>
      )}

      <LeadJourneyDrawer phone={selectedLeadPhone} onClose={() => setSelectedLeadPhone(null)}/>
    </div>
  )
}

// ─── CAMPAIGN LEAD PANEL ──────────────────────────────────────────────────────

function CampaignLeadPanel({
  group, leadMap, onClose, onLeadClick
}: {
  group: CampaignGroup
  leadMap: Record<string, Lead>
  onClose: () => void
  onLeadClick?: (phone: string) => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg h-full border-l border-[var(--border-default)] overflow-y-auto"
        style={{ background: '#0D0D14', boxShadow: '-24px 0 80px rgba(0,0,0,0.7)', animation: 'slideInRight 0.2s ease' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-[var(--border-default)] sticky top-0 z-10" style={{ background: 'rgba(13,13,20,0.97)' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">LEADS DE CAMPAÑA</p>
              <p className="font-bold text-[var(--text-primary)] text-base mt-0.5 truncate">{group.campaign}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {group.source && (
                  <span className="mono text-xs px-2 py-0.5 rounded-full" style={{ color: 'var(--accent)', background: 'var(--accent)20' }}>{group.source}</span>
                )}
                {group.content && (
                  <span className="mono text-xs text-[var(--text-muted)]">{group.content}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg border border-[var(--border-default)] hover:border-[var(--danger)] transition-colors group ml-3 flex-shrink-0">
              <X size={12} className="text-[var(--text-muted)] group-hover:text-[var(--danger)]"/>
            </button>
          </div>
          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'LEADS', value: group.totalLeads, color: 'var(--accent)' },
              { label: 'CALIENTES', value: `${group.calientes} (${group.calPct}%)`, color: 'var(--danger)' },
              { label: 'COMPRADORES', value: group.compradores, color: 'var(--success)' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-[var(--border-default)] p-2.5" style={{ background: 'var(--bg-card)' }}>
                <p className="mono text-[8px] text-[var(--text-muted)] tracking-widest">{s.label}</p>
                <p className="mono text-sm font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lead list */}
        <div className="divide-y divide-[var(--border-default)]">
          {group.rows.map((row, i) => {
            const lead = row.matched_contact_id ? leadMap[row.matched_contact_id] : null
            const name = row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : row.phone_number
            return (
              <div
                key={i}
                className={`px-6 py-4 flex items-center gap-4 transition-colors${onLeadClick ? ' cursor-pointer hover:bg-[#16161F]' : ''}`}
                onClick={onLeadClick ? () => onLeadClick(row.phone_number) : undefined}>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: lead ? `${segColor(lead.segmento)}20` : 'var(--border-default)' }}>
                  <User size={12} style={{ color: lead ? segColor(lead.segmento) : '#4A4A6A' }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="mono text-xs text-[var(--text-muted)]">{row.phone_number}</span>
                    {lead && lead.segmento && (
                      <span className="mono text-[8px] px-1.5 py-0.5 rounded-full" style={{ color: segColor(lead.segmento), background: `${segColor(lead.segmento)}15` }}>
                        {lead.segmento}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  {lead ? (
                    <StagePill stage={lead.agent_stage}/>
                  ) : (
                    <span className="mono text-xs text-[#2A2A4A]">sin match</span>
                  )}
                {(lead?.engagement_score ?? 0) > 0 && (
                    <span className="mono text-xs font-bold" style={{ color: scoreColor(lead!.engagement_score) }}>★{lead!.engagement_score}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── VENTAS TAB ───────────────────────────────────────────────────────────────

interface Sale {
  id: string
  phone_number: string
  amount: number
  currency: string
  product_name: string | null
  sale_source: string
  transaction_id: string | null
  utm_campaign: string | null
  utm_source: string | null
  sale_date: string
  capi_purchase_sent_at: string | null
  wa_contacts: { id: string; name: string; kanshi_score: number; kanshi_segment: string } | null
}

interface SalesMetrics {
  total_revenue: number
  total_sales: number
  avg_ticket: number
  by_source: Record<string, number>
  by_campaign: Record<string, { sales: number; revenue: number }>
}

// ─── HOTMART IMPORT SECTION ───────────────────────────────────────────────────
// Insertar ANTES de "function VentasTab(" en page.tsx

function HotmartImportSection({
  activeProjectId, stats, onImportComplete, onToast
}: {
  activeProjectId: string | null
  stats: { total: number; matched: number; capi_sent: number; total_revenue: number; match_rate: number } | null
  onImportComplete: () => void
  onToast: (type: 'success' | 'error' | 'info' | 'warning', msg: string) => void
}) {
  const [dragging, setDragging] = useState(false)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<{
    inserted: number; matched_contacts: number; skipped_dup: number;
    skipped_no_phone: number; capi_sent: number; total_csv: number; valid_rows: number; message: string
  } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const processFile = async (file: File) => {
    if (!activeProjectId) return
    if (!file.name.endsWith('.csv')) {
      onToast('error', 'Solo se aceptan archivos .csv de Hotmart')
      return
    }
    setImporting(true)
    setResult(null)
    try {
      const text = await file.text()
      const res = await fetch('/api/import-buyers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: activeProjectId, csv_text: text }),
      })
      const data = await res.json()
      if (data.success) {
        setResult(data)
        onToast('success', `✅ ${data.inserted} compradores importados · ${data.matched_contacts} con match WA`)
        onImportComplete()
      } else {
        onToast('error', data.error || 'Error al importar')
      }
    } catch {
      onToast('error', 'Error procesando el archivo')
    } finally {
      setImporting(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) processFile(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
    e.target.value = ''
  }

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--warning)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between"
           style={{ background: 'rgba(255,184,0,0.05)' }}>
        <div>
          <p className="mono text-xs tracking-widest font-bold" style={{ color: 'var(--warning)' }}>
            COMPRADORES HOTMART
          </p>
          <p className="text-xs text-[var(--text-primary)] mt-0.5">
            Importa historial de ventas · Meta CAPI retroactivo automático
          </p>
        </div>
        {stats && stats.total > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">IMPORTADOS</p>
              <p className="text-sm font-bold" style={{ color: 'var(--warning)' }}>{stats.total.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">MATCH WA</p>
              <p className="text-sm font-bold" style={{ color: stats.match_rate >= 50 ? 'var(--success)' : 'var(--accent)' }}>
                {stats.match_rate}%
              </p>
            </div>
            <div className="text-right">
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">CAPI ENVIADO</p>
              <p className="text-sm font-bold text-[var(--text-primary)]">{stats.capi_sent}</p>
            </div>
            <div className="text-right">
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">REVENUE HIST.</p>
              <p className="text-sm font-bold" style={{ color: 'var(--success)' }}>${stats.total_revenue.toLocaleString()}</p>
            </div>
          </div>
        )}
      </div>

      {/* Drag & Drop Zone */}
      <div className="p-5">
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className="relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed cursor-pointer transition-all py-10"
          style={{
            borderColor: dragging ? 'var(--warning)' : '#2E2E4E',
            background: dragging ? 'rgba(255,184,0,0.05)' : 'transparent',
          }}
        >
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange}/>

          {importing ? (
            <>
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--warning)' }}/>
              <p className="mono text-[11px] text-[var(--text-muted)] tracking-widest">PROCESANDO CSV...</p>
              <p className="text-xs text-[var(--text-muted)]">Normalizando teléfonos · Deduplicando · Enviando CAPI</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl border border-[#2E2E4E] flex items-center justify-center"
                   style={{ background: 'var(--bg-base)' }}>
                <Upload size={20} style={{ color: 'var(--warning)' }}/>
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-[var(--text-primary)]">
                  {dragging ? 'Suelta el archivo aquí' : 'Arrastra tu CSV de Hotmart'}
                </p>
                <p className="mono text-xs text-[var(--text-muted)] mt-1">
                  o haz clic para seleccionar · Solo Aprobado + Completo se importan
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#2E2E4E] mono text-xs text-[var(--text-muted)]">
                <span>Exportar desde Hotmart</span>
                <span>→</span>
                <span>Ventas</span>
                <span>→</span>
                <span>Historial de Transacciones</span>
                <span>→</span>
                <span style={{ color: 'var(--warning)' }}>Exportar CSV</span>
              </div>
            </>
          )}
        </div>

        {/* Resultado de la importación */}
        {result && (
          <div className="mt-4 rounded-xl border border-[var(--border-default)] p-4 space-y-3" style={{ background: 'var(--bg-base)' }}>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse"/>
              <p className="mono text-xs text-[var(--success)] tracking-widest font-bold">IMPORTACIÓN COMPLETADA</p>
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'CSV TOTAL',    value: result.total_csv,        color: 'var(--text-primary)' },
                { label: 'VÁLIDOS',      value: result.valid_rows,       color: 'var(--accent)' },
                { label: 'IMPORTADOS',   value: result.inserted,         color: 'var(--success)' },
                { label: 'MATCH WA',     value: result.matched_contacts, color: 'var(--warning)' },
                { label: 'DUPLICADOS',   value: result.skipped_dup,      color: 'var(--text-muted)' },
              ].map(s => (
                <div key={s.label} className="text-center rounded-xl border border-[var(--border-default)] py-3" style={{ background: 'var(--bg-card)' }}>
                  <p className="text-lg font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="mono text-xs text-[var(--text-muted)] tracking-widest mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {result.capi_sent > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,176,246,0.08)', border: '1px solid rgba(0,176,246,0.2)' }}>
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"/>
                <p className="mono text-xs text-[var(--accent)]">
                  {result.capi_sent} eventos Purchase enviados a Meta CAPI con fecha histórica retroactiva
                </p>
              </div>
            )}
            {result.skipped_no_phone > 0 && (
              <p className="mono text-xs text-[var(--text-muted)]">
                ⚠ {result.skipped_no_phone} filas omitidas por teléfono inválido o vacío
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── BUYER ANALYSIS PANEL ─────────────────────────────────────────────────────

interface QuizInsight {
  key: string
  value: string
  count: number
}

function BuyerAnalysisPanel({
  activeProjectId,
  stats,
  byCampaign,
}: {
  activeProjectId: string
  stats: { total: number; matched: number; capi_sent: number; total_revenue: number; match_rate: number }
  byCampaign: Record<string, { sales: number; revenue: number }>
}) {
  const [avgScore, setAvgScore] = useState<number | null>(null)
  const [scoreDistribution, setScoreDistribution] = useState<{ segment: string; count: number; color: string }[]>([])
  const [quizInsights, setQuizInsights] = useState<QuizInsight[]>([])
  const [loadingInsights, setLoadingInsights] = useState(true)

  useEffect(() => {
    const fetchInsights = async () => {
      setLoadingInsights(true)
      try {
        // ── 1. Compradores matcheados + KANSHI Score ───────────────────────────
        const { data: buyerRows } = await supabase
          .from('hotmart_buyers')
          .select('matched_contact_id, wa_contacts(kanshi_score, kanshi_segment)')
          .eq('project_id', activeProjectId)
          .not('matched_contact_id', 'is', null)

        if (buyerRows && buyerRows.length > 0) {
          // Avg score
          const scores = buyerRows
            .map(b => (b.wa_contacts as any)?.kanshi_score)
            .filter((s): s is number => typeof s === 'number' && s > 0)
          if (scores.length > 0) {
            setAvgScore(Math.round(scores.reduce((a, b) => a + b, 0) / scores.length))
          }

          // Segmentos
          const segMap: Record<string, { label: string; color: string }> = {
            frio:     { label: 'Frío',     color: 'var(--accent)' },
            templado: { label: 'Templado', color: 'var(--warning)' },
            caliente: { label: 'Caliente', color: 'var(--danger)' },
            fuego:    { label: 'Fuego',    color: 'var(--danger)' },
          }
          const segCounts: Record<string, number> = {}
          buyerRows.forEach(b => {
            const seg = (b.wa_contacts as any)?.kanshi_segment
            if (seg) segCounts[seg] = (segCounts[seg] || 0) + 1
          })
          setScoreDistribution(
            Object.entries(segCounts)
              .map(([seg, count]) => ({ segment: segMap[seg]?.label || seg, count, color: segMap[seg]?.color || 'var(--text-muted)' }))
              .sort((a, b) => b.count - a.count)
          )

          // ── 2. Quiz cross-reference ────────────────────────────────────────
          const contactIds = buyerRows
            .map(b => b.matched_contact_id)
            .filter((id): id is string => !!id)

          if (contactIds.length > 0) {
            const { data: quizRows } = await supabase
              .from('lead_quiz_responses')
              .select('responses')
              .in('matched_contact_id', contactIds)
              .limit(300)

            if (quizRows && quizRows.length > 0) {
              const tally: Record<string, Record<string, number>> = {}
              quizRows.forEach(row => {
                if (!row.responses || typeof row.responses !== 'object') return
                Object.entries(row.responses as Record<string, unknown>).forEach(([key, val]) => {
                  if (!tally[key]) tally[key] = {}
                  const v = String(val)
                  tally[key][v] = (tally[key][v] || 0) + 1
                })
              })
              const insights: QuizInsight[] = []
              Object.entries(tally).forEach(([key, vals]) => {
                const top = Object.entries(vals).sort((a, b) => b[1] - a[1])[0]
                if (top && top[1] >= 2) insights.push({ key, value: top[0], count: top[1] })
              })
              setQuizInsights(insights.sort((a, b) => b.count - a.count).slice(0, 6))
            }
          }
        }
      } catch (err) {
        console.error('[BuyerAnalysisPanel]', err)
      } finally {
        setLoadingInsights(false)
      }
    }
    fetchInsights()
  }, [activeProjectId])

  const campaignData = Object.entries(byCampaign)
    .map(([name, d]) => ({ name: name.length > 22 ? name.slice(0, 20) + '…' : name, sales: d.sales, revenue: d.revenue }))
    .sort((a, b) => b.sales - a.sales)
    .slice(0, 8)

  const scoreColor = (s: number) => s >= 76 ? '#00FF94' : s >= 51 ? '#FF6B35' : s >= 26 ? '#FFB800' : '#00b0f6'
  const capiPct = stats.total > 0 ? Math.round((stats.capi_sent / stats.total) * 100) : 0

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--primary)' }}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between"
           style={{ background: 'rgba(0,20,173,0.07)' }}>
        <div>
          <p className="mono text-xs tracking-widest font-bold" style={{ color: 'var(--accent)' }}>
            ANÁLISIS DE COMPRADORES
          </p>
          <p className="text-xs text-[var(--text-primary)] mt-0.5">
            Avatar del comprador real · Quiz × historial Hotmart
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
             style={{ background: 'rgba(0,176,246,0.08)', border: '1px solid rgba(0,176,246,0.2)' }}>
          <Brain size={12} style={{ color: 'var(--accent)' }}/>
          <span className="mono text-xs text-[var(--accent)]">{stats.matched} leads identificados</span>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* KPI Cards */}
        <div className="grid grid-cols-4 gap-4">

          {/* Match Rate */}
          <div className="rounded-2xl border border-[var(--border-default)] p-4 space-y-2" style={{ background: 'var(--bg-base)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">MATCH WA</p>
            <p className="text-2xl font-bold" style={{ color: stats.match_rate >= 50 ? 'var(--success)' : 'var(--accent)' }}>
              {stats.match_rate}%
            </p>
            <div className="h-1.5 rounded-full bg-[var(--border-default)]">
              <div className="h-1.5 rounded-full transition-all"
                   style={{ width: `${Math.min(stats.match_rate, 100)}%`, background: stats.match_rate >= 50 ? 'var(--success)' : 'var(--accent)' }}/>
            </div>
            <p className="mono text-xs text-[var(--text-muted)]">{stats.matched} de {stats.total} compradores</p>
          </div>

          {/* Avg KANSHI Score */}
          <div className="rounded-2xl border border-[var(--border-default)] p-4 space-y-2" style={{ background: 'var(--bg-base)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">SCORE PROMEDIO</p>
            {loadingInsights ? (
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin mt-1" style={{ borderColor: 'var(--primary)' }}/>
            ) : avgScore !== null ? (
              <>
                <p className="text-2xl font-bold" style={{ color: scoreColor(avgScore) }}>{avgScore}</p>
                <div className="h-1.5 rounded-full bg-[var(--border-default)]">
                  <div className="h-1.5 rounded-full" style={{ width: `${avgScore}%`, background: scoreColor(avgScore) }}/>
                </div>
                <p className="mono text-xs text-[var(--text-muted)]">KANSHI Score compradores</p>
              </>
            ) : (
              <p className="mono text-xs text-[var(--text-muted)] pt-1">Sin match WA</p>
            )}
          </div>

          {/* CAPI Coverage */}
          <div className="rounded-2xl border border-[var(--border-default)] p-4 space-y-2" style={{ background: 'var(--bg-base)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest">COBERTURA CAPI</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{capiPct}%</p>
            <div className="h-1.5 rounded-full bg-[var(--border-default)]">
              <div className="h-1.5 rounded-full bg-[var(--accent)]" style={{ width: `${capiPct}%` }}/>
            </div>
            <p className="mono text-xs text-[var(--text-muted)]">{stats.capi_sent} eventos Meta enviados</p>
          </div>

          {/* Segmentos */}
          <div className="rounded-2xl border border-[var(--border-default)] p-4" style={{ background: 'var(--bg-base)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-3">SEGMENTOS</p>
            {loadingInsights ? (
              <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)' }}/>
            ) : scoreDistribution.length > 0 ? (
              <div className="space-y-2">
                {scoreDistribution.map(s => (
                  <div key={s.segment} className="flex items-center justify-between">
                    <span className="mono text-xs text-[var(--text-muted)]">{s.segment}</span>
                    <span className="mono text-xs font-bold" style={{ color: s.color }}>{s.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mono text-xs text-[var(--text-muted)]">Sin datos score</p>
            )}
          </div>
        </div>

        {/* Chart Campañas */}
        {campaignData.length > 0 && (
          <div className="rounded-2xl border border-[var(--border-default)] p-4" style={{ background: 'var(--bg-base)' }}>
            <p className="mono text-xs text-[var(--text-muted)] tracking-widest mb-4">COMPRADORES POR CAMPAÑA</p>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={campaignData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: 'monospace' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 9 }} axisLine={false} tickLine={false}/>
                <Tooltip
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 11 }}
                  labelStyle={{ color: 'var(--text-primary)' }}
                  formatter={(value: number, name: string) => [
                    name === 'sales' ? `${value} compradores` : `$${value.toLocaleString()}`,
                    name === 'sales' ? 'Ventas' : 'Revenue'
                  ]}
                />
                <Bar dataKey="sales" fill="#0014ad" radius={[4,4,0,0]}/>
                <Bar dataKey="revenue" fill="#00b0f6" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-2">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ background: 'var(--primary)' }}/>
                <span className="mono text-xs text-[var(--text-muted)]">VENTAS</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-sm" style={{ background: 'var(--accent)' }}/>
                <span className="mono text-xs text-[var(--text-muted)]">REVENUE</span>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Insights */}
        {!loadingInsights && quizInsights.length > 0 && (
          <div className="rounded-2xl border border-[var(--border-default)] p-4" style={{ background: 'var(--bg-base)' }}>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen size={12} style={{ color: 'var(--accent)' }}/>
              <p className="mono text-xs text-[var(--text-muted)] tracking-widest">
                TOP RESPUESTAS QUIZ — COMPRADORES REALES
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {quizInsights.map((insight, i) => (
                <div key={i} className="rounded-xl border border-[var(--border-default)] p-3" style={{ background: 'var(--bg-card)' }}>
                  <p className="mono text-xs text-[var(--text-muted)] tracking-widest truncate mb-1">
                    {insight.key.replace(/_/g, ' ').toUpperCase().slice(0, 28)}
                  </p>
                  <p className="text-xs font-bold text-[var(--text-primary)] truncate">{insight.value}</p>
                  <div className="flex items-center gap-1 mt-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"/>
                    <span className="mono text-xs text-[var(--success)]">{insight.count} compradores</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loadingInsights && (
          <div className="flex items-center justify-center py-6 gap-2">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--primary)' }}/>
            <p className="mono text-xs text-[var(--text-muted)]">Analizando perfil de compradores...</p>
          </div>
        )}
      </div>
    </div>
  )
}

function VentasTab({
  activeProjectId, projects, onToast
}: {
  activeProjectId: string | null
  projects: Project[]
  onToast: (type: Toast['type'], msg: string) => void
}) {
  const [sales, setSales] = useState<Sale[]>([])
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null)
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formPhone, setFormPhone] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formProduct, setFormProduct] = useState('')
  const [saving, setSaving] = useState(false)
  const [showHotmart, setShowHotmart] = useState(false)
  const [hotmartStats, setHotmartStats] = useState<{
    total: number; matched: number; capi_sent: number;
    total_revenue: number; match_rate: number
  } | null>(null)
  const [byCampaign, setByCampaign] = useState<Record<string, { sales: number; revenue: number }>>({})

  const fetchHotmartStats = useCallback(async () => {
    if (!activeProjectId) return
    try {
      const res = await fetch(`/api/import-buyers?project_id=${activeProjectId}`)
     const data = await res.json()
      if (data.success) {
        setHotmartStats(data.stats)
        if (data.by_campaign) setByCampaign(data.by_campaign)
      }
    } catch {}
  }, [activeProjectId])

  useEffect(() => { fetchHotmartStats() }, [fetchHotmartStats])

  const project = projects.find(p => p.id === activeProjectId)

  const fetchSales = useCallback(async () => {
    if (!activeProjectId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/sales?project_id=${activeProjectId}`)
      const data = await res.json()
      if (data.sales) { setSales(data.sales); setMetrics(data.metrics) }
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => { fetchSales() }, [fetchSales])

  const handleRegisterSale = async () => {
    if (!formPhone.trim() || !formAmount.trim() || !activeProjectId) return
    setSaving(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeProjectId,
          phone_number: formPhone.trim(),
          amount: Number(formAmount),
          product_name: formProduct.trim() || project?.product_name || 'Producto',
          sale_source: 'manual',
        }),
      })
      const data = await res.json()
      if (data.success) {
        onToast('success', `Venta de $${formAmount} registrada ✅`)
        setShowForm(false); setFormPhone(''); setFormAmount(''); setFormProduct('')
        fetchSales()
        // Disparar Purchase CAPI
        fetch('/api/meta-capi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event_type: 'Purchase',
            phone_number: formPhone.trim(),
            value: Number(formAmount),
            sale_id: data.sale.id,
          }),
        }).then(() => onToast('info', 'Purchase enviado a Meta CAPI 📡')).catch(() => {})
      } else {
        onToast('error', data.error || 'Error al registrar venta')
      }
    } finally {
      setSaving(false)
    }
  }

  const salesGoal = project?.sales_goal ?? 0
  const progressPct = salesGoal > 0 ? Math.min(100, ((metrics?.total_sales ?? 0) / salesGoal) * 100) : 0
  const revenuePct = salesGoal > 0 && project?.product_price
    ? Math.min(100, ((metrics?.total_revenue ?? 0) / (salesGoal * project.product_price)) * 100) : 0

  const segmentColor = (seg: string) => seg === 'fuego' ? 'var(--danger)' : seg === 'caliente' ? 'var(--warning)' : seg === 'tibio' ? 'var(--accent)' : 'var(--text-muted)'

  if (!activeProjectId) return (
    <div className="flex items-center justify-center h-64">
      <p className="mono text-[11px] text-[var(--text-muted)]">Selecciona un proyecto para ver ventas</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest">MÓDULO DE VENTAS</p>
          <p className="text-lg font-bold text-[var(--text-primary)]">{project?.product_name || 'Ventas'}</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all"
          style={{ background: 'linear-gradient(135deg,var(--primary),#00a7e3)' }}>
          <Plus size={12}/> REGISTRAR VENTA
        </button>
        <button onClick={() => setShowHotmart(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl mono text-[11px] font-bold tracking-widest transition-all"
          style={{ background: showHotmart ? '#1a1a2e' : 'var(--bg-card)', border: '1px solid var(--warning)', color: 'var(--warning)' }}>
          <Upload size={12}/> IMPORTAR HOTMART
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-[var(--border-default)] p-5 space-y-4" style={{ background: 'var(--bg-card)' }}>
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest">NUEVA VENTA MANUAL</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">TELÉFONO (E.164)</label>
              <input value={formPhone} onChange={e => setFormPhone(e.target.value)}
                placeholder="+593999999999"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]"/>
            </div>
            <div>
              <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">MONTO (USD)</label>
              <input value={formAmount} onChange={e => setFormAmount(e.target.value)}
                placeholder="997" type="number"
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]"/>
            </div>
            <div>
              <label className="mono text-xs text-[var(--text-muted)] tracking-widest block mb-2">PRODUCTO</label>
              <input value={formProduct} onChange={e => setFormProduct(e.target.value)}
                placeholder={project?.product_name || 'Nombre producto'}
                className="w-full bg-[var(--bg-base)] border border-[var(--border-default)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] placeholder:text-[var(--text-muted)]"/>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-[var(--border-default)] mono text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
              CANCELAR
            </button>
            <button onClick={handleRegisterSale} disabled={!formPhone.trim() || !formAmount.trim() || saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold text-white disabled:opacity-30 transition-all"
              style={{ background: 'linear-gradient(135deg,var(--success),var(--accent))', color: 'var(--bg-base)' }}>
              {saving ? <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin"/> : <CheckCircle size={12}/>}
              {saving ? 'GUARDANDO...' : 'CONFIRMAR VENTA'}
            </button>
         </div>
        </div>
      )}

      {/* KPIs */}
      {metrics && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: 'INGRESOS TOTALES', value: `$${metrics.total_revenue.toLocaleString()}`, color: 'var(--success)', icon: '💰' },
            { label: 'VENTAS', value: `${metrics.total_sales}${salesGoal > 0 ? ` / ${salesGoal}` : ''}`, color: 'var(--accent)', icon: '🎯' },
            { label: 'TICKET PROMEDIO', value: `$${Math.round(metrics.avg_ticket).toLocaleString()}`, color: 'var(--warning)', icon: '🎫' },
            { label: 'META INGRESOS', value: `${Math.round(revenuePct)}%`, color: revenuePct >= 100 ? 'var(--success)' : 'var(--primary)', icon: '📈' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl border border-[var(--border-default)] p-4" style={{ background: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="mono text-xs text-[var(--text-muted)] tracking-widest">{kpi.label}</p>
                <span className="text-base">{kpi.icon}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              {kpi.label === 'VENTAS' && salesGoal > 0 && (
                <div className="mt-2 h-1 rounded-full bg-[var(--border-default)]">
                  <div className="h-1 rounded-full transition-all" style={{ width: `${progressPct}%`, background: 'var(--accent)' }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-2xl border border-[var(--border-default)] overflow-hidden" style={{ background: 'var(--bg-card)' }}>
        <div className="px-5 py-4 border-b border-[var(--border-default)] flex items-center justify-between">
          <p className="mono text-xs text-[var(--text-muted)] tracking-widest">REGISTRO DE VENTAS</p>
          <button onClick={fetchSales} className="p-1.5 rounded-lg border border-[var(--border-default)] hover:border-[#2E2E4E] transition-colors">
            <RefreshCw size={11} className={`text-[var(--text-muted)] ${loading ? 'animate-spin' : ''}`}/>
          </button>
        </div>
        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-3xl">💰</span>
            <p className="mono text-[11px] text-[var(--text-muted)]">Sin ventas registradas aún</p>
            <button onClick={() => setShowForm(true)}
              className="mono text-xs text-[var(--primary)] hover:text-[var(--accent)] transition-colors">
              + Registrar primera venta
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                {['FECHA','CONTACTO','MONTO','FUENTE','CAMPAÑA','KANSHI','CAPI'].map(h => (
                  <th key={h} className="px-4 py-3 text-left mono text-xs text-[var(--text-muted)] tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id} className="border-b border-[var(--border-default)] hover:bg-[var(--bg-base)] transition-colors">
                  <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">
                    {format(new Date(sale.sale_date), 'dd/MM HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-[var(--text-primary)]">{sale.wa_contacts?.name || '—'}</p>
                    <p className="mono text-xs text-[var(--text-muted)]">{sale.phone_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold" style={{ color: 'var(--success)' }}>${sale.amount.toLocaleString()}</p>
                    <p className="mono text-xs text-[var(--text-muted)]">{sale.currency}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="mono text-xs px-2 py-0.5 rounded-full border border-[var(--border-default)] text-[var(--text-muted)]">
                      {sale.sale_source}
                    </span>
                  </td>
                  <td className="px-4 py-3 mono text-xs text-[var(--text-muted)]">
                    {sale.utm_campaign || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {sale.wa_contacts?.kanshi_score ? (
                      <span className="mono text-xs font-bold" style={{ color: segmentColor(sale.wa_contacts.kanshi_segment) }}>
                        {sale.wa_contacts.kanshi_score}
                      </span>
                    ) : <span className="text-[var(--text-muted)]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {sale.capi_purchase_sent_at ? (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]"/>
                        <span className="mono text-xs text-[var(--success)]">ENVIADO</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--text-muted)]"/>
                        <span className="mono text-xs text-[var(--text-muted)]">PENDIENTE</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ══ COMPRADORES HOTMART ══ */}
      {showHotmart && (
        <HotmartImportSection
          activeProjectId={activeProjectId}
          stats={hotmartStats}
          onImportComplete={() => { fetchSales(); fetchHotmartStats() }}
          onToast={onToast}
        />
      )}

      {/* ══ ANÁLISIS COMPRADORES (HB5) ══ */}
      {hotmartStats && hotmartStats.total > 0 && activeProjectId && (
        <BuyerAnalysisPanel
          activeProjectId={activeProjectId}
          stats={hotmartStats}
          byCampaign={byCampaign}
        />
      )}
    </div>
  )
}
