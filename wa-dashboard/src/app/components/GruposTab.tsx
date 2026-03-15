'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Wifi, Plus, RefreshCw, Copy, ExternalLink,
  Users, Loader2, Smartphone, Key, Trash2,
  Shield, Edit2, Image, UserCheck, Lock,
  RotateCcw, ToggleLeft, ToggleRight, X,
  Send, Radio, Clock, MessageSquare, Shuffle, ChevronDown,
} from 'lucide-react'

interface Project { id: string; name: string }
interface Toast { id: string; type: 'success'|'error'|'warning'|'info'; message: string }

interface WhapiChannel {
  id: string
  name: string
  channel_id: string
  phone_number: string
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
  description: string
  group_type: string
  created_at: string
}

interface WhapiMember {
  id: string
  rank: 'admin' | 'superadmin' | 'member' | 'creator'
}

type EditTab = 'info' | 'imagen' | 'admins' | 'permisos'

interface WaBroadcast {
  id: string
  title: string
  message_body: string
  target_mode: 'all' | 'selected'
  target_group_ids: string[]
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
  scheduled_at: string | null
  sent_at: string | null
  total_groups: number
  sent_count: number
  failed_count: number
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

async function getWhapiCred() {
  const { data } = await supabase
    .from('kanshi_credentials')
    .select('credentials')
    .eq('type', 'whapi')
    .single()
  return data?.credentials ?? null
}

export default function GruposTab({ activeProjectId, projects, onToast }: Props) {
  const [channels, setChannels]     = useState<WhapiChannel[]>([])
  const [groups, setGroups]         = useState<WaGroup[]>([])
  const [loading, setLoading]       = useState(true)
  const [warmupDays, setWarmupDays] = useState(0)

  const [showConnectModal, setShowConnectModal]   = useState(false)
  const [showCreateGroup, setShowCreateGroup]     = useState(false)
  const [editGroup, setEditGroup]                 = useState<WaGroup | null>(null)
  const [editTab, setEditTab]                     = useState<EditTab>('info')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [channelName, setChannelName]       = useState('Número B — Growth Partner Club')
  const [whapiToken, setWhapiToken]         = useState('')
  const [whapiChannelId, setWhapiChannelId] = useState('')
  const [whapiNumber, setWhapiNumber]       = useState('')
  const [savingChannel, setSavingChannel]   = useState(false)

  const [groupLimit, setGroupLimit]       = useState(500)
  const [groupType, setGroupType]         = useState<'main'|'vip'|'broadcast'>('main')
  const [creatingGroup, setCreatingGroup] = useState(false)

  const [editName, setEditName]           = useState('')
  const [editDesc, setEditDesc]           = useState('')
  const [editLimit, setEditLimit]         = useState(500)
  const [editActive, setEditActive]       = useState(true)
  const [savingEdit, setSavingEdit]       = useState(false)
  const [members, setMembers]             = useState<WhapiMember[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [refreshingInvite, setRefreshingInvite] = useState(false)
  const [deletingGroup, setDeletingGroup] = useState(false)
  const [savingPerms, setSavingPerms]     = useState(false)
  const [onlyAdminsSend, setOnlyAdminsSend] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // ── BROADCAST STATE ──────────────────────────────────────
  const [broadcasts, setBroadcasts]           = useState<WaBroadcast[]>([])
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [showBroadcastsPanel, setShowBroadcastsPanel] = useState(false)
  const [bcTitle, setBcTitle]                 = useState('')
  const [bcBody, setBcBody]                   = useState('')
  const [bcTargetMode, setBcTargetMode]       = useState<'all' | 'selected'>('all')
  const [bcSelectedGroups, setBcSelectedGroups] = useState<string[]>([])
  const [bcScheduleMode, setBcScheduleMode]   = useState<'now' | 'later'>('now')
  const [bcScheduledAt, setBcScheduledAt]     = useState('')
  const [savingBroadcast, setSavingBroadcast] = useState(false)
  const [sendingBroadcast, setSendingBroadcast] = useState<string | null>(null)
  const [spintaxPreview, setSpintaxPreview]   = useState('')

  const imageInputRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    if (!activeProjectId) return
    setLoading(true)
    try {
      const { data: creds } = await supabase
        .from('kanshi_credentials')
        .select('*')
        .eq('type', 'whapi')

      if (creds) {
        setChannels(creds.map((c: any) => ({
          id: c.id,
          name: c.name,
          channel_id: c.credentials?.WHAPI_CHANNEL_ID ?? '',
          phone_number: c.credentials?.WHAPI_NUMBER_B ?? '',
          token_preview: (c.credentials?.WHAPI_TOKEN ?? '').slice(0, 8) + '...',
          created_at: c.created_at,
        })))
        if (creds.length > 0) {
          const diff = Math.floor((Date.now() - new Date(creds[0].created_at).getTime()) / 86400000)
          setWarmupDays(diff)
        }
      }

      const { data: grps } = await supabase
        .from('wa_groups')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('sequence_number', { ascending: true })
      setGroups(grps ?? [])
      const { data: bcs } = await supabase
        .from('wa_broadcasts')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false })
        .limit(20)
      setBroadcasts(bcs ?? [])
    } finally {
      setLoading(false)
    }
  }, [activeProjectId])

  useEffect(() => { load() }, [load])

  function openEdit(g: WaGroup) {
    setEditGroup(g)
    setEditName(g.name)
    setEditDesc(g.description ?? '')
    setEditLimit(g.member_limit)
    setEditActive(g.is_active)
    setEditTab('info')
    setMembers([])
    setShowDeleteConfirm(false)
    setOnlyAdminsSend(false)
  }

  async function loadMembers(g: WaGroup) {
    setLoadingMembers(true)
    try {
      const cred = await getWhapiCred()
      if (!cred) throw new Error('Sin credencial Whapi')
      const res = await fetch(`${cred.WHAPI_BASE_URL}groups/${g.whapi_group_id}`, {
        headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}` },
      })
      const data = await res.json()
      setMembers(data.participants ?? [])
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    } finally {
      setLoadingMembers(false)
    }
  }

  // PUT para nombre y descripción (endpoint verificado desde terminal)
  async function handleSaveInfo() {
    if (!editGroup) return
    setSavingEdit(true)
    try {
      const cred = await getWhapiCred()
      if (!cred) throw new Error('Sin credencial Whapi')

      if (editName !== editGroup.name) {
        const r = await fetch(`${cred.WHAPI_BASE_URL}groups/${editGroup.whapi_group_id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ subject: editName }),
        })
        const rd = await r.json()
        if (!r.ok) throw new Error('Error nombre: ' + JSON.stringify(rd))
      }

      if (editDesc !== (editGroup.description ?? '')) {
        const r = await fetch(`${cred.WHAPI_BASE_URL}groups/${editGroup.whapi_group_id}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ desc: editDesc }),
        })
        const rd = await r.json()
        if (!r.ok) throw new Error('Error descripción: ' + JSON.stringify(rd))
      }

      const { error } = await supabase
        .from('wa_groups')
        .update({ name: editName, description: editDesc, member_limit: editLimit, is_active: editActive })
        .eq('id', editGroup.id)
      if (error) throw error

      onToast({ type: 'success', message: '✅ Grupo actualizado en WhatsApp' })
      setEditGroup(null)
      await load()
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    } finally {
      setSavingEdit(false)
    }
  }

  // PUT /icon con FileReader en Promise (endpoint verificado)
  async function handleImageUpload(file: File) {
    if (!editGroup) return
    setUploadingImage(true)
    try {
      const cred = await getWhapiCred()
      if (!cred) throw new Error('Sin credencial Whapi')

      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = () => reject(new Error('Error leyendo archivo'))
        reader.readAsDataURL(file)
      })

      const r = await fetch(`${cred.WHAPI_BASE_URL}groups/${editGroup.whapi_group_id}/icon`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ media: `data:image/jpeg;base64,${base64}` }),
      })
      const rd = await r.json()
      if (!r.ok) throw new Error('Error imagen: ' + JSON.stringify(rd))
      onToast({ type: 'success', message: '✅ Imagen actualizada en WhatsApp' })
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleToggleAdmin(member: WhapiMember) {
    if (!editGroup) return
    try {
      const cred = await getWhapiCred()
      if (!cred) throw new Error('Sin credencial Whapi')
      const action = member.rank === 'admin' ? 'demote' : 'promote'
      await fetch(`${cred.WHAPI_BASE_URL}groups/${editGroup.whapi_group_id}/participants`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, participants: [member.id] }),
      })
      onToast({ type: 'success', message: action === 'promote' ? '✅ Admin asignado' : 'Admin removido' })
      await loadMembers(editGroup)
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    }
  }

  // PATCH setting + policy (endpoint verificado desde terminal)
  async function handleSavePerms() {
    if (!editGroup) return
    setSavingPerms(true)
    try {
      const cred = await getWhapiCred()
      if (!cred) throw new Error('Sin credencial Whapi')
      const r = await fetch(`${cred.WHAPI_BASE_URL}groups/${editGroup.whapi_group_id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ setting: 'send_messages', policy: onlyAdminsSend ? 'admins' : 'anyone' }),
      })
      const rd = await r.json()
      if (!r.ok) throw new Error('Error permisos: ' + JSON.stringify(rd))
      onToast({ type: 'success', message: `✅ ${onlyAdminsSend ? 'Solo admins pueden enviar' : 'Todos pueden enviar'}` })
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    } finally {
      setSavingPerms(false)
    }
  }

  async function handleRefreshInvite(g: WaGroup) {
    setRefreshingInvite(true)
    try {
      const cred = await getWhapiCred()
      if (!cred) throw new Error('Sin credencial Whapi')
      await fetch(`${cred.WHAPI_BASE_URL}groups/${g.whapi_group_id}/invite`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}` },
      })
      const res = await fetch(`${cred.WHAPI_BASE_URL}groups/${g.whapi_group_id}/invite`, {
        headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}` },
      })
      const data = await res.json()
      const newLink = `https://chat.whatsapp.com/${data.invite_code}`
      await supabase.from('wa_groups').update({ invite_link: newLink }).eq('id', g.id)
      onToast({ type: 'success', message: '✅ Invite link renovado' })
      await load()
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    } finally {
      setRefreshingInvite(false)
    }
  }

  async function handleDeleteGroup() {
    if (!editGroup) return
    setDeletingGroup(true)
    try {
      const { error } = await supabase.from('wa_groups').delete().eq('id', editGroup.id)
      if (error) throw error
      onToast({ type: 'success', message: 'Grupo eliminado de KANSHI' })
      setEditGroup(null)
      await load()
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    } finally {
      setDeletingGroup(false)
    }
  }

  // ── BROADCAST HELPERS ─────────────────────────────────────
  function resolveSpintax(text: string): string {
    return text.replace(/\{([^{}]+)\}/g, (_, opts: string) => {
      const parts = opts.split('|')
      return parts[Math.floor(Math.random() * parts.length)]
    })
  }

  function refreshSpintaxPreview(text: string) {
    setSpintaxPreview(resolveSpintax(text))
  }

  function resetBroadcastForm() {
    setBcTitle('')
    setBcBody('')
    setBcTargetMode('all')
    setBcSelectedGroups([])
    setBcScheduleMode('now')
    setBcScheduledAt('')
    setSpintaxPreview('')
  }

  function toggleBcGroup(groupId: string) {
    setBcSelectedGroups(prev =>
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    )
  }

  async function executeBroadcast(broadcastId: string, groupIds: string[], messageBody: string, cred: any) {
    if (!cred) { onToast({ type: 'error', message: 'Sin credencial Whapi' }); return }
    setSendingBroadcast(broadcastId)
    let sentCount = 0
    let failedCount = 0

    for (let i = 0; i < groupIds.length; i++) {
      const groupId  = groupIds[i]
      const finalMsg = resolveSpintax(messageBody)
      const group    = groups.find(g => g.whapi_group_id === groupId)

      try {
        const res = await fetch(`${cred.WHAPI_BASE_URL}messages/text`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: groupId, body: finalMsg }),
        })
        const data = await res.json()
        await supabase.from('wa_broadcast_logs').insert({
          broadcast_id: broadcastId,
          group_id:     groupId,
          group_name:   group?.name ?? groupId,
          status:       res.ok ? 'sent' : 'failed',
          message_id:   data.id ?? null,
          final_message: finalMsg,
          error_message: res.ok ? null : JSON.stringify(data),
          sent_at:      res.ok ? new Date().toISOString() : null,
        })
        if (res.ok) sentCount++; else failedCount++
      } catch (e: any) {
        await supabase.from('wa_broadcast_logs').insert({
          broadcast_id: broadcastId,
          group_id:     groupId,
          group_name:   group?.name ?? groupId,
          status:       'failed',
          error_message: e.message,
        })
        failedCount++
      }

      // Anti-ban: delay aleatorio 3–8s entre grupos
      if (i < groupIds.length - 1) {
        const delay = 3000 + Math.random() * 5000
        await new Promise(r => setTimeout(r, delay))
      }
    }

    await supabase.from('wa_broadcasts').update({
      status:      failedCount === groupIds.length ? 'failed' : 'sent',
      sent_at:     new Date().toISOString(),
      sent_count:  sentCount,
      failed_count: failedCount,
    }).eq('id', broadcastId)

    onToast({
      type:    sentCount > 0 ? 'success' : 'error',
      message: `Broadcast: ${sentCount} enviados · ${failedCount} fallidos`,
    })
    setSendingBroadcast(null)
    await load()
  }

  async function handleSaveBroadcast(sendNow: boolean) {
    if (!bcTitle.trim() || !bcBody.trim()) {
      onToast({ type: 'error', message: 'Completa título y mensaje' }); return
    }
    const targetGroupIds = bcTargetMode === 'all'
      ? groups.map(g => g.whapi_group_id)
      : bcSelectedGroups

    if (targetGroupIds.length === 0) {
      onToast({ type: 'error', message: 'Selecciona al menos un grupo' }); return
    }

    setSavingBroadcast(true)
    try {
      const cred       = channels.length > 0 ? await getWhapiCred() : null
      const channelId  = cred?.WHAPI_CHANNEL_ID ?? ''

      const { data: bc, error } = await supabase
        .from('wa_broadcasts')
        .insert({
          project_id:       activeProjectId,
          channel_id:       channelId,
          title:            bcTitle.trim(),
          message_type:     'text',
          message_body:     bcBody.trim(),
          target_mode:      bcTargetMode,
          target_group_ids: targetGroupIds,
          status:           sendNow ? 'sending' : bcScheduleMode === 'later' ? 'scheduled' : 'draft',
          scheduled_at:     bcScheduleMode === 'later' && bcScheduledAt
            ? new Date(bcScheduledAt).toISOString() : null,
          total_groups:     targetGroupIds.length,
          delay_min_seconds: 3,
          delay_max_seconds: 8,
          max_groups_per_day: 5,
        })
        .select()
        .single()
      if (error) throw error

      setShowBroadcastModal(false)
      resetBroadcastForm()

      if (sendNow && bc) {
        await executeBroadcast(bc.id, targetGroupIds, bcBody.trim(), cred)
      } else {
        onToast({ type: 'success', message: `✅ Broadcast ${bcScheduleMode === 'later' ? 'programado' : 'guardado como borrador'}` })
        await load()
      }
    } catch (e: any) {
      onToast({ type: 'error', message: e.message })
    } finally {
      setSavingBroadcast(false)
    }
  }

  async function handleSaveChannel() {
    if (!whapiToken || !whapiChannelId || !whapiNumber) {
      onToast({ type: 'error', message: 'Completa todos los campos' })
      return
    }
    setSavingChannel(true)
    try {
      const { error } = await supabase.from('kanshi_credentials').insert({
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
      onToast({ type: 'success', message: '✅ Canal conectado' })
      setShowConnectModal(false)
      setWhapiToken(''); setWhapiChannelId(''); setWhapiNumber('')
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
      const cred = await getWhapiCred()
      if (!cred) throw new Error('Sin credencial Whapi')
      const sameType = groups.filter(g => g.group_type === groupType)
      const nextSeq  = sameType.length > 0 ? Math.max(...sameType.map(g => g.sequence_number)) + 1 : 1
      const groupName = groupType === 'main'
        ? `Growth Partner Club ${nextSeq}`
        : groupType === 'vip' ? `GPC VIP ${nextSeq}` : `GPC Broadcast ${nextSeq}`

      const res = await fetch(`${cred.WHAPI_BASE_URL}groups`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: groupName, participants: [cred.WHAPI_NUMBER_B.replace(/\D/g, '')] }),
      })
      const groupData = await res.json()
      if (!groupData.group_id) throw new Error('Error Whapi: ' + JSON.stringify(groupData))

      const invRes  = await fetch(`${cred.WHAPI_BASE_URL}groups/${groupData.group_id}/invite`, {
        headers: { Authorization: `Bearer ${cred.WHAPI_TOKEN}` },
      })
      const invData    = await invRes.json()
      const inviteLink = `https://chat.whatsapp.com/${invData.invite_code}`

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
    onToast({ type: 'success', message: 'Copiado' })
  }

  const warmupPct   = Math.min((warmupDays / 14) * 100, 100)
  const warmupReady = warmupDays >= 14

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin" style={{ color: C.accent }} />
    </div>
  )

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-xl" style={{ color: C.text }}>Grupos WhatsApp</h2>
          <p className="text-sm mt-0.5" style={{ color: C.muted }}>Número B · Whapi.Cloud · broadcasts y comunidades</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.muted }}>
            <RefreshCw size={14} /> Actualizar
          </button>
          {channels.length > 0 && (
            <button onClick={() => { resetBroadcastForm(); setShowBroadcastModal(true) }}
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
              style={{ background: '#00FF9420', border: '1px solid #00FF9440', color: C.success }}>
              <Radio size={14} /> Broadcast
            </button>
          )}
          <button onClick={() => setShowConnectModal(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium"
            style={{ background: C.accent, color: '#fff' }}>
            <Plus size={14} /> Conectar número
          </button>
        </div>
      </div>

      {/* WARM-UP */}
      {channels.length > 0 && (
        <div className="rounded-2xl p-4"
          style={{ background: C.card, border: `1px solid ${warmupReady ? '#00FF9440' : '#FFB80040'}` }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Shield size={16} style={{ color: warmupReady ? C.success : C.warning }} />
              <span className="font-medium text-sm" style={{ color: C.text }}>Warm-up del número B</span>
            </div>
            <span className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{ background: warmupReady ? '#00FF9420' : '#FFB80020', color: warmupReady ? C.success : C.warning }}>
              {warmupReady ? '✅ LISTO PARA BROADCASTS' : `DÍA ${warmupDays} / 14`}
            </span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: C.border }}>
            <div className="h-full rounded-full transition-all duration-500"
              style={{ width: `${warmupPct}%`, background: warmupReady ? C.success : `linear-gradient(90deg, ${C.warning}, #ff9500)` }} />
          </div>
          {!warmupReady && (
            <p className="text-xs mt-2" style={{ color: C.muted }}>
              Faltan {14 - warmupDays} días para broadcasts masivos sin riesgo de ban. Deadline crítico: activo antes del 9 Abr.
            </p>
          )}
        </div>
      )}

      {/* CANALES */}
      <section>
        <h3 className="text-sm font-semibold mb-3" style={{ color: C.muted, letterSpacing: '0.08em' }}>CANALES WHAPI</h3>
        {channels.length === 0 ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: C.card, border: `1px dashed ${C.border}` }}>
            <Smartphone size={32} className="mx-auto mb-3" style={{ color: C.muted }} />
            <p className="font-medium mb-4" style={{ color: C.text }}>Sin canales conectados</p>
            <button onClick={() => setShowConnectModal(true)}
              className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: C.accent, color: '#fff' }}>
              Conectar número
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {channels.map(ch => (
              <div key={ch.id} className="rounded-2xl p-4" style={{ background: C.card, border: `1px solid ${C.border}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#00FF9415' }}>
                      <Wifi size={18} style={{ color: C.success }} />
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: C.text }}>{ch.name}</p>
                      <p className="text-xs" style={{ color: C.muted }}>{ch.phone_number} · {ch.channel_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs px-2 py-1 rounded-lg font-medium" style={{ background: '#00FF9420', color: C.success }}>CONECTADO</span>
                    <p className="text-xs font-mono" style={{ color: C.muted }}>{ch.token_preview}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-xl p-3 text-xs" style={{ background: '#FFB80010', border: '1px solid #FFB80030' }}>
                  <p className="font-medium mb-1" style={{ color: C.warning }}>⚠️ Reglas anti-ban activas</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5" style={{ color: C.muted }}>
                    <span>· Delay 3-8s entre mensajes</span><span>· Máx 5 grupos nuevos/día</span>
                    <span>· Spintax en todos los envíos</span><span>· Solo invite link (nunca force-add)</span>
                    <span>· Límite configurable por grupo</span><span>· Co-admin en cada grupo</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* GRUPOS */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: C.muted, letterSpacing: '0.08em' }}>GRUPOS ({groups.length})</h3>
          {channels.length > 0 && (
            <button onClick={() => setShowCreateGroup(true)}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-xl"
              style={{ background: C.card, border: `1px solid ${C.border}`, color: C.accent }}>
              <Plus size={13} /> Nuevo grupo
            </button>
          )}
        </div>
        {groups.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: C.card, border: `1px dashed ${C.border}` }}>
            <Users size={28} className="mx-auto mb-2" style={{ color: C.muted }} />
            <p className="text-sm" style={{ color: C.muted }}>Sin grupos todavía.</p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {groups.map(g => {
              const fillPct = Math.round((g.member_count / g.member_limit) * 100)
              const isFull  = g.member_count >= g.member_limit
              return (
                <div key={g.id} className="rounded-2xl p-4"
                  style={{ background: C.card, border: `1px solid ${isFull ? '#FF6B3560' : C.border}` }}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-medium text-sm" style={{ color: C.text }}>{g.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>{g.group_type.toUpperCase()} · #{g.sequence_number}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded-lg font-medium"
                        style={{ background: isFull ? '#FF6B3520' : g.is_active ? '#00FF9420' : '#4A4A6A20', color: isFull ? C.danger : g.is_active ? C.success : C.muted }}>
                        {isFull ? 'LLENO' : g.is_active ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                      <button onClick={() => openEdit(g)} className="rounded-lg p-1.5"
                        style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                        <Edit2 size={12} style={{ color: C.accent }} />
                      </button>
                    </div>
                  </div>
                  <div className="mb-3">
                    <div className="flex justify-between text-xs mb-1" style={{ color: C.muted }}>
                      <span>{g.member_count} miembros</span>
                      <span>{fillPct}% · límite {g.member_limit}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.border }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${fillPct}%`, background: isFull ? C.danger : fillPct > 80 ? C.warning : C.success }} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between rounded-xl px-3 py-2"
                    style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                    <span className="text-xs font-mono truncate" style={{ color: C.muted, maxWidth: '160px' }}>{g.invite_link}</span>
                    <div className="flex gap-2 ml-2 flex-shrink-0">
                      <button onClick={() => copyToClipboard(g.invite_link)}><Copy size={13} style={{ color: C.accent }} /></button>
                      <a href={g.invite_link} target="_blank" rel="noreferrer"><ExternalLink size={13} style={{ color: C.accent }} /></a>
                      <button onClick={() => handleRefreshInvite(g)} disabled={refreshingInvite}>
                        <RotateCcw size={13} style={{ color: refreshingInvite ? C.muted : C.warning }} />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>


      {/* ══ BROADCASTS ══ */}
      {broadcasts.length > 0 && (
        <section>
          <button onClick={() => setShowBroadcastsPanel(!showBroadcastsPanel)}
            className="w-full flex items-center justify-between mb-3 group">
            <h3 className="text-sm font-semibold" style={{ color: C.muted, letterSpacing: '0.08em' }}>
              BROADCASTS ({broadcasts.length})
            </h3>
            <ChevronDown size={14} style={{ color: C.muted, transform: showBroadcastsPanel ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {showBroadcastsPanel && (
            <div className="space-y-2">
              {broadcasts.map(bc => {
                const statusColor = bc.status === 'sent' ? C.success : bc.status === 'failed' ? C.danger : bc.status === 'sending' ? C.accent : bc.status === 'scheduled' ? C.warning : C.muted
                const statusLabel = { draft: 'BORRADOR', scheduled: 'PROGRAMADO', sending: 'ENVIANDO...', sent: 'ENVIADO', failed: 'FALLIDO', cancelled: 'CANCELADO' }[bc.status] ?? bc.status.toUpperCase()
                const isSending   = sendingBroadcast === bc.id
                return (
                  <div key={bc.id} className="rounded-2xl p-4 flex items-center justify-between gap-4"
                    style={{ background: C.card, border: `1px solid ${C.border}` }}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${statusColor}15` }}>
                        {isSending ? <Loader2 size={14} className="animate-spin" style={{ color: statusColor }} />
                          : bc.status === 'sent' ? <Send size={14} style={{ color: statusColor }} />
                          : bc.status === 'scheduled' ? <Clock size={14} style={{ color: statusColor }} />
                          : <MessageSquare size={14} style={{ color: statusColor }} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: C.text }}>{bc.title}</p>
                        <p className="text-xs truncate" style={{ color: C.muted }}>{bc.message_body}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <span className="text-xs font-bold block" style={{ color: statusColor }}>{statusLabel}</span>
                        {bc.status === 'sent' && (
                          <span className="text-xs" style={{ color: C.muted }}>{bc.sent_count}/{bc.total_groups}</span>
                        )}
                        {bc.status === 'scheduled' && bc.scheduled_at && (
                          <span className="text-xs" style={{ color: C.muted }}>
                            {new Date(bc.scheduled_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      {(bc.status === 'draft' || bc.status === 'scheduled') && !isSending && (
                        <button
                          onClick={async () => {
                            const cred = await getWhapiCred()
                            await supabase.from('wa_broadcasts').update({ status: 'sending' }).eq('id', bc.id)
                            await executeBroadcast(bc.id, bc.target_group_ids, bc.message_body, cred)
                          }}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
                          style={{ background: '#00FF9420', border: '1px solid #00FF9440', color: C.success }}>
                          <Send size={11} /> Enviar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      )}
      
      {/* ══ MODAL: EDITAR ══ */}
      {editGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={e => { if (e.target === e.currentTarget) setEditGroup(null) }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#111118', border: `1px solid ${C.border}` }}>
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div>
                <p className="font-bold" style={{ color: C.text }}>{editGroup.name}</p>
                <p className="text-xs" style={{ color: C.muted }}>{editGroup.group_type.toUpperCase()} · #{editGroup.sequence_number}</p>
              </div>
              <button onClick={() => setEditGroup(null)}><X size={18} style={{ color: C.muted }} /></button>
            </div>

            <div className="flex" style={{ borderBottom: `1px solid ${C.border}` }}>
              {([
                { key: 'info',     label: 'Info',     icon: <Edit2 size={13}/> },
                { key: 'imagen',   label: 'Imagen',   icon: <Image size={13}/> },
                { key: 'admins',   label: 'Admins',   icon: <UserCheck size={13}/> },
                { key: 'permisos', label: 'Permisos', icon: <Lock size={13}/> },
              ] as { key: EditTab; label: string; icon: React.ReactNode }[]).map(t => (
                <button key={t.key}
                  onClick={() => { setEditTab(t.key); if (t.key === 'admins' && members.length === 0) loadMembers(editGroup) }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all"
                  style={{ background: editTab === t.key ? '#1a1a2e' : 'transparent', borderBottom: editTab === t.key ? `2px solid ${C.accent}` : '2px solid transparent', color: editTab === t.key ? C.accent : C.muted }}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            <div className="p-6 space-y-4">

              {editTab === 'info' && (
                <>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>Nombre del grupo</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)}
                      className="w-full rounded-xl px-3 py-2.5 text-sm"
                      style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>Descripción (opcional)</label>
                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={3}
                      placeholder="Describe el propósito del grupo..."
                      className="w-full rounded-xl px-3 py-2.5 text-sm resize-none"
                      style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
                  </div>
                  <div>
                    <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>
                      Límite de miembros: <span style={{ color: C.accent }}>{editLimit}</span>
                    </label>
                    <input type="range" min={100} max={950} step={50} value={editLimit}
                      onChange={e => setEditLimit(Number(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs mt-1" style={{ color: C.muted }}>
                      <span>100</span><span style={{ color: C.warning }}>máx seguro: 950</span><span>950</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>Grupo activo</p>
                      <p className="text-xs" style={{ color: C.muted }}>Recibe nuevos leads via invite link</p>
                    </div>
                    <button onClick={() => setEditActive(!editActive)}>
                      {editActive ? <ToggleRight size={28} style={{ color: C.success }} /> : <ToggleLeft size={28} style={{ color: C.muted }} />}
                    </button>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: '#FF6B3510', border: '1px solid #FF6B3530' }}>
                    {!showDeleteConfirm ? (
                      <button onClick={() => setShowDeleteConfirm(true)} className="flex items-center gap-2 text-xs" style={{ color: C.danger }}>
                        <Trash2 size={13} /> Eliminar grupo de KANSHI
                      </button>
                    ) : (
                      <div>
                        <p className="text-xs mb-2" style={{ color: C.warning }}>¿Confirmas? El grupo en WhatsApp NO se borra.</p>
                        <div className="flex gap-2">
                          <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-1.5 rounded-lg text-xs"
                            style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted }}>Cancelar</button>
                          <button onClick={handleDeleteGroup} disabled={deletingGroup}
                            className="flex-1 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1"
                            style={{ background: C.danger, color: '#fff' }}>
                            {deletingGroup ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button onClick={() => setEditGroup(null)} className="flex-1 py-2.5 rounded-xl text-sm"
                      style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted }}>Cancelar</button>
                    <button onClick={handleSaveInfo} disabled={savingEdit}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                      style={{ background: C.accent, color: '#fff', opacity: savingEdit ? 0.7 : 1 }}>
                      {savingEdit ? <Loader2 size={14} className="animate-spin" /> : null}
                      {savingEdit ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </>
              )}

              {editTab === 'imagen' && (
                <div className="space-y-4">
                  <div className="rounded-2xl p-8 text-center cursor-pointer border-2 border-dashed"
                    style={{ borderColor: C.border }} onClick={() => imageInputRef.current?.click()}>
                    <Image size={32} className="mx-auto mb-3" style={{ color: C.muted }} />
                    <p className="font-medium text-sm" style={{ color: C.text }}>
                      {uploadingImage ? 'Subiendo...' : 'Subir imagen del grupo'}
                    </p>
                    <p className="text-xs mt-1" style={{ color: C.muted }}>JPG o PNG · recomendado 500×500px</p>
                    {uploadingImage && <Loader2 size={20} className="animate-spin mx-auto mt-3" style={{ color: C.accent }} />}
                  </div>
                  <input ref={imageInputRef} type="file" accept="image/jpeg,image/png" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f) }} />
                  <div className="rounded-xl p-3 text-xs" style={{ background: '#00b0f615', border: '1px solid #00b0f630' }}>
                    <p style={{ color: C.muted }}>La imagen se actualiza en WhatsApp via PUT /groups/{'{id}'}/icon.</p>
                  </div>
                </div>
              )}

              {editTab === 'admins' && (
                <div className="space-y-3">
                  {loadingMembers ? (
                    <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin" style={{ color: C.accent }} /></div>
                  ) : members.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-sm" style={{ color: C.muted }}>No se pudieron cargar los miembros</p>
                      <button onClick={() => loadMembers(editGroup)} className="mt-2 text-xs" style={{ color: C.accent }}>Reintentar</button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs" style={{ color: C.muted }}>{members.length} miembro{members.length !== 1 ? 's' : ''}</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {members.map(m => {
                          const isAdmin   = m.rank === 'admin' || m.rank === 'superadmin' || m.rank === 'creator'
                          const isCreator = m.rank === 'creator' || m.rank === 'superadmin'
                          return (
                            <div key={m.id} className="flex items-center justify-between rounded-xl px-3 py-2"
                              style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                              <div>
                                <p className="text-xs font-mono" style={{ color: C.text }}>+{m.id.replace('@s.whatsapp.net', '')}</p>
                                <p className="text-xs" style={{ color: isAdmin ? C.accent : C.muted }}>{m.rank}</p>
                              </div>
                              {!isCreator && (
                                <button onClick={() => handleToggleAdmin(m)} className="text-xs px-2 py-1 rounded-lg"
                                  style={{ background: isAdmin ? '#FF6B3520' : '#00FF9420', color: isAdmin ? C.danger : C.success, border: `1px solid ${isAdmin ? '#FF6B3540' : '#00FF9440'}` }}>
                                  {isAdmin ? 'Quitar admin' : 'Hacer admin'}
                                </button>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {editTab === 'permisos' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl p-4" style={{ background: C.bg, border: `1px solid ${C.border}` }}>
                    <div>
                      <p className="text-sm font-medium" style={{ color: C.text }}>Solo admins pueden enviar</p>
                      <p className="text-xs mt-0.5" style={{ color: C.muted }}>Los miembros solo pueden leer. Ideal para anuncios.</p>
                    </div>
                    <button onClick={() => setOnlyAdminsSend(!onlyAdminsSend)}>
                      {onlyAdminsSend ? <ToggleRight size={28} style={{ color: C.success }} /> : <ToggleLeft size={28} style={{ color: C.muted }} />}
                    </button>
                  </div>
                  <div className="rounded-xl p-3 text-xs" style={{ background: '#FFB80010', border: '1px solid #FFB80030' }}>
                    <p className="font-medium mb-1" style={{ color: C.warning }}>⚠️ Recomendación para lanzamientos</p>
                    <p style={{ color: C.muted }}>Activa "Solo admins" durante Lives y Clases. Desactívalo para encuestas de participación.</p>
                  </div>
                  <button onClick={handleSavePerms} disabled={savingPerms}
                    className="w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                    style={{ background: C.accent, color: '#fff', opacity: savingPerms ? 0.7 : 1 }}>
                    {savingPerms ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                    {savingPerms ? 'Aplicando...' : 'Aplicar permisos'}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}


      {/* ══ MODAL: BROADCAST COMPOSER ══ */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowBroadcastModal(false) }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden" style={{ background: '#111118', border: `1px solid ${C.border}` }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: `1px solid ${C.border}` }}>
              <div className="flex items-center gap-2">
                <Radio size={16} style={{ color: C.success }} />
                <h3 className="font-bold text-base" style={{ color: C.text }}>Nuevo Broadcast</h3>
              </div>
              <button onClick={() => setShowBroadcastModal(false)}><X size={18} style={{ color: C.muted }} /></button>
            </div>

            <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">

              {/* Título interno */}
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>Nombre interno</label>
                <input value={bcTitle} onChange={e => setBcTitle(e.target.value)}
                  placeholder="Ej: Recordatorio Live 1 — 14 Abr"
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
              </div>

              {/* Mensaje + spintax */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium" style={{ color: C.muted }}>Mensaje</label>
                  <span className="text-xs" style={{ color: C.muted }}>Usa {'{'}opción1|opción2{'}'} para spintax</span>
                </div>
                <textarea value={bcBody}
                  onChange={e => { setBcBody(e.target.value); setSpintaxPreview('') }}
                  rows={5} placeholder={'Hola {Carlos|amigo|crack} 👋\nArrancan los Lives del Growth Partner Club.\n¡Te esperamos!'}
                  className="w-full rounded-xl px-3 py-2.5 text-sm resize-none font-mono"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs" style={{ color: C.muted }}>{bcBody.length} chars</span>
                  <button onClick={() => refreshSpintaxPreview(bcBody)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-lg"
                    style={{ background: '#00b0f615', border: '1px solid #00b0f630', color: C.accent }}>
                    <Shuffle size={11} /> Preview aleatorio
                  </button>
                </div>
                {spintaxPreview && (
                  <div className="mt-2 rounded-xl p-3 text-xs" style={{ background: '#00FF9408', border: '1px solid #00FF9430' }}>
                    <p className="font-medium mb-1" style={{ color: C.success }}>Preview resuelto:</p>
                    <p className="whitespace-pre-wrap" style={{ color: C.text }}>{spintaxPreview}</p>
                  </div>
                )}
              </div>

              {/* Destinatarios */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: C.muted }}>Destinatarios</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {(['all', 'selected'] as const).map(m => (
                    <button key={m} onClick={() => setBcTargetMode(m)}
                      className="py-2 rounded-xl text-xs font-medium"
                      style={{ background: bcTargetMode === m ? C.accent : C.bg, border: `1px solid ${bcTargetMode === m ? C.accent : C.border}`, color: bcTargetMode === m ? '#fff' : C.muted }}>
                      {m === 'all' ? `Todos los grupos (${groups.length})` : 'Grupos específicos'}
                    </button>
                  ))}
                </div>
                {bcTargetMode === 'selected' && groups.length > 0 && (
                  <div className="space-y-2 max-h-36 overflow-y-auto">
                    {groups.map(g => (
                      <button key={g.id} onClick={() => toggleBcGroup(g.whapi_group_id)}
                        className="w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm"
                        style={{ background: bcSelectedGroups.includes(g.whapi_group_id) ? '#00b0f615' : C.bg, border: `1px solid ${bcSelectedGroups.includes(g.whapi_group_id) ? C.accent : C.border}` }}>
                        <span style={{ color: C.text }}>{g.name}</span>
                        <div className="w-4 h-4 rounded flex items-center justify-center text-xs font-bold"
                          style={{ background: bcSelectedGroups.includes(g.whapi_group_id) ? C.accent : C.border, color: '#fff' }}>
                          {bcSelectedGroups.includes(g.whapi_group_id) ? '✓' : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Programar */}
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: C.muted }}>Envío</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['now', 'later'] as const).map(m => (
                    <button key={m} onClick={() => setBcScheduleMode(m)}
                      className="py-2 rounded-xl text-xs font-medium"
                      style={{ background: bcScheduleMode === m ? '#FFB80020' : C.bg, border: `1px solid ${bcScheduleMode === m ? C.warning : C.border}`, color: bcScheduleMode === m ? C.warning : C.muted }}>
                      {m === 'now' ? '⚡ Ahora' : '🕐 Programar'}
                    </button>
                  ))}
                </div>
                {bcScheduleMode === 'later' && (
                  <input type="datetime-local" value={bcScheduledAt} onChange={e => setBcScheduledAt(e.target.value)}
                    className="w-full mt-2 rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
                )}
              </div>

              {/* Anti-ban notice */}
              <div className="rounded-xl p-3 text-xs" style={{ background: '#FFB80010', border: '1px solid #FFB80030' }}>
                <p className="font-medium mb-1" style={{ color: C.warning }}>⚠️ Anti-ban activo</p>
                <p style={{ color: C.muted }}>Delay aleatorio 3–8s entre grupos · spintax aplicado automáticamente · máx 5 grupos/día recomendado.</p>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 flex gap-3" style={{ borderTop: `1px solid ${C.border}` }}>
              <button onClick={() => setShowBroadcastModal(false)}
                className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted }}>
                Cancelar
              </button>
              <button onClick={() => handleSaveBroadcast(false)} disabled={savingBroadcast}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: C.card, border: `1px solid ${C.border}`, color: C.text, opacity: savingBroadcast ? 0.7 : 1 }}>
                {savingBroadcast ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                {bcScheduleMode === 'later' ? 'Programar' : 'Guardar borrador'}
              </button>
              <button onClick={() => handleSaveBroadcast(true)} disabled={savingBroadcast}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: C.success, color: '#0A0A0F', opacity: savingBroadcast ? 0.7 : 1 }}>
                {savingBroadcast ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Enviar ahora
              </button>
            </div>

          </div>
        </div>
      )}
      
      {/* ══ MODAL: CONECTAR CANAL ══ */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowConnectModal(false) }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: '#111118', border: `1px solid ${C.border}` }}>
            <h3 className="font-bold text-lg" style={{ color: C.text }}>Conectar canal Whapi</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>Nombre</label>
                <input value={channelName} onChange={e => setChannelName(e.target.value)}
                  className="w-full rounded-xl px-3 py-2.5 text-sm"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>WHAPI_TOKEN</label>
                <input value={whapiToken} onChange={e => setWhapiToken(e.target.value)}
                  placeholder="pIfKj1Pag..." className="w-full rounded-xl px-3 py-2.5 text-sm font-mono"
                  style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>Channel ID</label>
                  <input value={whapiChannelId} onChange={e => setWhapiChannelId(e.target.value)}
                    placeholder="IRONMN-GYC4V" className="w-full rounded-xl px-3 py-2.5 text-sm font-mono"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>Número B</label>
                  <input value={whapiNumber} onChange={e => setWhapiNumber(e.target.value)}
                    placeholder="+593969416349" className="w-full rounded-xl px-3 py-2.5 text-sm"
                    style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.text }} />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowConnectModal(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted }}>Cancelar</button>
              <button onClick={handleSaveChannel} disabled={savingChannel}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: C.accent, color: '#fff', opacity: savingChannel ? 0.7 : 1 }}>
                {savingChannel ? <Loader2 size={14} className="animate-spin" /> : <Key size={14} />}
                {savingChannel ? 'Guardando...' : 'Conectar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: CREAR GRUPO ══ */}
      {showCreateGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.8)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreateGroup(false) }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5" style={{ background: '#111118', border: `1px solid ${C.border}` }}>
            <div>
              <h3 className="font-bold text-lg" style={{ color: C.text }}>Crear grupo</h3>
              <p className="text-sm mt-1" style={{ color: C.muted }}>Nombre auto-incremental · se crea en WhatsApp</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium block mb-2" style={{ color: C.muted }}>Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['main','vip','broadcast'] as const).map(t => (
                    <button key={t} onClick={() => setGroupType(t)} className="py-2 rounded-xl text-xs font-medium"
                      style={{ background: groupType === t ? C.accent : C.bg, border: `1px solid ${groupType === t ? C.accent : C.border}`, color: groupType === t ? '#fff' : C.muted }}>
                      {t === 'main' ? 'Principal' : t === 'vip' ? 'VIP' : 'Broadcast'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: C.muted }}>
                  Límite: <span style={{ color: C.accent }}>{groupLimit}</span> miembros
                </label>
                <input type="range" min={100} max={950} step={50} value={groupLimit}
                  onChange={e => setGroupLimit(Number(e.target.value))} className="w-full" />
                <div className="flex justify-between text-xs mt-1" style={{ color: C.muted }}>
                  <span>100</span><span style={{ color: C.warning }}>⚠️ máx: 950</span><span>950</span>
                </div>
              </div>
              <div className="rounded-xl p-3 text-xs" style={{ background: '#00FF9410', border: '1px solid #00FF9430' }}>
                <p style={{ color: C.muted }}>
                  Se creará: <strong style={{ color: C.text }}>
                    {groupType === 'main'
                      ? `Growth Partner Club ${groups.filter(g => g.group_type === 'main').length + 1}`
                      : groupType === 'vip'
                      ? `GPC VIP ${groups.filter(g => g.group_type === 'vip').length + 1}`
                      : `GPC Broadcast ${groups.filter(g => g.group_type === 'broadcast').length + 1}`}
                  </strong>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreateGroup(false)} className="flex-1 py-2.5 rounded-xl text-sm"
                style={{ background: C.bg, border: `1px solid ${C.border}`, color: C.muted }}>Cancelar</button>
              <button onClick={handleCreateGroup} disabled={creatingGroup}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                style={{ background: C.success, color: '#0A0A0F', opacity: creatingGroup ? 0.7 : 1 }}>
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
