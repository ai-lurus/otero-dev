/** Título que se asigna al dar de alta una fuente sin título propio. */
export function autoUrlTitle(url: URL): string {
  return `${url.hostname}${url.pathname === '/' ? '' : url.pathname}`
}
