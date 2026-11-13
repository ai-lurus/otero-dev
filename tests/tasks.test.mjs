import { test } from 'node:test'
import assert from 'node:assert/strict'
import { taskLight, parseTaskInput, canSeeTask, compareTasks } from '../lib/tasks.ts'

const today = new Date(2026, 10, 13) // 13 nov 2026
const light = (dueDate, status = 'pendiente') => taskLight({ status, dueDate }, today)

test('semáforo: vencida y a 2 días son rojo, a 7 amarillo, más lejos verde', () => {
  assert.deepEqual(light('2026-11-10'), { light: 'risk', label: 'Venció hace 3 días' })
  assert.deepEqual(light('2026-11-13'), { light: 'risk', label: 'Vence hoy' })
  assert.deepEqual(light('2026-11-15'), { light: 'risk', label: 'Vence en 2 días' })
  assert.deepEqual(light('2026-11-20'), { light: 'warn', label: 'Vence en 7 días' })
  assert.deepEqual(light('2026-11-21'), { light: 'ok', label: 'Vence en 8 días' })
})

test('semáforo: completada o sin plazo no se semaforiza', () => {
  assert.equal(light('2026-11-01', 'completada').light, 'none')
  assert.equal(light(null).light, 'none')
})

test('validación: título obligatorio y fechas coherentes', () => {
  assert.throws(() => parseTaskInput({ title: '  ' }), /título/)
  assert.throws(() => parseTaskInput({ title: 'x', startDate: '2026-12-01', dueDate: '2026-11-01' }), /anterior/)
  assert.throws(() => parseTaskInput({ title: 'x', dueDate: '13/11/2026' }), /inválida/)
  assert.deepEqual(parseTaskInput({ title: ' Revisar ', dueDate: '' }), { title: 'Revisar', description: '', assigneeId: null, startDate: null, dueDate: null })
})

test('visibilidad: el director ve todo, el miembro solo lo suyo', () => {
  assert.equal(canSeeTask({ isDirector: true, memberId: null }, { assigneeId: 'bob' }), true)
  assert.equal(canSeeTask({ isDirector: false, memberId: 'ana' }, { assigneeId: 'ana' }), true)
  assert.equal(canSeeTask({ isDirector: false, memberId: 'ana' }, { assigneeId: 'bob' }), false)
  assert.equal(canSeeTask({ isDirector: false, memberId: null }, { assigneeId: null }), false)
})

test('orden: abiertas por plazo, completadas al final', () => {
  const sorted = [
    { status: 'completada', dueDate: '2026-01-01' },
    { status: 'pendiente', dueDate: null },
    { status: 'pendiente', dueDate: '2026-12-01' },
  ].sort(compareTasks)
  assert.deepEqual(sorted.map((t) => t.dueDate), ['2026-12-01', null, '2026-01-01'])
})
