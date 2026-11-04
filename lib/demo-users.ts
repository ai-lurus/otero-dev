// Personas ficticias para el demo de una empresa cliente. Las usan el botón
// del recorrido (/admin/demo) y scripts/demo-users.mjs, que repite esta lista;
// si cambia aquí, cambia allá. La contraseña sale de DEMO_PASSWORD.

export type DemoPersona = {
  local: string
  name: string
  position: string
  role: 'tenant_admin' | 'client'
}

export const DEMO_PERSONAS: readonly DemoPersona[] = [
  { local: 'admin', name: 'Mariana Torres', position: 'Directora jurídica', role: 'tenant_admin' },
  { local: 'ambiental', name: 'Jorge Medina', position: 'Gerente de medio ambiente', role: 'client' },
  { local: 'cumplimiento', name: 'Lucía Ramírez', position: 'Coordinadora de cumplimiento', role: 'client' },
]

/** Empresa ficticia que el recorrido puede registrar en un clic. */
export const DEMO_TENANT = {
  name: 'Química del Bajío S.A. de C.V.',
  slug: 'quimica-bajio',
  rfc: 'QBA180301AB1',
  industry: 'Manufactura',
} as const

export function slugify(value: string) {
  return value
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/s\.?\s?a\.?(\s?de\s?c\.?\s?v\.?)?/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

/** Correo de una persona demo: admin@quimica-bajio.demo */
export const demoEmail = (local: string, slug: string) => `${local}@${slug}.demo`

export function demoPassword() {
  const value = process.env.DEMO_PASSWORD
  if (!value || value.length < 8) throw new Error('Define DEMO_PASSWORD (8 caracteres o más) en .env para crear usuarios demo')
  return value
}
