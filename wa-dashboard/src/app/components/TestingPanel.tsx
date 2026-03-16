'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Play, CheckCircle, XCircle, AlertTriangle, Clock,
  RefreshCw, ExternalLink, Copy, ChevronDown, ChevronRight,
} from 'lucide-react'

// ─── TYPES ────────────────────────────────────────────────────────────────────

type TestStatus = 'idle' | 'running' | 'pass' | 'fail' | 'warning'

interface TestState {
  status: TestStatus
  summary: string
  rows: Array<Record<string, unknown>>
}

const IDLE: TestState = { status: 'idle', summary: '', rows: [] }

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function statusColor(s: TestStatus) {
  return s === 'pass'    ? 'var(--success)'
       : s === 'fail'    ? 'var(--danger)'
       : s === 'warning' ? 'var(--warning)'
       : s === 'running' ? 'var(--accent)'
       : 'var(--text-muted)'
}

function StatusBadge({ status }: { status: TestStatus }) {
  const labels: Record<TestStatus, string> = {
    idle: 'PENDIENTE', running: 'EJECUTANDO', pass: 'OK', fail: 'FALLO', warning: 'ALERTA',
  }
  const cls: Record<TestStatus, string> = {
    idle: 'k-badge-muted', running: 'k-badge-info', pass: 'k-badge-success',
    fail: 'k-badge-danger', warning: 'k-badge-warning',
  }
  return <span className={`k-badge ${cls[status]}`}>{labels[status]}</span>
}

function StatusIcon({ status }: { status: TestStatus }) {
  if (status === 'pass')    return <CheckCircle  size={14} style={{ color: 'var(--success)' }} />
  if (status === 'fail')    return <XCircle      size={14} style={{ color: 'var(--danger)'  }} />
  if (status === 'warning') return <AlertTriangle size={14} style={{ color: 'var(--warning)'  }} />
  if (status === 'running') return <RefreshCw    size={14} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
  return <Clock size={14} style={{ color: 'var(--text-muted)' }} />
}

// ─── TEST CARD ────────────────────────────────────────────────────────────────

function TestCard({
  number,
  title,
  desc,
  status,
  onRun,
  children,
  state,
  expandable = true,
}: {
  number: number
  title: string
  desc: string
  status: TestStatus
  onRun: () => void
  children?: React.ReactNode
  state: TestState
  expandable?: boolean
}) {
  const [open, setOpen] = useState(false)
  const hasResults = state.rows.length > 0 || state.summary !== ''

  return (
    <div className="k-card" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Number */}
        <div style={{
          width: '28px', height: '28px', borderRadius: 'var(--radius-md)',
          background: status === 'idle' ? 'var(--bg-card-2)' : `${statusColor(status)}18`,
          border: `1px solid ${status === 'idle' ? 'var(--border-default)' : statusColor(status)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', fontWeight: 700,
          color: status === 'idle' ? 'var(--text-muted)' : statusColor(status),
          flexShrink: 0,
        }}>
          {number}
        </div>

        {/* Title + desc */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </span>
            <StatusBadge status={status} />
          </div>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '2px' }}>
            {desc}
          </p>
        </div>

        {/* Status icon + Run button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <StatusIcon status={status} />
          <button
            onClick={onRun}
            disabled={status === 'running'}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 12px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-default)',
              background: status === 'running' ? 'var(--bg-card-2)' : 'var(--bg-card-3)',
              color: status === 'running' ? 'var(--text-muted)' : 'var(--text-primary)',
              fontSize: 'var(--text-xs)', fontWeight: 600, cursor: status === 'running' ? 'not-allowed' : 'pointer',
              letterSpacing: 'var(--tracking-wide)', transition: 'all var(--duration-fast) var(--ease-out)',
            }}
          >
            <Play size={10} />
            {status === 'running' ? 'RUNNING...' : 'RUN'}
          </button>
          {expandable && hasResults && (
            <button
              onClick={() => setOpen(v => !v)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
        </div>
      </div>

      {/* Inputs (children) */}
      {children && (
        <div style={{ padding: '0 16px 12px', borderTop: '0.5px solid var(--border-subtle)' }}>
          {children}
        </div>
      )}

      {/* Summary */}
      {state.summary && (
        <div style={{
          margin: '0 16px 12px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-md)',
          background: status === 'pass' ? 'var(--success-bg)' : status === 'fail' ? 'var(--danger-bg)' : 'var(--warning-bg)',
          borderLeft: `2px solid ${statusColor(status)}`,
        }}>
          <p style={{ fontSize: 'var(--text-xs)', color: statusColor(status), fontFamily: 'var(--font-mono)', lineHeight: 1.5 }}>
            {state.summary}
          </p>
        </div>
      )}

      {/* Results table */}
      {expandable && open && state.rows.length > 0 && (
        <div style={{
          margin: '0 0 0', borderTop: '0.5px solid var(--border-subtle)',
          overflowX: 'auto', maxHeight: '240px', overflowY: 'auto',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
            <thead>
              <tr style={{ background: 'var(--bg-card-2)' }}>
                {Object.keys(state.rows[0]).map(k => (
                  <th key={k} style={{
                    padding: '6px 12px', textAlign: 'left', color: 'var(--text-muted)',
                    letterSpacing: 'var(--tracking-wide)', fontWeight: 600, whiteSpace: 'nowrap',
                    borderBottom: '0.5px solid var(--border-subtle)',
                  }}>
                    {k.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {state.rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: '0.5px solid var(--border-subtle)' }}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} style={{
                      padding: '5px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap',
                      maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {val === null || val === undefined ? (
                        <span style={{ color: 'var(--text-disabled)' }}>—</span>
                      ) : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── INPUT HELPERS ────────────────────────────────────────────────────────────

function TestInput({
  label, value, onChange, placeholder, multiline = false,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  multiline?: boolean
}) {
  const shared: React.CSSProperties = {
    width: '100%', background: 'var(--bg-base)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-sm)', padding: '7px 10px', color: 'var(--text-primary)',
    fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', outline: 'none',
    resize: 'none',
  }
  return (
    <div style={{ marginTop: '10px' }}>
      <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', letterSpacing: 'var(--tracking-wide)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
        {label}
      </label>
      {multiline
        ? <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={shared} />
        : <input    type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={shared} />
      }
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export function TestingPanel() {

  // ── Test 1: UTM Tracking ────────────────────────────────────────────────
  const [utmUrl,    setUtmUrl]    = useState('')
  const [t1, setT1] = useState<TestState>(IDLE)

  const runTest1 = useCallback(async () => {
    if (!utmUrl.trim()) {
      setT1({ status: 'warning', summary: 'Pega una URL con UTMs para comenzar.', rows: [] })
      return
    }
    setT1({ status: 'running', summary: '', rows: [] })
    try {
      let parsed: URL
      try { parsed = new URL(utmUrl) } catch { parsed = new URL('https://x.com?' + utmUrl) }

      const utms = {
        utm_source:   parsed.searchParams.get('utm_source')   || null,
        utm_medium:   parsed.searchParams.get('utm_medium')   || null,
        utm_campaign: parsed.searchParams.get('utm_campaign') || null,
        utm_content:  parsed.searchParams.get('utm_content')  || null,
        utm_term:     parsed.searchParams.get('utm_term')     || null,
      }

      const missing = Object.entries(utms).filter(([, v]) => !v).map(([k]) => k)

      // Query Supabase for contacts with this utm_source
      const { data: contacts } = await supabase
        .from('wa_contacts')
        .select('phone_number, name, utm_source, utm_medium, utm_campaign, created_at')
        .eq('utm_source', utms.utm_source ?? '')
        .order('created_at', { ascending: false })
        .limit(5)

      const rows = (contacts || []).map(c => ({
        phone:    c.phone_number,
        name:     c.name || '—',
        source:   c.utm_source || '—',
        medium:   c.utm_medium || '—',
        campaign: c.utm_campaign || '—',
        date:     c.created_at?.slice(0, 10) || '—',
      }))

      const utmParsed = Object.entries(utms).filter(([, v]) => v).length
      const supaCount = rows.length

      setT1({
        status: missing.length === 0 ? 'pass' : 'warning',
        summary: `UTMs parseados: ${utmParsed}/5${missing.length ? ` — Faltan: ${missing.join(', ')}` : ''}\nContacts en Supabase con utm_source="${utms.utm_source}": ${supaCount}`,
        rows,
      })
    } catch (e) {
      setT1({ status: 'fail', summary: `Error: ${e instanceof Error ? e.message : String(e)}`, rows: [] })
    }
  }, [utmUrl])

  // ── Test 2: Quiz → Supabase ─────────────────────────────────────────────
  const [t2, setT2] = useState<TestState>(IDLE)

  const runTest2 = useCallback(async () => {
    setT2({ status: 'running', summary: '', rows: [] })
    try {
      const { data, error } = await supabase
        .from('lead_quiz_responses')
        .select('id, contact_phone, score, answers, created_at')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw new Error(error.message)

      const rows = (data || []).map(r => ({
        phone:   r.contact_phone || '—',
        score:   r.score ?? '—',
        answers: Array.isArray(r.answers) ? r.answers.length : '—',
        date:    r.created_at?.slice(0, 10) || '—',
      }))

      const withScore   = (data || []).filter(r => r.score !== null && r.score !== undefined).length
      const withAnswers = (data || []).filter(r => Array.isArray(r.answers) && r.answers.length > 0).length
      const total       = (data || []).length

      setT2({
        status: total > 0 ? (withScore === total ? 'pass' : 'warning') : 'warning',
        summary: `Últimos ${total} registros — Con score: ${withScore}/${total} — Con respuestas: ${withAnswers}/${total}`,
        rows,
      })
    } catch (e) {
      setT2({ status: 'fail', summary: `Error: ${e instanceof Error ? e.message : String(e)}`, rows: [] })
    }
  }, [])

  // ── Test 3: NEXO / Andreti ──────────────────────────────────────────────
  const [nexoWebhook, setNexoWebhook] = useState('')
  const [nexoMessage, setNexoMessage] = useState('Hola, quiero información sobre el curso')
  const [t3, setT3] = useState<TestState>(IDLE)

  const runTest3 = useCallback(async () => {
    if (!nexoWebhook.trim()) {
      setT3({ status: 'warning', summary: 'Ingresa la URL del webhook de n8n para continuar.', rows: [] })
      return
    }
    setT3({ status: 'running', summary: '', rows: [] })
    try {
      const res = await fetch(nexoWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: nexoMessage, phone: 'test_kanshi', test: true }),
      })

      const text = await res.text()
      let body: Record<string, unknown> = {}
      try { body = JSON.parse(text) } catch { body = { raw: text } }

      const response = String(body.response ?? body.message ?? body.text ?? text ?? '')
      const hasMarkdown    = /[*_`#]/.test(response)
      const mentionsAndreti = /andreti/i.test(response)
      const hasContext     = response.length > 20

      const issues: string[] = []
      if (hasMarkdown)     issues.push('⚠ Contiene markdown')
      if (!mentionsAndreti) issues.push('⚠ No menciona "Andreti"')
      if (!hasContext)      issues.push('⚠ Respuesta demasiado corta')

      setT3({
        status: issues.length === 0 ? 'pass' : issues.length <= 1 ? 'warning' : 'fail',
        summary: `HTTP ${res.status} — ${issues.length === 0 ? 'Todas las validaciones OK ✓' : issues.join(' · ')}\n\nRespuesta: "${response.slice(0, 200)}${response.length > 200 ? '…' : ''}"`,
        rows: [],
      })
    } catch (e) {
      setT3({ status: 'fail', summary: `Error de red: ${e instanceof Error ? e.message : String(e)}`, rows: [] })
    }
  }, [nexoWebhook, nexoMessage])

  // ── Test 4: Meta CAPI ───────────────────────────────────────────────────
  const [t4, setT4] = useState<TestState>(IDLE)

  const runTest4 = useCallback(async () => {
    setT4({ status: 'running', summary: '', rows: [] })
    const payload = {
      event_name:      'ViewContent',
      event_time:      Math.floor(Date.now() / 1000),
      test_event_code: 'TEST_KANSHI_01',
      user_data:       { client_ip_address: '127.0.0.1', client_user_agent: 'KANSHI-Test/1.0' },
      custom_data:     { content_name: 'SamurAI Test', currency: 'USD', value: 0 },
    }
    try {
      const res = await fetch('/api/meta-capi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      const ok = res.status >= 200 && res.status < 300

      setT4({
        status: ok ? 'pass' : 'fail',
        summary: `HTTP ${res.status} — ${ok ? 'Evento enviado a Meta CAPI ✓' : 'Error en CAPI'}\nPayload: ${JSON.stringify(payload, null, 2)}${data.error ? `\nError: ${JSON.stringify(data.error)}` : ''}`,
        rows: ok ? [{ evento: 'ViewContent', codigo: 'TEST_KANSHI_01', http: res.status, timestamp: new Date().toISOString() }] : [],
      })
    } catch (e) {
      setT4({
        status: 'warning',
        summary: `No se pudo contactar /api/meta-capi (puede ser normal en local sin env vars).\nPayload preparado:\n${JSON.stringify(payload, null, 2)}`,
        rows: [],
      })
    }
  }, [])

  // ── Test 5: Correlaciones de datos ──────────────────────────────────────
  const [t5, setT5] = useState<TestState>(IDLE)

  const runTest5 = useCallback(async () => {
    setT5({ status: 'running', summary: '', rows: [] })
    try {
      const [
        { data: noScore },
        { data: noSource },
        { data: quizData },
        { data: allContacts },
      ] = await Promise.all([
        supabase.from('wa_contacts').select('phone_number, name').is('kanshi_score', null).limit(200),
        supabase.from('wa_contacts').select('phone_number, name').is('utm_source', null).limit(200),
        supabase.from('lead_quiz_responses').select('contact_phone').limit(500),
        supabase.from('wa_contacts').select('phone_number').limit(500),
      ])

      const quizPhones   = new Set(Array.from((quizData || []).map(r => r.contact_phone)))
      const allPhones    = Array.from((allContacts || []).map(c => c.phone_number))
      const noQuizPhones = allPhones.filter(p => !quizPhones.has(p))

      const rows = [
        { problema: 'Sin kanshi_score',   cantidad: (noScore  || []).length, ejemplo: (noScore  || [])[0]?.phone_number || '—' },
        { problema: 'Sin utm_source',     cantidad: (noSource || []).length, ejemplo: (noSource || [])[0]?.phone_number || '—' },
        { problema: 'Sin quiz responses', cantidad: noQuizPhones.length,      ejemplo: noQuizPhones[0] || '—' },
      ]

      const total   = (allContacts || []).length
      const issues  = rows.filter(r => (r.cantidad as number) > 0)
      const pct     = total > 0 ? Math.round(((total - (noScore || []).length) / total) * 100) : 0

      setT5({
        status: issues.length === 0 ? 'pass' : issues.length <= 1 ? 'warning' : 'fail',
        summary: `Total contacts: ${total} — Score completo: ${pct}% — Problemas encontrados: ${issues.length}`,
        rows,
      })
    } catch (e) {
      setT5({ status: 'fail', summary: `Error: ${e instanceof Error ? e.message : String(e)}`, rows: [] })
    }
  }, [])

  // ── Test 6: Templates WA ────────────────────────────────────────────────
  const [t6, setT6] = useState<TestState>(IDLE)

  const runTest6 = useCallback(async () => {
    setT6({ status: 'running', summary: '', rows: [] })
    try {
      const { data, error } = await supabase
        .from('wa_templates')
        .select('name, display_name, status, language, category')
        .order('status')

      if (error) throw new Error(error.message)

      const templates = data || []
      const approved    = templates.filter(t => t.status === 'APPROVED').length
      const rejected    = templates.filter(t => t.status === 'REJECTED').length
      const pending     = templates.filter(t => t.status === 'PENDING').length
      const englishLangs = ['en', 'en_US', 'en_GB']
      const english = templates.filter(t => englishLangs.includes(t.language))
      const wrongLang = templates.filter(t => t.language && !['es', 'es_EC', 'es_MX', 'es_AR', 'es_419'].includes(t.language) && !englishLangs.includes(t.language))

      const rows = templates.map(t => ({
        nombre:    t.name || '—',
        estado:    t.status || '—',
        idioma:    t.language || '—',
        categoria: t.category || '—',
        alerta:    englishLangs.includes(t.language) ? '⚠ INGLÉS' : t.status === 'REJECTED' ? '🔴 RECHAZADO' : '✓',
      }))

      const hasIssues = rejected > 0 || english.length > 0

      setT6({
        status: hasIssues ? (rejected > 0 ? 'fail' : 'warning') : templates.length === 0 ? 'warning' : 'pass',
        summary: `Total: ${templates.length} — Aprobados: ${approved} — Pendientes: ${pending} — Rechazados: ${rejected}${english.length > 0 ? `\n⚠ ${english.length} template(s) en INGLÉS: ${english.map(t => t.name).join(', ')}` : ''}${wrongLang.length > 0 ? `\n⚠ Idioma no estándar: ${wrongLang.map(t => `${t.name} (${t.language})`).join(', ')}` : ''}`,
        rows,
      })
    } catch (e) {
      setT6({ status: 'fail', summary: `Error: ${e instanceof Error ? e.message : String(e)}`, rows: [] })
    }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────

  const allTests = [t1, t2, t3, t4, t5, t6]
  const passed   = allTests.filter(t => t.status === 'pass').length
  const failed   = allTests.filter(t => t.status === 'fail').length
  const warnings = allTests.filter(t => t.status === 'warning').length
  const ran      = allTests.filter(t => t.status !== 'idle').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Suite summary ── */}
      <div className="k-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
          <p className="k-section-title" style={{ marginBottom: 0 }}>TESTING SUITE — SISTEMA</p>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {ran}/6 ejecutados
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span className="k-badge k-badge-success">✓ {passed} OK</span>
          {warnings > 0 && <span className="k-badge k-badge-warning">⚠ {warnings} ALERTA</span>}
          {failed   > 0 && <span className="k-badge k-badge-danger">✕ {failed} FALLO</span>}
          {ran === 0 && <span className="k-badge k-badge-muted">Sin ejecutar</span>}
        </div>
        {ran > 0 && (
          <div className="k-progress" style={{ marginTop: '12px' }}>
            <div className="k-progress-fill" style={{
              width: `${(passed / 6) * 100}%`,
              background: failed > 0 ? 'var(--danger)' : warnings > 0 ? 'var(--warning)' : 'var(--success)',
            }} />
          </div>
        )}
      </div>

      {/* ── Test 1: UTM Tracking ── */}
      <TestCard
        number={1} title="UTM Tracking" state={t1} status={t1.status} onRun={runTest1}
        desc="Parsea una URL con UTMs y verifica que los campos lleguen a wa_contacts en Supabase."
      >
        <TestInput
          label="URL CON UTMs"
          value={utmUrl}
          onChange={setUtmUrl}
          placeholder="https://tudominio.com/landing?utm_source=meta&utm_medium=paid&utm_campaign=samuai_captacion"
        />
      </TestCard>

      {/* ── Test 2: Quiz → Supabase ── */}
      <TestCard
        number={2} title="Quiz → Supabase" state={t2} status={t2.status} onRun={runTest2}
        desc="Consulta lead_quiz_responses y verifica que el score se esté calculando correctamente."
      />

      {/* ── Test 3: NEXO / Andreti ── */}
      <TestCard
        number={3} title="NEXO / Andreti" state={t3} status={t3.status} onRun={runTest3}
        desc="Envía un mensaje al agente y verifica: sin markdown, menciona Andreti, contexto inyectado."
      >
        <TestInput
          label="WEBHOOK URL (n8n)"
          value={nexoWebhook}
          onChange={setNexoWebhook}
          placeholder="https://n8n.tudominio.com/webhook/andreti-test"
        />
        <TestInput
          label="MENSAJE DE PRUEBA"
          value={nexoMessage}
          onChange={setNexoMessage}
          placeholder="Hola, quiero información sobre el curso"
        />
      </TestCard>

      {/* ── Test 4: Meta CAPI ── */}
      <TestCard
        number={4} title="Meta CAPI" state={t4} status={t4.status} onRun={runTest4}
        desc="Dispara un evento ViewContent con test_event_code hacia /api/meta-capi y muestra el response."
      />

      {/* ── Test 5: Correlaciones de datos ── */}
      <TestCard
        number={5} title="Correlaciones de datos" state={t5} status={t5.status} onRun={runTest5}
        desc="Detecta leads sin score, sin quiz responses y sin utm_source en Supabase."
      />

      {/* ── Test 6: Templates WA ── */}
      <TestCard
        number={6} title="Templates WA" state={t6} status={t6.status} onRun={runTest6}
        desc="Lista todos los templates de WhatsApp, verifica estado APPROVED y alerta si hay idioma incorrecto."
      />

    </div>
  )
}
