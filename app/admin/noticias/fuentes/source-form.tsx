'use client'

import { useState } from 'react'
import { Loader2, Search } from 'lucide-react'
import { addNewsSource, previewNewsSource, updateNewsSource, type NewsSourceAdminRow, type NewsSourceInput } from '@/app/actions/news-sources'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MATERIAS } from '@/lib/ingest/categories'
import { decodeEntities } from '@/lib/ingest/title'

type Preview = { total: number; sample: { url: string; title: string; publishedAt: string | null }[] }

const EMPTY: NewsSourceInput = { name: '', shortName: '', url: '', linkFilter: '', kind: 'dependencia', parent: '', materia: 'otra' }

const selectClass = 'h-10 w-full rounded-md border border-border-strong bg-surface-raised px-3 text-body text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: 'America/Mexico_City' })

function fromSource(s: NewsSourceAdminRow): NewsSourceInput {
  return { name: s.name, shortName: s.shortName, url: s.url, linkFilter: s.linkFilter ?? '', kind: s.kind, parent: s.parent ?? '', materia: s.materia }
}

/** Alta o edición de una fuente del boletín. Con `source` edita; sin él, agrega. */
export function SourceForm({ source, primary, onSaved, onCancel }: {
  source?: NewsSourceAdminRow
  /** El botón de guardar es la acción primaria de la vista. */
  primary?: boolean
  onSaved: (s: NewsSourceAdminRow) => void
  onCancel?: () => void
}) {
  const [form, setForm] = useState<NewsSourceInput>(source ? fromSource(source) : EMPTY)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const set = (k: keyof NewsSourceInput, readField = false) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.value
    setForm(f => ({ ...f, [k]: value }))
    if (readField) setPreview(null)
  }
  const fieldId = (k: string) => `${source?.id ?? 'nueva'}-${k}`

  async function handleTest() {
    setTesting(true)
    setError('')
    setPreview(null)
    try {
      const res = await previewNewsSource({ url: form.url, linkFilter: form.linkFilter })
      if (!res.ok) { setError(res.error); return }
      setPreview({ total: res.total, sample: res.sample })
    } catch {
      setError('No se pudo probar el listado. Intenta de nuevo.')
    } finally {
      setTesting(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = source ? await updateNewsSource(source.id, form) : await addNewsSource(form)
      if (!res.ok) { setError(res.error); return }
      onSaved(res.source)
      if (!source) { setForm(EMPTY); setPreview(null) }
    } catch {
      setError('No se pudo guardar. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  const busy = saving || testing
  return (
    <form onSubmit={handleSave} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor={fieldId('url')}>Listado de comunicados</Label>
          <Input id={fieldId('url')} value={form.url} onChange={set('url', true)} inputMode="url" placeholder="https://www.gob.mx/stps/archivo/prensa" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId('name')}>Nombre</Label>
          <Input id={fieldId('name')} value={form.name} onChange={set('name')} placeholder="Trabajo y Previsión Social" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId('short')}>Nombre en la cita</Label>
          <Input id={fieldId('short')} value={form.shortName} onChange={set('shortName')} placeholder="STPS" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId('filter')}>Filtro de enlaces (opcional)</Label>
          <Input id={fieldId('filter')} value={form.linkFilter} onChange={set('linkFilter', true)} placeholder="*/stps/prensa/*" />
          <p className="text-caption text-ink-muted">Solo se toman las notas cuya URL contenga este texto; * vale por cualquier cosa.</p>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId('materia')}>Materia por defecto</Label>
          <select id={fieldId('materia')} value={form.materia} onChange={set('materia')} className={selectClass}>
            {Object.entries(MATERIAS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId('kind')}>Tipo</Label>
          <select id={fieldId('kind')} value={form.kind} onChange={set('kind')} className={selectClass}>
            <option value="dependencia">Dependencia</option>
            <option value="institucion">Institución</option>
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId('parent')}>Depende de (opcional)</Label>
          <Input id={fieldId('parent')} value={form.parent} onChange={set('parent')} placeholder="Medio Ambiente" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={handleTest} disabled={busy || !form.url.trim()}>
          {testing ? <Loader2 className="animate-spin" /> : <Search />} Probar URL
        </Button>
        <Button type="submit" variant={primary ? 'default' : 'outline'} disabled={busy || !form.url.trim()}>
          {saving && <Loader2 className="animate-spin" />} {source ? 'Guardar cambios' : 'Agregar fuente'}
        </Button>
        {onCancel && <Button type="button" variant="ghost" onClick={onCancel} disabled={saving}>Cancelar</Button>}
      </div>

      {preview && (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface-sunken p-4">
          <p className="text-body-sm font-medium text-ink">
            {preview.total === 0 ? 'No encontró notas. Revisa la URL o el filtro.'
              : preview.total === 1 ? 'Tomaría 1 nota' : `Tomaría ${preview.total} notas`}
            {preview.total > 8 && '; las primeras:'}
          </p>
          <ul className="flex flex-col gap-1">
            {preview.sample.map(n => (
              <li key={n.url} className="flex min-w-0 items-baseline gap-2 text-body-sm">
                {n.publishedAt && <span className="shrink-0 text-caption text-ink-muted">{shortDate(n.publishedAt)}</span>}
                <a href={n.url} target="_blank" rel="noreferrer" className="truncate text-ink hover:underline">{decodeEntities(n.title)}</a>
              </li>
            ))}
          </ul>
          {preview.total > 0 && <p className="text-caption text-ink-muted">Si salen enlaces de menú o que no son comunicados, agrega un filtro y vuelve a probar.</p>}
        </div>
      )}
      {error && <p role="alert" className="text-body-sm text-risk">{error}</p>}
    </form>
  )
}
