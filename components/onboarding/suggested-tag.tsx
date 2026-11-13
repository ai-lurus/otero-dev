import { Sparkles } from 'lucide-react'

/** Marca un dato que Otero propuso desde los documentos del cliente; deja de mostrarse en cuanto lo edita. */
export function SuggestedTag({ sources }: { sources: string[] }) {
  const title = sources.length > 0 ? `De: ${sources.join(', ')}` : undefined
  return (
    <span title={title} className="inline-flex w-fit items-center gap-1 rounded-pill bg-brand-tint px-2 py-0.5 text-caption text-brand-text">
      <Sparkles aria-hidden className="size-3" /> Sugerido por tus documentos
    </span>
  )
}
