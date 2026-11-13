import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  documentTriggers, expiryState, mergeAnalyses, mergeTriggers, sanitizeAnalysis, sanitizeSignals, visibleStatus,
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

const part = over => ({
  tipo: 'otro', autoridad: null, estado: 'desconocido', materia: 'otra',
  vigenciaInicio: null, vigenciaFin: null, senales: [], ...over,
})

test('mergeAnalyses junta las partes: lo más repetido en identidad, lo último en vigencia', () => {
  const merged = mergeAnalyses([
    part({ tipo: 'permiso', autoridad: 'SEMARNAT', materia: 'ambiental', vigenciaInicio: '2024-01-01', vigenciaFin: '2026-01-01', estado: 'vigente' }),
    part({ tipo: 'otro', autoridad: 'semarnat', materia: 'ambiental' }),
    part({ tipo: 'permiso', autoridad: 'ASEA', vigenciaFin: '2030-06-30', estado: 'vigente',
      senales: [{ key: 'hidrocarburos', value: 'si' }] }),
  ])
  assert.equal(merged.tipo, 'permiso')
  assert.equal(merged.autoridad, 'SEMARNAT')
  assert.equal(merged.materia, 'ambiental')
  assert.equal(merged.vigenciaInicio, '2024-01-01')
  assert.equal(merged.vigenciaFin, '2030-06-30') // la prórroga del final manda
  assert.deepEqual(merged.senales, [{ key: 'hidrocarburos', value: 'si' }])
})

test('mergeAnalyses de una sola parte la devuelve igual y sin datos cae a valores neutros', () => {
  const one = part({ tipo: 'licencia', autoridad: 'COFEPRIS', materia: 'salud', estado: 'vigente' })
  assert.deepEqual(mergeAnalyses([one]), one)
  assert.equal(mergeAnalyses([part({})]).tipo, 'otro')
})

test('visibleStatus deja de mostrar "leyendo" cuando la lectura lleva demasiado', () => {
  const now = Date.parse('2026-11-11T12:00:00Z')
  assert.equal(visibleStatus({ analysisStatus: 'analyzing', uploadedAt: new Date(now - 60_000) }, now), 'analyzing')
  assert.equal(visibleStatus({ analysisStatus: 'analyzing', uploadedAt: new Date(now - 11 * 60_000) }, now), 'none')
  assert.equal(visibleStatus({ analysisStatus: 'detected', uploadedAt: new Date(now - 99 * 60_000) }, now), 'detected')
})

test('sanitizeAnalysis conserva los datos de la empresa solo si son válidos', () => {
  const a = sanitizeAnalysis({
    empresa: {
      razonSocial: ' Química del Bajío SA de CV ', actividad: 'Fabrica resinas.', scian: '325',
      estados: ['Guanajuato', 'Narnia', 'guanajuato'], certificaciones: ['ISO 14001', ' ', 'ISO 14001'],
    },
  })
  assert.equal(a.empresa.razonSocial, 'Química del Bajío SA de CV')
  assert.equal(a.empresa.scian, '325')
  assert.deepEqual(a.empresa.estados, ['Guanajuato'])
  assert.deepEqual(a.empresa.certificaciones, ['ISO 14001'])
  assert.equal(sanitizeAnalysis({ empresa: { scian: '999', estados: [] } }).empresa, undefined)
  assert.equal(sanitizeAnalysis({}).empresa, undefined)
})

test('mergeAnalyses junta los datos de empresa de las partes', () => {
  const merged = mergeAnalyses([
    part({ empresa: { razonSocial: null, actividad: null, scian: null, estados: ['Guanajuato'], certificaciones: [] } }),
    part({ empresa: { razonSocial: 'Acme', actividad: 'Fabrica resinas.', scian: '325', estados: ['Querétaro', 'Guanajuato'], certificaciones: ['ISO 14001'] } }),
  ])
  assert.equal(merged.empresa.razonSocial, 'Acme')
  assert.equal(merged.empresa.actividad, 'Fabrica resinas.')
  assert.equal(merged.empresa.scian, '325')
  assert.deepEqual(merged.empresa.estados, ['Guanajuato', 'Querétaro'])
  assert.deepEqual(merged.empresa.certificaciones, ['ISO 14001'])
})
