import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildProposal } from '../lib/onboarding-proposal.ts'
import { sanitizeAnalysis } from '../lib/documents/analysis.ts'

const doc = (id, name, over = {}, status = 'detected') => ({
  id, name, analysisStatus: status, analysis: sanitizeAnalysis(over),
})
const TODAY = '2026-11-13'

const docs = [
  doc('1', 'registro-residuos.pdf', {
    tipo: 'registro', autoridad: 'SEMARNAT', materia: 'ambiental', estado: 'vigente', vigenciaFin: '2030-01-01',
    senales: [{ key: 'residuos_peligrosos', value: 'gran' }],
    empresa: { razonSocial: 'Química del Bajío', actividad: 'Fabrica resinas y adhesivos.', scian: '325', estados: ['Guanajuato'], certificaciones: [] },
  }),
  doc('2', 'concesion-agua.pdf', {
    tipo: 'concesion', autoridad: 'CONAGUA', materia: 'agua', estado: 'vencido', vigenciaFin: '2026-03-01',
    senales: [{ key: 'agua_concesion', value: 'si' }, { key: 'residuos_peligrosos', value: 'micro' }],
    empresa: { estados: ['Querétaro'], certificaciones: ['ISO 14001'] },
  }),
  doc('3', 'iso.pdf', { tipo: 'certificado', estado: 'vigente', vigenciaFin: '2026-12-01' }, 'confirmed'),
  { id: '4', name: 'leyendo.pdf', analysisStatus: 'analyzing', analysis: null },
  { id: '5', name: 'ilegible.pdf', analysisStatus: 'none', analysis: null },
]

test('buildProposal cuenta lo leído, lo que se está leyendo y lo que no se pudo leer', () => {
  const p = buildProposal(docs, TODAY)
  assert.equal(p.readCount, 3)
  assert.equal(p.readingCount, 1)
  assert.equal(p.unreadCount, 1)
})

test('buildProposal contesta preguntas con la respuesta más exigente y dice de qué documentos salió', () => {
  const p = buildProposal(docs, TODAY)
  assert.deepEqual(p.triggers, { residuos_peligrosos: 'gran', agua_concesion: 'si' })
  assert.deepEqual(p.triggerSources.residuos_peligrosos, ['registro-residuos.pdf', 'concesion-agua.pdf'])
  assert.equal(p.answered, 2)
  assert.ok(p.total >= 10)
})

test('buildProposal propone la empresa: sector, estados, certificaciones y descripción', () => {
  const p = buildProposal(docs, TODAY)
  assert.equal(p.scian, '325')
  assert.deepEqual(p.stateList, ['Guanajuato', 'Querétaro'])
  assert.equal(p.company.industry, 'Industria química (incluye farmacéutica)')
  assert.match(p.company.description, /Química del Bajío/)
  assert.match(p.company.description, /resinas y adhesivos/)
  assert.match(p.company.certifications, /ISO 14001/)
  assert.match(p.company.activities, /residuos peligrosos/i)
})

test('buildProposal lista vencidos y por vencer y los pone como riesgos', () => {
  const p = buildProposal(docs, TODAY)
  assert.deepEqual(p.expiring.map(e => [e.name, e.state]), [['concesion-agua.pdf', 'vencido'], ['iso.pdf', 'por_vencer']])
  assert.match(p.company.riesgos, /concesion-agua\.pdf/)
  assert.match(p.company.riesgos, /1 mar 2026/)
})

test('buildProposal sin documentos leídos no propone nada', () => {
  const p = buildProposal([docs[3], docs[4]], TODAY)
  assert.equal(p.readCount, 0)
  assert.deepEqual(p.company, {})
  assert.equal(p.scian, null)
  assert.deepEqual(p.triggers, {})
})

test('buildProposal respeta el tope de cada campo', () => {
  const long = Array.from({ length: 200 }, (_, i) => doc(`d${i}`, `permiso-${i}.pdf`, { estado: 'vencido', vigenciaFin: '2026-01-01' }))
  const p = buildProposal(long, TODAY)
  assert.ok(p.company.riesgos.length <= 2000)
})

test('buildProposal no repite una certificación que ya detectó con el nombre del archivo', () => {
  const p = buildProposal([
    doc('1', 'iso-14001.pdf', { tipo: 'certificado', empresa: { certificaciones: ['ISO 14001:2015'] } }),
    doc('2', 'industria-limpia.pdf', { tipo: 'certificado' }),
  ], TODAY)
  assert.equal(p.company.certifications, 'ISO 14001:2015, industria-limpia')
})
