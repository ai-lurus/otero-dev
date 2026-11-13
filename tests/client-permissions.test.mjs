import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  can, visibleScreens, sanitizePermissions, fallbackHref, describePermissionChange, DEFAULT_MEMBER_PERMISSIONS,
} from '../lib/client-permissions.ts'
import { ACTION_DICTIONARY, isAuditAction, actionLabel, actionCategory, AUDIT_CATEGORIES } from '../lib/audit-actions.ts'

const director = { isDirector: true, permissions: null }
const defaults = { isDirector: false, permissions: null }

test('el director puede todo en cualquier pantalla', () => {
  assert.equal(can(director, 'certificaciones', 'delete'), true)
  assert.equal(can(director, 'pagos', 'create'), true)
})

test('el miembro sin personalizar conserva lo que ya tenía', () => {
  assert.equal(can(defaults, 'cumplimiento', 'edit'), true)
  assert.equal(can(defaults, 'documentos', 'create'), true)
  assert.equal(can(defaults, 'documentos', 'delete'), false)
  assert.equal(can(defaults, 'regwatch', 'view'), false)
  assert.equal(can(defaults, 'certificaciones', 'view'), false)
})

test('lo que el director guarda reemplaza los permisos de fábrica', () => {
  const custom = { isDirector: false, permissions: { regwatch: ['view'] } }
  assert.equal(can(custom, 'regwatch', 'view'), true)
  assert.equal(can(custom, 'cumplimiento', 'view'), false)
})

test('sanitize descarta pantallas y acciones inválidas y agrega ver implícito', () => {
  const clean = sanitizePermissions({ documentos: ['delete', 'hack'], inventada: ['view'], pagos: [], agenda: 'view' })
  assert.deepEqual(clean, { documentos: ['view', 'delete'] })
  assert.deepEqual(sanitizePermissions(null), {})
})

test('visibleScreens y fallbackHref siguen los permisos', () => {
  assert.deepEqual(visibleScreens(defaults), ['cumplimiento', 'documentos', 'noticias', 'perfil'])
  assert.equal(fallbackHref(defaults), '/cliente/cumplimiento')
  assert.equal(fallbackHref({ isDirector: false, permissions: {} }), '/cliente')
})

test('describePermissionChange lista lo agregado y lo quitado', () => {
  const lines = describePermissionChange(DEFAULT_MEMBER_PERMISSIONS, { cumplimiento: ['view'], pagos: ['view'] })
  assert.ok(lines.includes('Mi cumplimiento: −Crear, Editar'))
  assert.ok(lines.includes('Pagos: +Ver'))
  assert.ok(lines.includes('Documentos: −Ver, Crear'))
})

test('el diccionario de acciones tiene categoría válida y etiqueta en cada llave', () => {
  for (const [key, def] of Object.entries(ACTION_DICTIONARY)) {
    assert.ok(def.label.length > 0, key)
    assert.ok(def.category in AUDIT_CATEGORIES, key)
  }
  assert.equal(isAuditAction('documento.creado'), true)
  assert.equal(isAuditAction('constructor'), false)
  assert.equal(actionLabel('otra.cosa'), 'otra.cosa')
  assert.equal(actionCategory('usuario.creado'), 'usuario')
})
