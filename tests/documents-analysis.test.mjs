import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  documentTriggers, expiryState, mergeTriggers, sanitizeAnalysis, sanitizeSignals,
} from '../lib/documents/analysis.ts'

test('sanitizeAnalysis descarta valores fuera de catálogo y fechas inválidas', () => {
  const a = sanitizeAnalysis({
    tipo: 'inventado', estado: 'vigente', materia: 'ambiental', autoridad: '  SEMARNAT ',
    vigenciaInicio: '2027-01-01', vigenciaFin: '2026-12-31', senales: [{ key: 'emisiones', value: 'si' }],
  })
  assert.equal(a.tipo, 'otro')
  assert.equal(a.autoridad, 'SEMARNAT')
  assert.equal(a.vigenciaInicio, null) // inicio posterior al fin
  assert.equal(a.vigenciaFin, '2026-12-31')
  assert.deepEqual(a.senales, [{ key: 'emisiones', value: 'si' }])
  assert.equal(sanitizeAnalysis({ vigenciaFin: '31/12/2026' }).vigenciaFin, null)
})

test('sanitizeSignals solo acepta respuestas afirmativas válidas y sin duplicar', () => {
  assert.deepEqual(sanitizeSignals([
    { key: 'emisiones', value: 'no' },
    { key: 'emisiones', value: 'si' },
    { key: 'emisiones', value: 'si' },
    { key: 'residuos_peligrosos', value: 'enorme' },
    { key: 'inexistente', value: 'si' },
    { key: 'agua_descarga', value: 'drenaje' },
  ]), [{ key: 'emisiones', value: 'si' }, { key: 'agua_descarga', value: 'drenaje' }])
  assert.deepEqual(sanitizeSignals('x'), [])
})

test('documentTriggers usa solo confirmados y la respuesta más exigente', () => {
  const doc = (status, senales) => ({ analysisStatus: status, analysis: sanitizeAnalysis({ senales }) })
  const t = documentTriggers([
    doc('detected', [{ key: 'emisiones', value: 'si' }]),
    doc('confirmed', [{ key: 'residuos_peligrosos', value: 'micro' }]),
    doc('confirmed', [{ key: 'residuos_peligrosos', value: 'gran' }]),
    { analysisStatus: 'confirmed', analysis: null },
  ])
  assert.deepEqual(t, { residuos_peligrosos: 'gran' })
})

test('mergeTriggers: el perfil manda, el documento llena vacíos y corrige un "no"', () => {
  const merged = mergeTriggers(
    { immex: 'no', emisiones: 'si', residuos_peligrosos: 'pequeno' },
    { immex: 'si', residuos_peligrosos: 'micro', hidrocarburos: 'si' },
  )
  assert.deepEqual(merged, { immex: 'si', emisiones: 'si', residuos_peligrosos: 'pequeno', hidrocarburos: 'si' })
  assert.deepEqual(mergeTriggers(null, {}), {})
})

test('expiryState', () => {
  assert.equal(expiryState(null, '2026-11-10'), null)
  assert.equal(expiryState('2026-11-09', '2026-11-10'), 'vencido')
  assert.equal(expiryState('2026-11-10', '2026-11-10'), 'por_vencer')
  assert.equal(expiryState('2026-12-10', '2026-11-10'), 'por_vencer')
  assert.equal(expiryState('2026-12-11', '2026-11-10'), 'vigente')
})
