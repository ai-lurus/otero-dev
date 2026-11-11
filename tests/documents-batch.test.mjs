import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  MAX_BATCH_FILES, analysisRoom, isHighConfidence, pickBatchFiles, runPool,
} from '../lib/documents/batch.ts'

const pdf = (name, size = 1000) => ({ name, size, type: 'application/pdf' })

test('pickBatchFiles rechaza formato, tamaño y excedente sin tirar el lote', () => {
  const files = [pdf('a.pdf'), { name: 'x.exe', size: 10, type: 'application/x-msdownload' }, pdf('vacío.pdf', 0), pdf('b.pdf')]
  const { accepted, rejected } = pickBatchFiles(files)
  assert.deepEqual(accepted.map(f => f.name), ['a.pdf', 'b.pdf'])
  assert.equal(rejected.length, 2)
})

test('pickBatchFiles respeta el tope contando lo ya encolado', () => {
  const many = Array.from({ length: MAX_BATCH_FILES + 5 }, (_, i) => pdf(`f${i}.pdf`))
  assert.equal(pickBatchFiles(many).accepted.length, MAX_BATCH_FILES)
  const rest = pickBatchFiles(many, MAX_BATCH_FILES - 2)
  assert.equal(rest.accepted.length, 2)
})

test('runPool limita la concurrencia y un error no detiene el resto', async () => {
  let inFlight = 0
  let peak = 0
  const done = []
  await runPool([1, 2, 3, 4, 5, 6], 2, async n => {
    inFlight++
    peak = Math.max(peak, inFlight)
    await new Promise(r => setTimeout(r, 5))
    inFlight--
    if (n === 3) throw new Error('falla')
    done.push(n)
  })
  assert.equal(peak, 2)
  assert.deepEqual(done.sort(), [1, 2, 4, 5, 6])
})

test('isHighConfidence exige tipo, autoridad, materia y estado definidos', () => {
  const ok = { tipo: 'permiso', autoridad: 'SEMARNAT', estado: 'vigente', materia: 'ambiental', vigenciaInicio: null, vigenciaFin: null, senales: [] }
  assert.equal(isHighConfidence(ok), true)
  assert.equal(isHighConfidence({ ...ok, autoridad: null }), false)
  assert.equal(isHighConfidence({ ...ok, tipo: 'otro' }), false)
  assert.equal(isHighConfidence(null), false)
})

test('analysisRoom nunca es negativo', () => {
  assert.equal(analysisRoom(40, 100), 60)
  assert.equal(analysisRoom(150, 100), 0)
})
