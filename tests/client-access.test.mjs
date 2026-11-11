import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canSeeItem } from '../lib/client-access.ts'

const director = { isDirector: true, memberId: null }
const ana = { isDirector: false, memberId: 'ana' }
const sinFicha = { isDirector: false, memberId: null }

test('el director ve cualquier asunto enviado, sin importar estado ni responsable', () => {
  assert.equal(canSeeItem(director, { assigneeId: null, status: 'identificada' }), true)
  assert.equal(canSeeItem(director, { assigneeId: 'bob', status: 'descartada' }), true)
})

test('el miembro solo ve lo aceptado o cerrado que le asignaron', () => {
  assert.equal(canSeeItem(ana, { assigneeId: 'ana', status: 'aceptada' }), true)
  assert.equal(canSeeItem(ana, { assigneeId: 'ana', status: 'cerrada' }), true)
})

test('el miembro no ve asuntos de otros, sin asignar ni sin decidir', () => {
  assert.equal(canSeeItem(ana, { assigneeId: 'bob', status: 'aceptada' }), false)
  assert.equal(canSeeItem(ana, { assigneeId: null, status: 'aceptada' }), false)
  assert.equal(canSeeItem(ana, { assigneeId: 'ana', status: 'identificada' }), false)
  assert.equal(canSeeItem(ana, { assigneeId: 'ana', status: 'descartada' }), false)
})

test('un miembro sin ficha en el equipo no ve nada', () => {
  assert.equal(canSeeItem(sinFicha, { assigneeId: null, status: 'aceptada' }), false)
})
