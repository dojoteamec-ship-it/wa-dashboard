'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
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
  Pause, Square, CheckCircle, Info, Target
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

interface KanshiProject {
  id: string
  name: string
  product_name: string | null
  product_price: number
  sales_goal: number
  leads_goal: number
  ad_budget: number
  status: 'planning' | 'active' | 'closed'
  captation_start: string | null
  captation_end: string | null
  cart_open: string | null
  cart_close: string | null
  class_dates: string[]
  color: string
  emoji: string
  created_at: string
}

// ─── STAGE & HELPERS ─────────────────────────────────────────────────────────

const STAGES = [
  { key: 'nuevo',           label: 'Nuevo',         color: '#4A4A6A' },
  { key: 'perfilando_1',    label: 'Perfilando P1', color: '#00b0f6' },
  { key: 'perfilando_2',    label: 'Perfilando P2', color: '#00b0f6' },
  { key: 'perfilando_3',    label: 'Perfilando P3', color: '#00b0f6' },
  { key: 'perfil_completo', label: 'Perfil Listo',  color: '#FF6B35' },
  { key: 'calentando',      label: 'Calentando',    color: '#FFB800' },
  { key: 'lives',           label: 'En Lives',      color: '#00FF94' },
  { key: 'clases',          label: 'En Clases',     color: '#00FF94' },
  { key: 'VIP',             label: 'VIP',           color: '#C084FC' },
  { key: 'comprador',       label: 'Comprador',     color: '#00FF94' },
]
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

const segColor = (s: string) => s==='caliente'?'#FF6B35':s==='templado'?'#FFB800':'#00b0f6'
const urgColor = (u: string) => u==='alta'?'#FF6B35':u==='media'?'#FFB800':'#4A4A6A'
const comColor = (c: string) => c==='alto'?'#00FF94':c==='medio'?'#FFB800':'#4A4A6A'
const scoreColor = (n: number) => n>=8?'#00FF94':n>=5?'#FFB800':'#FF6B35'
const segIcon = (s: string) => s==='caliente'
  ? <Flame size={10} className="text-[#FF6B35]"/>
  : s==='templado' ? <Thermometer size={10} className="text-[#FFB800]"/>
  : <Snowflake size={10} style={{color:'#00b0f6'}}/>

const statusColor = (s: string) =>
  s==='completed'?'text-[#00FF94]':s==='running'?'text-[#00b0f6]':s==='scheduled'?'text-[#FFB800]':s==='paused'?'text-[#FFB800]':'text-[#4A4A6A]'
const statusLabel = (s: string) =>
  ({completed:'COMPLETADA',running:'EN CURSO',scheduled:'PROGRAMADA',draft:'BORRADOR',paused:'PAUSADA',cancelled:'CANCELADA'}[s]||s.toUpperCase())

// ─── KANSHI ISOTIPO SVG ───────────────────────────────────────────────────────

function KanshiLogo({ size = 32, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 138.99 139"
      width={size}
      height={size}
      className={className}
    >
      <defs>
        <linearGradient id="kanshi-grad" y1="69.5" x2="138.99" y2="69.5" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0014ac"/>
          <stop offset="1" stopColor="#0099d3"/>
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
      localStorage.setItem(AUTH_KEY, 'true')
      onAuth()
    } else {
      setError(true)
      setShaking(true)
      setTimeout(() => setShaking(false), 600)
      setTimeout(() => setError(false), 2500)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#090c4c' }}>
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #00b0f6 0%, transparent 70%)' }}/>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #0014ad 0%, transparent 70%)' }}/>
        <div className="absolute top-0 right-0 w-[300px] h-[300px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #00b0f6 0%, transparent 70%)' }}/>
      </div>
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#00b0f6 1px, transparent 1px), linear-gradient(90deg, #00b0f6 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}/>
      <div
        className={`relative z-10 w-full max-w-sm mx-4 rounded-2xl border p-8 transition-all ${shaking ? 'animate-bounce' : ''}`}
        style={{
          background: 'rgba(9,12,76,0.8)',
          backdropFilter: 'blur(24px)',
          borderColor: error ? '#FF6B35' : 'rgba(0,176,246,0.3)',
          boxShadow: error
            ? '0 0 40px rgba(255,107,53,0.2), inset 0 0 40px rgba(255,107,53,0.05)'
            : '0 0 60px rgba(0,176,246,0.15), inset 0 0 40px rgba(0,20,173,0.3)',
        }}
      >
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 p-4 rounded-2xl" style={{ background: 'rgba(0,176,246,0.1)', border: '1px solid rgba(0,176,246,0.2)' }}>
            <KanshiLogo size={56} />
          </div>
          <h1 className="text-2xl font-bold tracking-[0.2em] text-white mb-1" style={{ fontFamily: 'monospace' }}>KANSHI</h1>
          <p className="mono text-[10px] tracking-widest" style={{ color: '#00b0f6' }}>MONITORING SYSTEM · GPC</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mono text-[10px] tracking-widest block mb-2" style={{ color: '#00b0f6' }}>ACCESO</label>
            <div className="relative">
              <Lock size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: '#4A4A6A' }}/>
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Contraseña del equipo"
                autoFocus
                className="w-full rounded-xl px-4 py-3 pl-10 pr-10 text-sm text-white outline-none placeholder:text-[#4A4A6A]"
                style={{
                  background: 'rgba(0,0,0,0.4)',
                  border: `1px solid ${error ? '#FF6B35' : 'rgba(0,176,246,0.3)'}`,
                  transition: 'border-color 0.3s',
                }}
              />
              <button type="button" onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2"
                style={{ color: showPwd ? '#00b0f6' : '#4A4A6A' }}>
                {showPwd ? <Eye size={13}/> : <EyeOff size={13}/>}
              </button>
            </div>
            {error && <p className="mono text-[10px] text-[#FF6B35] mt-2 tracking-widest">✕ ACCESO DENEGADO</p>}
          </div>
          <button type="submit" disabled={!password}
            className="w-full rounded-xl py-3 font-bold mono text-[12px] tracking-widest text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #0014ad, #00b0f6)', boxShadow: '0 4px 20px rgba(0,176,246,0.3)' }}>
            INGRESAR AL SISTEMA
          </button>
        </form>
        <p className="mono text-[9px] text-center mt-6 tracking-widest" style={{ color: '#2E3E6E' }}>
          SANTIAGO JIMÉNEZ · GROWTH PARTNER · 2026
        </p>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────

export default function Dashboard() {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null)
  const [kpi, setKpi] = useState<KPI|null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [recentMsgs, setRecentMsgs] = useState<RecentMsg[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead|null>(null)
  const [showCreator, setShowCreator] = useState(false)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())
  const [activeTab, setActiveTab] = useState<'overview'|'pipeline'|'psico'|'campaigns'>('overview')

  // ─── PROJECT STATE ──────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<KanshiProject[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('kanshi_active_project')
    return null
  })
  const [projectLeadsCount, setProjectLeadsCount] = useState<number>(0)

  const activeProject = useMemo(
    () => projects.find(p => p.id === activeProjectId) ?? null,
    [projects, activeProjectId]
  )

  const handleSelectProject = useCallback((id: string | null) => {
    setActiveProjectId(id)
    if (id) localStorage.setItem('kanshi_active_project', id)
    else localStorage.removeItem('kanshi_active_project')
  }, [])

  // ─── TOAST SYSTEM ──────────────────────────────────────────────────────────
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = `${Date.now()}-${Math.random()}`
    setToasts(p => [...p, { id, type, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(p => p.filter(t => t.id !== id))
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_KEY)
    setAuthenticated(stored === 'true')
  }, [])

  const fetchData = useCallback(async () => {
    try {
      const [msgsRes, convsRes, contactsCountRes, campsRes, leadsRes, tplsRes, projectsRes] = await Promise.all([
        supabase.from('wa_messages').select('direction,created_at,body,contact_name').order('created_at',{ascending:false}).limit(200),
        supabase.from('wa_conversations').select('status'),
        supabase.from('wa_contacts').select('id',{count:'exact',head:true}),
        supabase.from('wa_campaigns').select('*').order('created_at',{ascending:false}).limit(20),
        supabase.from('wa_contacts').select('*').order('updated_at',{ascending:false}).limit(300),
        supabase.from('wa_templates').select('*').eq('status','APPROVED').order('name'),
        supabase.from('kanshi_projects').select('*').order('created_at',{ascending:false}),
      ])
      const msgs = msgsRes.data||[]
      const leadsData: Lead[] = leadsRes.data||[]
      const campData: Campaign[] = campsRes.data||[]
      const tplData: Template[] = tplsRes.data||[]
      const projectsData: KanshiProject[] = (projectsRes.data||[]) as KanshiProject[]

      setProjects(projectsData)
      setLeads(leadsData); setCampaigns(campData); setTemplates(tplData)
      setRecentMsgs((msgs as RecentMsg[]).slice(0,10))

      const inbound = msgs.filter((m:any)=>m.direction==='inbound').length
      const outbound = msgs.filter((m:any)=>m.direction==='outbound').length
      const totalSent = campData.reduce((s,c)=>s+(c.sent_count||0),0)
      const totalDelivered = campData.reduce((s,c)=>s+(c.delivered_count||0),0)
      const totalRead = campData.reduce((s,c)=>s+(c.read_count||0),0)
      const totalReplied = campData.reduce((s,c)=>s+(c.reply_count||0),0)
      const scored = leadsData.filter(l=>l.engagement_score>0)
      const avgEngagement = scored.length>0?Math.round(scored.reduce((s,l)=>s+l.engagement_score,0)/scored.length*10)/10:0
      const profilingComplete = leadsData.filter(l=>['perfil_completo','calentando','lives','clases','VIP','comprador'].includes(l.agent_stage)).length

      setKpi({
        totalMessages:msgs.length, inbound, outbound,
        uniqueContacts:contactsCountRes.count||0,
        totalSent, totalDelivered, totalRead,
        deliveryRate: totalSent>0?Math.round((totalDelivered/totalSent)*100):0,
        readRate: totalDelivered>0?Math.round((totalRead/totalDelivered)*100):0,
        replyRate: totalSent>0?Math.round((totalReplied/totalSent)*100):0,
        avgEngagement, profilingComplete,
        profilingRate: leadsData.length>0?Math.round((profilingComplete/leadsData.length)*100):0,
      })

      const hourly: Record<string,{inbound:number;outbound:number}> = {}
      for(let i=23;i>=0;i--){const d=new Date();d.setHours(d.getHours()-i,0,0,0);hourly[format(d,'HH:00')]={inbound:0,outbound:0}}
      msgs.forEach((m:any)=>{const h=format(new Date(m.created_at),'HH:00');if(hourly[h]){if(m.direction==='inbound')hourly[h].inbound++;else hourly[h].outbound++}})
      setChartData(Object.entries(hourly).map(([hour,v])=>({hour,...v})))

      // Conteo leads del proyecto activo (usa activeProjectId via closure)
      const pid = localStorage.getItem('kanshi_active_project')
      if (pid) {
        const { count } = await supabase
          .from('wa_contacts')
          .select('id', { count: 'exact', head: true })
          .eq('project_id', pid)
        setProjectLeadsCount(count ?? 0)
      } else {
        setProjectLeadsCount(contactsCountRes.count ?? 0)
      }

      setLastUpdate(new Date()); setLoading(false)
    } catch(e){console.error(e);setLoading(false)}
  }, [])

  // Re-fetch leads count cuando cambia el proyecto activo
  useEffect(() => {
    if (!activeProjectId) return
    supabase
      .from('wa_contacts')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', activeProjectId)
      .then(({ count }) => setProjectLeadsCount(count ?? 0))
  }, [activeProjectId])

  // ─── CAMPAIGN ACTIONS ──────────────────────────────────────────────────────
  const handleCampaignAction = useCallback(async (camp: Campaign, action: 'paused' | 'cancelled') => {
    const { error } = await supabase
      .from('wa_campaigns')
      .update({ status: action })
      .eq('id', camp.id)
    if (error) {
      addToast('error', `Error: ${error.message}`)
    } else {
      const label = action === 'paused' ? 'pausada' : 'cancelada'
      addToast(action === 'paused' ? 'warning' : 'error', `"${camp.name}" ${label}`)
      setCampaigns(prev => prev.map(c => c.id === camp.id ? { ...c, status: action } : c))
    }
  }, [addToast])

  useEffect(()=>{
    if(!authenticated) return
    fetchData()
    const ch = supabase.channel('dash-v2')
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_messages'},fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_contacts'},fetchData)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'wa_campaigns'},(payload) => {
        setCampaigns(prev => prev.map(c =>
          c.id === (payload.new as Campaign).id ? { ...c, ...(payload.new as Campaign) } : c
        ))
      })
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'wa_campaigns'},fetchData)
      .subscribe(s=>setConnected(s==='SUBSCRIBED'))
    const iv = setInterval(fetchData,30000)
    return ()=>{supabase.removeChannel(ch);clearInterval(iv)}
  },[fetchData, authenticated])

  const segDist = ['caliente','templado','frio'].map(s=>({name:s==='frio'?'Frío':s.charAt(0).toUpperCase()+s.slice(1),value:leads.filter(l=>l.segmento===s).length,color:segColor(s)})).filter(d=>d.value>0)
  const urgDist = ['alta','media','baja'].map(u=>({name:u.charAt(0).toUpperCase()+u.slice(1),value:leads.filter(l=>l.urgencia_financiera===u).length,color:urgColor(u)})).filter(d=>d.value>0)
  const comDist  = ['alto','medio','bajo'].map(c=>({name:c.charAt(0).toUpperCase()+c.slice(1),value:leads.filter(l=>l.nivel_compromiso===c).length,color:comColor(c)})).filter(d=>d.value>0)

  if (authenticated === null) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#090c4c'}}>
      <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{borderColor:'#00b0f6',borderTopColor:'transparent'}}/>
    </div>
  )
  if (!authenticated) return <LoginScreen onAuth={() => setAuthenticated(true)} />
  if(loading) return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0A0A0F'}}>
      <div className="text-center">
        <div className="mx-auto mb-5 flex justify-center"><KanshiLogo size={40}/></div>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{borderColor:'#00b0f6',borderTopColor:'transparent'}}/>
        <p className="mono text-[#4A4A6A] text-sm tracking-widest">CARGANDO DATOS</p>
      </div>
    </div>
  )

  return(
    <div className="min-h-screen" style={{background:'#0A0A0F'}}>
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* HEADER */}
      <header className="border-b border-[#1E1E2E] px-6 py-4 flex items-center justify-between sticky top-0 z-50"
        style={{background:'rgba(10,10,15,0.97)',backdropFilter:'blur(12px)'}}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center p-1.5"
            style={{background:'linear-gradient(135deg,#0014ad,#00a7e3)'}}>
            <KanshiLogo size={24}/>
          </div>
          <div>
            <h1 className="font-bold text-white tracking-[0.18em] text-sm" style={{fontFamily:'monospace'}}>KANSHI</h1>
            <p className="mono text-[9px] tracking-widest" style={{color:'#00b0f6'}}>MONITORING SYSTEM · GPC</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          {/* Selector de proyecto */}
          {projects.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={activeProjectId ?? ''}
                onChange={e => handleSelectProject(e.target.value || null)}
                className="mono text-[10px] tracking-widest px-3 py-1.5 rounded-lg border border-[#1E1E2E] outline-none transition-colors"
                style={{ background: '#111118', color: activeProject ? (activeProject.color || '#00b0f6') : '#4A4A6A' }}
              >
                <option value="">— SIN PROYECTO —</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.emoji || '🚀'} {p.name}</option>
                ))}
              </select>
            </div>
          )}
          <nav className="flex items-center gap-1">
            {(['overview','pipeline','psico','campaigns'] as const).map(k=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                className={`mono text-[10px] tracking-widest px-3 py-1.5 rounded-lg transition-all ${activeTab===k?'font-bold text-white':'text-[#4A4A6A] hover:text-[#E0E0F0]'}`}
                style={activeTab===k?{background:'linear-gradient(135deg,#0014ad,#00a7e3)'}:{}}>
                {k==='overview'?'OVERVIEW':k==='pipeline'?'PIPELINE':k==='psico'?'PSICOGRÁFICO':'CAMPAÑAS'}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {connected
              ?<><Wifi size={12} style={{color:'#00b0f6'}}/><span className="mono text-[10px]" style={{color:'#00b0f6'}}>LIVE</span><div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:'#00b0f6'}}/></>
              :<><WifiOff size={12} className="text-[#4A4A6A]"/><span className="mono text-[10px] text-[#4A4A6A]">OFFLINE</span></>
            }
            <button onClick={fetchData} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#00b0f6] transition-colors group">
              <RefreshCw size={12} className="text-[#4A4A6A] group-hover:text-[#00b0f6]"/>
            </button>
            <span className="mono text-[10px] text-[#4A4A6A]">{format(lastUpdate,'HH:mm:ss')}</span>
            <button onClick={()=>{localStorage.removeItem(AUTH_KEY);setAuthenticated(false)}}
              className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#FF6B35] transition-colors group" title="Cerrar sesión">
              <Lock size={12} className="text-[#4A4A6A] group-hover:text-[#FF6B35]"/>
            </button>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* ══ OVERVIEW ══ */}
        {activeTab==='overview' && <>

          {/* MÉTRICAS VS METAS — solo si hay proyecto activo con metas */}
          {activeProject && (activeProject.leads_goal > 0 || activeProject.sales_goal > 0) && (
            <ProjectMetrics project={activeProject} leadsCount={projectLeadsCount} />
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
                    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00FF94" stopOpacity={0.2}/><stop offset="95%" stopColor="#00FF94" stopOpacity={0}/></linearGradient>
                    <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00b0f6" stopOpacity={0.2}/><stop offset="95%" stopColor="#00b0f6" stopOpacity={0}/></linearGradient>
                  </defs>
                  <XAxis dataKey="hour" tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false} interval={3}/>
                  <YAxis tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'#1E1E2E',border:'none',borderRadius:'8px',fontSize:'11px',color:'#E0E0F0'}}/>
                  <Area type="monotone" dataKey="inbound" stroke="#00FF94" strokeWidth={1.5} fill="url(#g1)"/>
                  <Area type="monotone" dataKey="outbound" stroke="#00b0f6" strokeWidth={1.5} fill="url(#g2)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
              <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-4">MENSAJES RECIENTES</p>
              <div className="space-y-3">
                {recentMsgs.length===0?<p className="text-[#4A4A6A] text-xs text-center mt-8">Sin mensajes</p>
                  :recentMsgs.map((m,i)=>(
                  <div key={i} className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{background:m.direction==='inbound'?'#00FF94':'#00b0f6'}}/>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#E0E0F0] truncate">{m.contact_name||'Desconocido'}</span>
                        <span className="mono text-[9px] text-[#4A4A6A] flex-shrink-0">{format(new Date(m.created_at),'HH:mm')}</span>
                      </div>
                      <p className="text-[11px] text-[#4A4A6A] truncate mt-0.5">{m.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>}

        {/* ══ PIPELINE ══ */}
        {activeTab==='pipeline' && (
          <Sec label={`PIPELINE DE LEADS — ${leads.length} TOTAL`}>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3 min-w-max">
                {STAGES.map(stage=>{
                  const sl = leads.filter(l=>l.agent_stage===stage.key)
                  return(
                    <div key={stage.key} className="w-60 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{background:stage.color}}/>
                          <span className="mono text-[10px] tracking-widest" style={{color:stage.color}}>{stage.label.toUpperCase()}</span>
                        </div>
                        <span className="mono text-[10px] text-[#4A4A6A] bg-[#1E1E2E] px-2 py-0.5 rounded-full">{sl.length}</span>
                      </div>
                      <div className="space-y-2 min-h-[100px]">
                        {sl.length===0
                          ?<div className="rounded-xl border border-dashed border-[#1E1E2E] h-16 flex items-center justify-center"><span className="mono text-[9px] text-[#2A2A3A]">VACÍO</span></div>
                          :sl.map(lead=>(
                          <div key={lead.id} onClick={()=>setSelectedLead(lead)}
                            className="rounded-xl border border-[#1E1E2E] p-3 cursor-pointer hover:border-[#2E2E4E] transition-all group" style={{background:'#111118'}}>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{background:`${stage.color}20`}}><User size={9} style={{color:stage.color}}/></div>
                                <span className="text-xs font-medium text-[#E0E0F0] truncate">{lead.name||'Desconocido'}</span>
                              </div>
                              <ChevronRight size={9} className="text-[#4A4A6A] group-hover:text-[#E0E0F0] flex-shrink-0 mt-0.5 transition-colors"/>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1">{segIcon(lead.segmento)}<span className="mono text-[9px]" style={{color:segColor(lead.segmento)}}>{lead.segmento||'n/a'}</span></div>
                              {lead.engagement_score>0&&<span className="mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{color:scoreColor(lead.engagement_score),background:`${scoreColor(lead.engagement_score)}15`}}>{lead.engagement_score}</span>}
                            </div>
                            {lead.situacion_actual&&<p className="mono text-[9px] text-[#4A4A6A] mt-1.5 truncate">{lead.situacion_actual}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Sec>
        )}

        {/* ══ PSICOGRÁFICO ══ */}
        {activeTab==='psico' && <>
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
          <Sec label="LEADS PERFILADOS">
            <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{background:'#111118'}}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-[#1E1E2E]">
                    {['CONTACTO','ETAPA','SEGMENTO','SCORE','COMPROMISO','URGENCIA','SITUACIÓN','DOLOR'].map(h=>(
                      <th key={h} className="px-4 py-3 text-left mono text-[9px] text-[#4A4A6A] tracking-widest font-normal whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {leads.filter(l=>l.situacion_actual).length===0
                      ?<tr><td colSpan={8} className="px-4 py-8 text-center text-[#4A4A6A] text-xs">Sin leads perfilados aún</td></tr>
                      :leads.filter(l=>l.situacion_actual).map((lead,i)=>(
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
            </div>
          </Sec>
        </>}

        {/* ══ CAMPAÑAS ══ */}
        {activeTab==='campaigns' && <>
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
                    :campaigns.map((c,i)=>(
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
                        {(c.status === 'scheduled' || c.status === 'running') && (
                          <div className="flex items-center gap-1">
                            {c.status === 'running' && (
                              <button
                                onClick={() => handleCampaignAction(c, 'paused')}
                                title="Pausar campaña"
                                className="p-1.5 rounded-lg border border-[#1E1E2E] hover:border-[#FFB800] transition-colors group">
                                <Pause size={10} className="text-[#4A4A6A] group-hover:text-[#FFB800]"/>
                              </button>
                            )}
                            <button
                              onClick={() => handleCampaignAction(c, 'cancelled')}
                              title="Cancelar campaña"
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
          </div>
        </>}

        {/* Footer */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <KanshiLogo size={14}/>
            <p className="mono text-[10px] text-[#4A4A6A]">KANSHI v2.0 — SUPABASE REALTIME</p>
          </div>
          <p className="mono text-[10px] text-[#4A4A6A]">SANTIAGO JIMÉNEZ · GROWTH PARTNER © 2026</p>
        </div>
      </main>

      {selectedLead&&<LeadPanel lead={selectedLead} onClose={()=>setSelectedLead(null)}/>}
      {showCreator&&<CampaignCreator
        leads={leads}
        templates={templates}
        onClose={()=>setShowCreator(false)}
        onCreated={()=>{
          setShowCreator(false)
          fetchData()
          setActiveTab('campaigns')
          addToast('success','Campaña creada — el scheduler la procesará en ~5 min')
        }}
      />}

      <ToastContainer toasts={toasts} onRemove={removeToast}/>
    </div>
  )
}

// ─── PROJECT METRICS ──────────────────────────────────────────────────────────

function MetricBar({ label, current, goal, color, prefix = '', suffix = '' }: {
  label: string; current: number; goal: number; color: string; prefix?: string; suffix?: string
}) {
  const pct = goal > 0 ? Math.min(Math.round((current / goal) * 100), 100) : 0
  const over = goal > 0 && current >= goal
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="mono text-[10px] tracking-widest text-[#4A4A6A]">{label}</span>
        <div className="flex items-center gap-2">
          <span className="mono text-[11px] font-bold" style={{ color: over ? '#00FF94' : color }}>
            {prefix}{current.toLocaleString()}{suffix}
          </span>
          <span className="mono text-[10px] text-[#4A4A6A]">/ {prefix}{goal.toLocaleString()}{suffix}</span>
          <span className="mono text-[10px] px-1.5 py-0.5 rounded-full"
            style={{ background: `${over ? '#00FF94' : color}18`, color: over ? '#00FF94' : color }}>
            {pct}%
          </span>
        </div>
      </div>
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1E1E2E' }}>
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: over ? '#00FF94' : `linear-gradient(90deg, ${color}80, ${color})` }} />
      </div>
    </div>
  )
}

function ProjectMetrics({ project, leadsCount }: { project: KanshiProject; leadsCount: number }) {
  const projectColor = project.color || '#00b0f6'
  const revenueGoal = project.sales_goal * project.product_price
  const currentSales = 0 // placeholder hasta tabla de ventas
  const currentRevenue = currentSales * project.product_price
  const cpl = leadsCount > 0 && project.ad_budget > 0
    ? (project.ad_budget / leadsCount).toFixed(2)
    : null

  let diasRestantes: number | null = null
  let diasLabel = ''
  if (project.captation_end) {
    const today = new Date(); today.setHours(0,0,0,0)
    const end = new Date(project.captation_end); end.setHours(0,0,0,0)
    const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000)
    diasRestantes = diff
    diasLabel = diff > 0 ? `${diff}D RESTANTES` : diff === 0 ? 'ÚLTIMO DÍA' : `${Math.abs(diff)}D VENCIDO`
  }

  const diasColor = diasRestantes === null ? projectColor
    : diasRestantes <= 0 ? '#FF6B35'
    : diasRestantes <= 3 ? '#FFB800'
    : projectColor

  return (
    <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{ background: '#111118' }}>
      {/* Accent bar top */}
      <div className="h-0.5" style={{ background: `linear-gradient(90deg, ${projectColor}, ${projectColor}30)` }}/>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{ background: `${projectColor}15`, border: `1px solid ${projectColor}30` }}>
              {project.emoji || '🚀'}
            </div>
            <div>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-0.5">MÉTRICAS VS METAS</p>
              <p className="text-sm font-semibold text-[#E0E0F0]">{project.product_name || project.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {diasRestantes !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
                style={{ borderColor: `${diasColor}50`, background: `${diasColor}10` }}>
                <Clock size={10} style={{ color: diasColor }}/>
                <span className="mono text-[10px] font-bold" style={{ color: diasColor }}>
                  CAPTACIÓN · {diasLabel}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#1E1E2E]">
              <Target size={10} style={{ color: projectColor }}/>
              <span className="mono text-[10px] text-[#4A4A6A]">
                META: <span style={{ color: projectColor }}>{project.sales_goal} ventas</span>
              </span>
            </div>
          </div>
        </div>

        {/* Barras de progreso */}
        <div className="space-y-4 mb-5">
          {project.leads_goal > 0 && (
            <MetricBar
              label="LEADS CAPTADOS"
              current={leadsCount}
              goal={project.leads_goal}
              color={projectColor}
            />
          )}
          {project.sales_goal > 0 && (
            <MetricBar
              label="VENTAS"
              current={currentSales}
              goal={project.sales_goal}
              color="#00FF94"
            />
          )}
          {project.sales_goal > 0 && project.product_price > 0 && (
            <MetricBar
              label="REVENUE"
              current={currentRevenue}
              goal={revenueGoal}
              color="#C084FC"
              prefix="$"
            />
          )}
        </div>

        {/* KPIs rápidos */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {project.leads_goal > 0 && (
            <div className="rounded-xl border border-[#1E1E2E] px-4 py-3" style={{ background: '#0A0A0F' }}>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-1.5">LEADS / META</p>
              <p className="mono text-xl font-bold leading-none" style={{ color: projectColor }}>
                {leadsCount}
                <span className="text-[#4A4A6A] text-xs font-normal ml-1">/ {project.leads_goal}</span>
              </p>
            </div>
          )}
          {project.sales_goal > 0 && project.product_price > 0 && (
            <div className="rounded-xl border border-[#1E1E2E] px-4 py-3" style={{ background: '#0A0A0F' }}>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-1.5">REVENUE PROYECTADO</p>
              <p className="mono text-xl font-bold leading-none text-[#C084FC]">
                ${revenueGoal.toLocaleString()}
              </p>
            </div>
          )}
          {cpl !== null && (
            <div className="rounded-xl border border-[#1E1E2E] px-4 py-3" style={{ background: '#0A0A0F' }}>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-1.5">CPL ESTIMADO</p>
              <p className="mono text-xl font-bold leading-none text-[#FFB800]">${cpl}</p>
            </div>
          )}
          {project.ad_budget > 0 && (
            <div className="rounded-xl border border-[#1E1E2E] px-4 py-3" style={{ background: '#0A0A0F' }}>
              <p className="mono text-[9px] tracking-widest text-[#4A4A6A] mb-1.5">PRESUPUESTO ADS</p>
              <p className="mono text-xl font-bold leading-none text-[#FF6B35]">
                ${project.ad_budget.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── CAMPAIGN CREATOR ────────────────────────────────────────────────────────

interface CreatorProps { leads: Lead[]; templates: Template[]; onClose: ()=>void; onCreated: ()=>void }

function CampaignCreator({ leads, templates, onClose, onCreated }: CreatorProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [campaignName, setCampaignName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template|null>(null)
  const [templateVars, setTemplateVars] = useState<{index:number;type:'field'|'fixed';value:string;fallback:string}[]>([])

  const detectVars = (tpl: Template) => {
    const matches = (tpl.body_text||'').match(/\{\{\d+\}\}/g) || []
    const count = new Set(matches).size
    setTemplateVars(Array.from({length:count},(_,i)=>({index:i+1,type:'field' as const,value:'name',fallback:'Amigo'})))
  }

  const FIELD_OPTIONS = [
    {value:'name',label:'Nombre del contacto'},
    {value:'contact_number',label:'Número de teléfono'},
  ]

  const [filterSegmento, setFilterSegmento] = useState<string[]>([])
  const [filterStage, setFilterStage] = useState<string[]>([])
  const [filterUrgencia, setFilterUrgencia] = useState<string[]>([])
  const [filterCompromiso, setFilterCompromiso] = useState<string[]>([])
  const [minScore, setMinScore] = useState(0)
  const [sendNow, setSendNow] = useState(true)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  const filteredLeads = useMemo(()=>{
    return leads.filter(l=>{
      if(filterSegmento.length>0 && !filterSegmento.includes(l.segmento)) return false
      if(filterStage.length>0 && !filterStage.includes(l.agent_stage)) return false
      if(filterUrgencia.length>0 && !filterUrgencia.includes(l.urgencia_financiera)) return false
      if(filterCompromiso.length>0 && !filterCompromiso.includes(l.nivel_compromiso)) return false
      if(minScore>0 && l.engagement_score<minScore) return false
      return true
    })
  }, [leads, filterSegmento, filterStage, filterUrgencia, filterCompromiso, minScore])

  const toggleFilter = (arr: string[], setArr: (v:string[])=>void, val: string) =>
    setArr(arr.includes(val) ? arr.filter(v=>v!==val) : [...arr, val])

  const handleCreate = async () => {
    if(!campaignName.trim()||!selectedTemplate||filteredLeads.length===0) return
    setSaving(true); setError('')
    try {
      const scheduled_at = sendNow
        ? new Date().toISOString()
        : new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()
      const { data: camp, error: campErr } = await supabase.from('wa_campaigns').insert({
        name: campaignName.trim(), status: 'scheduled', scheduled_at,
        template_name: selectedTemplate.name, language_code: selectedTemplate.language,
        template_params: templateVars.map(v=>({type:v.type,value:v.value,fallback:v.fallback})),
        total_contacts: filteredLeads.length,
        sent_count: 0, delivered_count: 0, read_count: 0, reply_count: 0,
      }).select().single()
      if(campErr) throw campErr
      const contacts = filteredLeads.map(l=>({campaign_id:camp.id,contact_number:l.phone_number,contact_name:l.name||'',status:'pending'}))
      const { error: contErr } = await supabase.from('wa_campaign_contacts').insert(contacts)
      if(contErr) throw contErr
      onCreated()
    } catch(e: any) {
      setError(e?.message||'Error al crear la campaña')
    } finally { setSaving(false) }
  }

  const canNext1 = campaignName.trim().length>0 && selectedTemplate!==null
  const canNext2 = filteredLeads.length>0
  const canConfirm = canNext1 && canNext2 && (sendNow || (scheduledDate&&scheduledTime))

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

          {/* STEP 1 */}
          {step===1 && <>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">NOMBRE DE LA CAMPAÑA</label>
              <input value={campaignName} onChange={e=>setCampaignName(e.target.value)}
                placeholder="ej. Live 1 — Leads Calientes"
                className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none transition-colors placeholder:text-[#4A4A6A]"/>
            </div>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">SELECCIONAR TEMPLATE</label>
              {templates.length===0
                ?<div className="rounded-xl border border-dashed border-[#1E1E2E] p-6 text-center">
                    <p className="text-[#4A4A6A] text-xs">No hay templates aprobados</p>
                  </div>
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
            {selectedTemplate && templateVars.length>0 && (
              <div>
                <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">VARIABLES DEL TEMPLATE — {templateVars.length} detectada{templateVars.length>1?'s':''}</label>
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
                                placeholder="Texto fijo..."
                                className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-2 py-1 text-xs text-[#E0E0F0] outline-none placeholder:text-[#4A4A6A]"/>
                          }
                        </div>
                      </div>
                      {v.type==='field'&&(
                        <div>
                          <p className="mono text-[9px] text-[#4A4A6A] mb-1">FALLBACK (si el campo está vacío)</p>
                          <input value={v.fallback} onChange={e=>{const nv=[...templateVars];nv[i]={...nv[i],fallback:e.target.value};setTemplateVars(nv)}}
                            placeholder="ej. Amigo"
                            className="w-full bg-[#0A0A0F] border border-[#1E1E2E] rounded-lg px-2 py-1 text-xs text-[#E0E0F0] outline-none placeholder:text-[#4A4A6A]"/>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {selectedTemplate && templateVars.length===0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#1E1E2E]" style={{background:'#111118'}}>
                <div className="w-1.5 h-1.5 rounded-full" style={{background:'#00b0f6'}}/>
                <span className="mono text-[10px] text-[#4A4A6A]">Template sin variables — se envía directo sin parámetros</span>
              </div>
            )}
          </>}

          {/* STEP 2 */}
          {step===2 && <>
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

          {/* STEP 3 */}
          {step===3 && <>
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

function SummaryRow({label,value,highlight}:{label:string;value:string;highlight?:boolean}) {
  return(
    <div className="flex items-center justify-between">
      <span className="mono text-[10px] text-[#4A4A6A]">{label}</span>
      <span className="mono text-[11px]" style={{color:highlight?'#00b0f6':'#E0E0F0',fontWeight:highlight?'bold':'normal'}}>{value}</span>
    </div>
  )
}

interface FGProps { label:string; options:string[]; selected:string[]; onToggle:(v:string)=>void; colors?:Record<string,string>; labels?:Record<string,string> }
function FilterGroup({label,options,selected,onToggle,colors={},labels={}}:FGProps) {
  return(
    <div>
      <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map(o=>{
          const active = selected.includes(o)
          const color = colors[o]||'#4A4A6A'
          const lbl = labels[o]||o.charAt(0).toUpperCase()+o.slice(1)
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

// ─── SHARED COMPONENTS ───────────────────────────────────────────────────────

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
            <PieChart><Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>{data.map((d,i)=><Cell key={i} fill={d.color} fillOpacity={0.85}/>)}</Pie></PieChart>
          </ResponsiveContainer>
        </div>
        <div className="space-y-2">{data.map((d,i)=>(
          <div key={i} className="flex items-center justify-between">
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{background:d.color}}/><span className="mono text-[10px] text-[#E0E0F0]">{d.name}</span></div>
            <div className="flex items-center gap-2"><span className="mono text-[10px]" style={{color:d.color}}>{d.value}</span><span className="mono text-[9px] text-[#4A4A6A]">{total>0?`${Math.round((d.value/total)*100)}%`:'0%'}</span></div>
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

// ─── TOAST SYSTEM ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  const icons: Record<Toast['type'], React.ReactNode> = {
    success: <CheckCircle size={13} style={{color:'#00FF94'}}/>,
    error:   <AlertCircle size={13} style={{color:'#FF6B35'}}/>,
    warning: <AlertCircle size={13} style={{color:'#FFB800'}}/>,
    info:    <Info size={13} style={{color:'#00b0f6'}}/>,
  }
  const borders: Record<Toast['type'], string> = {
    success: '#00FF94', error: '#FF6B35', warning: '#FFB800', info: '#00b0f6',
  }
  if (toasts.length === 0) return null
  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div key={t.id}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border pointer-events-auto"
          style={{
            background: '#111118',
            borderColor: `${borders[t.type]}40`,
            boxShadow: `0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px ${borders[t.type]}20`,
            minWidth: '260px', maxWidth: '380px',
            animation: 'slideInRight 0.25s ease',
          }}>
          {icons[t.type]}
          <span className="text-xs text-[#E0E0F0] flex-1 leading-snug">{t.message}</span>
          <button onClick={() => onRemove(t.id)} className="text-[#4A4A6A] hover:text-[#E0E0F0] transition-colors flex-shrink-0 ml-1">
            <X size={11}/>
          </button>
        </div>
      ))}
    </div>
  )
}
