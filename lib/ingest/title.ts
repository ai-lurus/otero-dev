/** Título que se asigna al dar de alta una fuente sin título propio. */
export function autoUrlTitle(url: URL): string {
  return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
}

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú',
  ntilde: 'ñ', Ntilde: 'Ñ', uuml: 'ü', Uuml: 'Ü',
  agrave: 'à', egrave: 'è', igrave: 'ì', ograve: 'ò', ugrave: 'ù',
  acirc: 'â', ecirc: 'ê', icirc: 'î', ocirc: 'ô', ucirc: 'û',
  ccedil: 'ç', Ccedil: 'Ç', iexcl: '¡', iquest: '¿',
  laquo: '«', raquo: '»', ordm: 'º', ordf: 'ª', deg: '°', sect: '§',
  ndash: '–', mdash: '—', hellip: '…', bull: '•', middot: '·',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', euro: '€', copy: '©', reg: '®',
}

function decodeOnce(text: string): string {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (m, n) => safeCodePoint(parseInt(n, 16), m))
    .replace(/&#(\d+);/g, (m, n) => safeCodePoint(Number(n), m))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, n) => NAMED[n] ?? m)
}

function safeCodePoint(code: number, fallback: string): string {
  return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : fallback
}

/**
 * Decodifica entidades HTML (&oacute;, &#233;…). Algunos sitios las escapan dos veces
 * (&amp;oacute;), así que se repite hasta que el texto ya no cambia.
 */
export function decodeEntities(text: string): string {
  let current = text
  for (let i = 0; i < 3; i++) {
    const next = decodeOnce(current)
    if (next === current) break
    current = next
  }
  return current
}
