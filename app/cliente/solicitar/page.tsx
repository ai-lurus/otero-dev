"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SERVICE_CATALOG } from "@/lib/types"
import type { Firm } from "@/lib/types"
import { cn } from "@/lib/utils"

type Step = 1 | 2 | 3

const CATEGORIES = ["Ambiental", "Regulatorio", "Corporativo", "Litigio", "PI", "Otro"]

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Ambiental: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
    </svg>
  ),
  Regulatorio: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ),
  Corporativo: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  Litigio: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.971zm-16.5.52c.99-.203 1.99-.377 3-.52m0 0l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.989 5.989 0 01-2.031.352 5.989 5.989 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L5.25 4.971z" />
    </svg>
  ),
  PI: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
  ),
  Otro: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
}

const FIRM_AI_TIPS: Record<Firm, string> = {
  paulsen: "Basado en tu historial, también deberías revisar el estado de tu Certificado PROFEPA antes de iniciar este trámite.",
  mia: "Recomendamos también revisar el contrato existente antes de constituir una nueva entidad. Un asesor corporativo te contactará en menos de 24 horas.",
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all",
            i + 1 < current ? "bg-[#16A34A] text-white" :
            i + 1 === current ? "bg-[#1C2B4A] text-white" :
            "bg-muted text-muted-foreground"
          )}>
            {i + 1 < current ? (
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : i + 1}
          </div>
          {i < total - 1 && (
            <div className={cn("h-0.5 w-8 rounded-full transition-all", i + 1 < current ? "bg-[#16A34A]" : "bg-muted")} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function SolicitarPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)
  const [selectedCatalog, setSelectedCatalog] = useState<string | null>(null)
  const [customTitle, setCustomTitle] = useState("")
  const [customCategory, setCustomCategory] = useState("")
  const [description, setDescription] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [aiTipDismissed, setAiTipDismissed] = useState(false)

  const selectedService = SERVICE_CATALOG.find((s) => s.id === selectedCatalog)

  function handleSubmit() {
    setSubmitted(true)
    setTimeout(() => router.push("/cliente/servicios"), 2200)
  }

  if (submitted) {
    return (
      <div className="px-5 pt-16 pb-4 flex flex-col items-center text-center gap-5">
        <div className="w-20 h-20 rounded-full bg-[#F0FDF4] flex items-center justify-center">
          <svg className="w-10 h-10 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="font-serif text-2xl font-semibold text-foreground">Solicitud enviada</h2>
          <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
            Un asesor te contactará en menos de 24 horas hábiles para confirmar y asignar responsable.
          </p>
        </div>
        <div className="w-full bg-card border border-border rounded-2xl p-4 text-left">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Resumen</p>
          <p className="text-sm font-semibold text-foreground">{selectedService?.label || customTitle}</p>
          {selectedService && (
            <p className="text-xs text-muted-foreground mt-0.5">{selectedService.firm === "paulsen" ? "Área Ambiental" : "Área Corporativa"} · {selectedService.category}</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Redirigiendo a tus servicios...</p>
      </div>
    )
  }

  return (
    <div className="px-5 pt-6 pb-4 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => step > 1 ? setStep((step - 1) as Step) : router.back()}
          className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center active:scale-95 transition-transform"
        >
          <svg className="w-4 h-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground uppercase tracking-widest">Nuevo servicio</p>
          <h1 className="font-serif text-xl font-semibold text-foreground leading-tight">
            {step === 1 ? "¿Qué necesitas?" : step === 2 ? "Cuéntanos más" : "Confirmar solicitud"}
          </h1>
        </div>
      </div>

      {/* Step indicator */}
      <StepIndicator current={step} total={3} />

      {/* ── STEP 1: Select service ── */}
      {step === 1 && (
        <div className="flex flex-col gap-4">
          {(["paulsen", "mia"] as Firm[]).map((firm) => {
            const firmServices = SERVICE_CATALOG.filter((s) => s.firm === firm)
            return (
              <div key={firm}>
                <div className={cn(
                  "inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full mb-2.5",
                  firm === "paulsen" ? "bg-[#EAF2EC] text-[#2D5A3D]" : "bg-[#EEF2F8] text-[#1C2B4A]"
                )}>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18" />
                  </svg>
                  {firm === "paulsen" ? "Área Ambiental" : "Área Corporativa"}
                </div>
                <div className="flex flex-col gap-2">
                  {firmServices.map((s) => {
                    const isSelected = selectedCatalog === s.id
                    return (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedCatalog(s.id); setCustomTitle("") }}
                        className={cn(
                          "w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3 active:scale-[0.98]",
                          isSelected
                            ? firm === "paulsen"
                              ? "border-[#2D5A3D] bg-[#EAF2EC]"
                              : "border-[#1C2B4A] bg-[#EEF2F8]"
                            : "border-border bg-card hover:border-foreground/20"
                        )}
                      >
                        <div className={cn(
                          "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                          isSelected
                            ? firm === "paulsen" ? "bg-[#2D5A3D] text-white" : "bg-[#1C2B4A] text-white"
                            : "bg-muted text-muted-foreground"
                        )}>
                          {CATEGORY_ICONS[s.category] || CATEGORY_ICONS.Otro}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug">{s.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.category}</p>
                        </div>
                        {isSelected && (
                          <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0", firm === "paulsen" ? "bg-[#2D5A3D]" : "bg-[#1C2B4A]")}>
                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}

          {/* Custom option */}
          <div className="border border-dashed border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Otro / Personalizado</p>
            </div>
            <input
              type="text"
              placeholder="Describe brevemente el servicio que necesitas..."
              value={customTitle}
              onChange={(e) => { setCustomTitle(e.target.value); setSelectedCatalog(null) }}
              className="w-full text-sm bg-muted rounded-xl px-3 py-2.5 outline-none border border-transparent focus:border-[#1C2B4A]/30 placeholder:text-muted-foreground/50"
            />
            {customTitle && (
              <div className="mt-2.5">
                <p className="text-xs text-muted-foreground mb-2">Categoría:</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCustomCategory(c)}
                      className={cn(
                        "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border transition-all",
                        customCategory === c
                          ? "bg-[#1C2B4A] text-white border-[#1C2B4A]"
                          : "border-border text-muted-foreground hover:border-foreground/20"
                      )}
                    >
                      <span className={customCategory === c ? "text-white/70" : "text-muted-foreground/70"}>
                        {CATEGORY_ICONS[c]}
                      </span>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setStep(2)}
            disabled={!selectedCatalog && !customTitle}
            className="w-full bg-[#1C2B4A] text-white font-semibold py-3.5 rounded-2xl disabled:opacity-40 transition-opacity active:scale-[0.98] flex items-center justify-center gap-2"
          >
            Continuar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}

      {/* ── STEP 2: Description ── */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {/* Selected service pill */}
          <div className={cn(
            "rounded-2xl p-3.5 flex items-center gap-3",
            selectedService?.firm === "paulsen" ? "bg-[#EAF2EC]" : "bg-[#EEF2F8]"
          )}>
            <div className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
              selectedService?.firm === "paulsen" ? "bg-[#2D5A3D] text-white" : "bg-[#1C2B4A] text-white"
            )}>
              {CATEGORY_ICONS[selectedService?.category || "Otro"]}
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Servicio seleccionado</p>
              <p className="text-sm font-semibold text-foreground mt-0.5">{selectedService?.label || customTitle}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">Describe tu necesidad</p>
            <p className="text-xs text-muted-foreground mb-3">Menciona contexto relevante, fechas límite o información que nos ayude a atenderte mejor.</p>
            <textarea
              rows={5}
              placeholder="Ej. Necesitamos renovar la Licencia Ambiental de Operación antes del 15 de mayo. La licencia original es de 2022 y cubre la Planta Vallejo Norte..."
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, 500))}
              className="w-full text-sm bg-muted rounded-2xl px-4 py-3 outline-none border border-transparent focus:border-[#1C2B4A]/30 placeholder:text-muted-foreground/40 resize-none leading-relaxed"
            />
            <p className="text-xs text-muted-foreground mt-1.5 text-right tabular-nums">
              {description.length}/500
            </p>
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full bg-[#1C2B4A] text-white font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            Continuar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </button>
        </div>
      )}

      {/* ── STEP 3: Confirm ── */}
      {step === 3 && (
        <div className="flex flex-col gap-4">
          {/* Summary card */}
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className={cn(
              "px-4 py-3 flex items-center gap-3",
              selectedService?.firm === "paulsen" ? "bg-[#EAF2EC]" : "bg-[#EEF2F8]"
            )}>
              <div className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center shrink-0",
                selectedService?.firm === "paulsen" ? "bg-[#2D5A3D] text-white" : "bg-[#1C2B4A] text-white"
              )}>
                {CATEGORY_ICONS[selectedService?.category || "Otro"]}
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{selectedService?.label || customTitle}</p>
                <p className="text-xs text-muted-foreground">{selectedService ? (selectedService.firm === "paulsen" ? "Área Ambiental" : "Área Corporativa") : "Por definir"} · {selectedService?.category || customCategory || "Por definir"}</p>
              </div>
            </div>
            {description && (
              <div className="px-4 py-3 border-t border-border">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1.5">Descripción</p>
                <p className="text-sm text-foreground leading-relaxed">{description}</p>
              </div>
            )}
            <div className="px-4 py-3 border-t border-border flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-[#16A34A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-muted-foreground">Respuesta en menos de <span className="font-semibold text-foreground">24 horas hábiles</span></p>
            </div>
          </div>

          {/* AI tip — dismissable */}
          {!aiTipDismissed && (
            <div className="bg-[#1C2B4A] rounded-2xl p-4 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#2D5A3D] opacity-20 blur-2xl -translate-y-4 translate-x-4 pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-white/15 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-bold tracking-wider uppercase text-white/70">Sugerencia IA</span>
                  </div>
                  <button
                    onClick={() => setAiTipDismissed(true)}
                    className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center active:bg-white/20"
                  >
                    <svg className="w-3 h-3 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-sm text-white/90 leading-relaxed">
                  {FIRM_AI_TIPS[selectedService?.firm || "mia"]}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full bg-[#2D5A3D] text-white font-semibold py-3.5 rounded-2xl active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
            </svg>
            Enviar solicitud
          </button>
        </div>
      )}
    </div>
  )
}
