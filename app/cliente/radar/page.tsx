"use client"

import { useState } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

interface Article {
  id: string
  category: string
  categoryColor: string
  categoryBg: string
  title: string
  summary: string
  body: string
  source: string
  date: string
  readTime: string
  image: string
  featured?: boolean
  relevance: "alta" | "media" | "baja"
}

const ARTICLES: Article[] = [
  {
    id: "a1",
    featured: true,
    category: "Ambiental",
    categoryColor: "var(--ok)",
    categoryBg: "var(--ok-tint)",
    title: "SEMARNAT endurece requisitos para Licencias Ambientales de Operación industrial en 2025",
    summary: "La nueva circular técnica CT-12/2025 exige monitoreo continuo de emisiones para plantas industriales en Zonas Metropolitanas. Los plazos de resolución se amplían a 90 días hábiles.",
    body: "A partir del 1 de junio de 2025, toda Licencia Ambiental de Operación para instalaciones industriales en Zonas Metropolitanas deberá incluir un sistema de monitoreo continuo de emisiones conforme al Anexo XII de la CT-12/2025. Esto impacta directamente plantas de manufactura, parques logísticos y naves industriales en CDMX, Monterrey y Guadalajara. Las empresas con trámites en curso podrán acogerse al régimen anterior si su expediente fue ingresado antes del 15 de mayo.",
    source: "DOF / SEMARNAT",
    date: "28 Abr 2025",
    readTime: "4 min",
    image: "/radar/semarnat.jpg",
    relevance: "alta",
  },
  {
    id: "a2",
    category: "PROFEPA",
    categoryColor: "var(--ink)",
    categoryBg: "var(--surface-sunken)",
    title: "PROFEPA intensifica operativos de verificación en parques industriales del Valle de México",
    summary: "La Procuraduría anuncia 240 visitas de inspección programadas para Q2 2025 en corredores industriales. Empresas sin certificado vigente podrían recibir medidas de seguridad inmediata.",
    body: "PROFEPA comunicó el inicio del Programa de Verificación Industrial 2025 que contempla 240 visitas de inspección en los corredores industriales del Valle de México, Tlalnepantla, Vallejo, Xalostoc y Cuautitlán Izcalli entre abril y junio. Las empresas detectadas con certificado de emisiones vencido o sin cumplir las NOM ambientales vigentes serán sujetas a medidas de seguridad que pueden incluir sellos de clausura parcial o total. Se recomienda verificar el estatus de cumplimiento antes del 15 de mayo.",
    source: "PROFEPA / Circular 2025-Q2",
    date: "22 Abr 2025",
    readTime: "3 min",
    image: "/radar/profepa.png",
    relevance: "alta",
  },
  {
    id: "a3",
    category: "Fiscal",
    categoryColor: "var(--warn-text)",
    categoryBg: "var(--warn-tint)",
    title: "SAT amplía plazo de declaración anual para personas morales con ingresos mixtos",
    summary: "La prórroga aplica para contribuyentes con ingresos de fuentes nacionales e internacionales. El nuevo límite es el 31 de julio de 2025 sin recargos.",
    body: "El Servicio de Administración Tributaria emitió el comunicado SAT-2025-123 que otorga una prórroga automática al 31 de julio 2025 para personas morales que reportaron en su última declaración ingresos provenientes tanto de fuentes nacionales como del extranjero. No se requiere solicitud expresa. El beneficio aplica automáticamente si el RFC está en el catálogo de contribuyentes con operaciones internacionales.",
    source: "SAT / Comunicado 2025-123",
    date: "18 Abr 2025",
    readTime: "2 min",
    image: "/radar/fiscal.jpg",
    relevance: "media",
  },
  {
    id: "a4",
    category: "Inversión",
    categoryColor: "var(--ink-muted)",
    categoryBg: "var(--surface-sunken)",
    title: "ZMVM registra récord de inversión en parques industriales en el primer trimestre 2025",
    summary: "Con $22,800 MDP en proyectos autorizados, el corredor CDMX-Querétaro lidera la inversión industrial nacional. Ecatepec y Toluca concentran el 55% de los nuevos desarrollos.",
    body: "ProMéxico reportó que en el primer trimestre de 2025 se autorizaron proyectos de infraestructura industrial en la Zona Metropolitana del Valle de México por un monto total de $22,800 millones de pesos, un incremento del 28% respecto al mismo periodo de 2024. Los municipios de Ecatepec, Toluca y Cuautitlán Izcalli concentran el 55% de la nueva inversión. El marco regulatorio ambiental — especialmente las Licencias Ambientales de Operación — es el principal cuello de botella señalado por los desarrolladores.",
    source: "ProMéxico / Informe Q1 2025",
    date: "15 Abr 2025",
    readTime: "5 min",
    image: "/radar/inversion.jpg",
    relevance: "media",
  },
]

const RELEVANCE_CONFIG = {
  alta:  { label: "Alta relevancia", color: "var(--risk)", bg: "var(--risk-tint)" },
  media: { label: "Relevancia media", color: "var(--warn-text)", bg: "var(--warn-tint)" },
  baja:  { label: "Baja relevancia", color: "var(--ink-muted)", bg: "var(--surface-sunken)" },
}

function ArticleDrawer({ article, onClose }: { article: Article; onClose: () => void }) {
  const rel = RELEVANCE_CONFIG[article.relevance]
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      {/* Header */}
      <div className="relative h-52 shrink-0">
        <Image src={article.image} alt={article.title} fill className="object-cover" />
        <div className="absolute inset-0 bg-ink/60" />
        <button
          onClick={onClose}
          className="absolute top-12 left-4 w-9 h-9 rounded-full bg-ink/40 flex items-center justify-center text-surface"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="absolute bottom-4 left-4 right-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: article.categoryColor, background: article.categoryBg }}>
              {article.category}
            </span>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: rel.color, background: "var(--surface-raised)" }}>
              {rel.label}
            </span>
          </div>
          <h2 className="text-surface font-serif text-lg font-semibold leading-snug text-balance">{article.title}</h2>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-4 pb-4 border-b border-border">
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-4.5 5.25h4.5m.75 2.25h.008v.008H12v-.008zm0-16.5h.008v.008H12V3m0 18h.008v.008H12v-.008zM6.75 12h.008v.008H6.75V12zm0 2.25h.008v.008H6.75v-.008zm0 2.25h.008v.008H6.75v-.008zm0-6.75h.008v.008H6.75V9.75zM5.25 12h.008v.008H5.25V12zm0 2.25h.008v.008H5.25v-.008zm0 2.25h.008v.008H5.25v-.008zm0-6.75h.008v.008H5.25V9.75z" /></svg>
            {article.source}
          </span>
          <span>·</span>
          <span>{article.date}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {article.readTime}
          </span>
        </div>
        <p className="text-sm font-semibold text-foreground leading-relaxed mb-4">{article.summary}</p>
        <p className="text-sm text-muted-foreground leading-relaxed">{article.body}</p>

        <div className="mt-6 p-4 bg-surface-sunken border border-border rounded-2xl">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-3.5 h-3.5 text-ink" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
            </svg>
            <span className="text-[10px] font-bold text-ink uppercase tracking-wider">Relevancia para tu portafolio</span>
          </div>
          <p className="text-xs text-ink/70 leading-relaxed">
            {article.id === "a1" && "Tu Licencia Ambiental de Operación de la Planta Norte debe renovarse antes del 15 de mayo para acogerse al régimen anterior. Tu área ambiental coordinará el expediente esta semana."}
            {article.id === "a2" && "El certificado PROFEPA de la Nave Industrial 3 vence en 18 días. Este nuevo operativo de verificación incrementa el riesgo de clausura. Atender con carácter urgente."}
            {article.id === "a3" && "Tu empresa podría calificar para la prórroga automática por operaciones internacionales. Tu asesor corporativo validará tu situación fiscal esta semana."}
            {article.id === "a4" && "El contexto de mercado es favorable para la expansión de tu planta en el Bajío. Los tiempos de obtención de licencias ambientales deben alinearse con el calendario de apertura de inversión."}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function RadarPage() {
  const [openArticle, setOpenArticle] = useState<Article | null>(null)
  const [filter, setFilter] = useState<"todos" | "alta" | "media">("todos")

  const featured = ARTICLES[0]
  const rest = ARTICLES.slice(1)

  const filtered = filter === "todos" ? rest : rest.filter(a => a.relevance === filter)

  if (openArticle) {
    return <ArticleDrawer article={openArticle} onClose={() => setOpenArticle(null)} />
  }

  return (
    <div className="flex flex-col">
      {/* Dark header */}
      <div className="bg-ink px-6 pt-12 pb-7">
        <p className="text-ok/60 text-[10px] font-bold tracking-[0.2em] uppercase mb-3">Inteligencia legal</p>
        <div className="flex items-end justify-between">
          <h1 className="font-serif text-4xl font-semibold text-surface leading-none">
            Radar<br /><span className="text-surface/30 font-light">Regulatorio</span>
          </h1>
          <div className="text-right">
            <p className="text-3xl font-bold text-surface leading-none">{ARTICLES.length}</p>
            <p className="text-[10px] text-surface/40 uppercase tracking-wide mt-1">esta semana</p>
          </div>
        </div>
        <p className="text-surface/40 text-xs mt-3">Novedades seleccionadas para tu sector · 30 Abr 2025</p>
      </div>

      <div className="bg-background rounded-t-3xl -mt-2 px-5 pt-5 pb-4 flex flex-col gap-5">
        {/* Relevance filters */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none">
          {(["todos", "alta", "media"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all",
                filter === f ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
              )}
            >
              {f === "todos" ? "Todos" : f === "alta" ? "Alta relevancia" : "Relevancia media"}
            </button>
          ))}
        </div>

        {/* Featured article */}
        {filter === "todos" && (
          <button onClick={() => setOpenArticle(featured)} className="w-full text-left group">
            <div className="relative h-52 rounded-2xl overflow-hidden">
              <Image src={featured.image} alt={featured.title} fill className="object-cover group-active:scale-[1.02] transition-transform duration-300" />
              <div className="absolute inset-0 bg-ink/60" />
              <div className="absolute top-3 left-3">
                <span className="text-[9px] font-bold px-2 py-1 rounded-full bg-surface-raised text-ok">
                  Destacado · {featured.category}
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-risk bg-risk/15">
                    Alta relevancia
                  </span>
                  <span className="text-[10px] text-surface/50">{featured.readTime} de lectura</span>
                </div>
                <h2 className="text-surface font-serif text-lg font-semibold leading-snug text-balance">{featured.title}</h2>
                <p className="text-surface/60 text-xs mt-1.5 line-clamp-2">{featured.summary}</p>
              </div>
            </div>
          </button>
        )}

        {/* Article list */}
        <div className="flex flex-col gap-3">
          {filtered.map(article => {
            const rel = RELEVANCE_CONFIG[article.relevance]
            return (
              <button
                key={article.id}
                onClick={() => setOpenArticle(article)}
                className="w-full text-left flex gap-3 bg-card border border-border rounded-2xl p-3 active:scale-[0.98] transition-transform group"
              >
                <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0">
                  <Image src={article.image} alt={article.title} fill className="object-cover group-active:scale-105 transition-transform duration-300" />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: article.categoryColor, background: article.categoryBg }}>
                        {article.category}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md" style={{ color: rel.color, background: rel.bg }}>
                        {rel.label}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">{article.title}</p>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] text-muted-foreground">{article.date}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {article.readTime}
                    </span>
                    <svg className="w-3 h-3 text-muted-foreground ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
