// pg avisa en consola cuando la URL trae sslmode=prefer, require o verify-ca,
// porque en la próxima versión mayor dejarán de significar verify-full. Hoy ya
// se comportan como verify-full, así que lo dejamos explícito: misma seguridad
// y sin el aviso.
const LEGACY_SSL_MODES = /([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/i

export function explicitSsl(url: string | undefined): string | undefined {
  return url?.replace(LEGACY_SSL_MODES, '$1verify-full')
}
