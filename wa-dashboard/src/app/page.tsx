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
  Plus, ChevronLeft, Calendar, Clock, Filter, Eye, Rocket
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

// ─── STAGE & HELPERS ─────────────────────────────────────────────────────────

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

const segColor = (s: string) => s==='caliente'?'#FF6B35':s==='templado'?'#FFB800':'#00C4FF'
const urgColor = (u: string) => u==='alta'?'#FF6B35':u==='media'?'#FFB800':'#4A4A6A'
const comColor = (c: string) => c==='alto'?'#00FF94':c==='medio'?'#FFB800':'#4A4A6A'
const scoreColor = (n: number) => n>=8?'#00FF94':n>=5?'#FFB800':'#FF6B35'
const segIcon = (s: string) => s==='caliente'
  ? <Flame size={10} className="text-[#FF6B35]"/>
  : s==='templado' ? <Thermometer size={10} className="text-[#FFB800]"/>
  : <Snowflake size={10} className="text-[#00C4FF]"/>

const statusColor = (s: string) =>
  s==='completed'?'text-[#00FF94]':s==='running'?'text-[#00C4FF]':s==='scheduled'?'text-[#FFB800]':'text-[#4A4A6A]'
const statusLabel = (s: string) =>
  ({completed:'COMPLETADA',running:'EN CURSO',scheduled:'PROGRAMADA',draft:'BORRADOR',paused:'PAUSADA'}[s]||s.toUpperCase())

// ─── MAIN ────────────────────────────────────────────────────────────────────

export default function Dashboard() {
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

  const fetchData = useCallback(async () => {
    try {
      const [msgsRes, convsRes, contactsCountRes, campsRes, leadsRes, tplsRes] = await Promise.all([
        supabase.from('wa_messages').select('direction,created_at,body,contact_name').order('created_at',{ascending:false}).limit(200),
        supabase.from('wa_conversations').select('status'),
        supabase.from('wa_contacts').select('id',{count:'exact',head:true}),
        supabase.from('wa_campaigns').select('*').order('created_at',{ascending:false}).limit(20),
        supabase.from('wa_contacts').select('*').order('updated_at',{ascending:false}).limit(300),
        supabase.from('wa_templates').select('*').eq('status','APPROVED').order('name'),
      ])
      const msgs = msgsRes.data||[]
      const leadsData: Lead[] = leadsRes.data||[]
      const campData: Campaign[] = campsRes.data||[]
      const tplData: Template[] = tplsRes.data||[]

      setLeads(leadsData)
      setCampaigns(campData)
      setTemplates(tplData)
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
      setLastUpdate(new Date())
      setLoading(false)
    } catch(e){console.error(e);setLoading(false)}
  }, [])

  useEffect(()=>{
    fetchData()
    const ch = supabase.channel('dash-v2')
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_messages'},fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_contacts'},fetchData)
      .on('postgres_changes',{event:'*',schema:'public',table:'wa_campaigns'},fetchData)
      .subscribe(s=>setConnected(s==='SUBSCRIBED'))
    const iv = setInterval(fetchData,30000)
    return ()=>{supabase.removeChannel(ch);clearInterval(iv)}
  },[fetchData])

  const segDist = ['caliente','templado','frio'].map(s=>({name:s==='frio'?'Frío':s.charAt(0).toUpperCase()+s.slice(1),value:leads.filter(l=>l.segmento===s).length,color:segColor(s)})).filter(d=>d.value>0)
  const urgDist = ['alta','media','baja'].map(u=>({name:u.charAt(0).toUpperCase()+u.slice(1),value:leads.filter(l=>l.urgencia_financiera===u).length,color:urgColor(u)})).filter(d=>d.value>0)
  const comDist  = ['alto','medio','bajo'].map(c=>({name:c.charAt(0).toUpperCase()+c.slice(1),value:leads.filter(l=>l.nivel_compromiso===c).length,color:comColor(c)})).filter(d=>d.value>0)

  if(loading) return(
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0A0A0F'}}>
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
        <p className="mono text-[#4A4A6A] text-sm tracking-widest">CARGANDO DATOS</p>
      </div>
    </div>
  )

  return(
    <div className="min-h-screen" style={{background:'#0A0A0F'}}>
      {/* HEADER */}
      <header className="border-b border-[#1E1E2E] px-6 py-4 flex items-center justify-between sticky top-0 z-50"
        style={{background:'rgba(10,10,15,0.97)',backdropFilter:'blur(12px)'}}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{background:'linear-gradient(135deg,#00FF94,#00C4FF)'}}>
            <MessageSquare size={16} color="#0A0A0F" strokeWidth={2.5}/>
          </div>
          <div>
            <h1 className="font-semibold text-[#E0E0F0] tracking-tight text-sm">GPA WHATSAPP DASHBOARD</h1>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">SURVIVEX LAUNCH 2026</p>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <nav className="flex items-center gap-1">
            {(['overview','pipeline','psico','campaigns'] as const).map(k=>(
              <button key={k} onClick={()=>setActiveTab(k)}
                className={`mono text-[10px] tracking-widest px-3 py-1.5 rounded-lg transition-all ${activeTab===k?'bg-[#00FF94] text-[#0A0A0F] font-bold':'text-[#4A4A6A] hover:text-[#E0E0F0]'}`}>
                {k==='overview'?'OVERVIEW':k==='pipeline'?'PIPELINE':k==='psico'?'PSICOGRÁFICO':'CAMPAÑAS'}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {connected?<><Wifi size={12} className="text-[#00FF94]"/><span className="mono text-[10px] text-[#00FF94]">LIVE</span><div className="w-1.5 h-1.5 rounded-full bg-[#00FF94] animate-pulse"/></>:<><WifiOff size={12} className="text-[#4A4A6A]"/><span className="mono text-[10px] text-[#4A4A6A]">OFFLINE</span></>}
            <button onClick={fetchData} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#00FF94] transition-colors group"><RefreshCw size={12} className="text-[#4A4A6A] group-hover:text-[#00FF94]"/></button>
            <span className="mono text-[10px] text-[#4A4A6A]">{format(lastUpdate,'HH:mm:ss')}</span>
          </div>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">

        {/* ══ OVERVIEW ══ */}
        {activeTab==='overview' && <>
          <Sec label="MENSAJES"><div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KCard icon={<MessageSquare size={14}/>} label="TOTAL" value={kpi?.totalMessages??0} color="#00FF94"/>
            <KCard icon={<TrendingUp size={14}/>} label="ENTRANTES" value={kpi?.inbound??0} color="#00C4FF"/>
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
            <KCard icon={<CheckCheck size={14}/>} label="TASA ENTREGA" value={`${kpi?.deliveryRate??0}%`} color="#00C4FF" isPercent/>
            <KCard icon={<CheckCheck size={14}/>} label="TASA LECTURA" value={`${kpi?.readRate??0}%`} color="#FF6B35" isPercent/>
            <KCard icon={<MessageSquare size={14}/>} label="TASA RESPUESTA" value={`${kpi?.replyRate??0}%`} color="#00FF94" isPercent/>
          </div></Sec>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <div className="lg:col-span-2 rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
              <div className="flex items-center justify-between mb-5">
                <div><p className="mono text-[10px] text-[#4A4A6A] tracking-widest">ACTIVIDAD</p><p className="text-sm font-medium text-[#E0E0F0] mt-0.5">Mensajes últimas 24h</p></div>
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
                  <XAxis dataKey="hour" tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false} interval={3}/>
                  <YAxis tick={{fill:'#4A4A6A',fontSize:9,fontFamily:'monospace'}} axisLine={false} tickLine={false}/>
                  <Tooltip contentStyle={{background:'#1E1E2E',border:'none',borderRadius:'8px',fontSize:'11px',color:'#E0E0F0'}}/>
                  <Area type="monotone" dataKey="inbound" stroke="#00FF94" strokeWidth={1.5} fill="url(#g1)"/>
                  <Area type="monotone" dataKey="outbound" stroke="#00C4FF" strokeWidth={1.5} fill="url(#g2)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="rounded-xl border border-[#1E1E2E] p-5" style={{background:'#111118'}}>
              <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-4">MENSAJES RECIENTES</p>
              <div className="space-y-3">
                {recentMsgs.length===0?<p className="text-[#4A4A6A] text-xs text-center mt-8">Sin mensajes</p>
                  :recentMsgs.map((m,i)=>(
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-[#0A0A0F] font-bold mono text-[11px] tracking-widest transition-all hover:scale-105"
              style={{background:'linear-gradient(135deg,#00FF94,#00C4FF)'}}>
              <Plus size={13}/> NUEVA CAMPAÑA
            </button>
          </div>
          <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{background:'#111118'}}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr className="border-b border-[#1E1E2E]">
                  {['CAMPAÑA','TEMPLATE','ESTADO','CONTACTOS','ENVIADOS','ENTREGADOS','LEÍDOS','RESPUESTAS','FECHA'].map(h=>(
                    <th key={h} className="px-4 py-3 text-left mono text-[9px] text-[#4A4A6A] tracking-widest font-normal whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {campaigns.length===0
                    ?<tr><td colSpan={9} className="px-5 py-8 text-center text-[#4A4A6A] text-xs">Sin campañas — crea una nueva</td></tr>
                    :campaigns.map((c,i)=>(
                    <tr key={i} className="border-b border-[#1E1E2E] hover:bg-[#1E1E2E] transition-colors">
                      <td className="px-4 py-3 text-sm text-[#E0E0F0] font-medium">{c.name}</td>
                      <td className="px-4 py-3"><span className="mono text-[10px] text-[#4A4A6A]">{c.template_name||'—'}</span></td>
                      <td className="px-4 py-3"><span className={`mono text-[10px] tracking-widest ${statusColor(c.status)}`}>{statusLabel(c.status)}</span></td>
                      <td className="px-4 py-3 mono text-sm text-[#E0E0F0]">{c.total_contacts||'—'}</td>
                      <td className="px-4 py-3 mono text-sm text-[#E0E0F0]">{c.sent_count}</td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="mono text-sm text-[#E0E0F0]">{c.delivered_count}</span>{c.sent_count>0&&<span className="mono text-[9px] text-[#00C4FF]">{Math.round((c.delivered_count/c.sent_count)*100)}%</span>}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="mono text-sm text-[#E0E0F0]">{c.read_count}</span>{c.delivered_count>0&&<span className="mono text-[9px] text-[#FF6B35]">{Math.round((c.read_count/c.delivered_count)*100)}%</span>}</div></td>
                      <td className="px-4 py-3"><div className="flex items-center gap-1.5"><span className="mono text-sm text-[#E0E0F0]">{c.reply_count}</span>{c.sent_count>0&&<span className="mono text-[9px] text-[#00FF94]">{Math.round((c.reply_count/c.sent_count)*100)}%</span>}</div></td>
                      <td className="px-4 py-3 mono text-[10px] text-[#4A4A6A]">{c.scheduled_at?format(new Date(c.scheduled_at),'dd/MM HH:mm'):'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>}

        <div className="flex items-center justify-between py-2">
          <p className="mono text-[10px] text-[#4A4A6A]">GPA DASHBOARD v2.0 — SUPABASE REALTIME</p>
          <p className="mono text-[10px] text-[#4A4A6A]">GROWTH PARTNERS ACADEMY © 2026</p>
        </div>
      </main>

      {selectedLead&&<LeadPanel lead={selectedLead} onClose={()=>setSelectedLead(null)}/>}
      {showCreator&&<CampaignCreator leads={leads} templates={templates} onClose={()=>setShowCreator(false)} onCreated={()=>{setShowCreator(false);fetchData();setActiveTab('campaigns')}}/>}
    </div>
  )
}

// ─── CAMPAIGN CREATOR ────────────────────────────────────────────────────────

interface CreatorProps { leads: Lead[]; templates: Template[]; onClose: ()=>void; onCreated: ()=>void }

function CampaignCreator({ leads, templates, onClose, onCreated }: CreatorProps) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [campaignName, setCampaignName] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<Template|null>(null)

  // Step 2 — filters
  const [filterSegmento, setFilterSegmento] = useState<string[]>([])
  const [filterStage, setFilterStage] = useState<string[]>([])
  const [filterUrgencia, setFilterUrgencia] = useState<string[]>([])
  const [filterCompromiso, setFilterCompromiso] = useState<string[]>([])
  const [minScore, setMinScore] = useState(0)

  // Step 3
  const [sendNow, setSendNow] = useState(true)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')

  // Filtered leads
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

  const toggleFilter = (arr: string[], setArr: (v:string[])=>void, val: string) => {
    setArr(arr.includes(val) ? arr.filter(v=>v!==val) : [...arr, val])
  }

  const handleCreate = async () => {
    if(!campaignName.trim()||!selectedTemplate||filteredLeads.length===0) return
    setSaving(true)
    setError('')
    try {
      const scheduled_at = sendNow
        ? new Date().toISOString()
        : new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString()

      // Insert campaign
      const { data: camp, error: campErr } = await supabase.from('wa_campaigns').insert({
        name: campaignName.trim(),
        status: 'scheduled',
        scheduled_at,
        template_name: selectedTemplate.name,
        language_code: selectedTemplate.language,
        total_contacts: filteredLeads.length,
        sent_count: 0,
        delivered_count: 0,
        read_count: 0,
        reply_count: 0,
      }).select().single()

      if(campErr) throw campErr

      // Insert contacts
      const contacts = filteredLeads.map(l=>({
        campaign_id: camp.id,
        contact_number: l.phone_number,
        contact_name: l.name||'',
        status: 'pending',
      }))
      const { error: contErr } = await supabase.from('wa_campaign_contacts').insert(contacts)
      if(contErr) throw contErr

      onCreated()
    } catch(e: any) {
      setError(e?.message||'Error al crear la campaña')
    } finally {
      setSaving(false)
    }
  }

  const canNext1 = campaignName.trim().length>0 && selectedTemplate!==null
  const canNext2 = filteredLeads.length>0
  const canConfirm = canNext1 && canNext2 && (sendNow || (scheduledDate&&scheduledTime))

  return(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative w-full max-w-2xl rounded-2xl border border-[#1E1E2E] overflow-hidden" style={{background:'#0D0D14',maxHeight:'90vh',overflowY:'auto'}}>

        {/* Modal header */}
        <div className="px-6 py-5 border-b border-[#1E1E2E] flex items-center justify-between sticky top-0 z-10" style={{background:'rgba(13,13,20,0.98)'}}>
          <div>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">NUEVA CAMPAÑA — PASO {step} DE 3</p>
            <p className="font-semibold text-[#E0E0F0] text-sm mt-0.5">
              {step===1?'Template y nombre':step===2?'Segmentación de audiencia':'Programación y confirmación'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#FF6B35] transition-colors group"><X size={12} className="text-[#4A4A6A] group-hover:text-[#FF6B35]"/></button>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-[#1E1E2E]"><div className="h-full bg-[#00FF94] transition-all duration-500" style={{width:`${(step/3)*100}%`}}/></div>

        <div className="p-6 space-y-5">

          {/* ── STEP 1: Template + Name ── */}
          {step===1 && <>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">NOMBRE DE LA CAMPAÑA</label>
              <input value={campaignName} onChange={e=>setCampaignName(e.target.value)}
                placeholder="ej. Live 1 — Leads Calientes"
                className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none focus:border-[#00FF94] transition-colors placeholder:text-[#4A4A6A]"/>
            </div>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">SELECCIONAR TEMPLATE</label>
              {templates.length===0
                ? <div className="rounded-xl border border-dashed border-[#1E1E2E] p-6 text-center">
                    <p className="text-[#4A4A6A] text-xs">No hay templates aprobados en wa_templates</p>
                    <p className="mono text-[9px] text-[#2A2A3A] mt-1">Agrega templates manualmente en Supabase</p>
                  </div>
                : <div className="space-y-2">
                    {templates.map(t=>(
                      <div key={t.id} onClick={()=>setSelectedTemplate(t)}
                        className={`rounded-xl border p-4 cursor-pointer transition-all ${selectedTemplate?.id===t.id?'border-[#00FF94] bg-[#00FF9408]':'border-[#1E1E2E] hover:border-[#2E2E4E]'}`}
                        style={{background: selectedTemplate?.id===t.id?'#0D1F17':'#111118'}}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${selectedTemplate?.id===t.id?'bg-[#00FF94]':'bg-[#2A2A3A]'}`}/>
                            <span className="font-medium text-sm text-[#E0E0F0]">{t.display_name||t.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="mono text-[9px] px-2 py-0.5 rounded-full border border-[#1E1E2E] text-[#4A4A6A]">{t.language}</span>
                            <span className="mono text-[9px] px-2 py-0.5 rounded-full border border-[#00FF9440] text-[#00FF94]">{t.category||'MARKETING'}</span>
                          </div>
                        </div>
                        <p className="mono text-[9px] text-[#4A4A6A]">{t.name}</p>
                        {t.body_text&&<p className="text-[11px] text-[#6A6A8A] mt-2 leading-relaxed line-clamp-2">{t.body_text}</p>}
                      </div>
                    ))}
                  </div>
              }
            </div>
          </>}

          {/* ── STEP 2: Filters ── */}
          {step===2 && <>
            <div className="flex items-center justify-between p-3 rounded-xl border border-[#00FF9440] bg-[#00FF9408]">
              <div className="flex items-center gap-2"><Filter size={12} className="text-[#00FF94]"/><span className="mono text-[10px] text-[#00FF94] tracking-widest">AUDIENCIA SELECCIONADA</span></div>
              <span className="mono text-lg font-bold text-[#00FF94]">{filteredLeads.length} leads</span>
            </div>

            <FilterGroup label="SEGMENTO" options={['caliente','templado','frio']} selected={filterSegmento}
              onToggle={v=>toggleFilter(filterSegmento,setFilterSegmento,v)}
              colors={{'caliente':'#FF6B35','templado':'#FFB800','frio':'#00C4FF'}}/>

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
                className="w-full accent-[#00FF94] h-1 bg-[#1E1E2E] rounded-full outline-none"/>
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

          {/* ── STEP 3: Schedule + Confirm ── */}
          {step===3 && <>
            <div>
              <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-3">CUÁNDO ENVIAR</label>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={()=>setSendNow(true)}
                  className={`rounded-xl border p-4 text-left transition-all ${sendNow?'border-[#00FF94] bg-[#00FF9408]':'border-[#1E1E2E] hover:border-[#2E2E4E]'}`}>
                  <div className="flex items-center gap-2 mb-1"><Rocket size={12} style={{color:sendNow?'#00FF94':'#4A4A6A'}}/><span className="mono text-[10px] tracking-widest" style={{color:sendNow?'#00FF94':'#4A4A6A'}}>AHORA MISMO</span></div>
                  <p className="text-xs text-[#6A6A8A]">El scheduler lo enviará en el próximo ciclo de 5 min</p>
                </button>
                <button onClick={()=>setSendNow(false)}
                  className={`rounded-xl border p-4 text-left transition-all ${!sendNow?'border-[#00FF94] bg-[#00FF9408]':'border-[#1E1E2E] hover:border-[#2E2E4E]'}`}>
                  <div className="flex items-center gap-2 mb-1"><Calendar size={12} style={{color:!sendNow?'#00FF94':'#4A4A6A'}}/><span className="mono text-[10px] tracking-widest" style={{color:!sendNow?'#00FF94':'#4A4A6A'}}>PROGRAMAR</span></div>
                  <p className="text-xs text-[#6A6A8A]">Elige fecha y hora específica</p>
                </button>
              </div>
            </div>

            {!sendNow&&(
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">FECHA</label>
                  <input type="date" value={scheduledDate} onChange={e=>setScheduledDate(e.target.value)}
                    className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none focus:border-[#00FF94] transition-colors"/>
                </div>
                <div>
                  <label className="mono text-[10px] text-[#4A4A6A] tracking-widest block mb-2">HORA</label>
                  <input type="time" value={scheduledTime} onChange={e=>setScheduledTime(e.target.value)}
                    className="w-full bg-[#111118] border border-[#1E1E2E] rounded-xl px-4 py-3 text-sm text-[#E0E0F0] outline-none focus:border-[#00FF94] transition-colors"/>
                </div>
              </div>
            )}

            {/* Summary */}
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

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-[#1E1E2E] flex items-center justify-between sticky bottom-0" style={{background:'rgba(13,13,20,0.98)'}}>
          <button onClick={()=>step>1?setStep(step-1):onClose()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-[#1E1E2E] mono text-[11px] text-[#4A4A6A] hover:text-[#E0E0F0] hover:border-[#2E2E4E] transition-all">
            <ChevronLeft size={12}/> {step===1?'CANCELAR':'ANTERIOR'}
          </button>
          {step<3
            ? <button onClick={()=>setStep(step+1)} disabled={step===1?!canNext1:!canNext2}
                className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{background:'linear-gradient(135deg,#00FF94,#00C4FF)',color:'#0A0A0F'}}>
                SIGUIENTE <ChevronRight size={12}/>
              </button>
            : <button onClick={handleCreate} disabled={!canConfirm||saving}
                className="flex items-center gap-2 px-5 py-2 rounded-xl mono text-[11px] font-bold tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{background:'linear-gradient(135deg,#00FF94,#00C4FF)',color:'#0A0A0F'}}>
                {saving?<><div className="w-3 h-3 border-2 border-[#0A0A0F] border-t-transparent rounded-full animate-spin"/> CREANDO...</>:<><Rocket size={12}/> CREAR CAMPAÑA</>}
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
      <span className={`mono text-[11px] ${highlight?'text-[#00FF94] font-bold':'text-[#E0E0F0]'}`}>{value}</span>
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
              style={{
                borderColor: active?color:`${color}40`,
                background: active?`${color}20`:'transparent',
                color: active?color:'#4A4A6A',
              }}>{lbl}</button>
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
            <PField label="ESTILO DE DECISIÓN" value={lead.estilo_decision} icon={<Brain size={11}/>} color="#00C4FF"/>
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
