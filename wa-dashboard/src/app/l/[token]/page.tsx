import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface Plan {
  id: string; name: string; badge: string | null
  price_anchor: number; price_real: number; billing: string
  cta_text: string; cta_url: string; highlight: boolean; features: string[]
}
interface OfferItem { name: string; value: number }
interface Testimonial { name: string; text: string; result: string }
interface FaqItem { q: string; a: string }

interface LandingData {
  id: string; token: string; status: string
  headline: string; subheadline: string
  body_dolor: string; body_solucion: string; carta_autor: string
  faq: FaqItem[]; pain_point: string; dream_state: string
  plans: Plan[]; recommended_plan_id: string; view_count: number
  wa_contacts: { name: string; phone_number: string }
  kanshi_projects: {
    product_name: string; name: string; logo_url: string | null
    color: string | null; cart_close: string | null; hormozi_config: any
  }
}

async function getLanding(token: string): Promise<LandingData | null> {
  const { data, error } = await supabase
    .from('landing_pages')
    .select(`*, wa_contacts(name, phone_number), kanshi_projects(product_name, name, logo_url, color, cart_close, hormozi_config)`)
    .eq('token', token)
    .eq('status', 'active')
    .single()
  if (error || !data) return null
  await supabase.from('landing_pages').update({
    view_count: (data.view_count || 0) + 1,
    viewed_at: data.viewed_at || new Date().toISOString(),
    last_viewed_at: new Date().toISOString(),
  }).eq('token', token)
  return data as LandingData
}

function getTimeLeft(cartClose: string) {
  const diff = new Date(cartClose).getTime() - Date.now()
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    secs: Math.floor((diff % (1000 * 60)) / 1000),
    iso: cartClose,
  }
}

export default async function LandingPage({ params }: { params: { token: string } }) {
  const landing = await getLanding(params.token)
  if (!landing) notFound()

  const proj = landing.kanshi_projects
  const config = proj.hormozi_config || {}
  const accent = proj.color || '#0014ad'
  const leadName = landing.wa_contacts?.name?.split(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/)[0]?.trim() || 'Tú'
  const productName = proj.product_name || proj.name
  const authorName = config.letter_author_name || 'El Fundador'
  const authorTitle = config.letter_author_title || `Fundador de ${productName}`
  const guaranteeDays = config.guarantee_days || 30
  const guaranteeText = config.guarantee_text || `Si no ves resultados en ${guaranteeDays} días, te devuelvo el 100%`
  const urgencyReason = config.urgency_reason || ''
  const dreamOutcome = config.dream_outcome || `lograr resultados extraordinarios`
  const offerStack: OfferItem[] = config.offer_stack || []
  const totalValue = offerStack.reduce((s, o) => s + (o.value || 0), 0)
  const testimonials: Testimonial[] = (config.testimonials || []).filter((t: Testimonial) => t.name)
  const plans: Plan[] = landing.plans || []
  const recPlan = plans.find(p => p.id === landing.recommended_plan_id) || plans.find(p => p.highlight) || plans[0]
  const timeLeft = proj.cart_close ? getTimeLeft(proj.cart_close) : null

  const marqueeItems = [
    `⚔️ ${productName}`,
    `🔥 +200 Estudiantes`,
    `💰 ${dreamOutcome}`,
    `🤖 Metodología ${config.methodology_name || productName}`,
    `🛡️ Garantía ${guaranteeDays} días`,
    `⚡ ${config.effort_sacrifice || 'Sin experiencia previa'}`,
  ]
  const marqueeDouble = [...marqueeItems, ...marqueeItems]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,700;1,300&family=DM+Mono:wght@400;500&display=swap');
        :root {
          --accent: ${accent};
          --accent2: #00b0f6;
          --gold: #FFB800;
          --success: #00FF94;
          --danger: #FF6B35;
          --bg: #050508;
          --card: #0d0d14;
          --border: rgba(255,255,255,0.06);
          --text: #E8E8F0;
          --muted: #6060A0;
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body {
          background: var(--bg); color: var(--text);
          font-family: 'DM Sans', -apple-system, sans-serif;
          overflow-x: hidden;
        }
        .bebas { font-family: 'Bebas Neue', sans-serif; }
        .mono  { font-family: 'DM Mono', monospace; }

        /* NOISE */
        body::before {
          content: ''; position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          pointer-events: none; z-index: 0; opacity: 0.35;
        }
        /* MESH */
        .mesh { position: fixed; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
        .mesh::before {
          content: ''; position: absolute;
          width: 900px; height: 900px; top: -200px; left: -200px;
          background: radial-gradient(circle, ${accent}18 0%, transparent 70%);
          animation: f1 14s ease-in-out infinite;
        }
        .mesh::after {
          content: ''; position: absolute;
          width: 700px; height: 700px; bottom: -100px; right: -100px;
          background: radial-gradient(circle, #00b0f612 0%, transparent 70%);
          animation: f2 18s ease-in-out infinite;
        }
        @keyframes f1 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(80px,60px)} }
        @keyframes f2 { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-70px,-80px)} }

        /* HEADER */
        .hdr {
          position: sticky; top: 0; z-index: 100;
          backdrop-filter: blur(20px) saturate(180%);
          background: rgba(5,5,8,0.85);
          border-bottom: 1px solid var(--border);
        }
        .hdr-inner {
          max-width: 1100px; margin: 0 auto; padding: 16px 32px;
          display: flex; align-items: center; justify-content: space-between;
        }
        .logo-text { font-family: 'Bebas Neue',sans-serif; font-size: 28px; letter-spacing: 2px;
          background: linear-gradient(135deg,#fff,var(--accent2));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .urgency-pill {
          display: flex; align-items: center; gap: 8px;
          background: rgba(255,107,53,0.1); border: 1px solid rgba(255,107,53,0.25);
          border-radius: 100px; padding: 6px 16px;
        }
        .urgency-dot {
          width: 7px; height: 7px; border-radius: 50%; background: var(--danger);
          animation: blink 1.2s ease-in-out infinite;
        }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }

        /* MARQUEE */
        .mq-wrap {
          overflow: hidden; padding: 10px 0;
          background: linear-gradient(90deg,var(--accent),#0033ff,var(--accent2),var(--accent));
          background-size: 200% 100%;
          animation: gshift 4s linear infinite;
        }
        @keyframes gshift { 0%{background-position:0%} 100%{background-position:200%} }
        .mq-track {
          display: flex; gap: 48px; white-space: nowrap;
          animation: mq 22s linear infinite;
        }
        @keyframes mq { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        .mq-item {
          font-family: 'DM Mono',monospace; font-size: 11px;
          letter-spacing: 0.1em; color: rgba(255,255,255,0.9);
          text-transform: uppercase; display: flex; align-items: center; gap: 12px;
        }

        /* HERO */
        .hero {
          min-height: 100vh; display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          text-align: center; padding: 80px 32px; position: relative;
        }
        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 10px;
          background: rgba(0,20,173,0.15); border: 1px solid rgba(0,176,246,0.2);
          border-radius: 100px; padding: 8px 20px;
          font-family: 'DM Mono',monospace; font-size: 11px;
          color: var(--accent2); letter-spacing: 0.12em; text-transform: uppercase;
          margin-bottom: 32px; animation: fadeUp 0.8s ease both;
        }
        .eyebrow-dot {
          width: 6px; height: 6px; border-radius: 50%; background: var(--accent2);
          animation: blink 2s ease-in-out infinite;
        }
        .hero-tag {
          font-family: 'DM Mono',monospace; font-size: 13px; color: var(--gold);
          letter-spacing: 0.15em; text-transform: uppercase;
          margin-bottom: 20px; animation: fadeUp 0.8s 0.1s ease both;
        }
        .hero-h1 {
          font-family: 'Bebas Neue',sans-serif;
          font-size: clamp(64px,10vw,120px); line-height: 0.92;
          letter-spacing: 1px; margin-bottom: 32px;
          animation: fadeUp 0.8s 0.2s ease both;
        }
        .h1-white { display: block; color: #fff; }
        .h1-blue {
          display: block;
          background: linear-gradient(135deg,var(--accent2),var(--accent));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .h1-gold { display: block; color: var(--gold); }
        .hero-sub {
          font-size: 18px; color: #9090B8; line-height: 1.7;
          max-width: 580px; margin: 0 auto 48px;
          animation: fadeUp 0.8s 0.3s ease both; font-weight: 300;
        }
        .hero-sub strong { color: var(--text); font-weight: 500; }

        /* COUNTDOWN */
        .cd-wrap {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; margin-bottom: 48px;
          animation: fadeUp 0.8s 0.4s ease both;
        }
        .cd-block { display: flex; flex-direction: column; align-items: center; }
        .cd-num {
          width: 72px; height: 72px; background: var(--card);
          border: 1px solid var(--border); border-radius: 16px;
          display: flex; align-items: center; justify-content: center;
          font-family: 'Bebas Neue',sans-serif; font-size: 36px;
          color: var(--success); position: relative; overflow: hidden;
        }
        .cd-num::after {
          content: ''; position: absolute; left: 0; right: 0; top: 50%;
          height: 1px; background: rgba(255,255,255,0.06);
        }
        .cd-label {
          font-family: 'DM Mono',monospace; font-size: 9px; color: var(--muted);
          letter-spacing: 0.12em; margin-top: 8px; text-transform: uppercase;
        }
        .cd-sep {
          font-family: 'Bebas Neue',sans-serif; font-size: 32px;
          color: var(--muted); margin-bottom: 24px;
        }

        /* BUTTONS */
        .btn-main {
          display: inline-flex; align-items: center; gap: 12px;
          background: linear-gradient(135deg,var(--accent),#0033cc,var(--accent2));
          background-size: 200% 200%;
          color: #fff; text-decoration: none;
          padding: 20px 56px; border-radius: 100px;
          font-size: 17px; font-weight: 700; letter-spacing: 0.02em;
          animation: gshift 3s linear infinite;
          box-shadow: 0 0 40px ${accent}60, 0 0 80px rgba(0,176,246,0.1);
          position: relative; overflow: hidden; transition: transform 0.3s, box-shadow 0.3s;
        }
        .btn-main::before {
          content: ''; position: absolute; inset: 0;
          background: linear-gradient(135deg,transparent 30%,rgba(255,255,255,0.15) 50%,transparent 70%);
          transform: translateX(-100%); transition: transform 0.5s;
        }
        .btn-main:hover::before { transform: translateX(100%); }
        .btn-main:hover { transform: translateY(-3px); box-shadow: 0 8px 48px ${accent}80; }
        .btn-arrow { font-size: 20px; transition: transform 0.2s; display: inline-block; }
        .btn-main:hover .btn-arrow { transform: translateX(4px); }
        .hero-guar {
          font-family: 'DM Mono',monospace; font-size: 10px; color: var(--muted);
          letter-spacing: 0.1em; text-transform: uppercase;
        }
        .hero-guar span { color: var(--success); }

        /* SCROLL LINE */
        .scroll-ind {
          position: absolute; bottom: 32px; left: 50%; transform: translateX(-50%);
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          animation: fadeUp 1s 1s ease both;
        }
        .scroll-line {
          width: 1px; height: 48px;
          background: linear-gradient(to bottom,var(--border),transparent);
          animation: spulse 2s ease-in-out infinite;
        }
        @keyframes spulse { 0%,100%{opacity:0.3;transform:scaleY(1)} 50%{opacity:1;transform:scaleY(1.2)} }

        /* SECTION */
        .wrap { max-width: 1100px; margin: 0 auto; padding: 0 32px; }
        .wrap-sm { max-width: 900px; margin: 0 auto; padding: 0 32px; }
        .sec { padding: 100px 0; }
        .sec-sm { padding: 80px 0; }
        .sec-hdr { text-align: center; margin-bottom: 64px; }
        .sec-eyebrow {
          font-family: 'DM Mono',monospace; font-size: 10px;
          color: var(--accent2); letter-spacing: 0.2em; text-transform: uppercase;
          margin-bottom: 16px; display: flex; align-items: center;
          justify-content: center; gap: 12px;
        }
        .sec-eyebrow::before,.sec-eyebrow::after {
          content: ''; display: block; width: 32px; height: 1px;
          background: var(--accent2); opacity: 0.4;
        }
        .sec-h2 {
          font-family: 'Bebas Neue',sans-serif;
          font-size: clamp(40px,5vw,64px); line-height: 1; color: #fff;
        }
        .sec-h2 em {
          font-style: normal;
          background: linear-gradient(135deg,var(--accent2),var(--accent));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }

        /* STATS */
        .stats-grid {
          display: grid; grid-template-columns: repeat(4,1fr);
          gap: 1px; background: var(--border);
          border: 1px solid var(--border); border-radius: 20px; overflow: hidden;
        }
        .stat-item { background: var(--card); padding: 32px; text-align: center; }
        .stat-num {
          font-family: 'Bebas Neue',sans-serif; font-size: 48px; line-height: 1;
          background: linear-gradient(135deg,#fff,var(--accent2));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 8px;
        }
        .stat-lbl {
          font-family: 'DM Mono',monospace; font-size: 10px;
          color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase;
        }

        /* DECO LINE */
        .deco {
          display: flex; align-items: center; gap: 16px;
          max-width: 1100px; margin: 0 auto 0; padding: 40px 32px;
        }
        .deco::before,.deco::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(90deg,transparent,var(--border),transparent);
        }
        .deco span {
          font-family: 'DM Mono',monospace; font-size: 9px;
          color: var(--muted); letter-spacing: 0.2em;
          text-transform: uppercase; white-space: nowrap;
        }

        /* DOLOR */
        .dolor-grid {
          display: grid; grid-template-columns: 1fr 1fr; gap: 2px;
        }
        .dolor-side {
          padding: 48px; background: var(--card);
        }
        .dolor-side.red { border-radius: 20px 0 0 20px; border-left: 3px solid var(--danger); }
        .dolor-side.green { border-radius: 0 20px 20px 0; border-right: 3px solid var(--success); }
        .dolor-tag {
          font-family: 'DM Mono',monospace; font-size: 10px;
          letter-spacing: 0.15em; text-transform: uppercase;
          margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
        }
        .dolor-tag.r { color: var(--danger); }
        .dolor-tag.g { color: var(--success); }
        .dolor-body {
          font-size: 17px; line-height: 1.9; color: #A0A0C0; font-weight: 300;
        }
        .dolor-body strong { color: var(--text); font-weight: 500; }

        /* CARTA */
        .carta-card {
          background: linear-gradient(135deg,#0e0e1a,#080810);
          border: 1px solid #2a2a4a; border-radius: 32px;
          padding: 64px 72px; position: relative; overflow: hidden;
        }
        .carta-card::before {
          content: '🗡️'; position: absolute; right: 48px; top: 48px;
          font-size: 90px; opacity: 0.04; pointer-events: none;
        }
        .carta-card::after {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg,transparent,var(--accent),var(--accent2),transparent);
        }
        .carta-eyebrow {
          font-family: 'DM Mono',monospace; font-size: 10px;
          color: var(--gold); letter-spacing: 0.2em; text-transform: uppercase;
          margin-bottom: 40px; display: flex; align-items: center; gap: 12px;
        }
        .carta-eyebrow::after {
          content: ''; flex: 1; height: 1px;
          background: linear-gradient(90deg,var(--gold),transparent); opacity: 0.3;
        }
        .carta-text {
          font-size: 17px; line-height: 2; color: #C8C8E0;
          font-weight: 300; font-style: italic; white-space: pre-line;
        }
        .carta-firma {
          margin-top: 48px; padding-top: 40px;
          border-top: 1px solid #1a1a2a;
          display: flex; align-items: flex-end; justify-content: space-between;
        }
        .carta-nombre {
          font-family: 'Bebas Neue',sans-serif;
          font-size: 40px; color: #fff; letter-spacing: 2px;
        }
        .carta-titulo {
          font-family: 'DM Mono',monospace; font-size: 11px; color: var(--muted);
          letter-spacing: 0.1em;
        }
        .carta-seal {
          width: 72px; height: 72px; border: 2px solid var(--accent2);
          border-radius: 50%; display: flex; align-items: center;
          justify-content: center; font-size: 28px; opacity: 0.6;
        }

        /* OFFER STACK */
        .offer-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 32px; border-bottom: 1px solid var(--border);
          transition: background 0.2s;
        }
        .offer-item:first-child { border-top: 1px solid var(--border); }
        .offer-item:hover { background: rgba(255,255,255,0.02); }
        .offer-left { display: flex; align-items: center; gap: 20px; }
        .offer-icon {
          width: 40px; height: 40px; border-radius: 12px;
          background: rgba(0,20,173,0.2); border: 1px solid rgba(0,176,246,0.15);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .offer-name { font-size: 16px; color: var(--text); font-weight: 500; }
        .offer-val { text-align: right; }
        .offer-strike { font-size: 13px; color: var(--muted); text-decoration: line-through; }
        .offer-inc {
          font-family: 'DM Mono',monospace; font-size: 10px;
          color: var(--success); letter-spacing: 0.08em; display: block;
        }
        .offer-total {
          background: linear-gradient(135deg,rgba(0,20,173,0.2),rgba(0,176,246,0.1));
          border: 1px solid rgba(0,176,246,0.2); border-radius: 20px;
          padding: 32px 48px; display: flex;
          align-items: center; justify-content: space-between;
        }
        .offer-total-lbl {
          font-family: 'DM Mono',monospace; font-size: 12px;
          color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase;
        }
        .offer-total-nums { text-align: right; }
        .offer-total-strike { font-size: 20px; color: var(--muted); text-decoration: line-through; }
        .offer-total-real {
          font-family: 'Bebas Neue',sans-serif;
          font-size: 64px; color: var(--success); line-height: 1;
        }
        .offer-billing {
          font-family: 'DM Mono',monospace; font-size: 11px;
          color: var(--muted); letter-spacing: 0.08em;
        }

        /* PLANES */
        .planes-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
        .plan-card {
          background: var(--card); border: 1px solid var(--border);
          border-radius: 28px; padding: 44px; position: relative;
          transition: transform 0.3s;
        }
        .plan-card:hover { transform: translateY(-4px); }
        .plan-card.hl {
          background: linear-gradient(135deg,#0a0a1f,#080818);
          border-color: var(--accent2);
          box-shadow: 0 0 60px rgba(0,176,246,0.1), inset 0 0 60px rgba(0,20,173,0.05);
        }
        .plan-badge {
          position: absolute; top: -16px; left: 50%; transform: translateX(-50%);
          background: linear-gradient(135deg,var(--accent),var(--accent2));
          color: #fff; padding: 6px 24px; border-radius: 100px;
          font-family: 'DM Mono',monospace; font-size: 10px;
          letter-spacing: 0.12em; text-transform: uppercase;
          white-space: nowrap; font-weight: 700;
        }
        .plan-name {
          font-family: 'Bebas Neue',sans-serif;
          font-size: 32px; letter-spacing: 1px; margin-bottom: 8px;
        }
        .plan-price-strike { font-size: 18px; color: var(--muted); text-decoration: line-through; margin-bottom: 4px; }
        .plan-price {
          font-family: 'Bebas Neue',sans-serif;
          font-size: 72px; line-height: 1; color: var(--success);
        }
        .plan-billing {
          font-family: 'DM Mono',monospace; font-size: 11px;
          color: var(--muted); letter-spacing: 0.08em; margin-bottom: 32px;
        }
        .plan-features { display: flex; flex-direction: column; gap: 12px; margin-bottom: 32px; }
        .plan-feat { display: flex; align-items: flex-start; gap: 12px; font-size: 14px; color: #A0A0C0; }
        .plan-check { color: var(--success); flex-shrink: 0; font-size: 16px; }
        .plan-cta {
          display: block; text-align: center; padding: 18px 32px;
          border-radius: 100px; font-size: 15px; font-weight: 700;
          text-decoration: none; transition: all 0.3s; letter-spacing: 0.02em;
        }
        .plan-cta.p {
          background: linear-gradient(135deg,var(--accent),var(--accent2));
          color: #fff; box-shadow: 0 0 30px ${accent}50;
        }
        .plan-cta.p:hover { transform: translateY(-2px); box-shadow: 0 8px 40px ${accent}70; }
        .plan-cta.s { border: 1px solid var(--border); color: var(--muted); }
        .plan-cta.s:hover { border-color: var(--muted); color: var(--text); }

        /* GARANTIA */
        .guar-card {
          display: flex; align-items: center; gap: 48px;
          background: linear-gradient(135deg,rgba(0,255,148,0.05),rgba(0,176,246,0.05));
          border: 1px solid rgba(0,255,148,0.15); border-radius: 28px; padding: 56px 64px;
        }
        .guar-shield { font-size: 80px; flex-shrink: 0; filter: drop-shadow(0 0 20px rgba(0,255,148,0.3)); }
        .guar-title {
          font-family: 'Bebas Neue',sans-serif;
          font-size: 48px; color: var(--success); line-height: 1; margin-bottom: 12px;
        }
        .guar-text { font-size: 17px; color: #A0A0C0; line-height: 1.7; font-weight: 300; }

        /* TESTIMONIOS */
        .testi-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 20px; }
        .testi-card {
          background: var(--card); border: 1px solid var(--border);
          border-radius: 24px; padding: 36px;
        }
        .testi-stars { display: flex; gap: 4px; margin-bottom: 20px; color: var(--gold); font-size: 14px; }
        .testi-text { font-size: 15px; color: #A0A0C0; line-height: 1.8; font-style: italic; margin-bottom: 28px; font-weight: 300; }
        .testi-foot { display: flex; align-items: center; justify-content: space-between; }
        .testi-name { font-size: 14px; font-weight: 600; color: var(--text); }
        .testi-result {
          background: rgba(0,255,148,0.1); border: 1px solid rgba(0,255,148,0.2);
          border-radius: 100px; padding: 4px 14px;
          font-family: 'DM Mono',monospace; font-size: 10px;
          color: var(--success); letter-spacing: 0.06em;
        }

        /* FAQ */
        .faq-item { border-bottom: 1px solid var(--border); padding: 28px 0; }
        .faq-q {
          font-size: 17px; font-weight: 600; color: var(--text);
          display: flex; justify-content: space-between; align-items: flex-start;
          cursor: pointer; gap: 20px;
          background: none; border: none; width: 100%; text-align: left;
        }
        .faq-icon { color: var(--accent2); font-size: 24px; flex-shrink: 0; transition: transform 0.3s; line-height: 1; }
        .faq-a {
          font-size: 15px; color: #8080A8; line-height: 1.8; font-weight: 300;
          margin-top: 16px; overflow: hidden; max-height: 0;
          transition: max-height 0.4s ease, opacity 0.3s;
          opacity: 0;
        }
        .faq-item.open .faq-a { max-height: 300px; opacity: 1; }
        .faq-item.open .faq-icon { transform: rotate(45deg); }

        /* CTA FINAL */
        .cta-final {
          padding: 120px 32px; text-align: center; position: relative; overflow: hidden;
        }
        .cta-final::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse at center,${accent}18 0%,transparent 70%);
          pointer-events: none;
        }
        .cta-final-h {
          font-family: 'Bebas Neue',sans-serif;
          font-size: clamp(48px,7vw,88px); line-height: 1; margin-bottom: 24px;
        }
        .cta-final-sub {
          font-size: 18px; color: #8080A8; line-height: 1.7;
          max-width: 520px; margin: 0 auto 48px; font-weight: 300;
        }
        .cta-final-sub strong { color: var(--text); font-weight: 500; }

        /* FOOTER */
        footer {
          border-top: 1px solid var(--border); padding: 40px 32px;
          text-align: center; background: rgba(0,0,0,0.4);
        }
        .ft-powered {
          font-family: 'DM Mono',monospace; font-size: 11px; color: var(--muted);
          letter-spacing: 0.1em; text-transform: uppercase; text-decoration: none;
          transition: color 0.2s; display: inline-block;
        }
        .ft-powered:hover { color: var(--text); }
        .ft-cr { font-family: 'DM Mono',monospace; font-size: 9px; color: #303050; letter-spacing: 0.05em; margin-top: 8px; }

        /* CORNER */
        .corner {
          position: fixed; bottom: 28px; right: 28px; z-index: 200;
          background: rgba(13,13,20,0.9); backdrop-filter: blur(12px);
          border: 1px solid var(--border); padding: 10px 18px; border-radius: 100px;
          font-family: 'DM Mono',monospace; font-size: 10px; color: var(--muted);
          letter-spacing: 0.08em; text-decoration: none; transition: all 0.2s;
        }
        .corner:hover { border-color: var(--accent2); color: var(--text); }

        /* ANIMATIONS */
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reveal { opacity: 0; transform: translateY(40px); transition: opacity 0.7s ease, transform 0.7s ease; }
        .reveal.vis { opacity: 1; transform: translateY(0); }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .dolor-grid, .planes-grid, .testi-grid, .stats-grid { grid-template-columns: 1fr; }
          .dolor-side.red { border-radius: 20px 20px 0 0; border-left: none; border-top: 3px solid var(--danger); }
          .dolor-side.green { border-radius: 0 0 20px 20px; border-right: none; border-bottom: 3px solid var(--success); }
          .carta-card { padding: 40px 32px; }
          .guar-card { flex-direction: column; text-align: center; padding: 40px 32px; }
          .offer-total { flex-direction: column; gap: 16px; text-align: center; }
          .hdr-inner { gap: 12px; }
          .carta-firma { flex-direction: column; gap: 24px; }
        }
      `}</style>

      <div className="mesh" />

      {/* HEADER */}
      <header className="hdr">
        <div className="hdr-inner">
          {proj.logo_url ? (
            <img src={proj.logo_url} alt={productName} style={{ height: 36, objectFit: 'contain' }} />
          ) : (
            <span className="logo-text">{productName}</span>
          )}
          {urgencyReason && (
            <div className="urgency-pill">
              <div className="urgency-dot" />
              <span className="mono" style={{ fontSize: 10, color: 'var(--danger)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {urgencyReason}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* MARQUEE */}
      <div className="mq-wrap">
        <div className="mq-track">
          {marqueeDouble.map((item, i) => (
            <span key={i} className="mq-item">
              {item}
              <span style={{ opacity: 0.4 }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-eyebrow">
          <div className="eyebrow-dot" />
          Mensaje especial para {leadName}
        </div>
        <div className="hero-tag">✦ Este camino fue diseñado para ti ✦</div>
        <h1 className="hero-h1">
          {landing.headline.split(' ').slice(0, 2).join(' ') !== landing.headline ? (
            <>
              <span className="h1-white">{landing.headline.split(',')[0] || leadName}</span>
              <span className="h1-blue">{landing.subheadline.split(' ').slice(0, 3).join(' ')}</span>
              <span className="h1-gold">{config.methodology_name || productName}</span>
            </>
          ) : (
            <span className="h1-white">{landing.headline}</span>
          )}
        </h1>
        <p className="hero-sub">
          {landing.subheadline} — <strong>{dreamOutcome}</strong>.
        </p>

        {/* COUNTDOWN */}
        {timeLeft && (
          <div className="cd-wrap" id="countdown" data-target={timeLeft.iso}>
            {[
              { id: 'cd-d', val: timeLeft.days, label: 'Días' },
              { id: 'cd-h', val: timeLeft.hours, label: 'Horas' },
              { id: 'cd-m', val: timeLeft.mins, label: 'Min' },
              { id: 'cd-s', val: timeLeft.secs, label: 'Seg' },
            ].map(({ id, val, label }, i) => (
              <>
                {i > 0 && <div key={`sep-${i}`} className="cd-sep">:</div>}
                <div key={id} className="cd-block">
                  <div className="cd-num" id={id}>{String(val).padStart(2, '0')}</div>
                  <div className="cd-label">{label}</div>
                </div>
              </>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, animation: 'fadeUp 0.8s 0.5s ease both' }}>
          {recPlan && (
            <a href={recPlan.cta_url} className="btn-main">
              {recPlan.cta_text || `Quiero ${productName}`}
              <span className="btn-arrow">→</span>
            </a>
          )}
          <span className="hero-guar">🛡️ <span>Garantía {guaranteeDays} días</span> · Sin preguntas</span>
        </div>

        <div className="scroll-ind">
          <div className="scroll-line" />
        </div>
      </section>

      {/* STATS */}
      <div className="wrap reveal" style={{ marginBottom: 0 }}>
        <div className="stats-grid">
          {[
            { num: '+200', lbl: 'Estudiantes activos' },
            { num: `$${plans[0]?.price_real?.toLocaleString() || '497'}`, lbl: 'Inversión única' },
            { num: config.time_delay || '90 días', lbl: 'Al resultado' },
            { num: '100%', lbl: 'Garantía devolución' },
          ].map(s => (
            <div key={s.lbl} className="stat-item">
              <div className="stat-num">{s.num}</div>
              <div className="stat-lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      {/* DECO */}
      <div className="deco reveal">
        <span>Tu situación actual vs. donde puedes estar</span>
      </div>

      {/* DOLOR */}
      <div className="wrap reveal">
        <div className="sec-sm">
          <div className="dolor-grid">
            <div className="dolor-side red">
              <div className="dolor-tag r">✕ Hoy, sin {productName}</div>
              <div className="dolor-body" dangerouslySetInnerHTML={{ __html: landing.body_dolor.replace(/\n\n/g, '<br/><br/>') }} />
            </div>
            <div className="dolor-side green">
              <div className="dolor-tag g">✓ En {config.time_delay || '90 días'}, con {productName}</div>
              <div className="dolor-body" dangerouslySetInnerHTML={{ __html: landing.body_solucion.replace(/\n\n/g, '<br/><br/>') }} />
            </div>
          </div>
        </div>
      </div>

      {/* DECO */}
      <div className="deco reveal">
        <span>Una carta personal de {authorName}</span>
      </div>

      {/* CARTA */}
      <div className="wrap-sm reveal">
        <div className="sec-sm">
          <div className="carta-card">
            <div className="carta-eyebrow">Carta personal de {authorName} · Solo para {leadName}</div>
            <div className="carta-text">{landing.carta_autor}</div>
            <div className="carta-firma">
              <div>
                <div className="carta-nombre">{authorName}</div>
                <div className="carta-titulo">{authorTitle}</div>
              </div>
              <div className="carta-seal">⚔️</div>
            </div>
          </div>
        </div>
      </div>

      {/* OFFER STACK */}
      {offerStack.length > 0 && (
        <div className="wrap reveal">
          <div className="sec">
            <div className="sec-hdr">
              <div className="sec-eyebrow">Todo lo que te llevas</div>
              <h2 className="sec-h2">La oferta <em>completa</em></h2>
            </div>
            <div style={{ marginBottom: 32 }}>
              {offerStack.map((item, i) => (
                <div key={i} className="offer-item">
                  <div className="offer-left">
                    <div className="offer-icon">{['🎓','🎯','🤝','⚡','🔥','💡'][i % 6]}</div>
                    <div className="offer-name">{item.name}</div>
                  </div>
                  <div className="offer-val">
                    <div className="offer-strike">${item.value.toLocaleString()}</div>
                    <span className="offer-inc">INCLUIDO</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="offer-total">
              <div className="offer-total-lbl">Valor total percibido</div>
              <div className="offer-total-nums">
                <div className="offer-total-strike">${totalValue.toLocaleString()}</div>
                {recPlan && <div className="offer-total-real">${recPlan.price_real.toLocaleString()}</div>}
                <div className="offer-billing">{recPlan?.billing || 'pago único'}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PLANES */}
      {plans.length > 0 && (
        <div className="wrap reveal" id="planes">
          <div className="sec">
            <div className="sec-hdr">
              <div className="sec-eyebrow">Elige tu nivel</div>
              <h2 className="sec-h2">¿Con qué plan empiezas, <em>{leadName}</em>?</h2>
            </div>
            <div className="planes-grid">
              {plans.map(plan => (
                <div key={plan.id} className={`plan-card ${plan.highlight ? 'hl' : ''}`}>
                  {plan.badge && <div className="plan-badge">{plan.id === landing.recommended_plan_id ? '⭐ Recomendado para ti' : plan.badge}</div>}
                  <div className="plan-name">{plan.name}</div>
                  <div style={{ marginTop: 24 }}>
                    <div className="plan-price-strike">${plan.price_anchor.toLocaleString()}</div>
                    <div className="plan-price" style={{ color: plan.highlight ? 'var(--success)' : '#A0A0C0' }}>
                      ${plan.price_real.toLocaleString()}
                    </div>
                    <div className="plan-billing">{plan.billing}</div>
                  </div>
                  <div className="plan-features">
                    {plan.features.filter(f => f.trim()).map((feat, i) => (
                      <div key={i} className="plan-feat">
                        <span className="plan-check">✓</span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                  <a href={plan.cta_url} className={`plan-cta ${plan.highlight ? 'p' : 's'}`}>
                    {plan.cta_text || `Elegir ${plan.name} →`}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* GARANTIA */}
      <div className="wrap-sm reveal">
        <div className="sec-sm">
          <div className="guar-card">
            <div className="guar-shield">🛡️</div>
            <div>
              <div className="guar-title">Garantía de {guaranteeDays} días</div>
              <div className="guar-text">{guaranteeText}</div>
            </div>
          </div>
        </div>
      </div>

      {/* TESTIMONIOS */}
      {testimonials.length > 0 && (
        <div className="wrap reveal">
          <div className="sec">
            <div className="sec-hdr">
              <div className="sec-eyebrow">Resultados reales</div>
              <h2 className="sec-h2">Lo que dicen quienes <em>ya lo vivieron</em></h2>
            </div>
            <div className={`testi-grid`} style={{ gridTemplateColumns: `repeat(${Math.min(testimonials.length, 2)}, 1fr)` }}>
              {testimonials.map((t, i) => (
                <div key={i} className="testi-card">
                  <div className="testi-stars">{'★★★★★'}</div>
                  <p className="testi-text">"{t.text}"</p>
                  <div className="testi-foot">
                    <div className="testi-name">{t.name}</div>
                    {t.result && <div className="testi-result">{t.result}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* FAQ */}
      {landing.faq?.length > 0 && (
        <div className="wrap-sm reveal">
          <div className="sec">
            <div className="sec-hdr">
              <div className="sec-eyebrow">Preguntas frecuentes</div>
              <h2 className="sec-h2">Resolvemos <em>tus dudas</em></h2>
            </div>
            {landing.faq.map((item, i) => (
              <div key={i} className="faq-item" id={`faq-${i}`}>
                <button className="faq-q" onClick={undefined} data-faq={i}>
                  {item.q}
                  <span className="faq-icon">+</span>
                </button>
                <div className="faq-a">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CTA FINAL */}
      <section className="cta-final reveal">
        <div className="cta-final-h">
          {leadName},<br />este es<br />
          <span style={{ background: `linear-gradient(135deg,var(--accent2),var(--accent))`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            tu momento.
          </span>
        </div>
        <p className="cta-final-sub">
          Cada día que esperas es un día más lejos de <strong>{dreamOutcome}</strong>.
          {urgencyReason && ` ${urgencyReason}.`}
        </p>
        {recPlan && (
          <a href={recPlan.cta_url} className="btn-main" style={{ fontSize: 18, padding: '22px 64px' }}>
            {recPlan.cta_text || `Sí, quiero ${productName}`}
            <span className="btn-arrow">→</span>
          </a>
        )}
        <p className="mono" style={{ fontSize: 10, color: 'var(--muted)', marginTop: 20, letterSpacing: '0.1em' }}>
          🛡️ GARANTÍA {guaranteeDays} DÍAS · ⚡ {urgencyReason || 'CUPOS LIMITADOS'}
        </p>
      </section>

      <footer>
        <a href="https://kanshi.app" className="ft-powered">
          ⚡ Powered by KANSHI · Sistema Operativo de Lanzamientos · Santiago Jiménez
        </a>
        <div className="ft-cr">© 2026 Santiago Jiménez · Todos los derechos reservados</div>
      </footer>

      <a href="https://kanshi.app" className="corner">⚡ by KANSHI</a>

      {/* SCRIPTS */}
      <script dangerouslySetInnerHTML={{ __html: `
        // COUNTDOWN LIVE
        (function() {
          var el = document.getElementById('countdown');
          if (!el) return;
          var target = new Date(el.dataset.target).getTime();
          function tick() {
            var diff = target - Date.now();
            if (diff <= 0) return;
            var d = Math.floor(diff/86400000);
            var h = Math.floor((diff%86400000)/3600000);
            var m = Math.floor((diff%3600000)/60000);
            var s = Math.floor((diff%60000)/1000);
            var p = function(n){return String(n).padStart(2,'0');};
            var dEl=document.getElementById('cd-d');
            var hEl=document.getElementById('cd-h');
            var mEl=document.getElementById('cd-m');
            var sEl=document.getElementById('cd-s');
            if(dEl)dEl.textContent=p(d);
            if(hEl)hEl.textContent=p(h);
            if(mEl)mEl.textContent=p(m);
            if(sEl)sEl.textContent=p(s);
          }
          setInterval(tick,1000); tick();
        })();

        // SCROLL REVEAL
        (function() {
          var obs = new IntersectionObserver(function(entries){
            entries.forEach(function(e){if(e.isIntersecting)e.target.classList.add('vis');});
          },{threshold:0.1,rootMargin:'0px 0px -60px 0px'});
          document.querySelectorAll('.reveal').forEach(function(el){obs.observe(el);});
        })();

        // FAQ ACCORDION
        (function() {
          document.querySelectorAll('.faq-q').forEach(function(btn){
            btn.addEventListener('click',function(){
              var item = btn.closest('.faq-item');
              item.classList.toggle('open');
            });
          });
        })();
      `}} />
    </>
  )
}

export const dynamic = 'force-dynamic'
