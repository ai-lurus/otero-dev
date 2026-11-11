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
