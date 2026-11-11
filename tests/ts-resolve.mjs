// Permite que `node --test` cargue módulos .ts con imports sin extensión.
import { register } from 'node:module'
register('data:text/javascript,' + encodeURIComponent(`
export async function resolve(specifier, context, next) {
  try { return await next(specifier, context) }
  catch (e) { if (e.code === 'ERR_MODULE_NOT_FOUND') return next(specifier + '.ts', context); throw e }
}`))
