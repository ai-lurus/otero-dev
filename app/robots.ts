import type { MetadataRoute } from 'next'
import { isDemoMode } from '@/lib/demo'

export default function robots(): MetadataRoute.Robots {
  return isDemoMode
    ? { rules: { userAgent: '*', disallow: '/' } }
    : { rules: { userAgent: '*', allow: '/' } }
}
