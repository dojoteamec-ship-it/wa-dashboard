'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts'
import {
  MessageSquare, Users, Send, CheckCheck, TrendingUp,
  Zap, RefreshCw, Wifi, WifiOff, X, ChevronRight,
  Brain, AlertCircle, Heart, Flame, Snowflake,
  Thermometer, Activity, Star, User
} from 'lucide-react'
import { format } from 'date-fns'

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface KPIData {
  totalMessages: number; inbound: number; outbound: number
  uniqueContacts: number; activeConversations: number
  totalCampaigns: number; totalSent: number; totalDelivered: number
  totalRead: number; deliveryRate: number; readRate: number; replyRate: number
  avgEngagement: number; profilingComplete: number; profilingRate: number
}

interface Lead {
  id: string; phone_number: string; contact_name: string; agent_stage: string
  engagement_score: number; segmento: string; situacion_actual: string
  dolor_declarado: string; dolor_profundo: string; sueno_declarado: string
  nivel_compromiso: string; urgencia_financiera: string; estilo_decision: string
  objecion_probable: string; objecion_financiera: string; resumen_perfil: string
  preguntas_respondidas: number; created_at: string; updated_at: string
}

interface ChartPoint { hour: string; inbound: number; outbound: number }
interface RecentMessage { contact_name: string; body: string; created_at: string; direction: string }
interface Campaign {
  name: string; status: string; sent_count: number; delivered_count: number
  read_count: number; reply_count: number; scheduled_at: string
}

// ─── STAGE CONFIG ────────────────────────────────────────────────────────────

const STAGES = [
  { key: 'nuevo',           label: 'Nuevo',         color: '#4A4A6A' },
  { key: 'perfilando_1',    label: 'Perfilando P1', color: '#00C4FF' },
  { key: 'perfilando_2',    label: 'Perfilando P2', color: '#00C4FF' },
  { key: 'perfilando_3',    label: 'Perfilando P3', color: '#00C4FF' },
  { key: 'perfil_completo', label: 'Perfil Listo',  color: '#FF6B35' },
  { key: 'calentando',      label: 'Calentando',    color: '#FFB800' },
  { key: 'lives',           label: 'En Lives',      color: '#00FF94' },
  { key: 'clases',          label: 'En Clases',     color: '#00FF94' },
  { key: 'VIP',             label: 'VIP',           color: '#C084FC' },
  { key: 'comprador',       label: 'Comprador',     color: '#00FF94' },
]
const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]))

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const segmentColor = (s: string) =>
  s === 'caliente' ? '#FF6B35' : s === 'templado' ? '#FFB800' : '#00C4FF'

const urgencyColor = (u: string) =>
  u === 'alta' ? '#FF6B35' : u === 'media' ? '#FFB800' : '#4A4A6A'

const commitmentColor = (c: string) =>
  c === 'alto' ? '#00FF94' : c === 'medio' ? '#FFB800' : '#4A4A6A'

const scoreColor = (n: number) =>
  n >= 8 ? '#00FF94' : n >= 5 ? '#FFB800' : '#FF6B35'

const segmentIcon = (s: string) => {
  if (s === 'caliente') return <Flame size={10} className="text-[#FF6B35]" />
  if (s === 'templado') return <Thermometer size={10} className="text-[#FFB800]" />
  return <Snowflake size={10} className="text-[#00C4FF]" />
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [leads, setLeads] = useState<Lead[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [activeTab, setActiveTab] = useState<'overview'|'pipeline'|'psico'|'campaigns'>('overview')

  const fetchData = useCallback(async () => {
    try {
      const [messagesRes, conversationsRes, contactsCountRes, campaignsRes, leadsRes] = await Promise.all([
        supabase.from('wa_messages').select('direction,created_at,body,contact_name').order('created_at',{ascending:false}).limit(200),
        supabase.from('wa_conversations').select('status'),
        supabase.from('wa_contacts').select('id',{count:'exact',head:true}),
        supabase.from('wa_campaigns').select('*').order('created_at',{ascending:false}).limit(20),
        supabase.from('wa_contacts').select('*').order('updated_at',{ascending:false}).limit(300),
      ])

      const msgs = messagesRes.data || []
      const convs = conversationsRes.data || []
      const leadsData: Lead[] = leadsRes.data || []
      const campData = campaignsRes.data || []

      setLeads(leadsData)
      setCampaigns(campData as Campaign[])

      const inbound = msgs.filter((m:any) => m.direction === 'inbound').length
      const outbound = msgs.filter((m:any) => m.direction === 'outbound').length
      const totalSent = campData.reduce((s:number,c:any) => s+(c.sent_count||0), 0)
      const totalDelivered = campData.reduce((s:number,c:any) => s+(c.delivered_count||0), 0)
      const totalRead = campData.reduce((s:number,c:any) => s+(c.read_count||0), 0)
      const totalReplied = campData.reduce((s:number,c:any) => s+(c.reply_count||0), 0)

      const scored = leadsData.filter(l => l.engagement_score > 0)
      const avgEngagement = scored.length > 0
        ? Math.round(scored.reduce((s,l) => s+l.engagement_score, 0)/scored.length * 10)/10 : 0
      const profilingComplete = leadsData.filter(l =>
        ['perfil_completo','calentando','lives','clases','VIP','comprador'].includes(l.agent_stage)).length

      setKpi({
        totalMessages: msgs.length, inbound, outbound,
        uniqueContacts: contactsCountRes.count||0,
        activeConversations: convs.filter((c:any) => c.status==='active').length,
        totalCampaigns: campData.length, totalSent, totalDelivered, totalRead,
        deliveryRate: totalSent>0 ? Math.round((totalDelivered/totalSent)*100) : 0,
        readRate: totalDelivered>0 ? Math.round((totalRead/totalDelivered)*100) : 0,
        replyRate: totalSent>0 ? Math.round((totalReplied/totalSent)*100) : 0,
        avgEngagement, profilingComplete,
        profilingRate: leadsData.length>0 ? Math.round((profilingComplete/leadsData.length)*100) : 0,
      })

      const hourlyData: Record<string,{inbound:number;outbound:number}> = {}
      for (let i=23; i>=0; i--) {
        const d = new Date(); d.setHours(d.getHours()-i, 0, 0, 0)
        hourlyData[format(d,'HH:00')] = {inbound:0, outbound:0}
      }
      msgs.forEach((m:any) => {
        const h = format(new Date(m.created_at),'HH:00')
        if (hourlyData[h]) {
          if (m.direction==='inbound') hourlyData[h].inbound++
          else hourlyData[h].outbound++
        }
      })
      setChartData(Object.entries(hourlyData).map(([hour,v]) => ({hour,...v})))
      setRecentMessages((msgs as RecentMessage[]).slice(0,10))
      setLastUpdate(new Date())
      setLoading(false)
    } catch(e) { console.error(e); setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    const ch = supabase.channel('dash-v2')
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_messages'}, fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_contacts'}, fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_campaigns'}, fetchData)
      .subscribe(s => setConnected(s==='SUBSCRIBED'))
    const iv = setInterval(fetchData, 30000)
    return () => { supabase.removeChannel(ch); clearInterval(iv) }
  }, [fetchData])

  const segDist = ['caliente','templado','frio'].map(s => ({
    name: s==='frio'?'Frío':s.charAt(0).toUpperCase()+s.slice(1),
    value: leads.filter(l => l.segmento===s).length,
    color: segmentColor(s)
  })).filter(d => d.value>0)

  const urgDist = ['alta','media','baja'].map(u => ({
    name: u.charAt(0).toUpperCase()+u.slice(1),
    value: leads.filter(l => l.urgencia_financiera===u).length,
    color: urgencyColor(u)
  })).filter(d => d.value>0)

  const commitDist = ['alto','medio','bajo'].map(c => ({
    name: c.charAt(0).toUpperCase()+c.slice(1),
    value: leads.filter(l => l.nivel_compromiso===c).length,
    color: commitmentColor(c)
  })).filter(d => d.value>0)

  const statusColor = (s:string) =>
    s==='completed'?'text-[#00FF94]':s==='running'?'text-[#00C4FF]':s==='scheduled'?'text-[#FF6B35]':'text-[#4A4A6A]'
  const statusLabel = (s:string) =>
    ({completed:'COMPLETADA',running:'EN CURSO',scheduled:'PROGRAMADA',draft:'BORRADOR',paused:'PAUSADA'}[s]||s.toUpperCase())

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0A0A0F'}}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="mono text-[#4A4A6A] text-sm tracking-widest">CARGANDO DATOS</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen" style={{background:'#0A0A0F'}}>

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <header className="border-b border-[#1E1E2E] px-6 py-4 flex items-center justify-between sticky top-0 z-50"
        style={{background:'rgba(10,10,15,0.97)',backdropFilter:'blur(12px)'}}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{background:'linear-gradient(135deg,#00FF94,#00C4FF)'}}>
            <MessageSquare size={16} color="#0A0A0F" strokeWidth={2.5}/>
          </div>
          <div>
            <h1 className="font-semibold text-[#E0E0F0] tracking-tight text-sm">GPA WHATSAPP DASHBOARD</h1>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">SURVIVEX LAUNCH 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <nav className="flex items-center gap-1">
            {([['overview','OVERVIEW'],['pipeline','PIPELINE'],['psico','PSICOGRÁFICO'],['campaigns','CAMPAÑAS']] as const).map(([k,l]) => (
              <button key={k} onClick={()=>setActiveTab(k)}
                className={`mono text-[10px] tracking-widest px-3 py-1.5 rounded-lg transition-all ${
                  activeTab===k ? 'bg-[#00FF94] text-[#0A0A0F] font-bold' : 'text-[#4A4A6A] hover:text-[#E0E0F0]'
                }`}>{l}</button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {connected
              ? <><Wifi size={12} className="text-[#00FF94]"/><span className="mono text-[10px] text-[#00FF94]">LIVE</span><div className="w-1.5 h-1.5 rounded-full bg-[#00FF94] animate-pulse"/></>
              : <><WifiOff size={12} className="text-[#4A4A6A]"/><span className="mono text-[10px] text-[#4A4A6A]">OFFLINE</span></>
            }
            <button onClick={fetchData} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#00FF94] transition-colors group">
              <RefreshCw size={12} className="text-[#4A4A6A] group-hover:text-[#00FF94]"/>
            </button>
            <span className="mono text-[10px] text-[#4A4A6A]">{format(lastUpdate,'HH:mm:ss')}</span>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* ══ OVERVIEW ══════════════════════════════════════════════ */}
        {activeTab==='overview' && (
          <>
            <Section label="MENSAJES">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard icon={<MessageSquare size={14}/>} label="TOTAL" value={kpi?.totalMessages??0} color="#00FF94"/>
                <KPICard icon={<TrendingUp size={14}/>} label="ENTRANTES" value={kpi?.inbound??0} color="#00C4FF"/>
                <KPICard icon={<Send size={14}/>} label="SALIENTES" value={kpi?.outbound??0} color="#FF6B35"/>
                <KPICard icon={<Users size={14}/>} label="CONTACTOS" value={kpi?.uniqueContacts??0} color="#00FF94"/>
              </div>
            </Section>

            <Section label="INTELIGENCIA DE LEADS">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard icon={<Brain size={14}/>} label="PERFILES COMPLETOS" value={kpi?.profilingComplete??0} color="#C084FC"/>
                <KPICard icon={<Activity size={14}/>} label="TASA PERFILADO" value={`${kpi?.profilingRate??0}%`} color="#FFB800" isPercent/>
                <KPICard icon={<Star size={14}/>} label="ENGAGEMENT PROM." value={kpi?.avgEngagement??0} color="#00FF94"/>
                <KPICard icon={<Flame size={14}/>} label="LEADS CALIENTES" value={leads.filter(l=>l.segmento==='caliente').length} color="#FF6B35"/>
              </div>
            </Section>

            <Section label="CAMPAÑAS">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <KPICard icon={<Zap size={14}/>} label="ENVIADOS" value={kpi?.totalSent??0} color="#00FF94"/>
                <KPICard icon={<CheckCheck size={14}/>} label="TASA ENTREGA" value={`${kpi?.deliveryRate??0}%`} color="#00C4FF" isPercent/>
                <KPICard icon={<CheckCheck size={14}/>} label="TASA LECTURA" value={`${kpi?.readRate??0}%`} color="#FF6B35" isPercent/>
                <KPICard icon={<MessageSquare size={14}/>} label="TASA RESPUESTA" value={`${kpi?.replyRate??0}%`} color="#00FF94" isPercent/>
              </div>
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="lg:col-span-2 rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">ACTIVIDAD</p>
                    <p className="text-sm font-medium text-[#E0E0F0] mt-0.5">Mensajes últimas 24h</p>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00FF94]"/><span className="mono text-[10px] text-[#4A4A6A]">ENTRANTE</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00C4FF]"/><span className="mono text-[10px] text-[#4A4A6A]">SALIENTE</span></div>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{top:5,right:0,left:-30,bottom:0}}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00FF94" stopOpacity={0.2}/><stop offset="95%" stopColor="#00FF94" stopOpacity={0}/></linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00C4FF" stopOpacity={0.2}/><stop offset="95%" stopColor="#00C4FF" stopOpacity={0}/></linearGradient>
                    </defs>
                    <XAxis dataKey="hour" tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false} interval={3}/>
                    <YAxis tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{background:'#1E1E2E',border:'none',borderRadius:'8px',fontSize:'11px',fontFamily:'JetBrains Mono',color:'#E0E0F0'}}/>
                    <Area type="monotone" dataKey="inbound" stroke="#00FF94" strokeWidth={1.5} fill="url(#g1)"/>
                    <Area type="monotone" dataKey="outbound" stroke="#00C4FF" strokeWidth={1.5} fill="url(#g2)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
                <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-4">MENSAJES RECIENTES</p>
                <div className="space-y-3">
                  {recentMessages.length===0
                    ? <p className="text-[#4A4A6A] text-xs text-center mt-8">Sin mensajes</p>
                    : recentMessages.map((m,i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${m.direction==='inbound'?'bg-[#00FF94]':'bg-[#00C4FF]'}`}/>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-[#E0E0F0] truncate">{m.contact_name||'Desconocido'}</span>
                            <span className="mono text-[9px] text-[#4A4A6A] flex-shrink-0">{format(new Date(m.created_at),'HH:mm')}</span>
                          </div>
                          <p className="text-[11px] text-[#4A4A6A] truncate mt-0.5">{m.body}</p>
                        </div>
                      </div>
                    ))
                  }
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══ PIPELINE ══════════════════════════════════════════════ */}
        {activeTab==='pipeline' && (
          <Section label={`PIPELINE DE LEADS — ${leads.length} TOTAL`}>
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3 min-w-max">
                {STAGES.map(stage => {
                  const stageLeads = leads.filter(l => l.agent_stage===stage.key)
                  return (
                    <div key={stage.key} className="w-60 flex-shrink-0">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{background:stage.color}}/>
                          <span className="mono text-[10px] tracking-widest" style={{color:stage.color}}>{stage.label.toUpperCase()}</span>
                        </div>
                        <span className="mono text-[10px] text-[#4A4A6A] bg-[#1E1E2E] px-2 py-0.5 rounded-full">{stageLeads.length}</span>
                      </div>
                      <div className="space-y-2 min-h-[100px]">
                        {stageLeads.length===0
                          ? <div className="rounded-xl border border-dashed border-[#1E1E2E] h-16 flex items-center justify-center">
                              <span className="mono text-[9px] text-[#2A2A3A]">VACÍO</span>
                            </div>
                          : stageLeads.map(lead => (
                            <div key={lead.id} onClick={()=>setSelectedLead(lead)}
                              className="rounded-xl border border-[#1E1E2E] p-3 cursor-pointer hover:border-[#2E2E4E] transition-all group"
                              style={{background:'#111118'}}>
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{background:`${stage.color}20`}}>
                                    <User size={9} style={{color:stage.color}}/>
                                  </div>
                                  <span className="text-xs font-medium text-[#E0E0F0] truncate">{lead.contact_name||'Desconocido'}</span>
                                </div>
                                <ChevronRight size={9} className="text-[#4A4A6A] group-hover:text-[#E0E0F0] flex-shrink-0 mt-0.5 transition-colors"/>
                              </div>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1">
                                  {segmentIcon(lead.segmento)}
                                  <span className="mono text-[9px]" style={{color:segmentColor(lead.segmento)}}>{lead.segmento||'n/a'}</span>
                                </div>
                                {lead.engagement_score>0 && (
                                  <span className="mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{color:scoreColor(lead.engagement_score),background:`${scoreColor(lead.engagement_score)}15`}}>
                                    {lead.engagement_score}
                                  </span>
                                )}
                              </div>
                              {lead.situacion_actual && (
                                <p className="mono text-[9px] text-[#4A4A6A] mt-1.5 truncate">{lead.situacion_actual}</p>
                              )}
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </Section>
        )}

        {/* ══ PSICOGRÁFICO ══════════════════════════════════════════ */}
        {activeTab==='psico' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <MiniDist title="SEGMENTO" data={segDist} total={leads.length}/>
              <MiniDist title="URGENCIA FINANCIERA" data={urgDist} total={leads.length}/>
              <MiniDist title="NIVEL COMPROMISO" data={commitDist} total={leads.length}/>
            </div>

            <Section label="ENGAGEMENT SCORE — DISTRIBUCIÓN">
              <div className="rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
                <ResponsiveContainer width="100%" height={150}>
                  <BarChart data={[1,2,3,4,5,6,7,8,9,10].map(n=>({score:n,count:leads.filter(l=>Math.round(l.engagement_score)===n).length}))} margin={{top:5,right:0,left:-30,bottom:0}}>
                    <XAxis dataKey="score" tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'JetBrains Mono'}} axisLine={false} tickLine={false}/>
                    <Tooltip contentStyle={{background:'#1E1E2E',border:'none',borderRadius:'8px',fontSize:'11px',fontFamily:'JetBrains Mono'}}/>
                    <Bar dataKey="count" radius={[4,4,0,0]}>
                      {[1,2,3,4,5,6,7,8,9,10].map((n,i) => <Cell key={i} fill={scoreColor(n)} fillOpacity={0.8}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Section>

            <Section label="LEADS PERFILADOS">
              <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{background:'#111118'}}>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#1E1E2E]">
                        {['CONTACTO','ETAPA','SEGMENTO','SCORE','COMPROMISO','URGENCIA','SITUACIÓN','DOLOR'].map(h => (
                          <th key={h} className="px-4 py-3 text-left mono text-[9px] text-[#4A4A6A] tracking-widest font-normal whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {leads.filter(l=>l.situacion_actual).length===0
                        ? <tr><td colSpan={8} className="px-4 py-8 text-center text-[#4A4A6A] text-xs">Sin leads perfilados aún</td></tr>
                        : leads.filter(l=>l.situacion_actual).map((lead,i) => (
                          <tr key={i} className="border-b border-[#1E1E2E] hover:bg-[#1E1E2E] transition-colors cursor-pointer" onClick={()=>setSelectedLead(lead)}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-[#1E1E2E] flex items-center justify-center">
                                  <User size={10} className="text-[#4A4A6A]"/>
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-[#E0E0F0]">{lead.contact_name||'—'}</p>
                                  <p className="mono text-[9px] text-[#4A4A6A]">{lead.phone_number}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3"><StagePill stage={lead.agent_stage}/></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                {segmentIcon(lead.segmento)}
                                <span className="mono text-[10px]" style={{color:segmentColor(lead.segmento)}}>{lead.segmento||'—'}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{color:scoreColor(lead.engagement_score),background:`${scoreColor(lead.engagement_score)}15`}}>{lead.engagement_score||'—'}</span>
                            </td>
                            <td className="px-4 py-3"><span className="mono text-[10px]" style={{color:commitmentColor(lead.nivel_compromiso)}}>{lead.nivel_compromiso||'—'}</span></td>
                            <td className="px-4 py-3"><span className="mono text-[10px]" style={{color:urgencyColor(lead.urgencia_financiera)}}>{lead.urgencia_financiera||'—'}</span></td>
                            <td className="px-4 py-3 max-w-[180px]"><p className="text-[11px] text-[#E0E0F0] truncate">{lead.situacion_actual||'—'}</p></td>
                            <td className="px-4 py-3 max-w-[200px]"><p className="text-[11px] text-[#4A4A6A] truncate">{lead.dolor_declarado||'—'}</p></td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </Section>
          </>
        )}

        {/* ══ CAMPAIGNS ═════════════════════════════════════════════ */}
        {activeTab==='campaigns' && (
          <Section label="HISTORIAL DE CAMPAÑAS">
            <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{background:'#111118'}}>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#1E1E2E]">
                      {['CAMPAÑA','ESTADO','ENVIADOS','ENTREGADOS','LEÍDOS','RESPUESTAS','FECHA'].map(h => (
                        <th key={h} className="px-5 py-3 text-left mono text-[9px] text-[#4A4A6A] tracking-widest font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {campaigns.length===0
                      ? <tr><td colSpan={7} className="px-5 py-8 text-center text-[#4A4A6A] text-xs">Sin campañas</td></tr>
                      : campaigns.map((c,i) => (
                        <tr key={i} className="border-b border-[#1E1E2E] hover:bg-[#1E1E2E] transition-colors">
                          <td className="px-5 py-3 text-sm text-[#E0E0F0] font-medium">{c.name}</td>
                          <td className="px-5 py-3"><span className={`mono text-[10px] tracking-widest ${statusColor(c.status)}`}>{statusLabel(c.status)}</span></td>
                          <td className="px-5 py-3 mono text-sm text-[#E0E0F0]">{c.sent_count}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="mono text-sm text-[#E0E0F0]">{c.delivered_count}</span>
                              {c.sent_count>0 && <span className="mono text-[9px] text-[#00C4FF]">{Math.round((c.delivered_count/c.sent_count)*100)}%</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="mono text-sm text-[#E0E0F0]">{c.read_count}</span>
                              {c.delivered_count>0 && <span className="mono text-[9px] text-[#FF6B35]">{Math.round((c.read_count/c.delivered_count)*100)}%</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-2">
                              <span className="mono text-sm text-[#E0E0F0]">{c.reply_count}</span>
                              {c.sent_count>0 && <span className="mono text-[9px] text-[#00FF94]">{Math.round((c.reply_count/c.sent_count)*100)}%</span>}
                            </div>
                          </td>
                          <td className="px-5 py-3 mono text-[10px] text-[#4A4A6A]">{c.scheduled_at?format(new Date(c.scheduled_at),'dd/MM HH:mm'):'—'}</td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </Section>
        )}

        <div className="flex items-center justify-between py-2">
          <p className="mono text-[10px] text-[#4A4A6A]">GPA DASHBOARD v2.0 — SUPABASE REALTIME</p>
          <p className="mono text-[10px] text-[#4A4A6A]">GROWTH PARTNERS ACADEMY © 2026</p>
        </div>
      </main>

      {/* ── LEAD DETAIL PANEL ─────────────────────────────────────── */}
      {selectedLead && <LeadPanel lead={selectedLead} onClose={()=>setSelectedLead(null)}/>}
    </div>
  )
}

// ─── HELPER COMPONENTS ───────────────────────────────────────────────────────

function Section({label,children}:{label:string;children:React.ReactNode}) {
  return <div><p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-3">{label}</p>{children}</div>
}

function KPICard({icon,label,value,color,isPercent}:{icon:React.ReactNode;label:string;value:number|string;color:string;isPercent?:boolean}) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] p-4 transition-all hover:border-[#2E2E4E]" style={{background:'#111118'}}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background:`${color}18`,color}}>{icon}</div>
        {isPercent && <div className="w-1.5 h-1.5 rounded-full" style={{background:color}}/>}
      </div>
      <p className="mono text-[28px] font-bold leading-none" style={{color}}>{value}</p>
      <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mt-2">{label}</p>
    </div>
  )
}

function StagePill({stage}:{stage:string}) {
  const s = STAGE_MAP[stage]||{label:stage,color:'#4A4A6A'}
  return (
    <span className="mono text-[9px] tracking-widest px-2 py-0.5 rounded-full border"
      style={{color:s.color,borderColor:`${s.color}40`,background:`${s.color}10`}}>
      {s.label.toUpperCase()}
    </span>
  )
}

function MiniDist({title,data,total}:{title:string;data:{name:string;value:number;color:string}[];total:number}) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
      <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-4">{title}</p>
      {data.length===0
        ? <p className="text-[#4A4A6A] text-xs text-center mt-6">Sin datos</p>
        : <>
            <div className="flex items-center justify-center mb-4">
              <ResponsiveContainer width={120} height={120}>
                <PieChart>
                  <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3}>
                    {data.map((d,i) => <Cell key={i} fill={d.color} fillOpacity={0.85}/>)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {data.map((d,i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{background:d.color}}/>
                    <span className="mono text-[10px] text-[#E0E0F0]">{d.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="mono text-[10px]" style={{color:d.color}}>{d.value}</span>
                    <span className="mono text-[9px] text-[#4A4A6A]">{total>0?`${Math.round((d.value/total)*100)}%`:'0%'}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
      }
    </div>
  )
}

function LeadPanel({lead,onClose}:{lead:Lead;onClose:()=>void}) {
  const stage = STAGE_MAP[lead.agent_stage]||{label:lead.agent_stage,color:'#4A4A6A'}

  return (
    <div className="fixed inset-0 z-[100] flex">
      <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-[460px] border-l border-[#1E1E2E] overflow-y-auto flex-shrink-0" style={{background:'#0D0D14'}}>

        {/* Panel header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b border-[#1E1E2E] flex items-center justify-between"
          style={{background:'rgba(13,13,20,0.97)',backdropFilter:'blur(12px)'}}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${stage.color}20`}}>
              <User size={16} style={{color:stage.color}}/>
            </div>
            <div>
              <p className="font-semibold text-[#E0E0F0] text-sm">{lead.contact_name||'Sin nombre'}</p>
              <p className="mono text-[10px] text-[#4A4A6A]">{lead.phone_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#FF6B35] transition-colors group">
            <X size={12} className="text-[#4A4A6A] group-hover:text-[#FF6B35]"/>
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Status */}
          <div className="flex items-center gap-3 flex-wrap">
            <StagePill stage={lead.agent_stage}/>
            {lead.segmento && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full border"
                style={{borderColor:`${segmentColor(lead.segmento)}40`,background:`${segmentColor(lead.segmento)}10`}}>
                {segmentIcon(lead.segmento)}
                <span className="mono text-[10px]" style={{color:segmentColor(lead.segmento)}}>{lead.segmento}</span>
              </div>
            )}
            {lead.engagement_score>0 && (
              <div className="flex items-center gap-1">
                <Star size={10} style={{color:scoreColor(lead.engagement_score)}}/>
                <span className="mono text-[10px] font-bold" style={{color:scoreColor(lead.engagement_score)}}>{lead.engagement_score}/10</span>
              </div>
            )}
          </div>

          {/* Psycho fields */}
          <div className="space-y-2">
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">PERFIL PSICOGRÁFICO</p>
            <PsycoField label="SITUACIÓN ACTUAL" value={lead.situacion_actual} icon={<User size={11}/>}/>
            <PsycoField label="DOLOR DECLARADO" value={lead.dolor_declarado} icon={<AlertCircle size={11}/>} color="#FF6B35"/>
            <PsycoField label="DOLOR PROFUNDO" value={lead.dolor_profundo} icon={<Heart size={11}/>} color="#C084FC"/>
            <PsycoField label="SUEÑO DECLARADO" value={lead.sueno_declarado} icon={<Star size={11}/>} color="#00FF94"/>
            <PsycoField label="OBJECIÓN PROBABLE" value={lead.objecion_probable} icon={<AlertCircle size={11}/>} color="#FFB800"/>
            <PsycoField label="ESTILO DE DECISIÓN" value={lead.estilo_decision} icon={<Brain size={11}/>} color="#00C4FF"/>
          </div>

          {/* Metrics */}
          <div className="space-y-2">
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">MÉTRICAS</p>
            <div className="grid grid-cols-2 gap-2">
              <MetricPill label="URGENCIA" value={lead.urgencia_financiera} color={urgencyColor(lead.urgencia_financiera)}/>
              <MetricPill label="COMPROMISO" value={lead.nivel_compromiso} color={commitmentColor(lead.nivel_compromiso)}/>
              <MetricPill label="PREGUNTAS" value={lead.preguntas_respondidas?.toString()} color="#4A4A6A"/>
              <MetricPill label="ACTUALIZADO" value={lead.updated_at?format(new Date(lead.updated_at),'dd/MM HH:mm'):'—'} color="#4A4A6A"/>
            </div>
          </div>

          {/* Resumen */}
          {lead.resumen_perfil && (
            <div className="space-y-2">
              <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">RESUMEN</p>
              <div className="rounded-xl border border-[#1E1E2E] p-4" style={{background:'#111118'}}>
                <p className="text-xs text-[#E0E0F0] leading-relaxed">{lead.resumen_perfil}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PsycoField({label,value,icon,color='#E0E0F0'}:{label:string;value:string;icon:React.ReactNode;color?:string}) {
  if (!value) return null
  return (
    <div className="rounded-xl border border-[#1E1E2E] p-3" style={{background:'#111118'}}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <span style={{color}}>{icon}</span>
        <span className="mono text-[9px] tracking-widest" style={{color:`${color}99`}}>{label}</span>
      </div>
      <p className="text-xs text-[#E0E0F0] leading-relaxed">{value}</p>
    </div>
  )
}

function MetricPill({label,value,color}:{label:string;value:string|undefined;color:string}) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] px-3 py-2" style={{background:'#111118'}}>
      <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mb-0.5">{label}</p>
      <p className="mono text-xs font-bold" style={{color}}>{value||'—'}</p>
    </div>
  )
}
