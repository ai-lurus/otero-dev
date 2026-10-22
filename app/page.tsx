"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight, AlertTriangle, Check, Clock3, Building2, CalendarClock, ClipboardCheck, FileCheck2, Scale, ShieldCheck, UsersRound } from "lucide-react"

const demos = [
  { command: "Otero, buenos días.", reply: "Buenos días. Revisé el DOF de hoy: 2 cambios te afectan.", tone: "warn", cite: "DOF 02/10/2026", title: "2 cambios te afectan hoy", body: "Una nueva obligación de reporte trimestral y un ajuste a la Resolución Miscelánea Fiscal. Ya preparé el resumen de cada uno.", pill: "Al día: 18 de 20 obligaciones", action: "Asignar responsable" },
  { command: "Otero, ¿qué cambió en el DOF?", reply: "Este es el cambio con el plazo más corto.", tone: "risk", cite: "DOF 02/10/2026 · Art. 15", title: "Nueva obligación de reporte trimestral", body: "Este plazo vence en 5 días. El cambio aplica a tu planta de Monterrey. Ya preparé el borrador del reporte.", pill: "Vence el 7 de octubre", action: "Asignar responsable" },
  { command: "Otero, manda esto a Laboral.", reply: "Listo. Te aviso cuando lo revise.", tone: "ok", cite: "Folio OT-2026-0418", title: "Enviado a Lic. A. Treviño, Laboral", body: "Le mandé el borrador con el artículo citado. Cuando responda, guardo la evidencia en el expediente.", pill: "Respuesta esperada: 3 de octubre", action: "Marcar como cumplido" },
  { command: "Otero, prepara la auditoría.", reply: "Tu expediente está listo.", tone: "ok", cite: "Expediente 2026 · 48 obligaciones", title: "Expediente de auditoría listo", body: "Junté 48 obligaciones con su evidencia, fechas y responsables. Las 2 que están en atención van al inicio.", pill: "Generado hoy, 08:15", action: "Descargar expediente" },
]

const steps = [
  ["01", "Revisa", "El DOF, autoridades y gacetas de México y LATAM, todos los días."],
  ["02", "Te dice qué cambió", "Cruza cada publicación con tu sector, permisos y sedes. Solo te llega lo que te aplica."],
  ["03", "Hace el trabajo", "Redacta el borrador, llena el formato y prepara el envío. Tú apruebas."],
  ["04", "Asigna a quien resuelve", "Responsable de área, gestor o despacho externo, con plazo y seguimiento hasta cerrar."],
  ["05", "Guarda la evidencia", "Fechas, responsables y acuses de cada cumplimiento, listos para inspección."],
]

const features = [
  ["Diario", "Radar regulatorio", "Otero revisa cada publicación oficial y te muestra solo las obligaciones que aplican a tu industria y tus plantas."],
  ["Con fuente", "Cada alerta, citada", "Cada obligación lleva su fuente: norma, fecha de publicación y artículo."],
  ["Ejecuta", "Hace, no solo avisa", "Redacta, envía y agenda seguimientos. Nada sale sin tu aprobación."],
  ["60 · 30 · 7 días", "Permisos y licencias al día", "Licencias ambientales, COA, NOMs de seguridad, avisos al IMSS y declaraciones con plazo, responsable y avisos escalonados."],
  ["Red de expertos", "Te enlaza con quien resuelve", "Cuando hace falta un gestor o especialista regulatorio, Otero lo involucra con el trámite ya armado."],
  ["AES-256", "Listo para inspecciones", "Cada cumplimiento queda registrado. Entrega el expediente a PROFEPA, STPS o SAT en minutos."],
]

const feed = ["DOF · México", "SAT", "SEMARNAT", "STPS", "IMSS", "PROFEPA", "CONAGUA", "Diario Oficial · Colombia", "Boletín Oficial · Argentina", "El Peruano · Perú"]

const TILES = "border ink tl|ink brand bl|warn warn -|brand ink tr|ink ink -|border warn br|ink border tl|ok ink tr|brand border br|border brand tl|ink warn bl|warn ink bl|ink warn tl|border border -|brand ink br|ink ok bl|warn border tr|ink brand tl|border ink br|brand warn tl".split("|").map((s) => s.split(" "))
const CORNERS: Record<string, string> = { tl: "100% 0 0 0", tr: "0 100% 0 0", br: "0 0 100% 0", bl: "0 0 0 100%", "-": "0" }
const MOSAIC_INDICES: Record<number, number[]> = {
  16: Array.from({ length: 16 }, (_, i) => i),
  12: [6, 9, 2, 15, 0, 12, 4, 17, 10, 19, 13, 7],
  9: [17, 3, 8, 11, 18, 5, 1, 14, 16],
}

function Mosaic({ count = 16 }: { count?: number }) {
  const indices = MOSAIC_INDICES[count] ?? MOSAIC_INDICES[16]
  const [entered, setEntered] = useState(false)
  const [settled, setSettled] = useState(false)
  const [rots, setRots] = useState<Record<number, number>>({})

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const t1 = window.setTimeout(() => setEntered(true), 80)
    const t2 = window.setTimeout(() => setSettled(true), 2400)
    if (reduce) return () => { window.clearTimeout(t1); window.clearTimeout(t2) }
    const rot = window.setInterval(() => {
      const ti = indices[Math.floor(Math.random() * indices.length)]
      if (TILES[ti][2] === "-") return
      setRots((r) => ({ ...r, [ti]: (r[ti] || 0) + (Math.random() < 0.5 ? 90 : -90) }))
    }, 1700)
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); window.clearInterval(rot) }
  }, [indices])

  return (
    <div className={`mosaic mosaic-${count}`} aria-hidden="true">
      {indices.map((ti, j) => {
        const [bg, fg, c] = TILES[ti]
        return (
          <div key={ti} className="mtile" style={{ background: `var(--m-${bg})` }}>
            <i
              style={{
                background: `var(--m-${fg})`,
                borderRadius: CORNERS[c],
                transform: `rotate(${rots[ti] || 0}deg) scale(${!entered && c !== "-" ? 0 : 1})`,
                transitionDelay: settled ? "0ms" : `${j * 70}ms`,
              }}
            />
          </div>
        )
      })}
    </div>
  )
}

function FeatureIcon({ title }: { title: string }) {
  if (title.includes("Radar")) return <CalendarClock aria-hidden="true" />
  if (title.includes("alerta")) return <FileCheck2 aria-hidden="true" />
  if (title.includes("Hace")) return <ClipboardCheck aria-hidden="true" />
  if (title.includes("Permisos")) return <ShieldCheck aria-hidden="true" />
  if (title.includes("expertos")) return <UsersRound aria-hidden="true" />
  return <Scale aria-hidden="true" />
}

function Nav() {
  return <nav className="site-nav"><Link href="#inicio" className="wordmark" aria-label="Otero, inicio">otero<span /></Link><div className="nav-links"><a href="#como-trabaja">Cómo trabaja</a><a href="#que-hace">Qué hace</a><a href="#equipo">Para tu equipo</a><a href="#demo">Precios</a></div><Link className="login-link" href="/sign-in">Iniciar sesión</Link><a className="button button-primary nav-cta" href="mailto:contact@otero.ai">Agendar demo</a></nav>
}

export default function LandingPage() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)
  const [phrase, setPhrase] = useState(0)
  const [typed, setTyped] = useState("")
  const current = demos[active]
  const phrases = ["buenos días.", "¿qué cambió hoy en el DOF?", "manda esto a Laboral.", "¿qué vence esta semana?", "prepara la auditoría.", "asigna esto al despacho."]

  useEffect(() => {
    const onScroll = () => setProgress(window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight))
    window.addEventListener("scroll", onScroll, { passive: true })
    const revealItems = Array.from(document.querySelectorAll<HTMLElement>(".section, .about, .closing"))
    revealItems.forEach((item) => item.classList.add("reveal-ready"))
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible")
          revealObserver.unobserve(entry.target)
        }
      })
    }, { threshold: 0.12 })
    revealItems.forEach((item) => revealObserver.observe(item))
    const interval = window.setInterval(() => setPhrase((p) => (p + 1) % phrases.length), 4000)
    return () => { window.removeEventListener("scroll", onScroll); window.clearInterval(interval); revealObserver.disconnect() }
  }, [phrases.length])

  useEffect(() => {
    setTyped("")
    let i = 0
    const timer = window.setInterval(() => { i += 1; setTyped(current.command.slice(0, i)); if (i >= current.command.length) window.clearInterval(timer) }, 38)
    return () => window.clearInterval(timer)
  }, [active, current.command])

  return <main id="inicio"><div className="progress" style={{ transform: `scaleX(${progress})` }} /><Nav />
    <header className="hero"><div className="hero-copy"><h1>Tu cumplimiento regulatorio,<br /><em>en automático.</em></h1><p className="hero-lede"><strong>Otero</strong> vigila las publicaciones oficiales, identifica lo que aplica a tu empresa y prepara el siguiente paso: permisos, reportes, plazos y evidencia.</p><div className="actions"><a className="button button-primary" href="mailto:contact@otero.ai?subject=Agendar demo de Otero">Agendar demo <ArrowRight data-icon="inline-end" /></a><a className="button button-outline" href="mailto:contact@otero.ai?subject=Revisar que regulación me aplica">Revisar qué regulación me aplica</a></div><div className="command-bar"><span className="mono">Pídeselo a Otero</span><span><b>“Otero,</b> {phrases[phrase]}”</span></div></div><div className="hero-art"><Mosaic /></div></header>
    <div className="ticker">{[...feed, ...feed].map((item, i) => <span key={`${item}-${i}`}><i />{item}</span>)}</div>
    <section className="section demo-section"><div className="section-intro"><h2>No contratas una plataforma. Contratas a <em>Otero</em>.</h2><p>Pídeselo como a alguien de tu equipo. Otero lee cada publicación oficial, identifica la obligación, prepara el trámite y da seguimiento. Tú decides.</p></div><div className="demo-grid"><div className="demo-tabs">{demos.map((demo, i) => <button key={demo.command} className={i === active ? "active" : ""} onClick={() => setActive(i)}><i />{demo.command}</button>)}<small>Toca un ejemplo para verlo.</small></div><div className="demo-result"><div className="typed"><span>Tú</span><strong>{typed}<b>|</b></strong></div><div className="reply"><span>Otero</span>{current.reply}</div><article className={`alert-card ${current.tone}`}><div className="alert-meta"><span className="status">{current.tone === "risk" ? <AlertTriangle data-icon="inline-start" /> : current.tone === "warn" ? <Clock3 data-icon="inline-start" /> : <Check data-icon="inline-start" />}{current.tone === "risk" ? "Riesgo" : current.tone === "warn" ? "Atención" : "Al día"}</span><span className="citation mono">{current.cite}</span></div><h3>{current.title}</h3><p>{current.tone === "risk" && <strong>Ojo: </strong>}{current.body}</p><div className="alert-footer"><span className="pill">{current.pill}</span><a href="mailto:contact@otero.ai">{current.action}</a></div></article></div></div></section>
    <section id="como-trabaja" className="section section-raised"><h2>Así cumple <em>Otero</em> por tu empresa</h2><div className="steps-grid">{steps.map(([number, title, body]) => <article key={number}><span className="card-icon"><ClipboardCheck aria-hidden="true" /></span><strong>{number}</strong><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section id="que-hace" className="section"><div className="section-heading"><h2>Todo tu cumplimiento regulatorio, resuelto</h2><a className="button button-outline" href="mailto:contact@otero.ai">Ver demo completo</a></div><div className="features-grid">{features.map(([tag, title, body]) => <article key={title}><span className="card-icon"><FeatureIcon title={title} /></span><span className="tag mono">{tag}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="about"><div className="about-mosaic"><Mosaic count={12} /></div><div className="about-copy"><h2>Sabe de tu empresa. Sabe de México.</h2><div className="about-columns"><div><h3>Tu empresa</h3><p>Tu sector, tus permisos vigentes, tus sedes y quién responde por cada obligación.</p></div><div><h3>Tu regulación</h3><p>DOF, SAT, SEMARNAT, STPS, IMSS y gacetas de LATAM. En español y con su fuente citada.</p></div></div><p>Otero afirma lo que sabe y marca lo que no. Sin fuente, no hay alerta. Tu responsable de cumplimiento revisa y decide.</p><small>El nombre rinde homenaje a Mariano Otero, cocreador del juicio de amparo: protección jurídica, de origen mexicano.</small></div></section>
    <section id="equipo" className="section"><h2><em>Otero</em> trabaja con quien responde por el cumplimiento</h2><div className="features-grid team-grid">{[["Cumplimiento y dirección jurídica", "Ve el estado regulatorio de cada planta, sede y país en un solo lugar.", "Al día: 18 de 20 obligaciones"], ["Responsables por área", "Ambiental, fiscal, laboral y seguridad reciben solo lo que les toca, con la norma citada y el borrador listo.", "3 tareas asignadas esta semana"], ["Despachos y gestores externos", "Se suman al trámite con acceso aislado por cliente.", "Folio OT-2026-0418"]].map(([title, body, stat]) => <article key={title}><h3>{title}</h3><p>{body}</p><span className="mono">{stat}</span></article>)}</div></section>
    <section id="demo" className="closing"><div><h2>Lo que cambia en el DOF, antes de que te cueste.</h2><p>Agenda una demo. Otero revisa tu empresa y te dice qué publicaciones del último mes te aplican.</p><div className="actions"><a className="button button-primary" href="mailto:contact@otero.ai">Agendar demo</a><Link className="button button-outline" href="/sign-in">Iniciar sesión</Link></div></div><Mosaic count={9} /></section>
    <footer><span className="wordmark">otero<span /></span><span>© 2026 Otero · Cumplimiento regulatorio que se adelanta.</span><span className="footer-links"><Link href="/sign-in">Acceso admin</Link><a href="mailto:contact@otero.ai">Contacto</a></span></footer>
  </main>
}

