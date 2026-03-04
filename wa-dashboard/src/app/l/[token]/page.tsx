import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface LandingData {
  id: string
  token: string
  status: string
  headline: string
  subheadline: string
  body_dolor: string
  body_solucion: string
  carta_autor: string
  faq: { q: string; a: string }[]
  pain_point: string
  dream_state: string
  plans: Plan[]
  recommended_plan_id: string
  view_count: number
  project_id: string
  contact_id: string
  wa_contacts: {
    name: string
    phone_number: string
  }
  kanshi_projects: {
    product_name: string
    name: string
    logo_url: string | null
    color: string | null
    cart_close: string | null
    hormozi_config: any
  }
}

interface Plan {
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

async function getLanding(token: string): Promise<LandingData | null> {
  const { data, error } = await supabase
    .from('landing_pages')
    .select(`
      *,
      wa_contacts(name, phone_number),
      kanshi_projects(product_name, name, logo_url, color, cart_close, hormozi_config)
    `)
    .eq('token', token)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  // Tracking: increment view_count + set viewed_at
  await supabase
    .from('landing_pages')
    .update({
      view_count: (data.view_count || 0) + 1,
      viewed_at: data.viewed_at || new Date().toISOString(),
      last_viewed_at: new Date().toISOString(),
    })
    .eq('token', token)

  return data as LandingData
}

function Countdown({ cartClose }: { cartClose: string }) {
  // Client component workaround — rendered as static with data attribute
  const target = new Date(cartClose).getTime()
  const now = Date.now()
  const diff = target - now

  if (diff <= 0) return null

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  return (
    <div className="flex items-center justify-center gap-3 my-6">
      {[
        { val: days, label: 'DÍAS' },
        { val: hours, label: 'HORAS' },
        { val: mins, label: 'MIN' },
      ].map(({ val, label }) => (
        <div key={label} className="flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{ background: '#111118', border: '1px solid #1E1E2E', color: '#00FF94' }}>
            {String(val).padStart(2, '0')}
          </div>
          <span className="text-[9px] mt-1 tracking-widest" style={{ color: '#4A4A6A', fontFamily: 'monospace' }}>{label}</span>
        </div>
      ))}
    </div>
  )
}

export default async function LandingPage({ params }: { params: { token: string } }) {
  const landing = await getLanding(params.token)

  if (!landing) notFound()

  const proj = landing.kanshi_projects
  const config = proj.hormozi_config || {}
  const accentColor = proj.color || '#0014ad'
  const leadName = landing.wa_contacts?.name?.split(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/)[0]?.trim() || 'Tú'
  const productName = proj.product_name || proj.name
  const authorName = config.letter_author_name || 'El Fundador'
  const authorTitle = config.letter_author_title || `Fundador de ${productName}`
  const guaranteeDays = config.guarantee_days || 30
  const guaranteeText = config.guarantee_text || `${guaranteeDays} días de garantía total`
  const urgencyReason = config.urgency_reason || ''
  const offerStack: { name: string; value: number }[] = config.offer_stack || []
  const totalValue = offerStack.reduce((s: number, o: any) => s + (o.value || 0), 0)
  const testimonials: { name: string; text: string; result: string }[] = config.testimonials || []
  const plans: Plan[] = landing.plans || []
  const highlightPlan = plans.find(p => p.id === landing.recommended_plan_id) || plans.find(p => p.highlight) || plans[0]
  const otherPlan = plans.find(p => p.id !== highlightPlan?.id)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A0A0F; color: #E0E0F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        .mono { font-family: 'SF Mono', 'Fira Code', monospace; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp 0.6s ease forwards; }
        .fade-up-2 { animation: fadeUp 0.6s 0.2s ease both; }
        .fade-up-3 { animation: fadeUp 0.6s 0.4s ease both; }
        .gradient-text {
          background: linear-gradient(135deg, #fff 0%, ${accentColor} 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .btn-primary {
          background: linear-gradient(135deg, ${accentColor}, #00b0f6);
          color: #fff; border: none; cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 32px ${accentColor}60; }
        .card { background: #111118; border: 1px solid #1E1E2E; border-radius: 20px; }
        .highlight-card { border-color: ${accentColor}; }
        .checkmark { color: #00FF94; }
        .powered { opacity: 0.4; transition: opacity 0.2s; }
        .powered:hover { opacity: 0.8; }
        .corner-badge {
          position: fixed; bottom: 24px; right: 24px; z-index: 50;
          background: #111118; border: 1px solid #1E1E2E;
          padding: 8px 14px; border-radius: 100px;
          font-family: monospace; font-size: 10px; color: #4A4A6A;
          text-decoration: none; transition: all 0.2s;
        }
        .corner-badge:hover { border-color: ${accentColor}; color: #E0E0F0; }
      `}</style>

      {/* HEADER */}
      <header style={{ borderBottom: '1px solid #1E1E2E', background: '#0A0A0F' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {proj.logo_url ? (
            <img src={proj.logo_url} alt={productName} style={{ height: 36, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', color: '#E0E0F0' }}>
              {productName}
            </span>
          )}
          {urgencyReason && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#FF6B3510', border: '1px solid #FF6B3530', borderRadius: 100, padding: '6px 14px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#FF6B35', animation: 'pulse 1.5s infinite' }} />
              <span className="mono" style={{ fontSize: 10, color: '#FF6B35', letterSpacing: '0.05em' }}>{urgencyReason}</span>
            </div>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px 120px' }}>

        {/* HERO */}
        <section className="fade-up" style={{ textAlign: 'center', padding: '72px 0 48px' }}>
          <div className="mono" style={{ fontSize: 11, color: accentColor, letterSpacing: '0.15em', marginBottom: 24 }}>
            MENSAJE ESPECIAL PARA {leadName.toUpperCase()}
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, letterSpacing: '-1px' }}>
            <span className="gradient-text">{landing.headline}</span>
          </h1>
          <p style={{ fontSize: 18, color: '#A0A0C0', lineHeight: 1.7, maxWidth: 640, margin: '0 auto 40px' }}>
            {landing.subheadline}
          </p>

          {/* Countdown */}
          {proj.cart_close && <Countdown cartClose={proj.cart_close} />}

          {/* CTA principal */}
          {highlightPlan && (
            <a href={highlightPlan.cta_url} className="btn-primary" style={{ display: 'inline-block', padding: '18px 48px', borderRadius: 100, fontSize: 16, fontWeight: 800, textDecoration: 'none', letterSpacing: '0.02em' }}>
              {highlightPlan.cta_text || `Quiero ${productName} →`}
            </a>
          )}
          <p className="mono" style={{ fontSize: 10, color: '#4A4A6A', marginTop: 16, letterSpacing: '0.1em' }}>
            ✓ {guaranteeText}
          </p>
        </section>

        {/* DOLOR */}
        <section className="fade-up-2" style={{ padding: '64px 0' }}>
          <div className="card" style={{ padding: '48px' }}>
            <div className="mono" style={{ fontSize: 10, color: '#FF6B35', letterSpacing: '0.15em', marginBottom: 20 }}>
              ¿TE SUENA FAMILIAR, {leadName.toUpperCase()}?
            </div>
            {landing.body_dolor.split('\n\n').map((p, i) => (
              <p key={i} style={{ fontSize: 17, color: '#C0C0D8', lineHeight: 1.8, marginBottom: 16 }}>{p}</p>
            ))}
          </div>
        </section>

        {/* SOLUCIÓN */}
        <section style={{ padding: '0 0 64px' }}>
          <div className="card" style={{ padding: '48px', borderColor: `${accentColor}40` }}>
            <div className="mono" style={{ fontSize: 10, color: accentColor, letterSpacing: '0.15em', marginBottom: 20 }}>
              HAY UNA MEJOR MANERA
            </div>
            {landing.body_solucion.split('\n\n').map((p, i) => (
              <p key={i} style={{ fontSize: 17, color: '#C0C0D8', lineHeight: 1.8, marginBottom: 16 }}>{p}</p>
            ))}
          </div>
        </section>

        {/* CARTA DEL AUTOR */}
        <section style={{ padding: '0 0 64px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{
              background: 'linear-gradient(135deg, #13131f, #0f0f1a)',
              border: '1px solid #2E2E4E',
              borderRadius: 24,
              padding: '48px 56px',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Decoración esquina */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: 200, height: 200, background: `radial-gradient(circle, ${accentColor}15, transparent 70%)`, pointerEvents: 'none' }} />

              <div className="mono" style={{ fontSize: 10, color: '#4A4A6A', letterSpacing: '0.15em', marginBottom: 32 }}>
                CARTA PERSONAL DE {authorName.toUpperCase()}
              </div>

              <div style={{ fontSize: 17, color: '#D0D0E8', lineHeight: 1.9, whiteSpace: 'pre-line' }}>
                {landing.carta_autor}
              </div>

              {/* Firma */}
              <div style={{ marginTop: 40, paddingTop: 32, borderTop: '1px solid #1E1E2E' }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: '#E0E0F0', fontStyle: 'italic' }}>{authorName}</p>
                <p className="mono" style={{ fontSize: 11, color: '#4A4A6A', marginTop: 4 }}>{authorTitle}</p>
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 32, height: 2, background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />
                  <span className="mono" style={{ fontSize: 9, color: accentColor, letterSpacing: '0.1em' }}>FIRMADO PARA {leadName.toUpperCase()}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* OFFER STACK */}
        {offerStack.length > 0 && (
          <section style={{ padding: '0 0 64px' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div className="mono" style={{ fontSize: 10, color: accentColor, letterSpacing: '0.15em', marginBottom: 12 }}>TODO LO QUE TE LLEVAS</div>
              <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 900 }}>La oferta completa de <span style={{ color: accentColor }}>{productName}</span></h2>
            </div>
            <div className="card" style={{ padding: '40px 48px' }}>
              {offerStack.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderBottom: i < offerStack.length - 1 ? '1px solid #1E1E2E' : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✓</div>
                    <span style={{ fontSize: 16, color: '#E0E0F0' }}>{item.name}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 13, color: '#4A4A6A', textDecoration: 'line-through' }}>${item.value.toLocaleString()}</span>
                    <span className="mono" style={{ fontSize: 10, color: '#00FF94', marginLeft: 8 }}>INCLUIDO</span>
                  </div>
                </div>
              ))}
              {/* Total */}
              <div style={{ marginTop: 24, paddingTop: 24, borderTop: `2px solid ${accentColor}40`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="mono" style={{ fontSize: 12, color: '#4A4A6A', letterSpacing: '0.1em' }}>VALOR TOTAL PERCIBIDO</span>
                <div>
                  <span style={{ fontSize: 28, fontWeight: 900, color: '#4A4A6A', textDecoration: 'line-through', marginRight: 12 }}>${totalValue.toLocaleString()}</span>
                  {highlightPlan && (
                    <span style={{ fontSize: 36, fontWeight: 900, color: '#00FF94' }}>${highlightPlan.price_real.toLocaleString()}</span>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* PLANES */}
        {plans.length > 0 && (
          <section style={{ padding: '0 0 64px' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div className="mono" style={{ fontSize: 10, color: accentColor, letterSpacing: '0.15em', marginBottom: 12 }}>ELIGE TU PLAN</div>
              <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 900 }}>¿Con qué nivel empiezas, {leadName}?</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: plans.length > 1 ? '1fr 1fr' : '1fr', gap: 20 }}>
              {plans.map(plan => (
                <div key={plan.id} className={`card ${plan.highlight ? 'highlight-card' : ''}`}
                  style={{ padding: '36px', position: 'relative', borderColor: plan.highlight ? accentColor : '#1E1E2E' }}>
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: `linear-gradient(135deg,${accentColor},#00b0f6)`, color: '#fff', padding: '4px 20px', borderRadius: 100, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                      {plan.badge}
                    </div>
                  )}
                  <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 20, color: plan.highlight ? '#fff' : '#A0A0C0' }}>{plan.name}</h3>
                  <div style={{ marginBottom: 24 }}>
                    <span style={{ fontSize: 18, color: '#4A4A6A', textDecoration: 'line-through' }}>${plan.price_anchor.toLocaleString()}</span>
                    <div style={{ fontSize: 48, fontWeight: 900, lineHeight: 1, color: plan.highlight ? '#00FF94' : '#E0E0F0', margin: '8px 0' }}>
                      ${plan.price_real.toLocaleString()}
                    </div>
                    <span className="mono" style={{ fontSize: 11, color: '#4A4A6A' }}>{plan.billing}</span>
                  </div>
                  <ul style={{ listStyle: 'none', marginBottom: 32, space: '8px' }}>
                    {plan.features.filter(f => f.trim()).map((feat, i) => (
                      <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 10 }}>
                        <span className="checkmark" style={{ flexShrink: 0, marginTop: 2 }}>✓</span>
                        <span style={{ fontSize: 14, color: '#C0C0D8' }}>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={plan.cta_url} className={plan.highlight ? 'btn-primary' : ''}
                    style={{
                      display: 'block', textAlign: 'center', padding: '16px 32px',
                      borderRadius: 100, fontSize: 15, fontWeight: 800, textDecoration: 'none',
                      background: plan.highlight ? `linear-gradient(135deg,${accentColor},#00b0f6)` : 'transparent',
                      color: plan.highlight ? '#fff' : '#A0A0C0',
                      border: plan.highlight ? 'none' : '1px solid #2E2E4E',
                      transition: 'all 0.2s'
                    }}>
                    {plan.cta_text || `Elegir ${plan.name} →`}
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* GARANTÍA */}
        <section style={{ padding: '0 0 64px' }}>
          <div style={{ background: 'linear-gradient(135deg,#00FF9410,#00b0f610)', border: '1px solid #00FF9430', borderRadius: 24, padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: 56, marginBottom: 20 }}>🛡️</div>
            <h3 style={{ fontSize: 28, fontWeight: 900, marginBottom: 12, color: '#00FF94' }}>Garantía de {guaranteeDays} días</h3>
            <p style={{ fontSize: 17, color: '#C0C0D8', maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>{guaranteeText}</p>
          </div>
        </section>

        {/* TESTIMONIOS */}
        {testimonials.length > 0 && testimonials.some(t => t.name) && (
          <section style={{ padding: '0 0 64px' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div className="mono" style={{ fontSize: 10, color: accentColor, letterSpacing: '0.15em', marginBottom: 12 }}>RESULTADOS REALES</div>
              <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 900 }}>Lo que dicen quienes ya lo vivieron</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(testimonials.length, 2)}, 1fr)`, gap: 20 }}>
              {testimonials.filter(t => t.name).map((t, i) => (
                <div key={i} className="card" style={{ padding: '32px' }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                    {[...Array(5)].map((_, j) => <span key={j} style={{ color: '#FFB800', fontSize: 16 }}>★</span>)}
                  </div>
                  <p style={{ fontSize: 15, color: '#C0C0D8', lineHeight: 1.7, marginBottom: 24, fontStyle: 'italic' }}>"{t.text}"</p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#E0E0F0' }}>{t.name}</p>
                    </div>
                    {t.result && (
                      <div style={{ background: '#00FF9415', border: '1px solid #00FF9430', borderRadius: 100, padding: '4px 14px' }}>
                        <span className="mono" style={{ fontSize: 10, color: '#00FF94' }}>{t.result}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FAQ */}
        {landing.faq?.length > 0 && (
          <section style={{ padding: '0 0 64px' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div className="mono" style={{ fontSize: 10, color: accentColor, letterSpacing: '0.15em', marginBottom: 12 }}>PREGUNTAS FRECUENTES</div>
              <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 900 }}>Resolvemos tus dudas</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {landing.faq.map((item, i) => (
                <div key={i} className="card" style={{ padding: '28px 32px' }}>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#E0E0F0', marginBottom: 12 }}>
                    <span style={{ color: accentColor, marginRight: 10 }}>Q.</span>{item.q}
                  </p>
                  <p style={{ fontSize: 15, color: '#A0A0C0', lineHeight: 1.7 }}>{item.a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CTA FINAL */}
        <section style={{ padding: '0 0 64px', textAlign: 'center' }}>
          <div style={{ background: `linear-gradient(135deg,${accentColor}20,#00b0f620)`, border: `1px solid ${accentColor}40`, borderRadius: 32, padding: '64px 48px' }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, marginBottom: 16, lineHeight: 1.2 }}>
              {leadName}, este es tu momento. 🔥
            </h2>
            <p style={{ fontSize: 17, color: '#A0A0C0', marginBottom: 40, lineHeight: 1.7, maxWidth: 480, margin: '0 auto 40px' }}>
              Cada día que esperas es un día más lejos de <strong style={{ color: '#E0E0F0' }}>{config.dream_outcome || 'tu meta'}</strong>.
            </p>
            {highlightPlan && (
              <a href={highlightPlan.cta_url} className="btn-primary"
                style={{ display: 'inline-block', padding: '20px 56px', borderRadius: 100, fontSize: 18, fontWeight: 900, textDecoration: 'none', letterSpacing: '0.02em' }}>
                {highlightPlan.cta_text || `Sí, quiero ${productName} →`}
              </a>
            )}
            <p className="mono" style={{ fontSize: 10, color: '#4A4A6A', marginTop: 20, letterSpacing: '0.1em' }}>
              🛡️ {guaranteeText} · {urgencyReason}
            </p>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid #1E1E2E', padding: '32px 24px', textAlign: 'center', background: '#0A0A0F' }}>
        <p className="mono powered" style={{ fontSize: 10, color: '#4A4A6A', letterSpacing: '0.1em' }}>
          ⚡ Powered by KANSHI · Sistema Operativo de Lanzamientos · Santiago Jiménez
        </p>
        <p className="mono" style={{ fontSize: 9, color: '#2E2E4E', marginTop: 8, letterSpacing: '0.05em' }}>
          © 2026 Santiago Jiménez · Todos los derechos reservados
        </p>
      </footer>

      {/* CORNER BADGE */}
      <a href="https://kanshi.app" className="corner-badge" title="Powered by KANSHI">
        ⚡ by KANSHI
      </a>
    </>
  )
}

export const dynamic = 'force-dynamic'
