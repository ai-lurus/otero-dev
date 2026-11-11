import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildBlocks, fromToolInput } from '../lib/documents/analyze.ts'

test('fromToolInput traduce la respuesta de Haiku y sanea', () => {
  const a = fromToolInput({
    tipo: 'permiso', autoridad: 'ASEA', estado: 'vigente', materia: 'energia',
    vigencia_inicio: '2025-01-01', vigencia_fin: '2030-01-01',
    senales: [{ clave: 'hidrocarburos', valor: 'si' }, { clave: 'hidrocarburos', valor: 'no' }, { clave: 'x', valor: 'si' }],
  })
  assert.deepEqual(a, {
    tipo: 'permiso', autoridad: 'ASEA', estado: 'vigente', materia: 'energia',
    vigenciaInicio: '2025-01-01', vigenciaFin: '2030-01-01', senales: [{ key: 'hidrocarburos', value: 'si' }],
  })
})

test('buildBlocks: texto y PDF se envían; formatos no soportados devuelven null', async () => {
  const txt = await buildBlocks(Buffer.from('Permiso de descarga'), 'text/plain', 'a.txt')
  assert.match(txt[0].text, /Permiso de descarga/)
  const pdf = await buildBlocks(Buffer.from('%PDF'), 'application/pdf', 'a.pdf')
  assert.equal(pdf[0].type, 'document')
  assert.equal(await buildBlocks(Buffer.from('x'), 'application/vnd.ms-excel', 'a.xls'), null)
  assert.equal(await buildBlocks(Buffer.from('x'), 'image/heic', 'a.heic'), null)
  assert.equal(await buildBlocks(Buffer.from('  '), 'text/plain', 'a.txt'), null)
})

test('buildChunks divide un PDF largo en partes y uno corto o inválido va entero', async () => {
  const { PDFDocument } = await import('pdf-lib')
  const { buildChunks, MAX_CHUNKS } = await import('../lib/documents/analyze.ts')
  const make = async n => {
    const doc = await PDFDocument.create()
    for (let i = 0; i < n; i++) doc.addPage()
    return Buffer.from(await doc.save())
  }
  const pagesOf = async block => (await PDFDocument.load(Buffer.from(block[0].source.data, 'base64'))).getPageCount()
  const chunks = await buildChunks(await make(50), 'application/pdf', 'a.pdf')
  assert.deepEqual(await Promise.all(chunks.map(pagesOf)), [20, 20, 10])
  assert.match(chunks[1][1].text, /parte 2 de 3/)
  assert.equal((await buildChunks(await make(5), 'application/pdf', 'a.pdf')).length, 1)
  assert.equal((await buildChunks(Buffer.from('%PDF-roto'), 'application/pdf', 'a.pdf')).length, 1)
  const huge = await buildChunks(await make(20 * (MAX_CHUNKS + 5)), 'application/pdf', 'a.pdf')
  assert.equal(huge.length, MAX_CHUNKS)
})

test('buildChunks parte el texto largo y conserva el final del documento', async () => {
  const { buildChunks } = await import('../lib/documents/analyze.ts')
  const text = 'A'.repeat(60_000) + 'B'.repeat(60_000) + 'TRANSITORIOS vigencia 2030'
  const chunks = await buildChunks(Buffer.from(text), 'text/plain', 'a.txt')
  assert.equal(chunks.length, 3)
  assert.match(chunks[2][0].text, /TRANSITORIOS vigencia 2030/)
})

test('pickChunkIndexes lee las primeras y las últimas partes cuando hay demasiadas', async () => {
  const { pickChunkIndexes } = await import('../lib/documents/analyze.ts')
  assert.deepEqual(pickChunkIndexes(3, 15), [0, 1, 2])
  assert.deepEqual(pickChunkIndexes(20, 4), [0, 1, 18, 19])
})
