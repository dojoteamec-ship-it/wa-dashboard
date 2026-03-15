'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Wifi, WifiOff, Plus, RefreshCw, Copy, ExternalLink,
  Users, Circle, AlertTriangle, CheckCircle, Loader2,
  Smartphone, Key, Trash2, ChevronDown, ChevronUp, Shield
} from 'lucide-react'

interface Project { id: string; name: string }
interface Toast { id: string; type: 'success'|'error'|'warning'|'info'; message: string }

interface WhapiChannel {
  id: string
  project_id: string
  name: string
  channel_id: string
  phone_number: string
  status: 'connected' | 'disconnected' | 'connecting'
  plan: string
  trial_ends_at: string | null
  token_preview: string
  created_at: string
}

interface WaGroup {
  id: string
  name: string
  whapi_group_id: string
  invite_link: string
  member_count: number
  member_limit: number
  is_active: boolean
  is_full: boolean
  sequence_number: number
  group_type: string
  created_at: string
}

interface Props {
  activeProjectId: string | null
  projects: Project[]
  onToast: (t: Omit<Toast,'id'>) => void
}

const C = {
  bg: '#0A0A0F', card: '#111118', border: '#1E1E2E',
  muted: '#4A4A6A', text: '#E0E0F0', primary: '#0014ad',
  accent: '#00b0f6', success: '#00FF94', warning: '#FFB800',
  danger: '#FF6B35',
}

export default function GruposTab({ activeProjectId, projects, onToast }: Props) {
  const [channels, setChannels] = useState<WhapiChannel[]>([])
  const [groups, setGroups] = useState<WaGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [connectStep, setConnectStep] = useState<'form'|'connecting'|'done'>('form')

  // Form states
  const [channelName, setChannelName] = useState('Número B — Growth Partner Club')
  const [whapiToken, setWhapiToken] = useState('')
  const [whapiChannelId, setWhapiChannelId] = useState('')
  const [whapiNumber, setWhapiNumber] = useState('')
  const [groupLimit, setGroupLimit] = useState(500)
  const [groupType, setGroupType] = useState<'main'|'vip'|'broadcast'>('main')
  const [savingChannel, setSavingChannel] = useState(false)
  const [creatingGroup, setCreatingGroup] = useState(false)
  const [warmupDays, setWarmupDays] = useState(0)

  const load = useCallback(async () => {
    if (!activeProjectId) return
    setLoading(true)
    try {
      // Load Whapi credentials as "channels"
      const { data: creds } = await supabase
        .from('kanshi_credentials')
        .select('*')
        .eq('type', 'whapi')

      if (creds) {
        const mapped: WhapiChannel[] = creds.map((c: any) => ({
          id: c.id,
          project_id: activeProjectId,
          name: c.name,
          channel_id: c.credentials?.WHAPI_CHANNEL_ID ?? '',
          phone_number: c.credentials?.WHAPI_NUMBER_B ?? '',
          status: 'connected' as const,
          plan: 'Starter',
          trial_ends_at: null,
          token_preview: (c.credentials?.WHAPI_TOKEN ?? '').slice(0, 8) + '...',
          created_at: c.created_at,
        }))
        setChannels(mapped)
      }

      // Load groups
      const { data: grps } = await supabase
        .from('wa_groups')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('sequence_number', { ascending: true })

      setGroups(grps ?? [])

      // Compute warm-up days from first credential created_at
      if (creds && creds.length > 0) {
        const created = new Date(creds[0].created_at)
        const now = new Date()
        const diff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24))
        setWarmupDays(diff)
      }
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => { load() }, [load])

  async function handleSaveChannel() {
    if (!whapiToken || !whapiChannelId || !whapiNumber) {
      onToast({ type: 'error', message: 'Completa todos los campos' })
      return
    }
    setSavingChannel(true)
    try {
      const { error } = await supabase
        .from('kanshi_credentials')
        .insert({
          name: channelName,
          type: 'whapi',
          credentials: {
            WHAPI_TOKEN: whapiToken,
            WHAPI_BASE_URL: 'https://gate.whapi.cloud/',
            WHAPI_CHANNEL_ID: whapiChannelId,
            WHAPI_NUMBER_B: whapiNumber,
          },
          is_active: true,
        })
      if (error) throw error
      onToast({ type: 'success', message: '✅ Canal conectado correctamente' })
      setShowConnectModal(false)
      setWhapiToken('')
      setWhapiChannelId('')
      setWhapiNumber('')
      await load()
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    } finally {
      setSavingChannel(false)
    }
  }

  async function handleCreateGroup() {
    if (channels.length === 0) {
      onToast({ type: 'error', message: 'Conecta un canal Whapi primero' })
      return
    }
    setCreatingGroup(true)
    try {
      // Get token from first channel
      const { data: cred } = await supabase
        .from('kanshi_credentials')
        .select('credentials')
        .eq('type', 'whapi')
        .single()

      if (!cred) throw new Error('No hay credencial Whapi')
      const token = cred.credentials.WHAPI_TOKEN
      const baseUrl = cred.credentials.WHAPI_BASE_URL

      // Determine next sequence number
      const nextSeq = groups.length > 0
        ? Math.max(...groups.map(g => g.sequence_number)) + 1
        : 1

      const groupName = groupType === 'main'
        ? `Growth Partner Club ${nextSeq}`
        : groupType === 'vip'
        ? `GPC VIP ${nextSeq}`
        : `GPC Broadcast ${nextSeq}`

      // Create group via Whapi
      const res = await fetch(`${baseUrl}groups`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: groupName,
          participants: [cred.credentials.WHAPI_NUMBER_B.replace(/\D/g, '')],
        }),
      })
      const groupData = await res.json()
      if (!groupData.group_id) throw new Error('Error al crear grupo en Whapi: ' + JSON.stringify(groupData))

      // Get invite link
      const invRes = await fetch(`${baseUrl}groups/${groupData.group_id}/invite`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const invData = await invRes.json()
      const inviteLink = `https://chat.whatsapp.com/${invData.invite_code}`

      // Save to Supabase
      const { error } = await supabase.from('wa_groups').insert({
        project_id: activeProjectId,
        name: groupName,
        group_type: groupType,
        whapi_group_id: groupData.group_id,
        invite_link: inviteLink,
        member_count: 1,
        member_limit: groupLimit,
        is_active: true,
        is_full: false,
        sequence_number: nextSeq,
      })
      if (error) throw error

      onToast({ type: 'success', message: `✅ ${groupName} creado` })
      setShowCreateGroup(false)
      await load()
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    } finally {
      setCreatingGroup(false)
    }
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    onToast({ type: 'success', message: 'Copiado al portapapeles' })
  }

  const warmupPct = Math.min((warmupDays / 14) * 100, 100)
  const warmupReady = warmupDays >= 14

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin" style={{ color: C.accent }} />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl" style={{ color: C.text }}>Grupos WhatsApp</h2>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>
            Número B · Whapi.Cloud · broadcasts y comunidades
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition-all"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted }}
          >
            <RefreshCw size={14} /> Actualizar
          </button>
          <button
            onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all"
            style={{ background: C.accent, color: '#fff' }}
          >
            <Plus size={14} /> Conectar número
          </button>
        </div>
      </div>

      {/* ── WARM-UP TRACKER ── */}
      {channels.length > 0 && (
        <div
          className="rounded-2xl p-4"
          style={{ background: C.card, border: `1px solid ${warmupReady ? '#00FF9440' : '#FFB80040'}` }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={16} style={{ color: warmupReady ? C.success : C.warning }} />
              <span className="font-medium text-sm" style={{ color: C.text }}>
                Warm-up del número B
              </span>
            </div>
            <span
              className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{
                background: warmupReady ? '#00FF9420' : '#FFB80020',
                color: warmupReady ? C.success : C.warning,
              }}
            >
              {warmupReady ? '✅ LISTO PARA BROADCASTS' : `DÍA ${warmupDays} / 14`}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${warmupPct}%`,
                background: warmupReady ? C.success : `linear-gradient(90deg, ${C.warning}, #ff9500)`,
              }}
            />
          </div>
          {!warmupReady && (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Faltan {14 - warmupDays} días para poder hacer broadcasts masivos sin riesgo de ban.
              Deadline deadline crítico: activo antes del 9 Abr.
            </p>
          )}
        </div>
      )}

      {/* ── CANALES CONECTADOS ── */}
      <section>
        <h3 className="text-sm font-semibold mb-3" style={{ color: C.muted, letterSpacing: '0.08em' }}>
          CANALES WHAPI
        </h3>

        {channels.length === 0 ? (
          <div
            className="rounded-2xl p-8 text-center"
            style={{ background: C.card, border: `1px dashed ${C.border}` }}
          >
            <Smartphone size={32} className="mx-auto mb-3" style={{ color: C.muted }} />
            <p className="font-medium" style={{ color: C.text }}>Sin canales conectados</p>
            <p className="text-sm mt-1 mb-4" style={{ color: C.muted }}>
              Conecta tu número B de Whapi para gestionar grupos
            </p>
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium"
              style={{ background: C.accent, color: '#fff' }}
            >
              Conectar número
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map(ch => (
              <div
                key={ch.id}
                className="rounded-2xl p-4"
                style={{ background: C.card, border: `1px solid ${C.border}` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: '#00FF9415' }}
                    >
                      <Wifi size={18} style={{ color: C.success }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: C.text }}>{ch.name}</p>
                      <p className="text-xs" style={{ color: C.muted }}>{ch.phone_number} · {ch.channel_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className="text-xs px-2 py-1 rounded-lg font-medium"
                      style={{ background: '#00FF9420', color: C.success }}
                    >
                      CONECTADO
                    </span>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: C.muted }}>Token</p>
                      <p className="text-xs font-mono" style={{ color: C.text }}>{ch.token_preview}</p>
                    </div>
                  </div>
                </div>

                {/* Anti-ban rules reminder */}
                <div
                  className="mt-3 rounded-xl p-3 text-xs space-y-1"
                  style={{ background: '#FFB80010', border: `1px solid #FFB80030` }}
                >
                  <p className="font-medium" style={{ color: C.warning }}>⚠️ Reglas anti-ban activas</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 mt-1" style={{ color: C.muted }}>
                    <span>· Delay 3-8s entre mensajes</span>
                    <span>· Máx 5 grupos nuevos/día</span>
                    <span>· Spintax en todos los envíos</span>
                    <span>· Solo invite link (nunca force-add)</span>
                    <span>· Límite configurable por grupo</span>
                    <span>· Co-admin en cada grupo</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── GRUPOS ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: C.muted, letterSpacing: '0.08em' }}>
            GRUPOS ({groups.length})
          </h3>
          {channels.length > 0 && (
            <button
              onClick={() => setShowCreateGroup(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl"
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.accent }}
            >
              <Plus size={13} /> Nuevo grupo
            </button>
          )}
        </div>

        {groups.length === 0 ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{ background: C.card, border: `1px dashed ${C.border}` }}
          >
            <Users size={28} className="mx-auto mb-2" style={{ color: C.muted }} />
            <p className="text-sm" style={{ color: C.muted }}>
              Sin grupos todavía. Crea el primero cuando el canal esté conectado.
            </p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {groups.map(g => {
              const fillPct = Math.round((g.member_count / g.member_limit) * 100)
              const isFull = g.member_count >= g.member_limit
              return (
                <div
                  key={g.id}
                  className="rounded-2xl p-4"
                  style={{
                    background: C.card,
                    border: `1px solid ${isFull ? '#FF6B3560' : C.border}`,
                  }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm" style={{ color: C.text }}>{g.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                        {g.group_type.toUpperCase()} · #{g.sequence_number}
                      </p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-lg font-medium"
                      style={{
                        background: isFull ? '#FF6B3520' : g.is_active ? '#00FF9420' : '#4A4A6A20',
                        color: isFull ? C.danger : g.is_active ? C.success : C.muted,
                      }}
                    >
                      {isFull ? 'LLENO' : g.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>

                  {/* Fill bar */}
                  <div className="mb-2">
                    <div className="flex justify-between text-xs mb-1" style={{ color: C.muted }}>
                      <span>{g.member_count} miembros</span>
                      <span>{fillPct}% · límite {g.member_limit}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${fillPct}%`,
                          background: isFull ? C.danger : fillPct > 80 ? C.warning : C.success,
                        }}
                      />
                    </div>
                  </div>

                  {/* Invite link */}
                  <div
                    className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: '#0A0A0F', border: `1px solid ${C.border}` }}
                  >
                    <span className="text-xs font-mono truncate" style={{ color: C.muted, maxWidth: '180px' }}>
                      {g.invite_link}
                    </span>
                    <div className="flex gap-2 ml-2">
                      <button onClick={() => copyToClipboard(g.invite_link)}>
                        <Copy size={13} style={{ color: C.accent }} />
                      </button>
                      <a href={g.invite_link} target="_blank" rel="noreferrer">
                        <ExternalLink size={13} style={{ color: C.accent }} />
                      </a>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ══ MODAL: CONECTAR CANAL ══ */}
      {showConnectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowConnectModal(false) }}
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-5"
            style={{ background: '#111118', border: `1px solid ${C.border}` }}
          >
            <div>
              <h3 className="font-bold text-lg" style={{ color: C.text }}>Conectar canal Whapi</h3>
              <p className="text-sm mt-1" style={{ color: C.muted }}>
                Ingresa los datos de tu canal en Whapi.Cloud
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>
                  Nombre del canal
                </label>
                <input
                  value={channelName}
                  onChange={e => setChannelName(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                />
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>
                  WHAPI_TOKEN
                </label>
                <input
                  value={whapiToken}
                  onChange={e => setWhapiToken(e.target.value)}
                  placeholder="pIfKj1PagAKeGm24qqP4..."
                  className="w-full rounded-xl px-3 py-2.5 text-sm font-mono"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>
                    Channel ID
                  </label>
                  <input
                    value={whapiChannelId}
                    onChange={e => setWhapiChannelId(e.target.value)}
                    placeholder="IRONMN-GYC4V"
                    className="w-full rounded-xl px-3 py-2.5 text-sm font-mono"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>
                    Número B
                  </label>
                  <input
                    value={whapiNumber}
                    onChange={e => setWhapiNumber(e.target.value)}
                    placeholder="+593969416349"
                    className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }}
                  />
                </div>
              </div>

              <div
                className="rounded-xl p-3 text-xs"
                style={{ background: '#00b0f615', border: `1px solid #00b0f630` }}
              >
                <p className="font-medium mb-1" style={{ color: C.accent }}>ℹ️ Dónde encontrar estos datos</p>
                <p style={{ color: C.muted }}>
                  En Whapi.Cloud → tu canal → la página principal muestra <strong style={{color:C.text}}>Token</strong> y <strong style={{color:C.text}}>Channel ID</strong> (el código IRONMN-GYC4V en el título).
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowConnectModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveChannel}
                disabled={savingChannel}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: C.accent, color: '#fff', opacity: savingChannel ? 0.7 : 1 }}
              >
                {savingChannel ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                {savingChannel ? 'Guardando...' : 'Conectar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CREAR GRUPO ══ */}
      {showCreateGroup && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreateGroup(false) }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-5"
            style={{ background: '#111118', border: `1px solid ${C.border}` }}
          >
            <div>
              <h3 className="font-bold text-lg" style={{ color: C.text }}>Crear grupo</h3>
              <p className="text-sm mt-1" style={{ color: C.muted }}>
                El nombre se genera automáticamente con numeración secuencial
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: C.muted }}>
                  Tipo de grupo
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['main','vip','broadcast'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setGroupType(t)}
                      className="py-2 rounded-xl text-xs font-medium transition-all"
                      style={{
                        background: groupType === t ? C.accent : C.bg,
                        border: `1px solid ${groupType === t ? C.accent : C.border}`,
                        color: groupType === t ? '#fff' : C.muted,
                      }}
                    >
                      {t === 'main' ? 'Principal' : t === 'vip' ? 'VIP' : 'Broadcast'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>
                  Límite de miembros: <span style={{ color: C.accent }}>{groupLimit}</span>
                </label>
                <input
                  type="range"
                  min={100}
                  max={950}
                  step={50}
                  value={groupLimit}
                  onChange={e => setGroupLimit(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs mt-1" style={{ color: C.muted }}>
                  <span>100</span>
                  <span style={{ color: C.warning }}>⚠️ máx recomendado: 950</span>
                  <span>950</span>
                </div>
              </div>

              <div
                className="rounded-xl p-3 text-xs"
                style={{ background: '#00FF9410', border: `1px solid #00FF9430` }}
              >
                <p style={{ color: C.muted }}>
                  El grupo se creará en Whapi con el nombre{' '}
                  <strong style={{ color: C.text }}>
                    {groupType === 'main'
                      ? `Growth Partner Club ${groups.length + 1}`
                      : groupType === 'vip'
                      ? `GPC VIP ${groups.length + 1}`
                      : `GPC Broadcast ${groups.length + 1}`}
                  </strong>
                  {' '}y se guardará automáticamente en KANSHI.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateGroup(false)}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted }}
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: C.success, color: '#0A0A0F', opacity: creatingGroup ? 0.7 : 1 }}
              >
                {creatingGroup ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {creatingGroup ? 'Creando...' : 'Crear grupo'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
