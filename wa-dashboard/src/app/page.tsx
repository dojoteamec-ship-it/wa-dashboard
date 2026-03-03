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
  LayoutDashboard, GitBranch, Radio, Settings, Bell, LogOut
} from 'lucide-react'
import { format } from 'date-fns'

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Lead {
  id: string; phone_number: string; name: string; agent_stage: string
  engagement_score: number; segmento: string; situacion_actual: string
  dolor_declarado: string; dolor_profundo: string; sueno_declarado: string
  nivel_compromiso: string; urgencia_financiera: string; estilo_decision: string
  objecion_probable: string; resumen_perfil: string; preguntas_respondidas: number
  created_at: string; updated_at: string
  kanshi_score: number; kanshi_segment: string
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
  ? <Flame size={10} className="text-[#FF6B35]"/>
  : s==='templado' ? <Thermometer size={10} className="text-[#FFB800]"/>
  : <Snowflake size={10} style={{color:'#00b0f6'}}/>

const statusColor = (s: string) =>
  s==='completed'?'text-[#00FF94]':s==='running'?'text-[#00b0f6]':s==='scheduled'?'text-[#FFB800]':s==='paused'?'text-[#FFB800]':'text-[#4A4A6A]'
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

type TabType = 'overview' | 'pipeline' | 'psico' | 'campaigns' | 'fuentes' | 'ventas' | 'config'

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
]

const STATUS_COLOR = (s: string) =>
  s === 'active' ? '#00FF94' : s === 'planning' ? '#FFB800' : '#4A4A6A'
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
}: {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  activeProject: Project | null
  connected: boolean
  onLogout: () => void
  onRefresh: () => void
  lastUpdate: Date
}) {
  return (
    <aside
      className="flex flex-col flex-shrink-0 h-screen sticky top-0 z-40"
      style={{
        width: '220px',
        background: '#0A0A0F',
        borderRight: '1px solid #1E1E2E',
      }}
    >
      {/* ── Logo ── */}
      <div
        className="flex items-center gap-3 px-5 py-5"
        style={{ borderBottom: '1px solid #1E1E2E' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center p-1.5 flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#0014ad,#00a7e3)' }}
        >
          <KanshiLogo size={22} />
        </div>
        <div>
          <p className="font-bold text-white tracking-[0.18em] text-[13px]" style={{ fontFamily: 'monospace' }}>
            KANSHI
          </p>
          <p className="mono text-[9px] tracking-widest" style={{ color: '#00b0f6' }}>
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
                borderLeft: isActive ? '2px solid #00b0f6' : '2px solid transparent',
                color: isActive ? '#E0E0F0' : '#4A4A6A',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = '#111118'
                  ;(e.currentTarget as HTMLElement).style.color = '#E0E0F0'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#4A4A6A'
                }
              }}
            >
              <span
                style={{
                  color: isActive ? '#00b0f6' : 'currentColor',
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
        <div className="my-3" style={{ height: '1px', background: '#1E1E2E' }} />

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
                borderLeft: isActive ? '2px solid #00b0f6' : '2px solid transparent',
                color: isActive ? '#E0E0F0' : '#4A4A6A',
              }}
              onMouseEnter={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = '#111118'
                  ;(e.currentTarget as HTMLElement).style.color = '#E0E0F0'
                }
              }}
              onMouseLeave={e => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent'
                  ;(e.currentTarget as HTMLElement).style.color = '#4A4A6A'
                }
              }}
            >
              <span style={{ color: isActive ? '#00b0f6' : 'currentColor', flexShrink: 0 }}>
                <Settings size={16} />
              </span>
              <span className="font-medium" style={{ fontSize: '15px' }}>Config</span>
            </button>
          )
        })}

        {/* Alertas — futuro (Día 14) */}
        <div
          className="w-full flex items-center gap-3 rounded-xl"
          style={{ padding: '10px 14px', opacity: 0.35, cursor: 'not-allowed' }}
        >
          <Bell size={16} style={{ color: '#4A4A6A', flexShrink: 0 }} />
          <span className="font-medium" style={{ fontSize: '15px', color: '#4A4A6A' }}>
            Alertas
          </span>
          <span
            className="ml-auto mono"
            style={{
              fontSize: '9px',
              color: '#FFB800',
              background: '#FFB80018',
              border: '1px solid #FFB80030',
              borderRadius: '4px',
              padding: '1px 5px',
              letterSpacing: '0.08em',
            }}
          >
            PRONTO
          </span>
        </div>
      </nav>

      {/* ── Footer: proyecto activo ── */}
      <div style={{ borderTop: '1px solid #1E1E2E' }}>
        {activeProject ? (
          <div className="px-4 py-4">
            <p className="mono tracking-widest mb-2" style={{ fontSize: '9px', color: '#4A4A6A' }}>
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
                  style={{ fontSize: '13px', color: '#E0E0F0', lineHeight: 1.2 }}
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
            <p className="mono tracking-widest mb-1" style={{ fontSize: '9px', color: '#4A4A6A' }}>
              SIN PROYECTO
            </p>
            <p style={{ fontSize: '12px', color: '#2E2E4E' }}>Selecciona uno arriba</p>
          </div>
        )}

        {/* ── Controles sistema ── */}
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderTop: '1px solid #1E1E2E' }}
        >
          {/* Status live */}
          <div className="flex items-center gap-1.5">
            {connected ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#00b0f6' }} />
                <span className="mono" style={{ fontSize: '10px', color: '#00b0f6' }}>LIVE</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#4A4A6A' }} />
                <span className="mono" style={{ fontSize: '10px', color: '#4A4A6A' }}>OFFLINE</span>
              </>
            )}
          </div>
          {/* Acciones */}
          <div className="flex items-center gap-1">
            <button
              onClick={onRefresh}
              className="p-1.5 rounded-lg transition-colors"
              style={{ border: '1px solid #1E1E2E' }}
              title="Actualizar datos"
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#00b0f6')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}
            >
              <RefreshCw size={11} style={{ color: '#4A4A6A' }} />
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg transition-colors"
              style={{ border: '1px solid #1E1E2E' }}
              title="Cerrar sesión"
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#FF6B35')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1E1E2E')}
            >
              <LogOut size={11} style={{ color: '#4A4A6A' }} />
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
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #00b0f6 0%, transparent 70%)' }}/>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #0014ad 0%, transparent 70%)' }}/>
      </div>
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#00b0f6 1px, transparent 1px), linear-gradient(90deg, #00b0f6 1px, transparent 1px)', backgroundSize: '40px 40px' }}/>
      <div className={`relative z-10 w-full max-w-sm mx-4 rounded-2xl border p-8 transition-all ${shaking ? 'animate-bounce' : ''}`}
        style={{ background: 'rgba(9,12,76,0.8)', backdropFilter: 'blur(24px)', borderColor: error ? '#FF6B35' : 'rgba(0,176,246,0.3)', boxShadow: error ? '0 0 40px rgba(255,107,53,0.2)' : '0 0 60px rgba(0,176,246,0.15)' }}>
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 p-4 rounded-2xl" style={{ background: 'rgba(0,176,246,0.1)', border: '1px solid rgba(0,176,246,0.2)' }}><KanshiLogo size={56} /></div>
          <h1 className="text-2xl font-bold tracking-[0.2em] text-white mb-1" style={{ fontFamily: 'monospace' }}>KANSHI</h1>
          <p className="mono text-[10px] tracking-widest" style={{ color: '#00b0f6' }}>MONITORING SYSTEM · GPC</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mono text-[10px] tracking-widest block mb-2" style={{ color: '#00b0f6' }}>ACCESO</label>
            <div className="relative">
              <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4A4A6A' }}/>
              <input type={showPwd ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña del equipo" autoFocus
                className="w-full rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-[#4A4A6A]"
                style={{ background: 'rgba(0,0,0,0.4)', border: `1px solid ${error ? '#FF6B35' : 'rgba(0,176,246,0.3)'}` }}/>
              <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: showPwd ? '#00b0f6' : '#4A4A6A' }}>
                {showPwd ? <Eye size={13}/> : <EyeOff size={13}/>}
              </button>
            </div>
            {error && <p className="mono text-[10px] text-[#FF6B35] mt-2 tracking-widest">✕ ACCESO DENEGADO</p>}
          </div>
          <button type="submit" disabled={!password}
            className="w-full rounded-xl py-3 font-bold mono text-[12px] tracking-widest text-white transition-all disabled:opacity-30 hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #0014ad, #00b0f6)', boxShadow: '0 4px 20px rgba(0,176,246,0.3)' }}>
            INGRESAR AL SISTEMA
          </button>
        </form>
        <p className="mono text-[9px] text-center mt-6 tracking-widest" style={{ color: '#2E3E6E' }}>SANTIAGO JIMÉNEZ · GROWTH PARTNER · 2026</p>
      </div>
    </div>
  )
}

// ─── GLOBAL SEARCH ────────────────────────────────────────────────────────────

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return <>{text.slice(0, idx)}<span style={{color:'#00b0f6',fontWeight:'bold'}}>{text.slice(idx, idx+query.length)}</span>{text.slice(idx+query.length)}</>
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
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1E1E2E] hover:border-[#2E2E4E] transition-colors" style={{background:'#111118',width:'220px'}}>
        <Search size={12} className="text-[#4A4A6A] flex-shrink-0"/>
        <input ref={inputRef} value={query} onChange={e=>{setQuery(e.target.value);setOpen(true)}} onFocus={()=>setOpen(true)}
          placeholder="Buscar lead... ⌘K" className="flex-1 bg-transparent text-xs text-[#E0E0F0] outline-none placeholder:text-[#4A4A6A]"/>
        {query && <button onClick={()=>{setQuery('');setOpen(false)}} className="text-[#4A4A6A] hover:text-[#E0E0F0]"><X size={10}/></button>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute top-[calc(100%+8px)] left-0 w-[320px] rounded-xl border border-[#1E1E2E] overflow-hidden z-[200]"
          style={{background:'#0D0D14',boxShadow:'0 16px 48px rgba(0,0,0,0.6)'}}>
          <div className="px-4 py-2 border-b border-[#1E1E2E]">
            <span className="mono text-[9px] text-[#4A4A6A] tracking-widest">{results.length} RESULTADO{results.length>1?'S':''}</span>
          </div>
          <div className="divide-y divide-[#1E1E2E]">
            {results.map((lead,i) => (
              <button key={i} onClick={()=>{onSelect(lead);setOpen(false);setQuery('')}}
                className="w-full px-4 py-3 flex items-center gap-3 hover:bg-[#1E1E2E] transition-colors text-left">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:`${segColor(lead.segmento)}20`}}>
                  <User size={11} style={{color:segColor(lead.segmento)}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#E0E0F0] truncate">{highlightMatch(lead.name||lead.phone_number,query)}</p>
                  <p className="mono text-[9px] text-[#4A4A6A] truncate">{lead.phone_number}</p>
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
    <div className="rounded-2xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
      <div className="flex items-center gap-3">
        <Calendar size={14} style={{color:'#4A4A6A'}}/>
        <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">{project.name} — Sin fechas configuradas. Edita el proyecto para agregar el calendario.</p>
      </div>
    </div>
  )

  const minDate = new Date(Math.min(...allDates.map(d=>d.getTime())))
  const maxDate = new Date(Math.max(...allDates.map(d=>d.getTime())))
  const totalSpan = Math.max(daysDiff(minDate,maxDate),1)
  const pct = (d:Date|null) => d===null?-1:Math.min(100,Math.max(0,(daysDiff(minDate,d)/totalSpan)*100))
  const todayPct = Math.min(100,Math.max(0,(daysDiff(minDate,today)/totalSpan)*100))

  const getPhase = () => {
    if (cartClose&&today>cartClose) return {label:'LANZAMIENTO CERRADO',color:'#4A4A6A'}
    if (cartOpen&&today>=cartOpen)  return {label:'CARRITO ABIERTO',color:'#00FF94'}
    if (classDates.length>0&&today>=classDates[0]) return {label:'EN LIVES/CLASES',color:'#FFB800'}
    if (captEnd&&today>captEnd)    return {label:'CAPTACIÓN TERMINADA',color:'#FF6B35'}
    if (captStart&&today>=captStart) return {label:'EN CAPTACIÓN',color:'#00b0f6'}
    return {label:'PRE-LANZAMIENTO',color:'#4A4A6A'}
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
    captStart ?{label:'INICIO CAPTACIÓN',date:captStart, color:'#00b0f6'}:null,
    captEnd   ?{label:'FIN CAPTACIÓN',   date:captEnd,   color:'#FFB800'}:null,
    ...classDates.map((d,i)=>({label:i===0?'PRIMER LIVE':`LIVE ${i+1}`,date:d,color:'#C084FC'})),
    cartOpen  ?{label:'CARRITO ABRE',    date:cartOpen,  color:'#00FF94'}:null,
    cartClose ?{label:'CARRITO CIERRA',  date:cartClose, color:'#FF6B35'}:null,
  ].filter(Boolean) as {label:string;date:Date;color:string}[]

  return (
    <div className="rounded-2xl border border-[#1E1E2E] overflow-hidden" style={{background:'#111118'}}>
      <div className="px-5 py-4 border-b border-[#1E1E2E] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{background:`${project.color||'#00b0f6'}20`,border:`1px solid ${project.color||'#00b0f6'}30`}}>
            {project.emoji||'🚀'}
          </div>
          <div>
            <p className="font-semibold text-[#E0E0F0] text-sm">{project.name}</p>
            {project.product_name && (
              <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">
                {project.product_name}{project.product_price?` · $${project.product_price.toLocaleString()}`:''}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="mono text-[10px] px-3 py-1.5 rounded-full font-bold tracking-widest"
            style={{color:phase.color,background:`${phase.color}18`,border:`1px solid ${phase.color}30`}}>
            {phase.label}
          </span>
          {nextMilestone && (
            <span className="mono text-[10px] text-[#4A4A6A] tracking-widest">
              <span style={{color:'#00b0f6'}}>{daysDiff(today,nextMilestone.date)}</span> días para {nextMilestone.label.toLowerCase()}
            </span>
          )}
        </div>
      </div>

      <div className="px-6 pt-5 pb-6">
        <div className="relative h-1.5 rounded-full mb-8" style={{background:'#1E1E2E'}}>
          <div className="absolute h-full rounded-full" style={{width:`${todayPct}%`,background:'linear-gradient(90deg,#0014ad,#00b0f6)'}}/>
          {todayPct>=0&&todayPct<=100&&(
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center" style={{left:`${todayPct}%`}}>
              <div className="w-3 h-3 rounded-full border-2 border-[#00b0f6] z-10" style={{background:'#0A0A0F',boxShadow:'0 0 8px #00b0f6'}}/>
              <span className="mono text-[8px] text-[#00b0f6] mt-6 whitespace-nowrap tracking-widest">HOY</span>
            </div>
          )}
          {milestones.map((m,i)=>{
            const p=pct(m.date); if(p<0) return null
            const isPast=m.date<=today
            return (
              <div key={i} className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center group" style={{left:`${p}%`}}>
                <div className="w-3 h-3 rounded-full border-2 z-10 transition-all"
                  style={{borderColor:isPast?'#2A2A4A':m.color,background:isPast?'#1E1E2E':m.color,boxShadow:isPast?'none':`0 0 6px ${m.color}80`}}/>
                <div className="absolute bottom-6 bg-[#0D0D14] border border-[#1E1E2E] rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap"
                  style={{boxShadow:'0 4px 16px rgba(0,0,0,0.6)'}}>
                  <p className="mono text-[9px] font-bold tracking-widest" style={{color:m.color}}>{m.label}</p>
                  <p className="mono text-[9px] text-[#4A4A6A]">{fmtDate(m.date)}</p>
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
                <span className="mono text-[9px] font-bold tracking-widest" style={{color:isPast?'#2A2A4A':m.color}}>{fmtDate(m.date)}</span>
                <span className="mono text-[8px] mt-0.5" style={{color:'#4A4A6A'}}>
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
              <div className="w-2 h-2 rounded-full" style={{background:'#00b0f6'}}/>
              <span className="mono text-[9px] text-[#4A4A6A] tracking-widest">
                CAPTACIÓN · {fmtDate(captStart)} → {fmtDate(captEnd)}<span style={{color:'#00b0f6'}}> ({daysDiff(captStart,captEnd)}d)</span>
              </span>
            </div>
          )}
          {classDates.length>0&&(
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{background:'#C084FC'}}/>
              <span className="mono text-[9px] text-[#4A4A6A] tracking-widest">LIVES · {classDates.length} clase{classDates.length>1?'s':''}</span>
            </div>
          )}
          {cartOpen&&cartClose&&(
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{background:'#00FF94'}}/>
              <span className="mono text-[9px] text-[#4A4A6A] tracking-widest">
                CARRITO · {fmtDate(cartOpen)} → {fmtDate(cartClose)}<span style={{color:'#00FF94'}}> ({daysDiff(cartOpen,cartClose)}d)</span>
              </span>
            </div>
          )}
          {project.sales_goal&&(
            <div className="flex items-center gap-1.5">
              <DollarSign size={9} style={{color:'#FFB800'}}/>
              <span className="mono text-[9px] text-[#4A4A6A] tracking-widest">
                META · <span style={{color:'#FFB800'}}>{project.sales_goal} ventas</span>
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
  const psc = (s: string) => s==='active'?'#00FF94':s==='planning'?'#FFB800':'#4A4A6A'
  const psl = (s: string) => s==='active'?'ACTIVO':s==='planning'?'PLANIF.':'CERRADO'

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#1E1E2E] hover:border-[#2E2E4E] transition-colors"
        style={{background:'#111118',minWidth:'180px',maxWidth:'220px'}}>
        <Rocket size={11} style={{color: activeProject ? psc(activeProject.status) : '#4A4A6A', flexShrink:0}}/>
        <span className="mono text-[11px] flex-1 text-left truncate" style={{color:activeProject?'#E0E0F0':'#4A4A6A'}}>
          {activeProject?activeProject.name:'SIN PROYECTO'}
        </span>
        {activeProject&&(
          <span className="mono text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{color:psc(activeProject.status),background:`${psc(activeProject.status)}15`}}>
            {psl(activeProject.status)}
          </span>
        )}
        <ChevronRight size={10} className="text-[#4A4A6A] flex-shrink-0 transition-transform" style={{transform:open?'rotate(90deg)':'rotate(0deg)'}}/>
      </button>

      {open&&(
        <div className="absolute top-[calc(100%+8px)] left-0 w-[280px] rounded-xl border border-[#1E1E2E] overflow-hidden z-[200]"
          style={{background:'#0D0D14',boxShadow:'0 16px 48px rgba(0,0,0,0.6)'}}>
          <div className="px-4 py-2 border-b border-[#1E1E2E]">
            <span className="mono text-[9px] text-[#4A4A6A] tracking-widest">PROYECTOS DISPONIBLES</span>
          </div>
          {projects.length===0?(
            <div className="px-4 py-5 text-center">
              <Rocket size={16} className="text-[#2A2A3A] mx-auto mb-2"/>
              <p className="mono text-[10px] text-[#4A4A6A] mb-1">Sin proyectos creados</p>
            </div>
          ):(
            <div className="py-1">
              <button onClick={()=>{onChange(null);setOpen(false)}}
                className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#1E1E2E] transition-colors text-left">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center border border-[#1E1E2E]"><Star size={10} className="text-[#4A4A6A]"/></div>
                <span className="mono text-[10px] text-[#4A4A6A] flex-1">TODOS LOS DATOS</span>
                {activeProjectId===null&&<CheckCircle size={10} style={{color:'#00b0f6'}}/>}
              </button>
              {projects.map(p=>(
                <button key={p.id} onClick={()=>{onChange(p.id);setOpen(false)}}
                  className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-[#1E1E2E] transition-colors text-left">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:`${psc(p.status)}20`}}>
                    <Rocket size={10} style={{color:psc(p.status)}}/>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="mono text-[11px] text-[#E0E0F0] truncate">{p.name}</p>
                    {p.product_name&&<p className="mono text-[9px] text-[#4A4A6A] truncate">{p.product_name}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="mono text-[8px] px-1.5 py-0.5 rounded-full" style={{color:psc(p.status),background:`${psc(p.status)}15`}}>{psl(p.status)}</span>
                    {p.id===activeProjectId&&<CheckCircle size={9} style={{color:'#00b0f6'}}/>}
                    {p.status==='planning'&&(
                      <button onClick={e=>{e.stopPropagation();onActivate(p.id);setOpen(false)}}
                        className="mono text-[8px] px-2 py-0.5 rounded-full font-bold hover:opacity-80 transition-opacity"
                        style={{background:'#00FF9420',color:'#00FF94',border:'1px solid #00FF9440'}}>
                        ACTIVAR
                      </button>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="border-t border-[#1E1E2E] p-2">
            <button onClick={()=>{setOpen(false);onNewProject()}}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:opacity-90 transition-all"
              style={{background:'linear-gradient(135deg,#0014ad,#00a7e3)'}}>
              <Plus size={11} className="text-white"/>
              <span className="mono text-[10px] text-white font-bold tracking-widest">NUEVO PROYECTO</span>
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
  const barColor = over ? '#00FF94' : color
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="mono text-[10px] tracking-widest text-[#4A4A6A]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] font-bold" style={{color: barColor}}>
            {prefix}{current.toLocaleString()}{suffix}
          </span>
          <span className="mono text-[10px] text-[#4A4A6A]">/ {prefix}{goal.toLocaleString()}{suffix}</span>
          <span className="mono text-[10px] px-1.5 py-0.5 rounded-full"
            style={{background:`${barColor}18`, color: barColor}}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{background:'#1E1E2E'}}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{width:`${pct}%`, background: over ? '#00FF94' : `linear-gradient(90deg,${color}80,${color})`}}/>
      </div>
    </div>
  )
}

function ProjectMetrics({ project, leadsCount }: { project: Project; leadsCount: number }) {
  const hasMetas = (project.leads_goal??0) > 0 || (project.sales_goal??0) > 0
  if (!hasMetas) return null

  const projectColor = project.color || '#00b0f6'
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
    : diasRestantes <= 0  ? '#FF6B35'
    : diasRestantes <= 3  ? '#FFB800'
    : projectColor

  return (
    <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{background:'#111118'}}>
      <div className="h-0.5" style={{background:`linear-gradient(90deg,${projectColor},${projectColor}20)`}}/>
      <div className="p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{background:`${projectColor}15`,border:`1px solid ${projectColor}30`}}>
              {project.emoji || '🚀'}
            </div>
            <div>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-0.5">MÉTRICAS VS METAS</p>
              <p className="text-sm font-semibold text-[#E0E0F0]">{project.product_name || project.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {diasRestantes !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                style={{borderColor:`${diasColor}50`,background:`${diasColor}10`}}>
                <Clock size={10} style={{color:diasColor}}/>
                <span className="mono text-[10px] font-bold" style={{color:diasColor}}>
                  CAPTACIÓN · {diasLabel}
                </span>
              </div>
            )}
            {salesGoal > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1E1E2E]">
                <Target size={10} style={{color:projectColor}}/>
                <span className="mono text-[10px] text-[#4A4A6A]">
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
            <MetricBar label="VENTAS" current={currentSales} goal={salesGoal} color="#00FF94"/>
          )}
          {salesGoal > 0 && price > 0 && (
            <MetricBar label="REVENUE" current={currentRevenue} goal={revenueGoal} color="#C084FC" prefix="$"/>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {leadsGoal > 0 && (
            <div className="rounded-xl border border-[#1E1E2E] px-4 py-3" style={{background:'#0A0A0F'}}>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-1.5">LEADS / META</p>
              <p className="mono text-xl font-bold leading-none" style={{color:projectColor}}>
                {leadsCount}<span className="text-[#4A4A6A] text-xs font-normal ml-1">/ {leadsGoal}</span>
              </p>
            </div>
          )}
          {salesGoal > 0 && price > 0 && (
            <div className="rounded-xl border border-[#1E1E2E] px-4 py-3" style={{background:'#0A0A0F'}}>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-1.5">REVENUE PROYECTADO</p>
              <p className="mono text-xl font-bold leading-none text-[#C084FC]">
                ${revenueGoal.toLocaleString()}
              </p>
            </div>
          )}
          {cpl !== null && (
            <div className="rounded-xl border border-[#1E1E2E] px-4 py-3" style={{background:'#0A0A0F'}}>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-1.5">CPL ESTIMADO</p>
              <p className="mono text-xl font-bold leading-none text-[#FFB800]">${cpl}</p>
            </div>
          )}
          {adBudget > 0 && (
            <div className="rounded-xl border border-[#1E1E2E] px-4 py-3" style={{background:'#0A0A0F'}}>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-1.5">PRESUPUESTO ADS</p>
              <p className="mono text-xl font-bold leading-none text-[#FF6B35]">
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
      <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">{label}</label>
      <input type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none transition-colors placeholder:text-[#4A4A6A] focus:border-[#0014ad]"/>
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
      <div className="relative w-full max-w-xl rounded-2xl border border-[#1E1E2E] overflow-hidden"
        style={{background:'#0D0D14',maxHeight:'90vh',overflowY:'auto',boxShadow:'0 32px 80px rgba(0,0,0,0.7)'}}>
        <div className="px-6 py-5 border-b border-[#1E1E2E] flex items-center justify-between sticky top-0 z-10" style={{background:'rgba(13,13,20,0.98)'}}>
          <div>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">NUEVO PROYECTO — PASO {step} DE 4</p>
            <p className="font-semibold text-[#E0E0F0] text-sm mt-0.5">
              {step===1?'Identidad del lanzamiento':step===2?'Metas del lanzamiento':step===3?'Fechas del calendario':'Contexto para el agente SAM'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#FF6B35] transition-colors group">
            <X size={12} className="text-[#4A4A6A] group-hover:text-[#FF6B35]"/>
          </button>
        </div>
        <div className="h-0.5 bg-[#1E1E2E]">
          <div className="h-full transition-all duration-500" style={{width:`${(step/4)*100}%`,background:'linear-gradient(90deg,#0014ad,#00a7e3)'}}/>
        </div>
        <div className="flex items-center justify-between px-6 py-3 border-b border-[#1E1E2E]">
          {WIZARD_STEPS.map((s,i)=>(
            <div key={s.num} className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center mono text-[9px] font-bold transition-all"
                  style={{background:step>s.num?'#00FF94':step===s.num?'linear-gradient(135deg,#0014ad,#00a7e3)':'#1E1E2E',color:step>=s.num?'white':'#4A4A6A'}}>
                  {step>s.num?'✓':s.num}
                </div>
                <span className="mono text-[9px] tracking-widest hidden sm:block" style={{color:step===s.num?'#E0E0F0':'#4A4A6A'}}>{s.label.toUpperCase()}</span>
              </div>
              {i<WIZARD_STEPS.length-1&&<div className="w-6 h-px mx-1" style={{background:step>s.num?'#00FF94':'#1E1E2E'}}/>}
            </div>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {step===1&&<>
            <WInput label="NOMBRE DEL PROYECTO *" value={data.name} onChange={set('name')} placeholder="ej. SamurAI Abril 2026"/>
            <WInput label="NOMBRE DEL PRODUCTO" value={data.product_name} onChange={set('product_name')} placeholder="ej. SamurAI — Curso de IA"/>
            <WInput label="PRECIO DEL PRODUCTO (USD)" value={data.product_price} onChange={set('product_price')} type="number" placeholder="ej. 297"/>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border border-[#1E1E2E]" style={{background:'#111118'}}>
              <Info size={12} style={{color:'#00b0f6',flexShrink:0,marginTop:1}}/>
              <p className="mono text-[9px] text-[#4A4A6A] leading-relaxed">El nombre del proyecto aparecerá en el selector del header.</p>
            </div>
          </>}

          {step===2&&<>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border" style={{borderColor:'rgba(0,176,246,0.3)',background:'rgba(0,176,246,0.05)'}}>
              <Target size={12} style={{color:'#00b0f6',flexShrink:0,marginTop:1}}/>
              <p className="mono text-[9px] text-[#4A4A6A] leading-relaxed">Todas las metas son opcionales pero KANSHI las usará para mostrar avance vs objetivo.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <WInput label="META DE VENTAS (unidades)" value={data.sales_goal} onChange={set('sales_goal')} type="number" placeholder="ej. 30"/>
              <WInput label="META DE LEADS" value={data.leads_goal} onChange={set('leads_goal')} type="number" placeholder="ej. 500"/>
            </div>
            <WInput label="PRESUPUESTO DE ADS (USD)" value={data.ad_budget} onChange={set('ad_budget')} type="number" placeholder="ej. 1500"/>
            {data.sales_goal&&data.product_price&&(
              <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#1E1E2E]" style={{background:'#111118'}}>
                <span className="mono text-[10px] text-[#4A4A6A]">REVENUE PROYECTADO</span>
                <span className="mono text-sm font-bold" style={{color:'#00FF94'}}>${(parseFloat(data.sales_goal)*parseFloat(data.product_price)).toLocaleString('en-US')} USD</span>
              </div>
            )}
          </>}

          {step===3&&<>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border" style={{borderColor:'rgba(0,176,246,0.3)',background:'rgba(0,176,246,0.05)'}}>
              <Calendar size={12} style={{color:'#00b0f6',flexShrink:0,marginTop:1}}/>
              <p className="mono text-[9px] text-[#4A4A6A] leading-relaxed">Las fechas permiten que SAM entienda en qué fase del lanzamiento está.</p>
            </div>
            <div>
              <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mb-3">CAPTACIÓN DE LEADS</p>
              <div className="grid grid-cols-2 gap-4">
                <WInput label="INICIO CAPTACIÓN" value={data.captation_start} onChange={set('captation_start')} type="date"/>
                <WInput label="FIN CAPTACIÓN" value={data.captation_end} onChange={set('captation_end')} type="date"/>
              </div>
            </div>
            <div>
              <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mb-3">CARRITO</p>
              <div className="grid grid-cols-2 gap-4">
                <WInput label="APERTURA CARRITO" value={data.cart_open} onChange={set('cart_open')} type="datetime-local"/>
                <WInput label="CIERRE CARRITO" value={data.cart_close} onChange={set('cart_close')} type="datetime-local"/>
              </div>
            </div>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">FECHAS DE CLASES / LIVES (una por línea)</label>
              <textarea value={data.class_dates} onChange={set('class_dates')}
                placeholder={'2026-04-07\n2026-04-09\n2026-04-11'} rows={4}
                className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none resize-none transition-colors placeholder:text-[#4A4A6A] focus:border-[#0014ad]"/>
            </div>
          </>}

          {step===4&&<>
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border" style={{borderColor:'rgba(0,176,246,0.3)',background:'rgba(0,176,246,0.05)'}}>
              <Brain size={12} style={{color:'#00b0f6',flexShrink:0,marginTop:1}}/>
              <p className="mono text-[9px] text-[#4A4A6A] leading-relaxed">Este texto se inyectará en el prompt de SAM para que conozca el producto y el avatar.</p>
            </div>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">CONTEXTO DEL AGENTE (opcional)</label>
              <textarea value={data.agent_context} onChange={set('agent_context')}
                placeholder="ej. SamurAI es un curso de 6 semanas para emprendedores latinoamericanos..." rows={8}
                className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none resize-none transition-colors placeholder:text-[#4A4A6A] focus:border-[#0014ad]"/>
            </div>
            <div className="mono text-[9px] text-[#4A4A6A] text-right">{data.agent_context.length} caracteres</div>
            <div className="rounded-xl border border-[#1E1E2E] p-4 space-y-2" style={{background:'#111118'}}>
              <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mb-3">RESUMEN DEL PROYECTO</p>
              <SummaryRow label="Nombre" value={data.name||'—'}/>
              {data.product_name&&<SummaryRow label="Producto" value={data.product_name}/>}
              {data.product_price&&<SummaryRow label="Precio" value={`$${data.product_price} USD`}/>}
              {data.sales_goal&&<SummaryRow label="Meta ventas" value={`${data.sales_goal} unidades`} highlight/>}
              {data.captation_start&&<SummaryRow label="Inicio captación" value={data.captation_start}/>}
              {data.cart_open&&<SummaryRow label="Apertura carrito" value={data.cart_open.replace('T',' ')}/>}
            </div>
          </>}
          {error&&<div className="rounded-xl border border-[#FF6B35] bg-[#FF6B3510] p-3"><p className="text-xs text-[#FF6B35]">{error}</p></div>}
        </div>

        <div className="px-6 py-4 border-t border-[#1E1E2E] flex items-center justify-between sticky bottom-0" style={{background:'rgba(13,13,20,0.98)'}}>
          <button onClick={()=>step>1?setStep(step-1):onClose()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1E1E2E] mono text-[11px] text-[#4A4A6A] hover:text-[#E0E0F0] hover:border-[#2E2E4E] transition-all">
            <ChevronLeft size={12}/> {step===1?'CANCELAR':'ANTERIOR'}
          </button>
          {step<4?(
            <button onClick={()=>setStep(step+1)} disabled={step===1&&!canStep1}
              className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{background:'linear-gradient(135deg,#0014ad,#00a7e3)'}}>
              SIGUIENTE <ChevronRight size={12}/>
            </button>
          ):(
            <button onClick={handleCreate} disabled={!canStep1||saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{background:'linear-gradient(135deg,#0014ad,#00a7e3)'}}>
              {saving?<><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> CREANDO...</>:<><Rocket size={12}/> CREAR PROYECTO</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

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
 const [activeTab,setActiveTab] = useState<'overview'|'pipeline'|'psico'|'campaigns'|'fuentes'|'ventas'|'config'>('overview')
  const [toasts,setToasts] = useState<Toast[]>([])
  const [leadsPage,setLeadsPage] = useState(1)
  const [campaignsPage,setCampaignsPage] = useState(1)
  const [projects,setProjects] = useState<Project[]>([])
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

  useEffect(()=>{setLeadsPage(1);setCampaignsPage(1)},[activeTab])
  useEffect(()=>{setLeadsPage(1);setCampaignsPage(1)},[activeProjectId])
  useEffect(()=>{const s=localStorage.getItem(AUTH_KEY);setAuthenticated(s==='true')},[])

  const fetchData = useCallback(async ()=>{
    try {
      let msgsQ = supabase.from('wa_messages').select('direction,created_at,body,contact_name').order('created_at',{ascending:false}).limit(200)
      let campsQ = supabase.from('wa_campaigns').select('*').order('created_at',{ascending:false}).limit(200)
      let leadsQ = supabase.from('wa_contacts').select('*').order('updated_at',{ascending:false}).limit(500)
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
        supabase.from('kanshi_projects').select('id,name,product_name,product_price,status,captation_start,captation_end,cart_open,cart_close,class_dates,sales_goal,leads_goal,ad_budget,agent_context,color,emoji,credential_id').order('created_at',{ascending:false}),
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
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#00b0f6',borderTopColor:'transparent'}}/>
    </div>
  )
  if(!authenticated) return <LoginScreen onAuth={()=>setAuthenticated(true)}/>
  if(loading) return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0A0A0F'}}>
      <div className="text-center">
        <div className="mx-auto mb-5 flex justify-center"><KanshiLogo size={40}/></div>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{borderColor:'#00b0f6',borderTopColor:'transparent'}}/>
        <p className="mono text-[#4A4A6A] text-sm tracking-widest">CARGANDO DATOS</p>
      </div>
    </div>
  )

 const TAB_TITLES: Record<TabType, string> = {
    overview:  'Overview',
    pipeline:  'Pipeline',
    psico:     'Leads',
    campaigns: 'Campañas',
    fuentes:   'Fuentes',
    ventas:    'Ventas',
    config:    'Configuración',
  }
  const activeProject = projects.find(p => p.id === activeProjectId) ?? null

  return(
    <div className="flex h-screen overflow-hidden" style={{background:'#0A0A0F'}}>
      <style>{`@keyframes slideInRight{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`}</style>

      {/* ── SIDEBAR ── */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        activeProject={activeProject}
        connected={connected}
        onLogout={() => { localStorage.removeItem(AUTH_KEY); setAuthenticated(false) }}
        onRefresh={fetchData}
        lastUpdate={lastUpdate}
      />

      {/* ── WORKSPACE ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Workspace Header */}
        <header className="flex items-center justify-between px-7 py-4 flex-shrink-0"
          style={{background:'rgba(10,10,15,0.97)',borderBottom:'1px solid #1E1E2E',backdropFilter:'blur(12px)'}}>
          <div>
            <h2 className="font-bold text-[#E0E0F0]" style={{fontSize:'20px',letterSpacing:'-0.01em'}}>
              {TAB_TITLES[activeTab]}
            </h2>
            {activeProject && (
              <p className="mono text-[10px] mt-0.5 tracking-widest" style={{color:'#4A4A6A'}}>
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

        {/* ══ OVERVIEW ══ */}
        {activeTab==='overview'&&<>
          {activeProjectId&&projects.find(p=>p.id===activeProjectId)&&(
            <ProjectTimeline project={projects.find(p=>p.id===activeProjectId)!}/>
          )}
          {activeProjectId&&projects.find(p=>p.id===activeProjectId)&&(
            ((projects.find(p=>p.id===activeProjectId)!.leads_goal??0)>0||(projects.find(p=>p.id===activeProjectId)!.sales_goal??0)>0)&&(
              <ProjectMetrics project={projects.find(p=>p.id===activeProjectId)!} leadsCount={kpi?.uniqueContacts??0}/>
            )
          )}
          <Sec label="MENSAJES"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KCard icon={<MessageSquare size={14}/>} label="TOTAL" value={kpi?.totalMessages??0} color="#00FF94"/>
            <KCard icon={<TrendingUp size={14}/>} label="ENTRANTES" value={kpi?.inbound??0} color="#00b0f6"/>
            <KCard icon={<Send size={14}/>} label="SALIENTES" value={kpi?.outbound??0} color="#FF6B35"/>
            <KCard icon={<Users size={14}/>} label="CONTACTOS" value={kpi?.uniqueContacts??0} color="#00FF94"/>
          </div></Sec>
          <Sec label="INTELIGENCIA DE LEADS"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KCard icon={<Brain size={14}/>} label="PERFILES COMPLETOS" value={kpi?.profilingComplete??0} color="#C084FC"/>
            <KCard icon={<Activity size={14}/>} label="TASA PERFILADO" value={`${kpi?.profilingRate??0}%`} color="#FFB800" isPercent/>
            <KCard icon={<Star size={14}/>} label="ENGAGEMENT PROM." value={kpi?.avgEngagement??0} color="#00FF94"/>
            <KCard icon={<Flame size={14}/>} label="LEADS CALIENTES" value={leads.filter(l=>l.segmento==='caliente').length} color="#FF6B35"/>
          </div></Sec>
          <KanshiScoreWidget leads={leads}/>
          <Sec label="CAMPAÑAS"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KCard icon={<Zap size={14}/>} label="ENVIADOS" value={kpi?.totalSent??0} color="#00FF94"/>
            <KCard icon={<CheckCheck size={14}/>} label="TASA ENTREGA" value={`${kpi?.deliveryRate??0}%`} color="#00b0f6" isPercent/>
            <KCard icon={<CheckCheck size={14}/>} label="TASA LECTURA" value={`${kpi?.readRate??0}%`} color="#FF6B35" isPercent/>
            <KCard icon={<MessageSquare size={14}/>} label="TASA RESPUESTA" value={`${kpi?.replyRate??0}%`} color="#00FF94" isPercent/>
          </div></Sec>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
              <div className="flex items-center justify-between mb-5">
                <div><p className="mono text-[10px] text-[#4A4A6A] tracking-widest">ACTIVIDAD</p><p className="text-sm font-medium text-[#E0E0F0] mt-0.5">Mensajes últimas 24h</p></div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00FF94]"/><span className="mono text-[10px] text-[#4A4A6A]">ENTRANTE</span></div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{background:'#00b0f6'}}/><span className="mono text-[10px] text-[#4A4A6A]">SALIENTE</span></div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={chartData} margin={{top:5,right:0,left:-30,bottom:0}}>
                  <defs>
                    <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00FF94" stopOpacity={0.3}/><stop offset="95%" stopColor="#00FF94" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00b0f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#00b0f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false} interval={3}/>
                  <YAxis tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'#1E1E2E',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                  <Area type="monotone" dataKey="inbound" stroke="#00FF94" strokeWidth={1.5} fill="url(#gIn)"/>
                  <Area type="monotone" dataKey="outbound" stroke="#00b0f6" strokeWidth={1.5} fill="url(#gOut)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
              <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-4">ACTIVIDAD RECIENTE</p>
              <div className="space-y-3">
                {recentMsgs.length===0?<p className="text-[#4A4A6A] text-xs text-center mt-6">Sin mensajes</p>
                :recentMsgs.map((m,i)=>(
                  <div key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{background:m.direction==='inbound'?'#00FF94':'#00b0f6'}}/>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-[#E0E0F0] truncate">{m.contact_name||'Desconocido'}</p>
                        <span className="mono text-[9px] text-[#4A4A6A] flex-shrink-0">{format(new Date(m.created_at),'HH:mm')}</span>
                      </div>
                      <p className="text-[11px] text-[#4A4A6A] truncate">{m.body}</p>
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
                <div key={stage.key} className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{background:'#111118'}}>
                  <div className="px-5 py-3 border-b border-[#1E1E2E] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-2 h-2 rounded-full" style={{background:stage.color}}/>
                      <span className="mono text-[11px] tracking-widest font-bold" style={{color:stage.color}}>{stage.label.toUpperCase()}</span>
                    </div>
                    <span className="mono text-[10px] text-[#4A4A6A]">{sl.length} leads</span>
                  </div>
                  <div className="divide-y divide-[#1E1E2E]">
                    {sl.slice(0,5).map((lead,i)=>(
                      <div key={i} className="px-5 py-3 flex items-center gap-4 hover:bg-[#1E1E2E] transition-colors cursor-pointer" onClick={()=>setSelectedLead(lead)}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-[#E0E0F0] font-medium truncate">{lead.name||lead.phone_number}</p>
                            {lead.segmento&&<div className="flex items-center gap-1">{segIcon(lead.segmento)}</div>}
                          </div>
                          {lead.situacion_actual&&<p className="mono text-[10px] text-[#4A4A6A] truncate">{lead.situacion_actual}</p>}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {lead.engagement_score>0&&<span className="mono text-[11px] font-bold" style={{color:scoreColor(lead.engagement_score)}}>★{lead.engagement_score}</span>}
                          {(lead.kanshi_score||0)>0&&(
                            <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 font-bold mono text-[10px] flex-shrink-0"
                              style={{
                                borderColor: lead.kanshi_segment==='listo'?'#00FF94':lead.kanshi_segment==='caliente'?'#FF6B35':lead.kanshi_segment==='templado'?'#FFB800':'#00b0f6',
                                color:       lead.kanshi_segment==='listo'?'#00FF94':lead.kanshi_segment==='caliente'?'#FF6B35':lead.kanshi_segment==='templado'?'#FFB800':'#00b0f6',
                                background:  lead.kanshi_segment==='listo'?'#00FF9415':lead.kanshi_segment==='caliente'?'#FF6B3515':lead.kanshi_segment==='templado'?'#FFB80015':'#00b0f615',
                              }}>
                              {lead.kanshi_score}
                            </div>
                          )}
                          <ChevronRight size={12} className="text-[#4A4A6A]"/>
                        </div>
                      </div>
                    ))}
                    {sl.length>5&&<div className="px-5 py-2 text-center"><span className="mono text-[9px] text-[#4A4A6A]">+{sl.length-5} más en esta etapa</span></div>}
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
            <div className="rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
              <ResponsiveContainer width="100%" height={150}>
                <BarChart data={[1,2,3,4,5,6,7,8,9,10].map(n=>({score:n,count:leads.filter(l=>Math.round(l.engagement_score)===n).length}))} margin={{top:5,right:0,left:-30,bottom:0}}>
                  <XAxis dataKey="score" tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'#1E1E2E',border:'none',borderRadius:'8px',fontSize:'11px'}}/>
                  <Bar dataKey="count" radius={[4,4,0,0]}>{[1,2,3,4,5,6,7,8,9,10].map((n,i)=><Cell key={i} fill={scoreColor(n)} fillOpacity={0.8}/>)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Sec>
          <Sec label={`LEADS PERFILADOS — ${profiledLeads.length} TOTAL`}>
            <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{background:'#111118'}}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-[#1E1E2E]">
                    {['CONTACTO','ETAPA','SEGMENTO','SCORE','COMPROMISO','URGENCIA','SITUACIÓN','DOLOR'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left mono text-[9px] text-[#4A4A6A] tracking-widest font-normal whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {profiledLeads.length===0
                      ?<tr><td colSpan={8} className="px-4 py-8 text-center text-[#4A4A6A] text-xs">Sin leads perfilados aún</td></tr>
                      :paginatedLeads.map((lead,i)=>(
                      <tr key={i} className="border-b border-[#1E1E2E] hover:bg-[#1E1E2E] transition-colors cursor-pointer" onClick={()=>setSelectedLead(lead)}>
                        <td className="px-4 py-3"><div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#1E1E2E] flex items-center justify-center"><User size={10} className="text-[#4A4A6A]"/></div>
                          <div><p className="text-xs font-medium text-[#E0E0F0]">{lead.name||'—'}</p><p className="mono text-[9px] text-[#4A4A6A]">{lead.phone_number}</p></div>
                        </div></td>
                        <td className="px-4 py-3"><StagePill stage={lead.agent_stage}/></td>
                        <td className="px-4 py-3"><div className="flex items-center gap-1">{segIcon(lead.segmento)}<span className="mono text-[10px]" style={{color:segColor(lead.segmento)}}>{lead.segmento||'—'}</span></div></td>
                        <td className="px-4 py-3"><span className="mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{color:scoreColor(lead.engagement_score),background:`${scoreColor(lead.engagement_score)}15`}}>{lead.engagement_score||'—'}</span></td>
                        <td className="px-4 py-3"><span className="mono text-[10px]" style={{color:comColor(lead.nivel_compromiso)}}>{lead.nivel_compromiso||'—'}</span></td>
                        <td className="px-4 py-3"><span className="mono text-[10px]" style={{color:urgColor(lead.urgencia_financiera)}}>{lead.urgencia_financiera||'—'}</span></td>
                        <td className="px-4 py-3 max-w-[180px]"><p className="text-[11px] text-[#E0E0F0] truncate">{lead.situacion_actual||'—'}</p></td>
                        <td className="px-4 py-3 max-w-[200px]"><p className="text-[11px] text-[#4A4A6A] truncate">{lead.dolor_declarado||'—'}</p></td>
                      </tr>
                    ))}
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
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">CAMPAÑAS — {campaigns.length} TOTAL</p>
            <button onClick={()=>setShowCreator(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold mono text-[11px] tracking-widest transition-all hover:scale-105"
              style={{background:'linear-gradient(135deg,#0014ad,#00a7e3)'}}>
              <Plus size={13}/> NUEVA CAMPAÑA
            </button>
          </div>
          <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{background:'#111118'}}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#1E1E2E]">
                  {['CAMPAÑA','TEMPLATE','ESTADO','CONTACTOS','ENVIADOS','ENTREGADOS','LEÍDOS','RESPUESTAS','FECHA',''].map(h=>(
                    <th key={h} className="px-4 py-3 text-left mono text-[9px] text-[#4A4A6A] tracking-widest font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {campaigns.length===0
                    ?<tr><td colSpan={10} className="px-5 py-8 text-center text-[#4A4A6A] text-xs">Sin campañas — crea una nueva</td></tr>
                    :paginatedCampaigns.map((c,i)=>(
                    <tr key={i} className="border-b border-[#1E1E2E] hover:bg-[#1E1E2E] transition-colors">
                      <td className="px-4 py-3 text-sm text-[#E0E0F0] font-medium">{c.name}</td>
                      <td className="px-4 py-3"><span className="mono text-[10px] text-[#4A4A6A]">{c.template_name||'—'}</span></td>
                      <td className="px-4 py-3"><span className={`mono text-[10px] tracking-widest ${statusColor(c.status)}`}>{statusLabel(c.status)}</span></td>
                      <td className="px-4 py-3 mono text-sm text-[#E0E0F0]">{c.total_contacts||'—'}</td>
                      <td className="px-4 py-3 mono text-sm text-[#E0E0F0]">{c.sent_count}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="mono text-sm text-[#E0E0F0]">{c.delivered_count}</span>{c.sent_count>0&&<span className="mono text-[9px]" style={{color:'#00b0f6'}}>{Math.round((c.delivered_count/c.sent_count)*100)}%</span>}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="mono text-sm text-[#E0E0F0]">{c.read_count}</span>{c.delivered_count>0&&<span className="mono text-[9px] text-[#FF6B35]">{Math.round((c.read_count/c.delivered_count)*100)}%</span>}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="mono text-sm text-[#E0E0F0]">{c.reply_count}</span>{c.sent_count>0&&<span className="mono text-[9px] text-[#00FF94]">{Math.round((c.reply_count/c.sent_count)*100)}%</span>}</div></td>
                      <td className="px-4 py-3 mono text-[10px] text-[#4A4A6A]">{c.scheduled_at?format(new Date(c.scheduled_at),'dd/MM HH:mm'):'—'}</td>
                      <td className="px-4 py-3">
                        {(c.status==='scheduled'||c.status==='running')&&(
                          <div className="flex items-center gap-1">
                            {c.status==='running'&&(
                              <button onClick={()=>handleCampaignAction(c,'paused')} title="Pausar"
                                className="p-1.5 rounded-lg border border-[#1E1E2E] hover:border-[#FFB800] transition-colors group">
                                <Pause size={10} className="text-[#4A4A6A] group-hover:text-[#FFB800]"/>
                              </button>
                            )}
                            <button onClick={()=>handleCampaignAction(c,'cancelled')} title="Cancelar"
                              className="p-1.5 rounded-lg border border-[#1E1E2E] hover:border-[#FF6B35] transition-colors group">
                              <Square size={10} className="text-[#4A4A6A] group-hover:text-[#FF6B35]"/>
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

        
        {/* ══ CONFIG ══ */}
        {activeTab==='config'&&(
          <CredentialsVault
            activeProjectId={activeProjectId}
            projects={projects}
            onToast={addToast}
            onProjectsUpdate={setProjects}
          />
        )}

       {/* Footer */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2"><KanshiLogo size={14}/><p className="mono text-[10px] text-[#4A4A6A]">KANSHI v2.0 — SUPABASE REALTIME</p></div>
          <p className="mono text-[10px] text-[#4A4A6A]">SANTIAGO JIMÉNEZ · GROWTH PARTNER © 2026</p>
        </div>
          </div>{/* /max-w wrapper */}
        </main>{/* /scrollable content */}
      </div>{/* /workspace */}

      {selectedLead&&<LeadPanel lead={selectedLead} onClose={()=>setSelectedLead(null)}/>}
      {showCreator&&<CampaignCreator leads={leads} templates={templates} onClose={()=>setShowCreator(false)}
        onCreated={()=>{setShowCreator(false);fetchData();setActiveTab('campaigns');addToast('success','Campaña creada — el scheduler la procesará en ~5 min')}}/>}
      {showProjectWizard&&<ProjectWizard onClose={()=>setShowProjectWizard(false)} onCreated={handleProjectCreated}/>}
      <ToastContainer toasts={toasts} onRemove={removeToast}/>
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
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#1E1E2E] overflow-hidden" style={{background:'#0D0D14',maxHeight:'90vh',overflowY:'auto'}}>
        <div className="px-6 py-5 border-b border-[#1E1E2E] flex items-center justify-between sticky top-0 z-10" style={{background:'rgba(13,13,20,0.98)'}}>
          <div>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">NUEVA CAMPAÑA — PASO {step} DE 3</p>
            <p className="font-semibold text-[#E0E0F0] text-sm mt-0.5">
              {step===1?'Template y nombre':step===2?'Segmentación de audiencia':'Programación y confirmación'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#FF6B35] transition-colors group"><X size={12} className="text-[#4A4A6A] group-hover:text-[#FF6B35]"/></button>
        </div>
        <div className="h-0.5 bg-[#1E1E2E]">
          <div className="h-full transition-all duration-500" style={{width:`${(step/3)*100}%`,background:'linear-gradient(90deg,#0014ad,#00a7e3)'}}/>
        </div>

        <div className="p-6 space-y-5">
          {step===1&&<>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">NOMBRE DE LA CAMPAÑA</label>
              <input value={campaignName} onChange={e=>setCampaignName(e.target.value)} placeholder="ej. Live 1 — Leads Calientes"
                className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none transition-colors placeholder:text-[#4A4A6A]"/>
            </div>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">SELECCIONAR TEMPLATE</label>
              {templates.length===0
                ?<div className="rounded-xl border border-dashed border-[#1E1E2E] p-6 text-center"><p className="text-[#4A4A6A] text-xs">No hay templates aprobados</p></div>
                :<div className="space-y-2">
                  {templates.map(t=>(
                    <div key={t.id} onClick={()=>{setSelectedTemplate(t);detectVars(t)}}
                      className="rounded-xl border p-4 cursor-pointer transition-all"
                      style={{borderColor:selectedTemplate?.id===t.id?'#00b0f6':'#1E1E2E',background:selectedTemplate?.id===t.id?'rgba(0,176,246,0.05)':'#111118'}}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{background:selectedTemplate?.id===t.id?'#00b0f6':'#2A2A3A'}}/>
                          <span className="font-medium text-sm text-[#E0E0F0]">{t.display_name||t.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="mono text-[9px] px-2 py-0.5 rounded-full border border-[#1E1E2E] text-[#4A4A6A]">{t.language}</span>
                          <span className="mono text-[9px] px-2 py-0.5 rounded-full border text-[#00b0f6]" style={{borderColor:'rgba(0,176,246,0.4)'}}>{t.category||'MARKETING'}</span>
                        </div>
                      </div>
                      <p className="mono text-[9px] text-[#4A4A6A]">{t.name}</p>
                      {t.body_text&&<p className="text-[11px] text-[#6A6A8A] mt-2 leading-relaxed line-clamp-2">{t.body_text}</p>}
                    </div>
                  ))}
                </div>
              }
            </div>
            {selectedTemplate&&templateVars.length>0&&(
              <div>
                <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">VARIABLES — {templateVars.length} detectada{templateVars.length>1?'s':''}</label>
                <div className="space-y-2">
                  {templateVars.map((v,i)=>(
                    <div key={i} className="rounded-xl border border-[#1E1E2E] p-3 space-y-2" style={{background:'#111118'}}>
                      <div className="flex items-center gap-2">
                        <span className="mono text-[10px] px-2 py-0.5 rounded-full border text-[#00b0f6]" style={{borderColor:'rgba(0,176,246,0.4)'}}>{'{{'}{v.index}{'}}'}</span>
                        <span className="mono text-[10px] text-[#4A4A6A]">Parámetro {v.index}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="mono text-[9px] text-[#4A4A6A] mb-1">TIPO</p>
                          <div className="flex gap-2">
                            {(['field','fixed'] as const).map(t=>(
                              <button key={t} onClick={()=>{const nv=[...templateVars];nv[i]={...nv[i],type:t};setTemplateVars(nv)}}
                                className="px-2 py-1 rounded-lg border mono text-[9px] transition-all"
                                style={{borderColor:v.type===t?'#00b0f6':'#1E1E2E',color:v.type===t?'#00b0f6':'#4A4A6A',background:v.type===t?'rgba(0,176,246,0.1)':'transparent'}}>
                                {t==='field'?'CAMPO':'FIJO'}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="mono text-[9px] text-[#4A4A6A] mb-1">{v.type==='field'?'CAMPO DEL CONTACTO':'TEXTO FIJO'}</p>
                          {v.type==='field'
                            ?<select value={v.value} onChange={e=>{const nv=[...templateVars];nv[i]={...nv[i],value:e.target.value};setTemplateVars(nv)}}
                                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-2 py-1 text-xs text-[#E0E0F0] outline-none">
                                {FIELD_OPTIONS.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            :<input value={v.value} onChange={e=>{const nv=[...templateVars];nv[i]={...nv[i],value:e.target.value};setTemplateVars(nv)}}
                                placeholder="Texto fijo..." className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-2 py-1 text-xs text-[#E0E0F0] outline-none placeholder:text-[#4A4A6A]"/>
                          }
                        </div>
                      </div>
                      {v.type==='field'&&(
                        <div>
                          <p className="mono text-[9px] text-[#4A4A6A] mb-1">FALLBACK (si el campo está vacío)</p>
                          <input value={v.fallback} onChange={e=>{const nv=[...templateVars];nv[i]={...nv[i],fallback:e.target.value};setTemplateVars(nv)}}
                            placeholder="ej. Amigo" className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-2 py-1 text-xs text-[#E0E0F0] outline-none placeholder:text-[#4A4A6A]"/>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedTemplate&&templateVars.length===0&&(
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1E1E2E]" style={{background:'#111118'}}>
                <div className="w-1.5 h-1.5 rounded-full" style={{background:'#00b0f6'}}/>
                <span className="mono text-[10px] text-[#4A4A6A]">Template sin variables — se envía directo sin parámetros</span>
              </div>
            )}
          </>}

          {step===2&&<>
            <div className="flex items-center justify-between p-3 rounded-xl border" style={{borderColor:'rgba(0,176,246,0.4)',background:'rgba(0,176,246,0.05)'}}>
              <div className="flex items-center gap-2"><Filter size={12} style={{color:'#00b0f6'}}/><span className="mono text-[10px] tracking-widest" style={{color:'#00b0f6'}}>AUDIENCIA SELECCIONADA</span></div>
              <span className="mono text-lg font-bold" style={{color:'#00b0f6'}}>{filteredLeads.length} leads</span>
            </div>
            <FilterGroup label="SEGMENTO" options={['caliente','templado','frio']} selected={filterSegmento}
              onToggle={v=>toggleFilter(filterSegmento,setFilterSegmento,v)}
              colors={{'caliente':'#FF6B35','templado':'#FFB800','frio':'#00b0f6'}}/>
            <FilterGroup label="ETAPA" options={STAGES.map(s=>s.key)} selected={filterStage}
              onToggle={v=>toggleFilter(filterStage,setFilterStage,v)}
              labels={Object.fromEntries(STAGES.map(s=>[s.key,s.label]))}/>
            <FilterGroup label="URGENCIA FINANCIERA" options={['alta','media','baja']} selected={filterUrgencia}
              onToggle={v=>toggleFilter(filterUrgencia,setFilterUrgencia,v)}
              colors={{'alta':'#FF6B35','media':'#FFB800','baja':'#4A4A6A'}}/>
            <FilterGroup label="NIVEL COMPROMISO" options={['alto','medio','bajo']} selected={filterCompromiso}
              onToggle={v=>toggleFilter(filterCompromiso,setFilterCompromiso,v)}
              colors={{'alto':'#00FF94','medio':'#FFB800','bajo':'#4A4A6A'}}/>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">ENGAGEMENT SCORE MÍNIMO — {minScore===0?'Sin filtro':`>= ${minScore}`}</label>
              <input type="range" min={0} max={10} value={minScore} onChange={e=>setMinScore(Number(e.target.value))}
                className="w-full h-1 bg-[#1E1E2E] rounded-full outline-none" style={{accentColor:'#00b0f6'}}/>
              <div className="flex justify-between mt-1">{[0,2,4,6,8,10].map(n=><span key={n} className="mono text-[9px] text-[#4A4A6A]">{n}</span>)}</div>
            </div>
            {filteredLeads.length>0&&(
              <div>
                <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-2">PREVIEW — primeros {Math.min(5,filteredLeads.length)} leads</p>
                <div className="space-y-1.5">
                  {filteredLeads.slice(0,5).map((l,i)=>(
                    <div key={i} className="flex items-center justify-between rounded-xl border border-[#1E1E2E] px-3 py-2" style={{background:'#111118'}}>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full" style={{background:segColor(l.segmento)}}/>
                        <span className="text-xs text-[#E0E0F0]">{l.name||l.phone_number}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <StagePill stage={l.agent_stage}/>
                        <span className="mono text-[10px] font-bold" style={{color:scoreColor(l.engagement_score)}}>{l.engagement_score||'—'}</span>
                      </div>
                    </div>
                  ))}
                  {filteredLeads.length>5&&<p className="mono text-[9px] text-[#4A4A6A] text-center">+{filteredLeads.length-5} más</p>}
                </div>
              </div>
            )}
          </>}

          {step===3&&<>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-3">CUÁNDO ENVIAR</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setSendNow(true)} className="rounded-xl border p-4 text-left transition-all"
                  style={{borderColor:sendNow?'#00b0f6':'#1E1E2E',background:sendNow?'rgba(0,176,246,0.05)':'transparent'}}>
                  <div className="flex items-center gap-2 mb-1"><Rocket size={12} style={{color:sendNow?'#00b0f6':'#4A4A6A'}}/><span className="mono text-[10px] tracking-widest" style={{color:sendNow?'#00b0f6':'#4A4A6A'}}>AHORA MISMO</span></div>
                  <p className="text-xs text-[#6A6A8A]">El scheduler lo enviará en el próximo ciclo de 5 min</p>
                </button>
                <button onClick={()=>setSendNow(false)} className="rounded-xl border p-4 text-left transition-all"
                  style={{borderColor:!sendNow?'#00b0f6':'#1E1E2E',background:!sendNow?'rgba(0,176,246,0.05)':'transparent'}}>
                  <div className="flex items-center gap-2 mb-1"><Calendar size={12} style={{color:!sendNow?'#00b0f6':'#4A4A6A'}}/><span className="mono text-[10px] tracking-widest" style={{color:!sendNow?'#00b0f6':'#4A4A6A'}}>PROGRAMAR</span></div>
                  <p className="text-xs text-[#6A6A8A]">Elige fecha y hora específica</p>
                </button>
              </div>
            </div>
            {!sendNow&&(
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">FECHA</label>
                  <input type="date" value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)}
                    className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none transition-colors"/>
                </div>
                <div>
                  <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">HORA</label>
                  <input type="time" value={scheduledTime} onChange={e=>setScheduledTime(e.target.value)}
                    className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none transition-colors"/>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-[#1E1E2E] p-4 space-y-3" style={{background:'#111118'}}>
              <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">RESUMEN DE CAMPAÑA</p>
              <SummaryRow label="Nombre" value={campaignName}/>
              <SummaryRow label="Template" value={selectedTemplate?.name||'—'}/>
              <SummaryRow label="Idioma" value={selectedTemplate?.language||'—'}/>
              <SummaryRow label="Contactos" value={`${filteredLeads.length} leads seleccionados`} highlight/>
              <SummaryRow label="Envío" value={sendNow?'Inmediato (próx. ciclo ~5min)':`${scheduledDate} a las ${scheduledTime}`}/>
            </div>
            {error&&<div className="rounded-xl border border-[#FF6B35] bg-[#FF6B3510] p-3"><p className="text-xs text-[#FF6B35]">{error}</p></div>}
          </>}
        </div>

        <div className="px-6 py-4 border-t border-[#1E1E2E] flex items-center justify-between sticky bottom-0" style={{background:'rgba(13,13,20,0.98)'}}>
          <button onClick={()=>step>1?setStep(step-1):onClose()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1E1E2E] mono text-[11px] text-[#4A4A6A] hover:text-[#E0E0F0] hover:border-[#2E2E4E] transition-all">
            <ChevronLeft size={12}/> {step===1?'CANCELAR':'ANTERIOR'}
          </button>
          {step<3
            ?<button onClick={()=>setStep(step+1)} disabled={step===1?!canNext1:!canNext2}
                className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{background:'linear-gradient(135deg,#0014ad,#00a7e3)'}}>
                SIGUIENTE <ChevronRight size={12}/>
              </button>
            :<button onClick={handleCreate} disabled={!canConfirm||saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{background:'linear-gradient(135deg,#0014ad,#00a7e3)'}}>
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
  { key: 'frio',     label: 'Frío',     color: '#00b0f6', range: '0–25'  },
  { key: 'templado', label: 'Templado', color: '#FFB800', range: '26–50' },
  { key: 'caliente', label: 'Caliente', color: '#FF6B35', range: '51–75' },
  { key: 'listo',    label: 'Listo',    color: '#00FF94', range: '76–100'},
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

  const gaugeColor = avgScore >= 76 ? '#00FF94'
    : avgScore >= 51 ? '#FF6B35'
    : avgScore >= 26 ? '#FFB800'
    : '#00b0f6'

  const listos = leads.filter(l => (l.kanshi_segment || 'frio') === 'listo').length

  return (
    <div className="rounded-xl border border-[#1E1E2E] p-5" style={{ background: '#111118' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">KANSHI SCORE</p>
          <p className="text-sm font-medium text-[#E0E0F0] mt-0.5">Calificación de leads 0–100</p>
        </div>
        {listos > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#00FF9440] bg-[#00FF9410]">
            <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-[#00FF94]"/>
            <span className="mono text-[10px] font-bold text-[#00FF94]">{listos} LISTOS</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-6">
        {/* Gauge numérico */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="38" fill="none" stroke="#1E1E2E" strokeWidth="10"/>
              <circle cx="50" cy="50" r="38" fill="none" stroke={gaugeColor} strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 38}`}
                strokeDashoffset={`${2 * Math.PI * 38 * (1 - avgScore / 100)}`}
                style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
            </svg>
            <div className="text-center z-10">
              <p className="mono text-2xl font-bold leading-none" style={{ color: gaugeColor }}>{avgScore}</p>
              <p className="mono text-[8px] text-[#4A4A6A] tracking-widest mt-0.5">PROM</p>
            </div>
          </div>
          <p className="mono text-[9px] text-[#4A4A6A] mt-2">{scored.length} evaluados</p>
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
              <div className="w-[72px] h-[72px] rounded-full border-[10px] border-[#1E1E2E]"/>
            </div>
          )}

          <div className="flex-1 space-y-2">
            {segCounts.map(seg => (
              <div key={seg.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: seg.color }}/>
                  <span className="mono text-[10px] text-[#E0E0F0]">{seg.label}</span>
                  <span className="mono text-[9px] text-[#4A4A6A]">{seg.range}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mono text-[11px] font-bold" style={{ color: seg.color }}>{seg.count}</span>
                  <span className="mono text-[9px] text-[#4A4A6A] w-8 text-right">
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
      <span className="mono text-[10px] text-[#4A4A6A]">{label}</span>
      <span className="mono text-[11px]" style={{color:highlight?'#00b0f6':'#E0E0F0',fontWeight:highlight?'bold':'normal'}}>{value}</span>
    </div>
  )
}

interface FGProps {label:string;options:string[];selected:string[];onToggle:(v:string)=>void;colors?:Record<string,string>;labels?:Record<string,string>}
function FilterGroup({label,options,selected,onToggle,colors={},labels={}}:FGProps) {
  return(
    <div>
      <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o=>{
          const active=selected.includes(o); const color=colors[o]||'#4A4A6A'
          const lbl=labels[o]||o.charAt(0).toUpperCase()+o.slice(1)
          return(
            <button key={o} onClick={()=>onToggle(o)}
              className="px-3 py-1.5 rounded-full border mono text-[10px] transition-all"
              style={{borderColor:active?color:`${color}40`,background:active?`${color}20`:'transparent',color:active?color:'#4A4A6A'}}>
              {lbl}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function Sec({label,children}:{label:string;children:React.ReactNode}){
  return <div><p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-3">{label}</p>{children}</div>
}

function KCard({icon,label,value,color,isPercent}:{icon:React.ReactNode;label:string;value:number|string;color:string;isPercent?:boolean}){
  return(
    <div className="rounded-xl border border-[#1E1E2E] p-4 hover:border-[#2E2E4E] transition-all" style={{background:'#111118'}}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:`${color}18`,color}}>{icon}</div>
        {isPercent&&<div className="w-1.5 h-1.5 rounded-full" style={{background:color}}/>}
      </div>
      <p className="mono text-[28px] font-bold leading-none" style={{color}}>{value}</p>
      <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mt-2">{label}</p>
    </div>
  )
}

function StagePill({stage}:{stage:string}){
  const s=STAGE_MAP[stage]||{label:stage,color:'#4A4A6A'}
  return <span className="mono text-[9px] tracking-widest px-2 py-0.5 rounded-full border" style={{color:s.color,borderColor:`${s.color}40`,background:`${s.color}10`}}>{s.label.toUpperCase()}</span>
}

function MiniDist({title,data,total}:{title:string;data:{name:string;value:number;color:string}[];total:number}){
  return(
    <div className="rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
      <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-4">{title}</p>
      {data.length===0?<p className="text-[#4A4A6A] text-xs text-center mt-6">Sin datos</p>:<>
        <div className="flex items-center justify-center mb-4">
          <ResponsiveContainer width={120} height={120}>
            <PieChart><Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
              {data.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.85}/>)}
            </Pie></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">{data.map((d,i)=>(
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:d.color}}/><span className="mono text-[10px] text-[#E0E0F0]">{d.name}</span></div>
            <div className="flex items-center gap-2">
              <span className="mono text-[10px]" style={{color:d.color}}>{d.value}</span>
              <span className="mono text-[9px] text-[#4A4A6A]">{total>0?`${Math.round((d.value/total)*100)}%`:'0%'}</span>
            </div>
          </div>
        ))}</div>
      </>}
    </div>
  )
}

function LeadPanel({lead,onClose}:{lead:Lead;onClose:()=>void}){
  const stage=STAGE_MAP[lead.agent_stage]||{label:lead.agent_stage,color:'#4A4A6A'}
  return(
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-[460px] border-l border-[#1E1E2E] overflow-y-auto flex-shrink-0" style={{background:'#0D0D14'}}>
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-[#1E1E2E] flex items-center justify-between" style={{background:'rgba(13,13,20,0.97)'}}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${stage.color}20`}}><User size={16} style={{color:stage.color}}/></div>
            <div><p className="font-semibold text-[#E0E0F0] text-sm">{lead.name||'Sin nombre'}</p><p className="mono text-[10px] text-[#4A4A6A]">{lead.phone_number}</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#FF6B35] transition-colors group"><X size={12} className="text-[#4A4A6A] group-hover:text-[#FF6B35]"/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-3 flex-wrap">
            <StagePill stage={lead.agent_stage}/>
            {lead.segmento&&<div className="flex items-center gap-1 px-2 py-0.5 rounded-full border" style={{borderColor:`${segColor(lead.segmento)}40`,background:`${segColor(lead.segmento)}10`}}>{segIcon(lead.segmento)}<span className="mono text-[10px]" style={{color:segColor(lead.segmento)}}>{lead.segmento}</span></div>}
            {lead.engagement_score>0&&<div className="flex items-center gap-1"><Star size={10} style={{color:scoreColor(lead.engagement_score)}}/><span className="mono text-[10px] font-bold" style={{color:scoreColor(lead.engagement_score)}}>{lead.engagement_score}/10</span></div>}
          </div>
          <div className="space-y-2">
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">PERFIL PSICOGRÁFICO</p>
            <PField label="SITUACIÓN ACTUAL" value={lead.situacion_actual} icon={<User size={11}/>}/>
            <PField label="DOLOR DECLARADO" value={lead.dolor_declarado} icon={<AlertCircle size={11}/>} color="#FF6B35"/>
            <PField label="DOLOR PROFUNDO" value={lead.dolor_profundo} icon={<Heart size={11}/>} color="#C084FC"/>
            <PField label="SUEÑO DECLARADO" value={lead.sueno_declarado} icon={<Star size={11}/>} color="#00FF94"/>
            <PField label="OBJECIÓN PROBABLE" value={lead.objecion_probable} icon={<AlertCircle size={11}/>} color="#FFB800"/>
            <PField label="ESTILO DE DECISIÓN" value={lead.estilo_decision} icon={<Brain size={11}/>} color="#00b0f6"/>
          </div>
          <div className="space-y-2">
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">MÉTRICAS</p>
            <div className="grid grid-cols-2 gap-2">
              <MPin label="URGENCIA" value={lead.urgencia_financiera} color={urgColor(lead.urgencia_financiera)}/>
              <MPin label="COMPROMISO" value={lead.nivel_compromiso} color={comColor(lead.nivel_compromiso)}/>
              <MPin label="PREGUNTAS" value={lead.preguntas_respondidas?.toString()} color="#4A4A6A"/>
              <MPin label="ACTUALIZADO" value={lead.updated_at?format(new Date(lead.updated_at),'dd/MM HH:mm'):'—'} color="#4A4A6A"/>
            </div>
          </div>
          {(lead.kanshi_score||0)>0&&(
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">KANSHI SCORE</p>
                <span className="mono text-sm font-bold"
                  style={{color:lead.kanshi_segment==='listo'?'#00FF94':lead.kanshi_segment==='caliente'?'#FF6B35':lead.kanshi_segment==='templado'?'#FFB800':'#00b0f6'}}>
                  {lead.kanshi_score}/100
                </span>
              </div>
              <div className="rounded-xl border border-[#1E1E2E] p-4 space-y-3" style={{background:'#111118'}}>
                {[
                  {label:'FIT DEL PERFIL',    value: (lead as any).score_fit        ?? 0, max:25, color:'#C084FC'},
                  {label:'ENGAGEMENT ACTIVO', value: (lead as any).score_engagement ?? 0, max:35, color:'#00b0f6'},
                  {label:'INTENCIÓN DECLARADA',value:(lead as any).score_intencion  ?? 0, max:25, color:'#FF6B35'},
                  {label:'CALIDAD DE FUENTE', value: (lead as any).score_fuente     ?? 0, max:15, color:'#FFB800'},
                ].map(dim=>(
                  <div key={dim.label}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="mono text-[9px] text-[#4A4A6A] tracking-widest">{dim.label}</span>
                      <span className="mono text-[10px] font-bold" style={{color:dim.color}}>{dim.value}<span className="text-[#4A4A6A] font-normal">/{dim.max}</span></span>
                    </div>
                    <div className="h-1.5 rounded-full" style={{background:'#1E1E2E'}}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{width:`${Math.round((dim.value/dim.max)*100)}%`,background:dim.color,opacity:0.8}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lead.resumen_perfil&&<div className="space-y-2">
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">RESUMEN</p>
            <div className="rounded-xl border border-[#1E1E2E] p-4" style={{background:'#111118'}}><p className="text-xs text-[#E0E0F0] leading-relaxed">{lead.resumen_perfil}</p></div>
          </div>}
        </div>
      </div>
    </div>
  )
}

function PField({label,value,icon,color='#E0E0F0'}:{label:string;value:string;icon:React.ReactNode;color?:string}){
  if(!value) return null
  return(
    <div className="rounded-xl border border-[#1E1E2E] p-3" style={{background:'#111118'}}>
      <div className="flex items-center gap-1.5 mb-1.5"><span style={{color}}>{icon}</span><span className="mono text-[9px] tracking-widest" style={{color:`${color}99`}}>{label}</span></div>
      <p className="text-xs text-[#E0E0F0] leading-relaxed">{value}</p>
    </div>
  )
}

function MPin({label,value,color}:{label:string;value:string|undefined;color:string}){
  return(
    <div className="rounded-xl border border-[#1E1E2E] px-3 py-2" style={{background:'#111118'}}>
      <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mb-0.5">{label}</p>
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
    <div className="flex items-center justify-between px-4 py-3 border-t border-[#1E1E2E]">
      <span className="mono text-[10px] text-[#4A4A6A]">{from}–{to} de {total}</span>
      <div className="flex items-center gap-1">
        <button onClick={()=>onPage(page-1)} disabled={page===1}
          className="p-1.5 rounded-lg border border-[#1E1E2E] disabled:opacity-30 hover:border-[#00b0f6] transition-colors group disabled:cursor-not-allowed">
          <ChevronLeft size={11} className="text-[#4A4A6A] group-hover:text-[#00b0f6]"/>
        </button>
        {pages.map((p,i)=>
          p==='…'
            ?<span key={`e-${i}`} className="mono text-[10px] text-[#4A4A6A] px-1">…</span>
            :<button key={p} onClick={()=>onPage(p as number)}
                className="min-w-[28px] h-7 rounded-lg border mono text-[10px] transition-all"
                style={{borderColor:page===p?'#00b0f6':'#1E1E2E',background:page===p?'rgba(0,176,246,0.12)':'transparent',color:page===p?'#00b0f6':'#4A4A6A'}}>
                {p}
              </button>
        )}
        <button onClick={()=>onPage(page+1)} disabled={page===totalPages}
          className="p-1.5 rounded-lg border border-[#1E1E2E] disabled:opacity-30 hover:border-[#00b0f6] transition-colors group disabled:cursor-not-allowed">
          <ChevronRight size={11} className="text-[#4A4A6A] group-hover:text-[#00b0f6]"/>
        </button>
      </div>
    </div>
  )
}

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────

function ToastContainer({toasts,onRemove}:{toasts:Toast[];onRemove:(id:string)=>void}){
  const icons:Record<Toast['type'],React.ReactNode>={
    success:<CheckCircle size={13} style={{color:'#00FF94'}}/>,
    error:<AlertCircle size={13} style={{color:'#FF6B35'}}/>,
    warning:<AlertCircle size={13} style={{color:'#FFB800'}}/>,
    info:<Info size={13} style={{color:'#00b0f6'}}/>,
  }
  const borders:Record<Toast['type'],string>={success:'#00FF94',error:'#FF6B35',warning:'#FFB800',info:'#00b0f6'}
  if(toasts.length===0) return null
  return(
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t=>(
        <div key={t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border pointer-events-auto"
          style={{background:'#111118',borderColor:`${borders[t.type]}40`,boxShadow:`0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${borders[t.type]}20`,minWidth:'260px',maxWidth:'380px',animation:'slideInRight 0.25s ease'}}>
          {icons[t.type]}
          <span className="text-xs text-[#E0E0F0] flex-1 leading-snug">{t.message}</span>
          <button onClick={()=>onRemove(t.id)} className="text-[#4A4A6A] hover:text-[#E0E0F0] transition-colors flex-shrink-0 ml-1"><X size={11}/></button>
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
    <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{ background: '#111118' }}>
      <div className="px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(0,176,246,0.1)', border: '1px solid rgba(0,176,246,0.2)' }}>
            <MessageSquare size={14} style={{ color: '#00b0f6' }}/>
          </div>
          <div>
            <p className="font-semibold text-[#E0E0F0] text-sm">{cred.name}</p>
            <p className="mono text-[10px] text-[#4A4A6A]">
              {cred.credentials.display_phone_number || `ID: ${cred.credentials.phone_number_id?.slice(0,8)}...`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {cred.credentials.quality_rating && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: `${qrColor(cred.credentials.quality_rating)}15`, border: `1px solid ${qrColor(cred.credentials.quality_rating)}40` }}>
              <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: qrColor(cred.credentials.quality_rating) }}/>
              <span className="mono text-[10px] font-bold tracking-widest" style={{ color: qrColor(cred.credentials.quality_rating) }}>
                {cred.credentials.quality_rating}
              </span>
            </div>
          )}
          {cred.credentials.messaging_limit_tier && (
            <span className="mono text-[10px] text-[#4A4A6A] px-2 py-1 rounded-lg border border-[#1E1E2E]">
              {tierLabel(cred.credentials.messaging_limit_tier)}
            </span>
          )}
          {cred.credentials.last_verified && (
            <span className="mono text-[9px] text-[#2E2E4E]">
              verificado {format(new Date(cred.credentials.last_verified), 'dd/MM HH:mm')}
            </span>
          )}
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1E1E2E] mono text-[10px] text-[#4A4A6A] hover:border-[#00b0f6] hover:text-[#00b0f6] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
            {verifying
              ? <><div className="w-3 h-3 border border-[#00b0f6] border-t-transparent rounded-full animate-spin"/> VERIFICANDO</>
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
    <div className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg" style={{ background: '#0A0A0F' }}>
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-base">{project.emoji || '🚀'}</span>
        <div className="min-w-0">
          <p className="text-xs font-medium text-[#E0E0F0] truncate">{project.name}</p>
          <p className="mono text-[10px] text-[#4A4A6A]">{project.status.toUpperCase()}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {saving && <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin" style={{ borderColor: '#00b0f6', borderTopColor: 'transparent' }}/>}
        <select
          value={value}
          onChange={e => handleChange(e.target.value)}
          className="mono text-[10px] rounded-lg px-2 py-1.5 border outline-none text-[#E0E0F0]"
          style={{ background: '#111118', borderColor: '#1E1E2E', minWidth: '180px' }}>
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
    r === 'GREEN' ? '#00FF94' : r === 'YELLOW' ? '#FFB800' : r === 'RED' ? '#FF6B35' : '#4A4A6A'
  const tierLabel = (t?: string) =>
    ({ TIER_50:'50/día', TIER_250:'250/día', TIER_1K:'1K/día', TIER_10K:'10K/día', TIER_100K:'100K/día' }[t||''] || t || '—')

  const handleProjectUpdate = (projectId: string, credentialId: string | null) => {
    onProjectsUpdate(projects.map(p => p.id === projectId ? { ...p, credential_id: credentialId } : p))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">CREDENCIALES — WHATSAPP BUSINESS</p>
          <p className="text-xs text-[#4A4A6A] mt-0.5">{credentials.length} número{credentials.length!==1?'s':''} registrado{credentials.length!==1?'s':''}</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-bold mono text-[11px] tracking-widest transition-all hover:scale-105"
          style={{ background: 'linear-gradient(135deg,#0014ad,#00a7e3)' }}>
          <Plus size={13}/> AGREGAR NÚMERO
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#00b0f6', borderTopColor: 'transparent' }}/>
        </div>
      ) : credentials.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#1E1E2E] p-12 text-center">
          <div className="w-12 h-12 rounded-xl border border-[#1E1E2E] flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={20} className="text-[#4A4A6A]"/>
          </div>
          <p className="text-sm text-[#4A4A6A] mb-1">Sin números registrados</p>
          <p className="mono text-[10px] text-[#2E2E4E] tracking-widest">Agrega tu Phone ID, Token y WABA ID de Meta</p>
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
        <div className="rounded-xl border border-[#1E1E2E] p-4 space-y-3" style={{ background: '#111118' }}>
          <div className="flex items-center gap-2">
            <Rocket size={12} style={{ color: '#00b0f6' }}/>
            <p className="mono text-[10px] tracking-widest text-[#4A4A6A]">ASIGNAR NÚMERO A PROYECTO</p>
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
      <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">{label}</label>
      <div className="relative">
        <input
          type={masked ? (show ? 'text' : 'password') : type}
          value={value} onChange={onChange} placeholder={placeholder}
          className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none transition-colors placeholder:text-[#4A4A6A] focus:border-[#0014ad]"
          style={{ paddingRight: masked ? '40px' : undefined }}
        />
        {masked && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#4A4A6A] hover:text-[#E0E0F0] transition-colors">
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
      <div className="relative w-full max-w-md rounded-2xl border border-[#1E1E2E] overflow-hidden"
        style={{ background: '#0D0D14', boxShadow: '0 32px 80px rgba(0,0,0,0.7)' }}>
        <div className="px-6 py-5 border-b border-[#1E1E2E] flex items-center justify-between">
          <div>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">NUEVO NÚMERO WHATSAPP</p>
            <p className="font-semibold text-[#E0E0F0] text-sm mt-0.5">Credenciales de Meta Business</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#FF6B35] transition-colors group">
            <X size={12} className="text-[#4A4A6A] group-hover:text-[#FF6B35]"/>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border"
            style={{ borderColor: 'rgba(0,176,246,0.3)', background: 'rgba(0,176,246,0.05)' }}>
            <Info size={12} style={{ color: '#00b0f6', flexShrink: 0, marginTop: 1 }}/>
            <p className="mono text-[9px] text-[#4A4A6A] leading-relaxed">
              Encontrarás estos datos en Meta Business Manager → WhatsApp → Configuración del número
            </p>
          </div>
          <CInput label="NOMBRE / ALIAS *" value={name} onChange={e=>setName(e.target.value)} placeholder="ej. SamurAI Principal"/>
          <CInput label="PHONE NUMBER ID *" value={phoneId} onChange={e=>setPhoneId(e.target.value)} placeholder="ej. 123456789012345"/>
          <CInput label="WABA ID (WhatsApp Business Account)" value={wabaId} onChange={e=>setWabaId(e.target.value)} placeholder="ej. 987654321098765"/>
          <CInput label="ACCESS TOKEN *" value={token} onChange={e=>setToken(e.target.value)} placeholder="EAAxxxxxxx..." masked/>
          {error && (
            <div className="rounded-xl border border-[#FF6B35] bg-[#FF6B3510] px-4 py-3">
              <p className="text-xs text-[#FF6B35]">{error}</p>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-[#1E1E2E] flex items-center justify-between"
          style={{ background: 'rgba(13,13,20,0.98)' }}>
          <button onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1E1E2E] mono text-[11px] text-[#4A4A6A] hover:text-[#E0E0F0] hover:border-[#2E2E4E] transition-all">
            <X size={12}/> CANCELAR
          </button>
          <button onClick={handleSave} disabled={!canSave || saving}
            className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ background: 'linear-gradient(135deg,#0014ad,#00a7e3)' }}>
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

// ─── META ADS CREDENTIAL CARD ─────────────────────────────────────────────────

function MetaAdsCard({ onToast }: { onToast: (type: Toast['type'], msg: string) => void }) {
  const [cred, setCred] = useState<{ id: string; credentials: any } | null>(null)
  const [editing, setEditing] = useState(false)
  const [pixelId, setPixelId] = useState('')
  const [capiToken, setCapiToken] = useState('')
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
        credentials: { pixel_id: pixelId.trim(), capi_token: capiToken.trim() }
      }
      if (cred) {
        await supabase.from('kanshi_credentials').update({ credentials: payload.credentials }).eq('id', cred.id)
      } else {
        await supabase.from('kanshi_credentials').insert(payload)
      }
      await fetchMeta()
      setEditing(false)
      onToast('success', 'Meta Ads CAPI actualizado')
    } catch (e: any) {
      onToast('error', e?.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const isConfigured = cred && cred.credentials.pixel_id && cred.credentials.capi_token

  return (
    <div className="rounded-2xl border border-[#1E1E2E] overflow-hidden" style={{ background: '#111118' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#1E1E2E]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
            style={{ background: 'rgba(0,176,246,0.1)', border: '1px solid rgba(0,176,246,0.2)' }}>
            📡
          </div>
          <div>
            <p className="text-sm font-semibold text-[#E0E0F0]">Meta Ads CAPI</p>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mt-0.5">
              {isConfigured ? `Pixel: ${cred.credentials.pixel_id}` : 'SIN CONFIGURAR'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isConfigured && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg"
              style={{ background: 'rgba(0,255,148,0.08)', border: '1px solid rgba(0,255,148,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FF94] animate-pulse"/>
              <span className="mono text-[9px] text-[#00FF94] tracking-widest">ACTIVO</span>
            </div>
          )}
          <button onClick={() => setEditing(e => !e)}
            className="px-3 py-1.5 rounded-lg border border-[#1E1E2E] mono text-[10px] text-[#4A4A6A] hover:text-[#E0E0F0] hover:border-[#2E2E4E] transition-all">
            {editing ? 'CANCELAR' : isConfigured ? 'EDITAR' : 'CONFIGURAR'}
          </button>
        </div>
      </div>

      {/* Form */}
      {editing && (
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl border"
            style={{ borderColor: 'rgba(0,176,246,0.3)', background: 'rgba(0,176,246,0.05)' }}>
            <Info size={12} style={{ color: '#00b0f6', flexShrink: 0, marginTop: 1 }}/>
            <p className="mono text-[9px] text-[#4A4A6A] leading-relaxed">
              Events Manager → Andreti Page's Pixel → Configuración → API de conversiones → Generar token
            </p>
          </div>
          <CInput
            label="PIXEL ID"
            value={pixelId}
            onChange={e => setPixelId(e.target.value)}
            placeholder="ej. 120057833094582"
          />
          <CInput
            label="CAPI ACCESS TOKEN"
            value={capiToken}
            onChange={e => setCapiToken(e.target.value)}
            placeholder="EAAxxxxx..."
            masked
          />
          <button onClick={handleSave} disabled={!pixelId.trim() || !capiToken.trim() || saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg,#0014ad,#00a7e3)' }}>
            {saving
              ? <><div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"/> GUARDANDO...</>
              : <><CheckCircle size={12}/> GUARDAR</>
            }
          </button>
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

function FuentesTab({
  activeProjectId, leads, projects
}: {
  activeProjectId: string|null; leads: Lead[]; projects: Project[]
}) {
  const [utmData, setUtmData] = useState<UtmRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<CampaignGroup|null>(null)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [quizResponses, setQuizResponses] = useState<Array<{
    phone_number: string
    responses: Record<string, string>
  }>>([])

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
    p === 'facebook' || p === 'ghl' ? '#00b0f6' : p === 'instagram' ? '#C084FC' : '#4A4A6A'

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
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#00b0f6', borderTopColor: 'transparent' }}/>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'TOTAL LEADS', value: totals.leads, color: '#00b0f6' },
          { label: 'LEADS CALIENTES', value: totals.calientes, sub: totals.leads > 0 ? `${Math.round((totals.calientes/totals.leads)*100)}%` : '0%', color: '#FF6B35' },
          { label: 'COMPRADORES', value: totals.compradores, sub: totals.leads > 0 ? `${Math.round((totals.compradores/totals.leads)*100)}% conv.` : '—', color: '#00FF94' },
          { label: 'FUENTES ACTIVAS', value: groups.length, color: '#FFB800' },
        ].map(m => (
          <div key={m.label} className="rounded-xl border border-[#1E1E2E] p-4" style={{ background: '#111118' }}>
            <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mb-1">{m.label}</p>
            <div className="flex items-end gap-2">
              <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
              {m.sub && <p className="mono text-[10px] text-[#4A4A6A] mb-1">{m.sub}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{ background: '#111118' }}>
        <div className="px-5 py-4 border-b border-[#1E1E2E] flex items-center justify-between">
          <div>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">FUENTES DE TRÁFICO</p>
            {activeProject && <p className="text-sm font-medium text-[#E0E0F0] mt-0.5">{activeProject.name}</p>}
          </div>
          {!adBudget && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[#FFB80030] bg-[#FFB80008]">
              <AlertCircle size={10} style={{ color: '#FFB800' }}/>
              <span className="mono text-[9px] text-[#4A4A6A]">CPL/CPV disponible con presupuesto de ads configurado</span>
            </div>
          )}
        </div>
        {groups.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <TrendingUp size={24} className="text-[#2A2A3A] mx-auto mb-3"/>
            <p className="text-[#4A4A6A] text-sm">Sin datos UTM registrados aún</p>
            <p className="mono text-[10px] text-[#2A2A4A] mt-1">Los UTMs se capturan cuando un lead llega desde una landing con parámetros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2E]">
                  {['CAMPAÑA','FUENTE','ANUNCIO','LEADS','CALIENTES','COMPRADORES','SCORE PROM','CPL EST.','CPV EST.',''].map(h => (
                    <th key={h} className="px-4 py-3 text-left mono text-[9px] text-[#4A4A6A] tracking-widest font-normal whitespace-nowrap">{h}</th>
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
                      <span className="mono text-[9px] text-[#4A4A6A] w-28 flex-shrink-0 tracking-widest">{label}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1E1E2E' }}>
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: total > 0 ? `${Math.round((value / total) * 100)}%` : '0%', background: color }}/>
                      </div>
                      <span className="mono text-[10px] font-bold w-6 text-right" style={{ color }}>{value}</span>
                      <span className="mono text-[9px] text-[#4A4A6A] w-8 text-right">
                        {total > 0 ? `${Math.round((value / total) * 100)}%` : '0%'}
                      </span>
                    </div>
                  )

                  return (
                    <>
                      {/* ── Fila principal ── */}
                      <tr key={`row-${i}`}
                        className="border-b border-[#1E1E2E] hover:bg-[#16161F] transition-colors cursor-pointer"
                        onClick={() => toggleExpand(key)}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-4 h-4 rounded flex items-center justify-center transition-transform duration-200 flex-shrink-0 ${isExpanded ? 'rotate-90' : ''}`}
                              style={{ background: '#1E1E2E' }}>
                              <ChevronRight size={9} className="text-[#4A4A6A]"/>
                            </div>
                            <p className="text-sm font-medium text-[#E0E0F0]">{g.campaign}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="mono text-[10px] px-2 py-0.5 rounded-full"
                            style={{ color: sourcePlatformColor(g.source), background: `${sourcePlatformColor(g.source)}15` }}>
                            {g.source || '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="mono text-[10px] text-[#4A4A6A]">{g.content || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="mono text-sm font-bold text-[#E0E0F0]">{g.totalLeads}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="mono text-sm text-[#E0E0F0]">{g.calientes}</span>
                            <span className="mono text-[10px]" style={{ color: g.calPct >= 40 ? '#00FF94' : g.calPct >= 20 ? '#FFB800' : '#FF6B35' }}>
                              {g.calPct}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="mono text-sm text-[#E0E0F0]">{g.compradores}</span>
                            {g.compradores > 0 && (
                              <span className="mono text-[10px]" style={{ color: '#00FF94' }}>{g.convPct}%</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {g.avgKanshiScore > 0 ? (
                            <span className="mono text-sm font-bold"
                              style={{ color: g.avgKanshiScore>=76?'#00FF94':g.avgKanshiScore>=51?'#FF6B35':g.avgKanshiScore>=26?'#FFB800':'#00b0f6' }}>
                              {g.avgKanshiScore}
                            </span>
                          ) : <span className="mono text-[10px] text-[#2E2E4E]">—</span>}
                        </td>
                        <td className="px-4 py-3 mono text-sm" style={{ color: adBudget ? '#E0E0F0' : '#4A4A6A' }}>{cpl(g)}</td>
                        <td className="px-4 py-3 mono text-sm" style={{ color: adBudget && g.compradores > 0 ? '#00FF94' : '#4A4A6A' }}>{cpv(g)}</td>
                        <td className="px-4 py-3">
                          <button
                            onClick={e => { e.stopPropagation(); setSelectedGroup(g) }}
                            className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[#1E1E2E] hover:border-[#00b0f6] transition-colors group">
                            <Eye size={10} className="text-[#4A4A6A] group-hover:text-[#00b0f6]"/>
                            <span className="mono text-[9px] text-[#4A4A6A] group-hover:text-[#00b0f6]">leads</span>
                          </button>
                        </td>
                      </tr>

                      {/* ── Panel expandible ── */}
                      {isExpanded && (
                        <tr key={`funnel-${i}`} className="border-b border-[#1E1E2E]">
                          <td colSpan={10} className="px-6 py-5" style={{ background: '#0D0D14' }}>
                            <div className="space-y-5">

                              {/* Funnel + métricas */}
                              <div className="flex items-start gap-8">
                                <div className="flex-1 space-y-2.5">
                                  <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mb-3">EMBUDO DE CONVERSIÓN</p>
                                  <FunnelBar label="REGISTRADOS"  value={total}         color="#00b0f6"/>
                                  <FunnelBar label="SAM ACTIVOS"  value={samActivos}    color="#0014ad"/>
                                  <FunnelBar label="CALIFICADOS"  value={calificados}   color="#FFB800"/>
                                  <FunnelBar label="SCORE ≥ 70"   value={scoreAlto}     color="#FF6B35"/>
                                  <FunnelBar label="COMPRADORES"  value={g.compradores} color="#00FF94"/>
                                </div>
                                <div className="w-48 space-y-2 flex-shrink-0">
                                  <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mb-3">MÉTRICAS</p>
                                  {[
                                    { label: 'ACTIVACIÓN SAM', value: total>0?`${Math.round((samActivos/total)*100)}%`:'—', color: '#00b0f6' },
                                    { label: 'TASA CALIDAD',   value: total>0?`${Math.round((calificados/total)*100)}%`:'—', color: '#FFB800' },
                                    { label: 'CPL EST.',       value: cpl(g), color: '#E0E0F0' },
                                    { label: 'CPV EST.',       value: cpv(g), color: g.compradores>0?'#00FF94':'#4A4A6A' },
                                    { label: 'SCORE PROM.',    value: g.avgKanshiScore>0?`${g.avgKanshiScore}`:'—',
                                      color: g.avgKanshiScore>=76?'#00FF94':g.avgKanshiScore>=51?'#FF6B35':g.avgKanshiScore>=26?'#FFB800':'#00b0f6' },
                                  ].map(m => (
                                    <div key={m.label} className="flex items-center justify-between py-1.5 border-b border-[#1E1E2E]">
                                      <span className="mono text-[9px] text-[#4A4A6A] tracking-widest">{m.label}</span>
                                      <span className="mono text-[11px] font-bold" style={{ color: m.color }}>{m.value}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* F4c — Distribución quiz de registro */}
                              {(() => {
                                const dist = buildQuizDistribution(g)
                                if (dist.length === 0) return (
                                  <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-[#1E1E2E]" style={{ background: '#111118' }}>
                                    <BookOpen size={11} style={{ color: '#4A4A6A' }}/>
                                    <span className="mono text-[9px] text-[#4A4A6A] tracking-widest">
                                      SIN DATOS DE QUIZ — los gráficos aparecen cuando lleguen respuestas del quiz de registro
                                    </span>
                                  </div>
                                )
                                return (
                                  <div>
                                    <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mb-3">
                                      DISTRIBUCIÓN QUIZ DE REGISTRO — {dist[0]?.total} respuestas
                                    </p>
                                    <div className="grid grid-cols-2 gap-4">
                                      {dist.map((q, qi) => (
                                        <div key={qi} className="rounded-xl border border-[#1E1E2E] p-4" style={{ background: '#111118' }}>
                                          <p className="mono text-[9px] text-[#00b0f6] tracking-widest mb-3 truncate">{q.question}</p>
                                          <div className="space-y-2">
                                            {q.data.map((d, di) => (
                                              <div key={di} className="flex items-center gap-2">
                                                <span className="mono text-[9px] text-[#4A4A6A] w-32 truncate flex-shrink-0">{d.name}</span>
                                                <div className="flex-1 h-1.5 rounded-full" style={{ background: '#1E1E2E' }}>
                                                  <div className="h-full rounded-full transition-all duration-700"
                                                    style={{ width:`${d.pct}%`, background: di===0?'#00b0f6':di===1?'#FFB800':di===2?'#FF6B35':'#4A4A6A' }}/>
                                                </div>
                                                <span className="mono text-[9px] font-bold w-7 text-right"
                                                  style={{ color: di===0?'#00b0f6':di===1?'#FFB800':di===2?'#FF6B35':'#4A4A6A' }}>
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

      {/* Lead panel for selected campaign */}
      {selectedGroup && (
        <CampaignLeadPanel group={selectedGroup} leadMap={leadMap} onClose={() => setSelectedGroup(null)}/>
      )}
    </div>
  )
}

// ─── CAMPAIGN LEAD PANEL ──────────────────────────────────────────────────────

function CampaignLeadPanel({
  group, leadMap, onClose
}: {
  group: CampaignGroup
  leadMap: Record<string, Lead>
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[200] flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg h-full border-l border-[#1E1E2E] overflow-y-auto"
        style={{ background: '#0D0D14', boxShadow: '-24px 0 80px rgba(0,0,0,0.7)', animation: 'slideInRight 0.2s ease' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-[#1E1E2E] sticky top-0 z-10" style={{ background: 'rgba(13,13,20,0.97)' }}>
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">LEADS DE CAMPAÑA</p>
              <p className="font-bold text-[#E0E0F0] text-base mt-0.5 truncate">{group.campaign}</p>
              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                {group.source && (
                  <span className="mono text-[9px] px-2 py-0.5 rounded-full" style={{ color: '#00b0f6', background: '#00b0f620' }}>{group.source}</span>
                )}
                {group.content && (
                  <span className="mono text-[9px] text-[#4A4A6A]">{group.content}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#FF6B35] transition-colors group ml-3 flex-shrink-0">
              <X size={12} className="text-[#4A4A6A] group-hover:text-[#FF6B35]"/>
            </button>
          </div>
          {/* Mini stats */}
          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { label: 'LEADS', value: group.totalLeads, color: '#00b0f6' },
              { label: 'CALIENTES', value: `${group.calientes} (${group.calPct}%)`, color: '#FF6B35' },
              { label: 'COMPRADORES', value: group.compradores, color: '#00FF94' },
            ].map(s => (
              <div key={s.label} className="rounded-lg border border-[#1E1E2E] p-2.5" style={{ background: '#111118' }}>
                <p className="mono text-[8px] text-[#4A4A6A] tracking-widest">{s.label}</p>
                <p className="mono text-sm font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lead list */}
        <div className="divide-y divide-[#1E1E2E]">
          {group.rows.map((row, i) => {
            const lead = row.matched_contact_id ? leadMap[row.matched_contact_id] : null
            const name = row.first_name ? `${row.first_name} ${row.last_name || ''}`.trim() : row.phone_number
            return (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                {/* Avatar */}
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: lead ? `${segColor(lead.segmento)}20` : '#1E1E2E' }}>
                  <User size={12} style={{ color: lead ? segColor(lead.segmento) : '#4A4A6A' }}/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#E0E0F0] truncate">{name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="mono text-[9px] text-[#4A4A6A]">{row.phone_number}</span>
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
                    <span className="mono text-[9px] text-[#2A2A4A]">sin match</span>
                  )}
                {(lead?.engagement_score ?? 0) > 0 && (
                    <span className="mono text-[9px] font-bold" style={{ color: scoreColor(lead!.engagement_score) }}>★{lead!.engagement_score}</span>
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

  const segmentColor = (seg: string) => seg === 'fuego' ? '#FF6B35' : seg === 'caliente' ? '#FFB800' : seg === 'tibio' ? '#00b0f6' : '#4A4A6A'

  if (!activeProjectId) return (
    <div className="flex items-center justify-center h-64">
      <p className="mono text-[11px] text-[#4A4A6A]">Selecciona un proyecto para ver ventas</p>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">MÓDULO DE VENTAS</p>
          <p className="text-lg font-bold text-[#E0E0F0]">{project?.product_name || 'Ventas'}</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl mono text-[11px] font-bold tracking-widest text-white transition-all"
          style={{ background: 'linear-gradient(135deg,#0014ad,#00a7e3)' }}>
          <Plus size={12}/> REGISTRAR VENTA
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-2xl border border-[#1E1E2E] p-5 space-y-4" style={{ background: '#111118' }}>
          <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">NUEVA VENTA MANUAL</p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">TELÉFONO (E.164)</label>
              <input value={formPhone} onChange={e => setFormPhone(e.target.value)}
                placeholder="+593999999999"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none focus:border-[#0014ad] placeholder:text-[#4A4A6A]"/>
            </div>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">MONTO (USD)</label>
              <input value={formAmount} onChange={e => setFormAmount(e.target.value)}
                placeholder="997" type="number"
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none focus:border-[#0014ad] placeholder:text-[#4A4A6A]"/>
            </div>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">PRODUCTO</label>
              <input value={formProduct} onChange={e => setFormProduct(e.target.value)}
                placeholder={project?.product_name || 'Nombre producto'}
                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none focus:border-[#0014ad] placeholder:text-[#4A4A6A]"/>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl border border-[#1E1E2E] mono text-[11px] text-[#4A4A6A] hover:text-[#E0E0F0] transition-all">
              CANCELAR
            </button>
            <button onClick={handleRegisterSale} disabled={!formPhone.trim() || !formAmount.trim() || saving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold text-white disabled:opacity-30 transition-all"
              style={{ background: 'linear-gradient(135deg,#00FF94,#00b0f6)', color: '#0A0A0F' }}>
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
            { label: 'INGRESOS TOTALES', value: `$${metrics.total_revenue.toLocaleString()}`, color: '#00FF94', icon: '💰' },
            { label: 'VENTAS', value: `${metrics.total_sales}${salesGoal > 0 ? ` / ${salesGoal}` : ''}`, color: '#00b0f6', icon: '🎯' },
            { label: 'TICKET PROMEDIO', value: `$${Math.round(metrics.avg_ticket).toLocaleString()}`, color: '#FFB800', icon: '🎫' },
            { label: 'META INGRESOS', value: `${Math.round(revenuePct)}%`, color: revenuePct >= 100 ? '#00FF94' : '#0014ad', icon: '📈' },
          ].map(kpi => (
            <div key={kpi.label} className="rounded-2xl border border-[#1E1E2E] p-4" style={{ background: '#111118' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="mono text-[9px] text-[#4A4A6A] tracking-widest">{kpi.label}</p>
                <span className="text-base">{kpi.icon}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              {kpi.label === 'VENTAS' && salesGoal > 0 && (
                <div className="mt-2 h-1 rounded-full bg-[#1E1E2E]">
                  <div className="h-1 rounded-full transition-all" style={{ width: `${progressPct}%`, background: '#00b0f6' }}/>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tabla */}
      <div className="rounded-2xl border border-[#1E1E2E] overflow-hidden" style={{ background: '#111118' }}>
        <div className="px-5 py-4 border-b border-[#1E1E2E] flex items-center justify-between">
          <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">REGISTRO DE VENTAS</p>
          <button onClick={fetchSales} className="p-1.5 rounded-lg border border-[#1E1E2E] hover:border-[#2E2E4E] transition-colors">
            <RefreshCw size={11} className={`text-[#4A4A6A] ${loading ? 'animate-spin' : ''}`}/>
          </button>
        </div>
        {sales.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-3xl">💰</span>
            <p className="mono text-[11px] text-[#4A4A6A]">Sin ventas registradas aún</p>
            <button onClick={() => setShowForm(true)}
              className="mono text-[10px] text-[#0014ad] hover:text-[#00b0f6] transition-colors">
              + Registrar primera venta
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E1E2E]">
                {['FECHA','CONTACTO','MONTO','FUENTE','CAMPAÑA','KANSHI','CAPI'].map(h => (
                  <th key={h} className="px-4 py-3 text-left mono text-[9px] text-[#4A4A6A] tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map(sale => (
                <tr key={sale.id} className="border-b border-[#1E1E2E] hover:bg-[#0A0A0F] transition-colors">
                  <td className="px-4 py-3 mono text-[10px] text-[#4A4A6A]">
                    {format(new Date(sale.sale_date), 'dd/MM HH:mm')}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-[#E0E0F0]">{sale.wa_contacts?.name || '—'}</p>
                    <p className="mono text-[9px] text-[#4A4A6A]">{sale.phone_number}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-bold" style={{ color: '#00FF94' }}>${sale.amount.toLocaleString()}</p>
                    <p className="mono text-[9px] text-[#4A4A6A]">{sale.currency}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="mono text-[9px] px-2 py-0.5 rounded-full border border-[#1E1E2E] text-[#4A4A6A]">
                      {sale.sale_source}
                    </span>
                  </td>
                  <td className="px-4 py-3 mono text-[10px] text-[#4A4A6A]">
                    {sale.utm_campaign || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {sale.wa_contacts?.kanshi_score ? (
                      <span className="mono text-[10px] font-bold" style={{ color: segmentColor(sale.wa_contacts.kanshi_segment) }}>
                        {sale.wa_contacts.kanshi_score}
                      </span>
                    ) : <span className="text-[#4A4A6A]">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {sale.capi_purchase_sent_at ? (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#00FF94]"/>
                        <span className="mono text-[9px] text-[#00FF94]">ENVIADO</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4A4A6A]"/>
                        <span className="mono text-[9px] text-[#4A4A6A]">PENDIENTE</span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
