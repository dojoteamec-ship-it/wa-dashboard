'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts'
import {
  MessageSquare, Users, Send, CheckCheck, TrendingUp,
  DollarSign, Zap, Clock, RefreshCw, Wifi, WifiOff
} from 'lucide-react'
import { format, subDays, startOfDay } from 'date-fns'

interface KPIData {
  totalMessages: number
  inbound: number
  outbound: number
  uniqueContacts: number
  activeConversations: number
  totalCampaigns: number
  totalSent: number
  totalDelivered: number
  totalRead: number
  deliveryRate: number
  readRate: number
  replyRate: number
}

interface MessageRow {
  direction: string
  created_at: string
}

interface ConversationRow {
  status: string
}

interface CampaignRow {
  sent_count: number
  delivered_count: number
  read_count: number
  reply_count: number
}

interface ChartPoint {
  hour: string
  inbound: number
  outbound: number
}

interface RecentMessage {
  contact_name: string
  body: string
  created_at: string
  direction: string
}

interface Campaign {
  name: string
  status: string
  sent_count: number
  delivered_count: number
  read_count: number
  reply_count: number
  total_contacts: number
  scheduled_at: string
}

export default function Dashboard() {
  const [kpi, setKpi] = useState<KPIData | null>(null)
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [recentMessages, setRecentMessages] = useState<RecentMessage[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [connected, setConnected] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    try {
      const [messagesRes, conversationsRes, contactsRes, campaignsRes] = await Promise.all([
        supabase.from('wa_messages').select('direction, created_at, body, contact_name').order('created_at', { ascending: false }).limit(200),
        supabase.from('wa_conversations').select('status'),
        supabase.from('wa_contacts').select('id', { count: 'exact', head: true }),
        supabase.from('wa_campaigns').select('*').order('created_at', { ascending: false }).limit(10),
      ])

      const messages: MessageRow[] = messagesRes.data || []
      const conversations: ConversationRow[] = conversationsRes.data || []
      const uniqueContacts = contactsRes.count || 0
      const campaignData: CampaignRow[] = campaignsRes.data || []

      const inbound = messages.filter(m => m.direction === 'inbound').length
      const outbound = messages.filter(m => m.direction === 'outbound').length
      const activeConversations = conversations.filter(c => c.status === 'active').length

      const totalSent = campaignData.reduce((s, c) => s + (c.sent_count || 0), 0)
      const totalDelivered = campaignData.reduce((s, c) => s + (c.delivered_count || 0), 0)
      const totalRead = campaignData.reduce((s, c) => s + (c.read_count || 0), 0)
      const totalReplied = campaignData.reduce((s, c) => s + (c.reply_count || 0), 0)

      setKpi({
        totalMessages: messages.length,
        inbound,
        outbound,
        uniqueContacts,
        activeConversations,
        totalCampaigns: campaignsRes.data?.length || 0,
        totalSent,
        totalDelivered,
        totalRead,
        deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
        readRate: totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0,
        replyRate: totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0,
      })

      // Chart: last 24h by hour
      const hourlyData: Record<string, { inbound: number; outbound: number }> = {}
      for (let i = 23; i >= 0; i--) {
        const d = new Date()
        d.setHours(d.getHours() - i, 0, 0, 0)
        hourlyData[format(d, 'HH:00')] = { inbound: 0, outbound: 0 }
      }
      messages.forEach((m) => {
        const h = format(new Date(m.created_at), 'HH:00')
        if (hourlyData[h]) {
          if (m.direction === 'inbound') hourlyData[h].inbound++
          else hourlyData[h].outbound++
        }
      })
      setChartData(Object.entries(hourlyData).map(([hour, v]) => ({ hour, ...v })))

      // Recent messages
      const recent = (messagesRes.data || []).slice(0, 8) as RecentMessage[]
      setRecentMessages(recent)

      setCampaigns((campaignsRes.data || []) as Campaign[])
      setLastUpdate(new Date())
      setLoading(false)
    } catch (e) {
      console.error(e)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()

    // Realtime subscription
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_messages' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'wa_campaigns' }, () => fetchData())
      .subscribe((status) => {
        setConnected(status === 'SUBSCRIBED')
      })

    const interval = setInterval(fetchData, 30000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(interval)
    }
  }, [fetchData])

  const statusColor = (status: string) => {
    if (status === 'completed') return 'text-[#00FF94]'
    if (status === 'running') return 'text-[#00C4FF]'
    if (status === 'scheduled') return 'text-[#FF6B35]'
    return 'text-[#4A4A6A]'
  }

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      completed: 'COMPLETADA',
      running: 'EN CURSO',
      scheduled: 'PROGRAMADA',
      draft: 'BORRADOR',
      paused: 'PAUSADA',
    }
    return map[status] || status.toUpperCase()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0A0F' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="mono text-[#4A4A6A] text-sm tracking-widest">CARGANDO DATOS</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: '#0A0A0F' }}>
      {/* Header */}
      <header className="border-b border-[#1E1E2E] px-6 py-4 flex items-center justify-between sticky top-0 z-50" style={{ background: 'rgba(10,10,15,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00FF94, #00C4FF)' }}>
            <MessageSquare size={16} color="#0A0A0F" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-semibold text-[#E0E0F0] tracking-tight text-sm">GPA WHATSAPP DASHBOARD</h1>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">GROWTH PARTNERS ACADEMY</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {connected ? (
              <><Wifi size={12} className="text-[#00FF94]" /><span className="mono text-[10px] text-[#00FF94] tracking-widest">LIVE</span><div className="w-1.5 h-1.5 rounded-full bg-[#00FF94] pulse-dot" /></>
            ) : (
              <><WifiOff size={12} className="text-[#4A4A6A]" /><span className="mono text-[10px] text-[#4A4A6A] tracking-widest">OFFLINE</span></>
            )}
          </div>
          <button onClick={fetchData} className="p-2 rounded-lg border border-[#1E1E2E] hover:border-[#00FF94] transition-colors group">
            <RefreshCw size={12} className="text-[#4A4A6A] group-hover:text-[#00FF94] transition-colors" />
          </button>
          <span className="mono text-[10px] text-[#4A4A6A]">{format(lastUpdate, 'HH:mm:ss')}</span>
        </div>
      </header>

      <main className="p-6 max-w-[1600px] mx-auto space-y-6">
        {/* KPI Row 1 — Mensajes */}
        <div>
          <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-3">MENSAJES</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard icon={<MessageSquare size={14} />} label="TOTAL MENSAJES" value={kpi?.totalMessages ?? 0} color="#00FF94" />
            <KPICard icon={<TrendingUp size={14} />} label="ENTRANTES" value={kpi?.inbound ?? 0} color="#00C4FF" />
            <KPICard icon={<Send size={14} />} label="SALIENTES" value={kpi?.outbound ?? 0} color="#FF6B35" />
            <KPICard icon={<Users size={14} />} label="CONTACTOS ÚNICOS" value={kpi?.uniqueContacts ?? 0} color="#00FF94" />
          </div>
        </div>

        {/* KPI Row 2 — Campañas */}
        <div>
          <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-3">RENDIMIENTO DE CAMPAÑAS</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard icon={<Zap size={14} />} label="ENVIADOS" value={kpi?.totalSent ?? 0} color="#00FF94" />
            <KPICard icon={<CheckCheck size={14} />} label="TASA ENTREGA" value={`${kpi?.deliveryRate ?? 0}%`} color="#00C4FF" isPercent />
            <KPICard icon={<CheckCheck size={14} />} label="TASA LECTURA" value={`${kpi?.readRate ?? 0}%`} color="#FF6B35" isPercent />
            <KPICard icon={<MessageSquare size={14} />} label="TASA RESPUESTA" value={`${kpi?.replyRate ?? 0}%`} color="#00FF94" isPercent />
          </div>
        </div>

        {/* Chart + Recent Messages */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Timeline Chart */}
          <div className="lg:col-span-2 rounded-xl border border-[#1E1E2E] p-5" style={{ background: '#111118' }}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">ACTIVIDAD</p>
                <p className="text-sm font-medium text-[#E0E0F0] mt-0.5">Mensajes últimas 24h</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00FF94]" /><span className="mono text-[10px] text-[#4A4A6A]">ENTRANTE</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#00C4FF]" /><span className="mono text-[10px] text-[#4A4A6A]">SALIENTE</span></div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00FF94" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00C4FF" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#00C4FF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="hour" tick={{ fill: '#4A4A6A', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fill: '#4A4A6A', fontSize: 9, fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1E1E2E', border: 'none', borderRadius: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono', color: '#E0E0F0' }}
                  itemStyle={{ color: '#E0E0F0' }}
                />
                <Area type="monotone" dataKey="inbound" stroke="#00FF94" strokeWidth={1.5} fill="url(#inboundGrad)" />
                <Area type="monotone" dataKey="outbound" stroke="#00C4FF" strokeWidth={1.5} fill="url(#outboundGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Messages */}
          <div className="rounded-xl border border-[#1E1E2E] p-5" style={{ background: '#111118' }}>
            <p className="mono text-[10px] text-[#4A4A6A] tracking-widest mb-4">MENSAJES RECIENTES</p>
            <div className="space-y-3">
              {recentMessages.length === 0 ? (
                <p className="text-[#4A4A6A] text-xs text-center mt-8">Sin mensajes</p>
              ) : recentMessages.map((msg, i) => (
                <div key={i} className="flex gap-3 items-start slide-in" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${msg.direction === 'inbound' ? 'bg-[#00FF94]' : 'bg-[#00C4FF]'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-[#E0E0F0] truncate">{msg.contact_name || 'Desconocido'}</span>
                      <span className="mono text-[9px] text-[#4A4A6A] flex-shrink-0">{format(new Date(msg.created_at), 'HH:mm')}</span>
                    </div>
                    <p className="text-[11px] text-[#4A4A6A] truncate mt-0.5">{msg.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="rounded-xl border border-[#1E1E2E] overflow-hidden" style={{ background: '#111118' }}>
          <div className="px-5 py-4 border-b border-[#1E1E2E] flex items-center justify-between">
            <div>
              <p className="mono text-[10px] text-[#4A4A6A] tracking-widest">CAMPAÑAS</p>
              <p className="text-sm font-medium text-[#E0E0F0] mt-0.5">Historial de envíos</p>
            </div>
            <span className="mono text-[10px] px-2 py-1 rounded border border-[#1E1E2E] text-[#4A4A6A]">{campaigns.length} TOTAL</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E1E2E]">
                  {['CAMPAÑA', 'ESTADO', 'ENVIADOS', 'ENTREGADOS', 'LEÍDOS', 'RESPUESTAS', 'FECHA'].map(h => (
                    <th key={h} className="px-5 py-3 text-left mono text-[9px] text-[#4A4A6A] tracking-widest font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {campaigns.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-[#4A4A6A] text-xs">Sin campañas</td></tr>
                ) : campaigns.map((c, i) => (
                  <tr key={i} className="border-b border-[#1E1E2E] hover:bg-[#1E1E2E] transition-colors">
                    <td className="px-5 py-3 text-sm text-[#E0E0F0] font-medium">{c.name}</td>
                    <td className="px-5 py-3">
                      <span className={`mono text-[10px] tracking-widest ${statusColor(c.status)}`}>{statusLabel(c.status)}</span>
                    </td>
                    <td className="px-5 py-3 mono text-sm text-[#E0E0F0]">{c.sent_count}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="mono text-sm text-[#E0E0F0]">{c.delivered_count}</span>
                        {c.sent_count > 0 && <span className="mono text-[9px] text-[#00C4FF]">{Math.round((c.delivered_count / c.sent_count) * 100)}%</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="mono text-sm text-[#E0E0F0]">{c.read_count}</span>
                        {c.delivered_count > 0 && <span className="mono text-[9px] text-[#FF6B35]">{Math.round((c.read_count / c.delivered_count) * 100)}%</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="mono text-sm text-[#E0E0F0]">{c.reply_count}</span>
                        {c.sent_count > 0 && <span className="mono text-[9px] text-[#00FF94]">{Math.round((c.reply_count / c.sent_count) * 100)}%</span>}
                      </div>
                    </td>
                    <td className="px-5 py-3 mono text-[10px] text-[#4A4A6A]">
                      {c.scheduled_at ? format(new Date(c.scheduled_at), 'dd/MM HH:mm') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between py-2">
          <p className="mono text-[10px] text-[#4A4A6A]">GPA DASHBOARD v1.0 — WHATSAPP CLOUD API</p>
          <p className="mono text-[10px] text-[#4A4A6A]">GROWTH PARTNERS ACADEMY © 2026</p>
        </div>
      </main>
    </div>
  )
}

function KPICard({ icon, label, value, color, isPercent }: {
  icon: React.ReactNode
  label: string
  value: number | string
  color: string
  isPercent?: boolean
}) {
  return (
    <div className="rounded-xl border border-[#1E1E2E] p-4 fade-in hover:border-opacity-60 transition-colors" style={{ background: '#111118' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}15`, color }}>
          {icon}
        </div>
        {isPercent && (
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
        )}
      </div>
      <p className="mono text-[28px] font-bold leading-none" style={{ color }}>{value}</p>
      <p className="mono text-[9px] text-[#4A4A6A] tracking-widest mt-2">{label}</p>
    </div>
  )
}
